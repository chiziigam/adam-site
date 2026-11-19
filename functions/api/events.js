import { CLIENT_EVENTS, attribution, placement, recordEvent, sameOrigin } from '../../lib/funnel.js';

export async function onRequestPost({ request, env }) {
  const reply = status => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!sameOrigin(request)) return reply(403);
  let data;
  try {
    const text = await request.text();
    if (text.length > 2048) return reply(413);
    data = JSON.parse(text);
    if (!data || !CLIENT_EVENTS.has(data.event)) return reply(400);
  } catch (_) { return reply(400); }
  try {
    // Short-lived, hashed-IP abuse limit. No IP address enters event records.
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const key = 'ar:' + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    const count = Number(await env.ADAM_SIGNUPS.get(key) || 0);
    if (count >= 120) return reply(429);
    // KV counters are best effort (eventual consistency and per-key write limits).
    // A burst of legitimate funnel events must not be dropped by this guard.
    await env.ADAM_SIGNUPS.put(key, String(count + 1), { expirationTtl: 3600 }).catch(() => {});
    await recordEvent(env, data.event, attribution(data), placement(data.placement));
    return reply(204);
  } catch (_) { return reply(503); }
}

export function onRequest() { return new Response(null, { status: 405, headers: { Allow: 'POST' } }); }
