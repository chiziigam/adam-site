import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost as subscribe } from '../functions/api/subscribe.js';
import { onRequestPost as event } from '../functions/api/events.js';

const visit = '12345678-1234-4234-8234-123456789abc';
function setup() {
  const values = new Map(), jobs = [];
  const env = { ADAM_SIGNUPS: { get: async key => values.get(key) || null, put: async (key, value) => { values.set(key, value); } } };
  function context(body, origin = 'https://www.heyintuitive.com', path = 'subscribe') {
    return { env, request: new Request('https://www.heyintuitive.com/api/' + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify(body) }), waitUntil: job => jobs.push(job) };
  }
  return { env, values, jobs, context };
}
test('new email is normalized, saved with attribution, then counted once', async () => {
  const s = setup();
  const body = { email: ' Hello@Example.com ', placement: 'hero', attribution: { visit, source: 'imessage', campaign: 'launch', device: 'mobile' } };
  assert.equal((await subscribe(s.context(body))).status, 200);
  await Promise.all(s.jobs);
  const saved = JSON.parse(s.values.get('e:hello@example.com'));
  assert.equal(saved.placement, 'hero'); assert.equal(saved.attribution.source, 'imessage');
  assert.equal([...s.values.keys()].filter(key => key.startsWith('a:')).length, 1);
  assert.equal((await subscribe(s.context(body))).status, 200);
  await Promise.all(s.jobs);
  assert.equal([...s.values.keys()].filter(key => key.startsWith('a:')).length, 1);
});
test('invalid emails and honeypot submissions are not saved or counted', async () => {
  const s = setup();
  assert.equal((await subscribe(s.context({ email: 'not-an-email' }))).status, 400);
  assert.equal((await subscribe(s.context({ email: 'a@example.com', company: 'bot' }))).status, 200);
  assert.equal(s.values.size, 0);
});
test('rejects cross-origin signup and event posts', async () => {
  const s = setup();
  assert.equal((await subscribe(s.context({ email: 'a@example.com' }, 'https://other.example'))).status, 403);
  assert.equal((await event(s.context({ event: 'page_view' }, 'https://other.example', 'events'))).status, 403);
});
test('preserves existing signup data and honours tracking opt-out', async () => {
  const s = setup(); s.values.set('e:a@example.com', JSON.stringify({ at: 'original', for: 'parent' }));
  await subscribe(s.context({ email: 'a@example.com' }));
  assert.deepEqual(JSON.parse(s.values.get('e:a@example.com')), { at: 'original', for: 'parent' });
  await subscribe(s.context({ email: 'b@example.com', tracking: false }));
  await Promise.all(s.jobs);
  assert.equal(JSON.parse(s.values.get('e:b@example.com')).attribution, undefined);
  assert.equal([...s.values.keys()].some(key => key.startsWith('a:')), false);
});
test('storage failures return an honest retryable signup error', async () => {
  const s = setup(); s.env.ADAM_SIGNUPS.get = async () => { throw new Error('down'); };
  const response = await subscribe(s.context({ email: 'a@example.com' }));
  assert.equal(response.status, 503); assert.equal((await response.json()).ok, false);
});
test('analytics write failure cannot fail a stored signup', async () => {
  const s = setup();
  const put = s.env.ADAM_SIGNUPS.put;
  s.env.ADAM_SIGNUPS.put = async (key, value) => { if (key.startsWith('a:')) throw new Error('analytics down'); await put(key, value); };
  assert.equal((await subscribe(s.context({ email: 'a@example.com' }))).status, 200);
  await Promise.all(s.jobs); assert.ok(s.values.has('e:a@example.com'));
});
test('rate-limited signups are not saved', async () => {
  const s = setup(); s.values.set('rl:192.0.2.1', '8');
  assert.equal((await subscribe(s.context({ email: 'a@example.com' }))).status, 429);
  assert.equal(s.values.has('e:a@example.com'), false);
});
test('events strip arbitrary contents and deduplicate page/placement events', async () => {
  const s = setup();
  const body = { event: 'page_view', visit, source: 'person@example.com', campaign: 'launch', placement: 'page', email: 'secret@example.com' };
  assert.equal((await event(s.context(body, undefined, 'events'))).status, 204);
  assert.equal((await event(s.context(body, undefined, 'events'))).status, 204);
  const records = [...s.values.entries()].filter(([key]) => key.startsWith('a:'));
  assert.equal(records.length, 1); assert.equal(records[0][1].includes('@'), false);
  assert.equal(JSON.parse(records[0][1]).source, 'direct');
});
test('browser events cannot forge a successful signup', async () => {
  const s = setup();
  assert.equal((await event(s.context({ event: 'signup_success', visit }, undefined, 'events'))).status, 400);
  assert.equal(s.values.size, 0);
});
test('event abuse limits use hashed, expiring keys and event records expire', async () => {
  const s = setup(), writes = [];
  const put = s.env.ADAM_SIGNUPS.put;
  s.env.ADAM_SIGNUPS.put = async (key, value, options) => { writes.push({ key, options }); await put(key, value); };
  assert.equal((await event(s.context({ event: 'page_view', visit }, undefined, 'events'))).status, 204);
  const limiter = writes.find(write => write.key.startsWith('ar:'));
  assert.match(limiter.key, /^ar:[a-f0-9]{64}$/);
  assert.equal(limiter.options.expirationTtl, 3600);
  assert.equal(writes.find(write => write.key.startsWith('a:')).options.expirationTtl, 90 * 86400);
  s.values.set(limiter.key, '120');
  assert.equal((await event(s.context({ event: 'waitlist_start', visit }, undefined, 'events'))).status, 429);
});
test('malformed or oversized payloads fail without touching storage', async () => {
  const s = setup();
  assert.equal((await subscribe(s.context(null))).status, 400);
  assert.equal((await event(s.context({ event: 'page_view', extra: 'x'.repeat(3000) }, undefined, 'events'))).status, 413);
  assert.equal(s.values.size, 0);
});
