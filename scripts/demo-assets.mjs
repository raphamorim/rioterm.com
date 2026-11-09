// Everything the homepage terminal demo needs on disk before docusaurus
// runs: the Linux snapshot inputs, the snapshot itself, and the bash webc.
// Each step is a no-op once its output exists.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
for (const script of [
  'fetch-linux-image.mjs',
  'build-v86-state.mjs',
  'fetch-bash-webc.mjs',
]) {
  execFileSync(process.execPath, [join(here, script)], { stdio: 'inherit' });
}
