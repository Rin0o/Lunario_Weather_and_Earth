/**
 * Generates a VAPID key pair for the frost alerts (D-33). Run it once, on your own machine:
 *   npm run vapid-keys
 * The public key goes in the repository (app config and worker/wrangler.jsonc). The private
 * key is a secret: store it with `npx wrangler secret put VAPID_PRIVATE_KEY` and nowhere else.
 */
import { generateVapidKeys } from './lib/vapid.ts';

const { publicKey, privateKey } = await generateVapidKeys();
console.log(`
VAPID_PUBLIC_KEY (not secret: send it to the developer / put it in the repository):
${publicKey}

VAPID_PRIVATE_KEY (SECRET: paste it only into "npx wrangler secret put VAPID_PRIVATE_KEY"):
${privateKey}
`);
