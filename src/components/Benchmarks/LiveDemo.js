// @ts-check

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';

const PAYLOAD_BYTES = 8 * 1024 * 1024;
const encoder = new TextEncoder();

// Same generators as riotermjs's own benchmark (benchmark/src/workloads.mjs),
// so a run here is comparable with its published numbers.
const WORKLOADS = {
  plain: {
    label: 'Plain text',
    line: () =>
      'the quick brown fox jumps over the lazy dog 0123456789 lorem ipsum dolor sit amet consetetur\r\n',
  },
  ansi: {
    label: 'ANSI colors',
    line: () => {
      let line = '';
      for (let i = 0; i < 10; i++) {
        line += `\x1b[38;5;${(i * 37) % 256}m\x1b[48;5;${(i * 53 + 8) % 256}mword${i}\x1b[0m `;
        line += `\x1b[1;38;2;${(i * 31) % 256};${(i * 67) % 256};${(i * 13) % 256}mbold\x1b[0m `;
        line += i % 2 ? '\x1b[3mital\x1b[0m ' : '\x1b[4munder\x1b[0m ';
      }
      return `${line}\r\n`;
    },
  },
};

/** @param {keyof typeof WORKLOADS} id */
function buildChunks(id) {
  const line = WORKLOADS[id].line();
  const chunk = encoder.encode(line.repeat(Math.ceil(65536 / line.length)));
  const chunks = [];
  let bytes = 0;
  while (bytes < PAYLOAD_BYTES) {
    chunks.push(chunk);
    bytes += chunk.length;
  }
  return { chunks, bytes };
}

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

const BANNER =
  '\x1b[1;35mrioterm\x1b[0m \x1b[2m· Rio’s terminal core compiled to WebAssembly\x1b[0m\r\n' +
  '\x1b[2mThis is a real terminal running in your browser tab.\x1b[0m\r\n\r\n' +
  'Pick a workload to stream \x1b[1m8 MB\x1b[0m through it and time parse + paint.\r\n\r\n' +
  '\x1b[36m❯\x1b[0m ';

/**
 * A live riotermjs terminal on the page. The reader runs the benchmark
 * workloads in their own browser, so these numbers are measured, not quoted.
 */
/** @param {{ className?: string }} props */
export default function LiveDemo({ className } = {}) {
  const hostRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const termRef = useRef(
    /** @type {import('rioterm').Terminal | null} */ (null),
  );
  const [status, setStatus] = useState(
    /** @type {'idle' | 'loading' | 'ready' | 'running' | 'error'} */ ('idle'),
  );
  const [runs, setRuns] = useState(
    /** @type {{ id: number, workload: string, parseMbPerSec: number, parseMs: number, paintedMs: number }[]} */ ([]),
  );

  // Load the 1.4 MB wasm engine only once the demo scrolls into view.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    /** @type {{ dispose(): void } | null} */
    let handle = null;
    let cancelled = false;

    const boot = async () => {
      setStatus('loading');
      try {
        const { open } = await import('rioterm');
        if (cancelled) return;
        const opened = await open(host, {
          autoFocus: false,
          fontSize: 13,
          scrollback: 10000,
          fontFamily:
            "'Cascadia Code', 'JetBrains Mono', ui-monospace, Menlo, monospace",
        });
        if (cancelled) {
          opened.dispose();
          return;
        }
        handle = opened;
        termRef.current = opened.terminal;
        opened.terminal.write(BANNER);
        setStatus('ready');
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus('error');
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      void boot();
    } else {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            observer.disconnect();
            void boot();
          }
        },
        { rootMargin: '200px' },
      );
      observer.observe(host);
      return () => {
        cancelled = true;
        observer.disconnect();
        handle?.dispose();
        termRef.current = null;
      };
    }

    return () => {
      cancelled = true;
      handle?.dispose();
      termRef.current = null;
    };
  }, []);

  /** @param {keyof typeof WORKLOADS} id */
  const run = async (id) => {
    const term = termRef.current;
    if (!term || status === 'running') return;
    setStatus('running');
    const { chunks, bytes } = buildChunks(id);
    // Let the button state paint before the main thread is busy.
    await nextFrame();

    // Parsing is synchronous, so the write loop alone is the engine's cost.
    // The two-frame settle after it matches the riotermjs benchmark.
    const start = performance.now();
    for (const chunk of chunks) term.write(chunk);
    const parseMs = performance.now() - start;
    await nextFrame();
    await nextFrame();
    const paintedMs = performance.now() - start;
    const parseMbPerSec = bytes / 1024 / 1024 / (parseMs / 1000);

    term.write(
      `\x1b[0m\r\n\x1b[1;32m✓\x1b[0m ${WORKLOADS[id].label.toLowerCase()} · ` +
        `${(bytes / 1024 / 1024).toFixed(1)} MB parsed in ${parseMs.toFixed(1)} ms · ` +
        `\x1b[1;35m${Math.round(parseMbPerSec)} MB/s\x1b[0m` +
        ` \x1b[2m(painted at ${paintedMs.toFixed(1)} ms)\x1b[0m\r\n\r\n\x1b[36m❯\x1b[0m `,
    );
    setRuns((prev) =>
      [
        {
          id: Date.now(),
          workload: WORKLOADS[id].label,
          parseMbPerSec,
          parseMs,
          paintedMs,
        },
        ...prev,
      ].slice(0, 5),
    );
    setStatus('ready');
  };

  const latest = runs[0];
  const busy = status !== 'ready';

  return (
    <div className={clsx(styles.card, className)}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            Run it in your browser{' '}
            <span className={styles.liveBadge}>Live</span>
          </div>
          <div className={styles.cardSubtitle}>
            <a
              href="https://github.com/raphamorim/riotermjs"
              target="_blank"
              rel="noopener noreferrer"
            >
              riotermjs
            </a>{' '}
            · Rio&rsquo;s VT core in WebAssembly with a canvas renderer
          </div>
        </div>
        {latest && (
          <div className={styles.headline}>
            <span className={styles.headlineValue}>
              {Math.round(latest.parseMbPerSec).toLocaleString('en-US')}
              <small> MB/s</small>
            </span>
            <span className={styles.headlineText}>
              {latest.workload} parse speed, measured just now on your machine
            </span>
          </div>
        )}
      </div>

      <div className={styles.tabs}>
        {
          /** @type {(keyof typeof WORKLOADS)[]} */ (
            Object.keys(WORKLOADS)
          ).map((id) => (
            <button
              key={id}
              type="button"
              className={styles.tab}
              onClick={() => void run(id)}
              disabled={busy}
            >
              ▶ {WORKLOADS[id].label}, 8 MB
            </button>
          ))
        }
      </div>

      <div className={styles.liveTerminal}>
        <div ref={hostRef} className={styles.liveHost} />
        {status === 'loading' && (
          <div className={styles.liveOverlay}>Loading the terminal engine…</div>
        )}
        {status === 'error' && (
          <div className={styles.liveOverlay}>
            The terminal engine could not load in this browser. Try the{' '}
            <a
              href="https://riotermjs.pages.dev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              riotermjs demo
            </a>{' '}
            instead.
          </div>
        )}
      </div>

      {runs.length > 0 && (
        <div className={clsx(styles.scoreWrap, styles.runsWrap)}>
          <table className={styles.scoreTable}>
            <thead>
              <tr>
                <th scope="col">Your runs</th>
                <th scope="col">Parse speed</th>
                <th scope="col">Parse time</th>
                <th scope="col">Painted at</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.workload}</th>
                  <td>
                    {Math.round(r.parseMbPerSec).toLocaleString('en-US')} MB/s
                  </td>
                  <td>{r.parseMs.toFixed(1)} ms</td>
                  <td>{r.paintedMs.toFixed(1)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
