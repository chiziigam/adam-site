import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../signup.js', import.meta.url), 'utf8');

function element(props = {}) {
  const handlers = {}, attrs = {};
  return Object.assign({
    handlers, attrs, children: [], className: '', textContent: '', value: '', dataset: {},
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    setAttribute(name, value) { attrs[name] = String(value); },
    getAttribute(name) { return name in attrs ? attrs[name] : null; },
    removeAttribute(name) { delete attrs[name]; },
    hasAttribute(name) { return name in attrs; },
    appendChild(child) { this.children.push(child); },
    focus() { page.focused = this; },
    get classList() { return { contains: name => this.className.split(' ').includes(name) }; }
  }, props);
}
let page;

function load({ respond, onLine = true }) {
  const input = element({ type: 'email' });
  const company = element();
  const button = element();
  const message = element();
  const form = element({ dataset: { signup: 'hero' }, querySelector: sel => sel === 'button' ? button : sel.includes('company') ? company : input });
  page = { input, button, message, form, requests: [], focused: null };
  const fetch = async (url, init) => {
    if (url === '/api/events') return { ok: true };
    page.requests.push(JSON.parse(init.body));
    return respond(init);
  };
  const document = {
    querySelectorAll: sel => sel === '[data-signup]' ? [form] : [],
    getElementById: id => id === 'heroMsg' ? message : null,
    createElement: () => element(),
    createTextNode: text => ({ textContent: text })
  };
  vm.runInNewContext(source, {
    window: {}, document, fetch, URLSearchParams, URL, AbortController, setTimeout, clearTimeout, JSON, Object,
    navigator: { doNotTrack: '1', onLine }, location: { search: '', hostname: 'www.heyintuitive.com' },
    crypto: { randomUUID: () => '12345678-1234-4234-8234-123456789abc' }, matchMedia: () => ({ matches: true })
  });
  return page;
}

async function submit(p, email) {
  p.input.value = email;
  for (const fn of p.form.handlers.submit) await fn({ preventDefault() {} });
}
const json = (status, body) => () => ({ ok: status < 300, status, json: async () => body });
const text = all => all.message.textContent + all.message.children.map(c => c.textContent).join('');

test('invalid email is caught before sending, marked invalid and focused', async () => {
  const p = load({ respond: json(200, { ok: true }) });
  await submit(p, 'name@example');
  assert.equal(p.requests.length, 0);
  assert.equal(p.input.getAttribute('aria-invalid'), 'true');
  assert.match(p.message.className, /err/);
  assert.equal(p.focused, p.input);
});

test('typing after an error clears the error', async () => {
  const p = load({ respond: json(200, { ok: true }) });
  await submit(p, 'bad');
  for (const fn of p.input.handlers.input) fn();
  assert.equal(p.message.textContent, '');
  assert.equal(p.input.hasAttribute('aria-invalid'), false);
});

test('server rejection of the address is shown as an address problem', async () => {
  const p = load({ respond: json(400, { ok: false, error: 'invalid email' }) });
  await submit(p, 'a@example.com');
  assert.equal(p.input.getAttribute('aria-invalid'), 'true');
  assert.match(text(p), /full email address/);
});

test('rate limit, storage failure and non-JSON gateway errors give retryable messages with a contact link', async () => {
  for (const [respond, pattern] of [
    [json(429, { ok: false }), /Too many attempts/],
    [json(503, { ok: false }), /couldn’t add you/],
    [() => ({ ok: false, status: 502, json: async () => { throw new SyntaxError('html'); } }), /couldn’t add you/]
  ]) {
    const p = load({ respond });
    await submit(p, 'a@example.com');
    assert.match(text(p), pattern);
    assert.equal(p.message.children[0].href, 'mailto:support@heyintuitive.com?subject=Adam%20waitlist');
    assert.equal(p.input.hasAttribute('aria-invalid'), false);
    assert.equal(p.button.hasAttribute('aria-disabled'), false, 'button is usable again');
    assert.equal(p.focused, p.input);
  }
});

test('network failure while offline says so', async () => {
  const p = load({ onLine: false, respond: () => { throw new TypeError('Failed to fetch'); } });
  await submit(p, 'a@example.com');
  assert.match(text(p), /offline/);
});

test('success confirms, locks the form and moves focus to the confirmation', async () => {
  const p = load({ respond: json(200, { ok: true }) });
  await submit(p, ' a@example.com ');
  assert.equal(p.requests[0].email, 'a@example.com');
  assert.match(p.message.textContent, /on the list/);
  assert.equal(p.input.readOnly, true);
  assert.equal(p.button.getAttribute('aria-disabled'), 'true');
  assert.equal(p.focused, p.message);
  await submit(p, 'b@example.com');
  assert.equal(p.requests.length, 1, 'no second submission after success');
});
