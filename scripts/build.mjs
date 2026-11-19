import { readdir, cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = new URL('../public/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const directories = new Set(['assets', 'colorways', 'day', 'family', 'frames', 'inside', 'works']);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (directories.has(entry.name) || /\.(html|css|js|png|webp|svg|ico|txt|xml)$/.test(entry.name) || entry.name === '_headers') {
    await cp(new URL('../' + entry.name, import.meta.url), new URL(entry.name, out), { recursive: true });
  }
}
console.log('Static assets built to public/; Pages Functions remain in functions/.');
