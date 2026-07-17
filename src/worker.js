/* src/worker.js — capture-email Worker (scaffold, 2026-07-17).
   ------------------------------------------------------------------------
   NOT YET DEPLOYED. This is a fresh scaffold for the "the door" mini-form
   (index.html #start) — this project had no Worker before. Modeled on
   savycolours-website's src/worker.js (same CORS/validate/D1 shape),
   extended with the message field. Requires a real D1 database
   (`wrangler d1 create ...`) and a deploy before it does anything; see
   wrangler.toml's placeholder database_id.
*/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX = 2000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    if (request.method === 'OPTIONS' && path === '/capture-email') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === 'POST' && path === '/capture-email') {
      try {
        await env.DB.prepare(
          'CREATE TABLE IF NOT EXISTS inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL)'
        ).run();

        const body = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        const message = (body.message || '').trim().slice(0, MESSAGE_MAX);

        if (!EMAIL_RE.test(email)) {
          return new Response(JSON.stringify({ success: false, message: 'Invalid email' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        await env.DB.prepare('INSERT INTO inquiries (email, message, created_at) VALUES (?, ?, ?)')
          .bind(email, message, new Date().toISOString()).run();

        return new Response(JSON.stringify({ success: true, message: 'Sent!' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: 'Server error', error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
