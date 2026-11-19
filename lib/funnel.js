export const CLIENT_EVENTS = new Set(['page_view', 'waitlist_view', 'waitlist_start', 'cta_click', 'signup_error']);
const PLACEMENTS = new Set(['hero', 'footer', 'nav', 'body', 'page']);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function attribution(input = {}) {
  const tag = value => typeof value === 'string' && /^[a-z0-9._-]{1,64}$/i.test(value) ? value : '';
  return {
    visit: UUID.test(input.visit || '') ? input.visit : crypto.randomUUID(),
    source: tag(input.source) || 'direct', medium: tag(input.medium), campaign: tag(input.campaign),
    device: input.device === 'mobile' ? 'mobile' : 'desktop', version: 'waitlist-v1'
  };
}

export function placement(value) { return PLACEMENTS.has(value) ? value : 'body'; }

export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function recordEvent(env, event, details, where) {
  const at = new Date().toISOString();
  const record = { event, at, ...attribution(details), placement: placement(where) };
  // One event of each kind per page/placement; retries cannot inflate the funnel.
  const key = `a:${at.slice(0, 10)}:${record.visit}:${event}:${record.placement}`;
  await env.ADAM_SIGNUPS.put(key, JSON.stringify(record), { expirationTtl: 90 * 86400, metadata: record });
}

export function scheduleEvent(context, event, details, where) {
  // An analytics outage must not turn a successfully stored email into an error.
  const job = recordEvent(context.env, event, details, where).catch(() => {});
  context.waitUntil(job);
}
