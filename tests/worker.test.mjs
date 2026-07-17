import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

function makeEnv() {
  const inserted = [];
  const stmt = {
    bind(...args) {
      this._args = args;
      return this;
    },
    async run() {
      if (this._args) inserted.push(this._args);
      return { success: true };
    },
  };
  return {
    DB: {
      prepare(_sql) {
        return stmt;
      },
    },
    ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
    _inserted: inserted,
  };
}

test('OPTIONS /capture-email returns a CORS preflight response', async () => {
  const env = makeEnv();
  const req = new Request('https://lgrwebstudios.com/capture-email', { method: 'OPTIONS' });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.equal(res.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
});

test('POST /capture-email rejects malformed email addresses', async () => {
  const env = makeEnv();
  const bad = ['bob@', 'bob', '@example.com', 'bob@example', ''];
  for (const email of bad) {
    const req = new Request('https://lgrwebstudios.com/capture-email', {
      method: 'POST',
      body: JSON.stringify({ email, message: 'hello' }),
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 400, `expected 400 for "${email}"`);
  }
  assert.equal(env._inserted.length, 0, 'no rows should have been inserted for bad input');
});

test('POST /capture-email accepts a well-formed email + message and stores both, lowercased/trimmed', async () => {
  const env = makeEnv();
  const req = new Request('https://lgrwebstudios.com/capture-email', {
    method: 'POST',
    body: JSON.stringify({ email: '  Bob@Example.COM  ', message: '  my site does not book anyone  ' }),
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(env._inserted.length, 1);
  assert.equal(env._inserted[0][0], 'bob@example.com');
  assert.equal(env._inserted[0][1], 'my site does not book anyone');
});

test('POST /capture-email accepts a well-formed email with no message', async () => {
  const env = makeEnv();
  const req = new Request('https://lgrwebstudios.com/capture-email', {
    method: 'POST',
    body: JSON.stringify({ email: 'jane@example.com' }),
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  assert.equal(env._inserted[0][1], '');
});

test('POST /capture-email truncates an overlong message to 2000 chars', async () => {
  const env = makeEnv();
  const long = 'x'.repeat(3000);
  const req = new Request('https://lgrwebstudios.com/capture-email', {
    method: 'POST',
    body: JSON.stringify({ email: 'jane@example.com', message: long }),
  });
  await worker.fetch(req, env);
  assert.equal(env._inserted[0][1].length, 2000);
});

test('non-matching routes fall through to static assets', async () => {
  const env = makeEnv();
  const req = new Request('https://lgrwebstudios.com/', { method: 'GET' });
  const res = await worker.fetch(req, env);
  assert.equal(await res.text(), 'asset');
});
