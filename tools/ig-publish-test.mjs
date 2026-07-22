#!/usr/bin/env node
/* tools/ig-publish-test.mjs — the two-step Instagram container->publish
   flow (POST /{ig-user-id}/media, then POST /{ig-user-id}/media_publish),
   for the owner to run manually against the real @lgrwebstudios account.

   SAFE BY DEFAULT: with no --live flag this is a DRY RUN — it prints the
   exact requests it would make and makes ZERO network calls. To actually
   publish, both --live AND --confirm=PUBLISH must be passed (a typed
   phrase, not just a boolean, so it can't be triggered by an accidental
   flag). This script must never be run with --live by an agent or in CI —
   only the owner, deliberately, against his own account.

   Usage:
     node tools/ig-publish-test.mjs --image-url=<url> [--caption="..."]                 (dry run — default)
     node tools/ig-publish-test.mjs --image-url=<url> --live --confirm=PUBLISH          (real publish)

   Reads IG_TOKEN and IG_USER_ID from the environment — never hardcode a
   token here, never pass one as a CLI arg (shell history would leak it).
*/
const IG_GRAPH_VERSION = 'v21.0'; // confirm current stable version in the Meta dashboard before real use

function parseArgs(argv) {
  const out = { live: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--live') { out.live = true; continue; }
    const m = arg.match(/^--([a-z-]+)=(.*)$/);
    if (m) out[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = m[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.imageUrl) {
    console.error('Usage: node tools/ig-publish-test.mjs --image-url=<url> [--caption="..."] [--live --confirm=PUBLISH]');
    process.exit(1);
  }

  const token = process.env.IG_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (args.live && (!token || !igUserId)) {
    console.error('--live requires IG_TOKEN and IG_USER_ID in the environment.');
    process.exit(1);
  }

  const containerUrl = `https://graph.facebook.com/${IG_GRAPH_VERSION}/${igUserId || '<IG_USER_ID>'}/media`;
  const containerParams = { image_url: args.imageUrl, ...(args.caption ? { caption: args.caption } : {}) };
  const publishUrl = `https://graph.facebook.com/${IG_GRAPH_VERSION}/${igUserId || '<IG_USER_ID>'}/media_publish`;

  if (!args.live || args.confirm !== 'PUBLISH') {
    console.log('DRY RUN — no network calls made. To publish for real: --live --confirm=PUBLISH\n');
    console.log('Step 1 — create container:');
    console.log(`  POST ${containerUrl}`);
    console.log('  body:', JSON.stringify({ ...containerParams, access_token: '<IG_TOKEN, redacted>' }, null, 2));
    console.log('\nStep 2 — publish (after polling GET /<container-id>?fields=status_code until FINISHED, ~1x/min for up to 5 min):');
    console.log(`  POST ${publishUrl}`);
    console.log('  body:', JSON.stringify({ creation_id: '<container-id-from-step-1>', access_token: '<IG_TOKEN, redacted>' }, null, 2));
    return;
  }

  console.log('LIVE MODE — publishing for real to the account tied to IG_USER_ID.');
  const containerRes = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...containerParams, access_token: token }),
  });
  const containerBody = await containerRes.json();
  if (!containerRes.ok) { console.error('Container creation failed:', containerBody); process.exit(1); }
  const creationId = containerBody.id;
  console.log('Container created:', creationId);

  console.log('Polling container status (up to 5 minutes)...');
  let status = 'IN_PROGRESS';
  for (let i = 0; i < 5 && status === 'IN_PROGRESS'; i++) {
    await new Promise((r) => setTimeout(r, 60_000));
    const statusRes = await fetch(`https://graph.facebook.com/${IG_GRAPH_VERSION}/${creationId}?fields=status_code&access_token=${token}`);
    const statusBody = await statusRes.json();
    status = statusBody.status_code;
    console.log(`  status: ${status}`);
  }
  if (status !== 'FINISHED') { console.error('Container did not reach FINISHED in time:', status); process.exit(1); }

  const publishRes = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: creationId, access_token: token }),
  });
  const publishBody = await publishRes.json();
  if (!publishRes.ok) { console.error('Publish failed:', publishBody); process.exit(1); }
  console.log('Published:', publishBody.id);
}

main();
