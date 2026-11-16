/**
 * Decrypts a Web Push message as the browser does (RFC 8291 with RFC 8188 `aes128gcm`), so
 * the tests check the Worker's encryption end to end. Single record only, as Web Push uses.
 */

const text = (s: string) => new TextEncoder().encode(s);
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    bytes * 8,
  );
  return new Uint8Array(bits);
}

export async function decryptAes128gcm(
  body: Uint8Array,
  userAgentPrivate: CryptoKey,
  userAgentPublic: Uint8Array,
  authSecret: Uint8Array,
): Promise<string> {
  // RFC 8188 §2.1 header: salt (16) | record size (4) | key id length (1) | key id.
  const salt = body.slice(0, 16);
  const idLength = body[20] ?? 0;
  const appServerPublic = body.slice(21, 21 + idLength);
  const ciphertext = body.slice(21 + idLength);

  // RFC 8291 §3.3–3.4: the ECDH secret, mixed with the auth secret and both public keys.
  const serverKey = await crypto.subtle.importKey(
    'raw',
    appServerPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: serverKey }, userAgentPrivate, 256),
  );
  const keyInfo = concat(text('WebPush: info\0'), userAgentPublic, appServerPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // RFC 8188 §2.2–2.3: content key and nonce.
  const cek = await hkdf(salt, ikm, text('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, text('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const padded = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext),
  );

  // RFC 8188 §2: the last record ends with the delimiter 0x02, then zero padding.
  let end = padded.length - 1;
  while (end >= 0 && padded[end] === 0) end--;
  if (padded[end] !== 2) throw new Error('Missing last-record delimiter');
  return new TextDecoder().decode(padded.slice(0, end));
}
