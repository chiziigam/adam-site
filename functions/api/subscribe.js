import { attribution, placement, sameOrigin, scheduleEvent } from '../../lib/funnel.js';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function reply(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!sameOrigin(request)) return reply({ ok: false, error: 'bad origin' }, 403);
  let data;
  try {
    const text = await request.text();
    if (text.length > 4096) return reply({ ok: false, error: 'bad request' }, 413);
    data = JSON.parse(text);
    if (!data || typeof data !== 'object') throw new Error('bad request');
  } catch (e) { return reply({ ok: false, error: 'bad request' }, 400); }
  if (data.company) return reply({ ok: true });
  const email = String(data.email || '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return reply({ ok: false, error: 'invalid email' }, 400);
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = 'rl:' + ip;
    const seen = parseInt((await env.ADAM_SIGNUPS.get(key)) || '0', 10);
    if (seen >= 8) return reply({ ok: false, error: 'too many tries' }, 429);
    await env.ADAM_SIGNUPS.put(key, String(seen + 1), { expirationTtl: 3600 });
    const who = ['baby', 'parent', 'household', 'fun', 'other', 'home'].includes(data.for) ? data.for : '';
    const existing = await env.ADAM_SIGNUPS.get('e:' + email);
    const detail = attribution(data.attribution || {});
    const where = placement(data.placement);
    const rec = existing ? JSON.parse(existing) : {
      at: new Date().toISOString(), from: new URL(request.url).origin,
      ...(data.tracking !== false ? { attribution: detail, placement: where } : {})
    };
    if (who) rec.for = who;
    if (!existing || who) await env.ADAM_SIGNUPS.put('e:' + email, JSON.stringify(rec));
    if (!existing && data.tracking !== false) scheduleEvent(context, 'signup_success', detail, where);
    return reply({ ok: true });
  } catch (_) { return reply({ ok: false, error: 'temporarily unavailable' }, 503); }
}

export function onRequest() {
  return reply({ ok: false, error: 'method not allowed' }, 405);
}
