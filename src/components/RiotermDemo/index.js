// @ts-check

import useBaseUrl from '@docusaurus/useBaseUrl';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';

/** @typedef {'canvas' | 'dom'} Renderer */
/** @typedef {'bash' | 'linux'} Program */

const TERM_FONT =
  "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";
const DEFAULT_TITLE = 'rio terminal emulator';

/**
 * The riotermjs.pages.dev demo, in rioterm.com's clothes: Rio's VT core in
 * WebAssembly driving either a real bash under WASIX or a pre-booted Linux
 * under v86, painted by the canvas or the DOM renderer. Everything runs in
 * the visitor's tab. Ported from riotermjs/docs/src/main.ts.
 *
 * @param {{ className?: string, header?: import('react').ReactNode }} props
 *   `header` renders on the left of the top row, beside the controls.
 */
export default function RiotermDemo({ className, header } = {}) {
  const base = useBaseUrl('/');
  const hostRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  // Sessions outlive terminals: a renderer flip swaps the terminal while
  // bash or Linux keeps running and replays recent output onto the new one.
  const sessions = useRef(
    /** @type {{ hero: import('rioterm').RioTermHandle | null, bash: import('./wasmer-shell').BashSession | null, linux: import('./linux-vm').LinuxSession | null, queue: Promise<void> }} */ ({
      hero: null,
      bash: null,
      linux: null,
      queue: Promise.resolve(),
    }),
  );

  const [bashAvailable, setBashAvailable] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const [visible, setVisible] = useState(false);
  const [program, setProgram] = useState(/** @type {Program} */ ('linux'));
  const [renderer, setRenderer] = useState(/** @type {Renderer} */ ('canvas'));
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [status, setStatus] = useState('librio wasm + v86 · canvas');
  const [error, setError] = useState(/** @type {string | null} */ (null));
  // True while rioterm's hidden textarea has keyboard focus: the visitor
  // clicked into the terminal. Drives the border and who owns the wheel.
  const [focused, setFocused] = useState(false);

  // bash (wasix) needs SharedArrayBuffer; without cross-origin isolation
  // (plain GitHub Pages) only the linux snapshot runs.
  useEffect(() => {
    import('./wasmer-shell').then(({ BashSession }) => {
      const ok = BashSession.supported();
      setBashAvailable(ok);
      if (ok) setProgram('bash');
    });
  }, []);

  // The terminal only mounts on desktop, as on riotermjs.pages.dev: touch
  // keyboards and a 128 MB VM are a poor match for phones.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 981px)');
    setDesktop(mq.matches);
    const onChange = (/** @type {MediaQueryListEvent} */ e) =>
      setDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Load the engine (and the VM behind it) only once the band scrolls near.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setVisible(true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // Mounting is async (font load, wasm init); a toggle clicked mid-mount
  // must not race the mount already in flight, so calls are serialized.
  useEffect(() => {
    if (!visible || !desktop) return;
    const host = hostRef.current;
    if (!host) return;
    const s = sessions.current;
    let cancelled = false;

    const mount = async () => {
      // The canvas renderer measures cell metrics at mount; the font must be
      // resident first or every cell inherits fallback-font widths.
      await document.fonts.load(`14px ${TERM_FONT}`).catch(() => {});
      if (cancelled) return;
      const { open } = await import('rioterm');
      if (cancelled) return;
      s.hero?.dispose();
      s.linux?.detach();
      s.bash?.detach();
      // No predictiveEcho here on purpose: the hero runs against an in-browser
      // VM shell with near-zero latency, where predictions would never surface.
      const hero = await open(host, {
        renderer,
        scrollback: 2000,
        fontFamily: TERM_FONT,
        fontSize: 14,
        autoFocus: false,
        // WASIX bash writes bare LF (no PTY line discipline doing ONLCR);
        // the v86 serial console is a real tty and sends CRLF itself.
        convertEol: program === 'bash',
      });
      if (cancelled) {
        hero.dispose();
        return;
      }
      s.hero = hero;
      hero.terminal.onTitleChange((t) => setTitle(t || DEFAULT_TITLE));

      if (program === 'bash') {
        if (!s.bash) {
          hero.terminal.write('\x1b[2mstarting bash (wasix)...\x1b[0m\r\n');
          const { BashSession } = await import('./wasmer-shell');
          s.bash = new BashSession();
          void s.bash.start(base);
        }
        s.bash.attach(hero.terminal);
      } else {
        if (!s.linux) {
          hero.terminal.write('\x1b[2mrestoring linux snapshot...\x1b[0m\r\n');
          // v86 and its wasm load after first paint.
          const { LinuxSession } = await import('./linux-vm');
          s.linux = new LinuxSession(base);
        }
        s.linux.attach(hero.terminal);
      }
    };

    s.queue = s.queue.then(mount, mount).catch((err) => {
      console.error(err);
      if (!cancelled)
        setError('The terminal engine could not load in this browser.');
    });

    return () => {
      cancelled = true;
    };
  }, [visible, desktop, program, renderer, base]);

  // Wheel ownership follows focus, the way embedded terminals behave in a
  // page: until the visitor clicks into the terminal, the page scrolls even
  // with the pointer over it. Once focused, the terminal owns the wheel
  // completely, with no scroll chaining to the page at the top or bottom of
  // scrollback (what `overscroll-behavior: contain` gives native scroll
  // containers; xterm.js lets the page take over at the edges, which is the
  // behavior people complain about). Sub-line trackpad deltas accumulate
  // until they reach a whole line, as xterm.js does. The capture-phase
  // listener runs before rioterm's own wheel handler, which never sees it.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let partial = 0;
    const onWheel = (/** @type {WheelEvent} */ e) => {
      const hero = sessions.current.hero;
      if (!hero || !host.contains(document.activeElement)) {
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const cellHeight = hero.renderer.cellHeight || 16;
      let lines;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) lines = e.deltaY;
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE)
        lines = e.deltaY * hero.terminal.options.rows;
      else lines = e.deltaY / cellHeight;
      partial += lines;
      const whole = Math.trunc(partial);
      if (whole === 0) return;
      partial -= whole;
      const { col, row } = hero.renderer.cellAt(e.clientX, e.clientY);
      const mods =
        (e.shiftKey ? 1 : 0) |
        (e.ctrlKey ? 2 : 0) |
        (e.altKey ? 4 : 0) |
        (e.metaKey ? 8 : 0);
      // rioterm counts positive lines towards history.
      hero.terminal.scrollWheel(-whole, col, row, mods);
    };
    host.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => host.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  // Status line: engine · renderer · cols x rows, refreshed every 2 s.
  useEffect(() => {
    const update = () => {
      const hero = sessions.current.hero;
      const engine =
        program === 'bash' ? 'librio wasm + wasix' : 'librio wasm + v86';
      if (!hero) {
        setStatus(`${engine} · ${renderer}`);
        return;
      }
      const { cols, rows } = hero.terminal.options;
      setStatus(`${engine} · ${renderer} · ${cols}x${rows}`);
    };
    update();
    const timer = setInterval(update, 2000);
    return () => clearInterval(timer);
  }, [program, renderer]);

  // Tear everything down when the page unmounts.
  useEffect(() => {
    const s = sessions.current;
    return () => {
      s.hero?.dispose();
      s.hero = null;
      s.bash?.detach();
      s.linux?.destroy();
      s.linux = null;
    };
  }, []);

  /**
   * @template {string} T
   * @param {T} value
   * @param {T} current
   * @param {(v: T) => void} set
   */
  const pick = (value, current, set) => {
    if (value === current) return;
    set(value);
    // Refocus once the swap lands.
    sessions.current.queue.then(() => sessions.current.hero?.focus());
  };

  return (
    <div className={clsx(styles.card, className)}>
      <div className={styles.header}>
        {header ?? <div />}
        <div className={styles.controls}>
          <div className={styles.controlRow}>
            <span className={styles.controlLabel}>program</span>
            <span
              className={styles.segmented}
              role="group"
              aria-label="Program"
            >
              <button
                type="button"
                className={clsx(
                  styles.segment,
                  program === 'bash' && styles.segmentActive,
                )}
                onClick={() => pick('bash', program, setProgram)}
                disabled={!bashAvailable}
                title={
                  bashAvailable
                    ? undefined
                    : 'bash needs cross-origin isolation headers, which this host does not send. Linux runs everywhere.'
                }
              >
                bash
              </button>
              <button
                type="button"
                className={clsx(
                  styles.segment,
                  program === 'linux' && styles.segmentActive,
                )}
                onClick={() => pick('linux', program, setProgram)}
              >
                linux
              </button>
            </span>
          </div>
          <div className={styles.controlRow}>
            <span className={styles.controlLabel}>renderer</span>
            <span
              className={styles.segmented}
              role="group"
              aria-label="Renderer"
            >
              <button
                type="button"
                className={clsx(
                  styles.segment,
                  renderer === 'canvas' && styles.segmentActive,
                )}
                onClick={() => pick('canvas', renderer, setRenderer)}
              >
                canvas
              </button>
              <button
                type="button"
                className={clsx(
                  styles.segment,
                  renderer === 'dom' && styles.segmentActive,
                )}
                onClick={() => pick('dom', renderer, setRenderer)}
              >
                dom
              </button>
            </span>
          </div>
        </div>
      </div>

      <div
        className={clsx(
          styles.liveTerminal,
          focused && styles.liveTerminalFocused,
        )}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          // Focus moving between elements inside the terminal is not a blur.
          if (
            !e.currentTarget.contains(
              /** @type {Node | null} */ (e.relatedTarget),
            )
          ) {
            setFocused(false);
          }
        }}
      >
        <div ref={hostRef} className={styles.liveHost} />
        {!desktop && (
          <div className={styles.liveOverlay}>
            The live terminal runs on desktop screens. Open this page on a
            laptop to boot Linux in your browser.
          </div>
        )}
        {desktop && error && (
          <div className={styles.liveOverlay}>
            {error} Try the{' '}
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

      <div className={styles.caption}>
        <span>
          {title} · {status}
        </span>
        <span>
          {desktop && !error && (
            <span className={styles.focusHint}>
              {focused
                ? 'typing here · click outside to release'
                : 'click to type'}
            </span>
          )}
          <a
            href="https://github.com/raphamorim/riotermjs"
            target="_blank"
            rel="noopener noreferrer"
          >
            riotermjs
          </a>
        </span>
      </div>

      <p className={styles.note}>
        Everything here is client-side. <kbd>bash</kbd> is the real thing,
        running under{' '}
        <a href="https://wasmer.io/" target="_blank" rel="noopener noreferrer">
          wasix
        </a>
        ; <kbd>linux</kbd> restores a pre-booted{' '}
        <a
          href="https://github.com/copy/v86"
          target="_blank"
          rel="noopener noreferrer"
        >
          v86
        </a>{' '}
        snapshot with its serial console wired to rioterm. Try <kbd>vim</kbd> or{' '}
        <kbd>top</kbd> in linux, select text with the mouse, flip the renderer
        mid-session.
      </p>
    </div>
  );
}
