// Fetches the assets the homepage "linux" demo boots with: a Buildroot
// kernel image from copy.sh (the v86 project's own image host), the
// SeaBIOS/VGABIOS blobs from the v86 repository, and v86's own wasm from
// node_modules. Cached in static/v86 (gitignored) so dev, build and CI
// serve them same-origin instead of hotlinking copy.sh from the site.
// Ported from riotermjs/scripts/fetch-linux-image.mjs.

import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  statSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'static', 'v86');
const cache = join(root, '.v86-cache');
mkdirSync(out, { recursive: true });
mkdirSync(cache, { recursive: true });

// The kernel is only an input to the state snapshot (built once by
// build-v86-state.mjs); visitors download the snapshot, not the kernel,
// so it stays out of static/.
const ASSETS = [
  [
    join(cache, 'buildroot-bzimage68.bin'),
    'https://i.copy.sh/buildroot-bzimage68.bin',
  ],
  [
    join(out, 'seabios.bin'),
    'https://cdn.jsdelivr.net/gh/copy/v86@master/bios/seabios.bin',
  ],
  [
    join(out, 'vgabios.bin'),
    'https://cdn.jsdelivr.net/gh/copy/v86@master/bios/vgabios.bin',
  ],
];

for (const [path, url] of ASSETS) {
  const name = path.split('/').pop();
  if (existsSync(path) && statSync(path).size > 0) {
    console.log(`have ${name}`);
    continue;
  }
  console.log(`fetching ${name} ...`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    console.error(`failed to fetch ${url}: ${res.status}`);
    process.exit(1);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(path));
  console.log(`  ${name}: ${(statSync(path).size / 1024 / 1024).toFixed(1)}MB`);
}

// v86's wasm is served as a plain static file: webpack has no `?url`
// import, and v86 takes a `wasm_path` anyway.
const require = createRequire(import.meta.url);
const wasm = join(out, 'v86.wasm');
copyFileSync(require.resolve('v86/build/v86.wasm'), wasm);
console.log(
  `have v86.wasm (${(statSync(wasm).size / 1024 / 1024).toFixed(1)}MB)`,
);
console.log('linux demo assets ready');
