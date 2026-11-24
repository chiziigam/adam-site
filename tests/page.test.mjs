import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);

test('ids are unique and every in-page link has a target', () => {
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), '#' + id);
});

test('mobile menu toggle controls the section menu', () => {
  const toggle = html.match(/<button[^>]*class="menu-toggle"[^>]*>/)[0];
  assert.match(toggle, /aria-expanded="false"/);
  assert.match(toggle, /aria-controls="menu"/);
  assert.match(toggle, /aria-label="Open menu"/);
  const menu = html.match(/<nav class="mnav" id="menu"[\s\S]*?<\/nav>/)[0];
  for (const target of ['#what', '#day', '#privacy', '#faq']) assert.ok(menu.includes(`href="${target}"`), target);
});

test('waitlist emails are labelled, required and tied to their messages', () => {
  for (const [input, msg] of [['heroEmail', 'heroMsg'], ['signupEmail', 'signupMsg']]) {
    assert.match(html, new RegExp(`<label[^>]*for="${input}"`));
    const field = html.match(new RegExp(`<input id="${input}"[^>]*>`))[0];
    assert.match(field, /required/); assert.match(field, new RegExp(`aria-describedby="${msg} `));
    assert.match(html, new RegExp(`id="${msg}" role="status" aria-live="polite" tabindex="-1"`));
  }
});

test('honeypot fields are hidden from assistive technology and keyboard', () => {
  const traps = [...html.matchAll(/<div class="hp" aria-hidden="true"><input type="text" name="company" tabindex="-1" autocomplete="off"><\/div>/g)];
  assert.equal(traps.length, 2);
  assert.equal((html.match(/name="company"/g) || []).length, 2);
});

test('privacy and safety section states each boundary', () => {
  const section = html.match(/<section class="bounds" id="privacy"[\s\S]*?<\/section>/)[0];
  for (const term of ['Stays in your home', 'Goes online', 'Not in the box', 'Happens without asking', 'Waits for your OK', 'Yours to control', '999']) assert.ok(section.includes(term), term);
});
