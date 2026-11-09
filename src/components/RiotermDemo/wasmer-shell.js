// @ts-check

// A real bash, instantly: sharrattj/bash from the Wasmer registry running
// under WASIX in the browser. Needs cross-origin isolation (COOP/COEP
// headers) for SharedArrayBuffer; static/_headers provides them on hosts
// that honor it (Cloudflare Pages). Where isolation is missing (plain
// GitHub Pages) the program toggle falls back to Linux.
// Ported from riotermjs/docs/src/wasmer-shell.ts.

const MAX_REPLAY = 256 * 1024;

export class BashSession {
  /** @type {import('rioterm').Terminal | null} */
  terminal = null;
  /** @type {{ dispose(): void } | null} */
  subscription = null;
  /** @type {WritableStreamDefaultWriter<Uint8Array> | null} */
  writer = null;
  /** @type {Uint8Array[]} */
  replay = [];
  replayLen = 0;
  started = false;

  static supported() {
    return typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  }

  /** @param {string} base */
  async start(base) {
    if (this.started) return;
    this.started = true;

    const { init, Wasmer } = await import('@wasmer/sdk');
    // The package is self-hosted (scripts/fetch-bash-webc.mjs); loading it
    // in parallel with the runtime init keeps cold starts short.
    const [webc] = await Promise.all([
      fetch(`${base}wasmer/bash.webc`).then((r) => r.arrayBuffer()),
      init(),
    ]);
    const pkg = await Wasmer.fromFile(new Uint8Array(webc));
    const instance = await /** @type {NonNullable<typeof pkg.entrypoint>} */ (
      pkg.entrypoint
    ).run({
      env: { TERM: 'xterm-256color', HOME: '/home', PS1: '\\w $ ' },
    });

    this.writer = /** @type {WritableStream<Uint8Array>} */ (
      instance.stdin
    ).getWriter();
    /** @param {ReadableStream<Uint8Array>} stream */
    const pump = (stream) => {
      const reader = stream.getReader();
      const loop = () => {
        reader
          .read()
          .then(({ value, done }) => {
            if (done || !value) return;
            this.remember(value);
            this.terminal?.write(value);
            loop();
          })
          .catch(() => {});
      };
      loop();
    };
    pump(instance.stdout);
    pump(instance.stderr);
  }

  /** @param {Uint8Array} bytes */
  remember(bytes) {
    this.replay.push(bytes);
    this.replayLen += bytes.length;
    while (this.replayLen > MAX_REPLAY && this.replay.length > 1) {
      this.replayLen -= /** @type {Uint8Array} */ (this.replay.shift()).length;
    }
  }

  /** @param {import('rioterm').Terminal} terminal */
  attach(terminal) {
    this.detach();
    this.terminal = terminal;
    for (const chunk of this.replay) terminal.write(chunk);
    this.subscription = terminal.onData((bytes) => {
      void this.writer?.write(bytes.slice());
    });
  }

  detach() {
    this.subscription?.dispose();
    this.subscription = null;
    this.terminal = null;
  }
}
