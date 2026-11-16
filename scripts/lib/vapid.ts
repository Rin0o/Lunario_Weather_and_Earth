/** VAPID keys (RFC 8292) in the base64url forms the browser and the Worker use. */

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

export interface VapidKeys {
  /** The uncompressed P-256 public point (65 bytes), as `applicationServerKey` expects. */
  publicKey: string;
  /** The private scalar `d` (32 bytes). */
  privateKey: string;
}

export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  if (!jwk.d) throw new Error('The private key has no "d"');
  return { publicKey: base64url(raw), privateKey: jwk.d };
}
