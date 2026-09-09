// Netlify Function: simpan & ambil pengaturan caption generator lewat Netlify Blobs.
// Tanpa login. Endpoint: /.netlify/functions/settings
//   GET  ?k=<slot>   -> { ts, data } | { ts: 0, data: null }
//   POST ?k=<slot>   -> body { ts, data }, disimpan apa adanya
// Slot dipakai sebagai nama simpanan. Siapa pun yang tahu nama slot bisa
// membaca dan menimpanya, jadi pakai slot yang tidak mudah ditebak.

import { getStore } from "@netlify/blobs";

const CORS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store"
};

const slotOf = (url) => {
  const raw = new URL(url).searchParams.get("k") || "default";
  const clean = raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  return clean || "default";
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const store = getStore("caption-settings");
  const slot = slotOf(req.url);

  try {
    if (req.method === "GET") {
      const saved = await store.get(slot, { type: "json" });
      return new Response(JSON.stringify(saved ?? { ts: 0, data: null }), { headers: CORS });
    }

    if (req.method === "POST") {
      const body = await req.json();
      if (!body || typeof body !== "object" || !body.data) {
        return new Response(JSON.stringify({ error: "body harus { ts, data }" }), { status: 400, headers: CORS });
      }
      const payload = { ts: Number(body.ts) || Date.now(), data: body.data };
      if (JSON.stringify(payload).length > 512 * 1024) {
        return new Response(JSON.stringify({ error: "pengaturan terlalu besar" }), { status: 413, headers: CORS });
      }
      await store.setJSON(slot, payload);
      return new Response(JSON.stringify({ ok: true, ts: payload.ts }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "method tidak didukung" }), { status: 405, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 500, headers: CORS });
  }
};
