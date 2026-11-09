// @ts-check

import {
  framePacing,
  isPlaceholder,
  latency,
  releaseHistory,
  suites,
  terminals,
} from '@site/src/data/benchmarks';
import clsx from 'clsx';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './styles.module.css';

const HERO = 'Rio';

/**
 * Flips to true the first time the element scrolls into view, so animations
 * start where the reader is looking instead of on page load.
 *
 * @param {import('react').RefObject<HTMLElement | null>} ref
 */
function useInView(ref) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, inView]);

  return inView;
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/** @param {number} value */
function format(value) {
  if (value >= 100) return Math.round(value).toLocaleString('en-US');
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function PreviewBadge() {
  if (!isPlaceholder) return null;
  return <span className={styles.previewBadge}>Preview data</span>;
}

/**
 * @param {{ suite: import('@site/src/data/benchmarks').Suite }} props
 */
function Headline({ suite }) {
  const hero = suite.results[HERO];
  const others = Object.entries(suite.results).filter(([name]) => name !== HERO);
  const best = others.reduce((a, b) =>
    suite.lowerIsBetter ? (b[1] < a[1] ? b : a) : b[1] > a[1] ? b : a,
  );
  const ratio = suite.lowerIsBetter ? best[1] / hero : hero / best[1];
  const wins = ratio >= 1;

  return (
    <div className={styles.headline}>
      <span className={styles.headlineValue}>
        {format(hero)}
        <small> {suite.unit}</small>
      </span>
      <span className={styles.headlineText}>
        {wins ? (
          <>
            <strong>{ratio.toFixed(1)}×</strong> {suite.lowerIsBetter ? 'faster' : 'higher'} than
            the next best ({best[0]})
          </>
        ) : (
          <>
            {best[0]} leads at {format(best[1])} {suite.unit}
          </>
        )}
      </span>
    </div>
  );
}

/**
 * @param {{ suite: import('@site/src/data/benchmarks').Suite, animate: boolean }} props
 */
function Bars({ suite, animate }) {
  const [hovered, setHovered] = useState(/** @type {string | null} */ (null));
  const rows = Object.entries(suite.results).sort((a, b) =>
    suite.lowerIsBetter ? a[1] - b[1] : b[1] - a[1],
  );
  const max = Math.max(...rows.map(([, v]) => v));
  const hero = suite.results[HERO];

  return (
    <div className={styles.bars} role="list">
      {rows.map(([name, value], i) => {
        const relative = suite.lowerIsBetter ? value / hero : hero / value;
        return (
          <div
            key={name}
            role="listitem"
            className={clsx(styles.barRow, name === HERO && styles.barRowHero)}
            onMouseEnter={() => setHovered(name)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(name)}
            onBlur={() => setHovered(null)}
            tabIndex={0}
            aria-label={`${name}: ${format(value)} ${suite.unit}`}
          >
            <span className={styles.barName}>{name}</span>
            <span className={styles.barTrack}>
              <span
                className={styles.barFill}
                style={{
                  width: animate ? `${(value / max) * 100}%` : '0%',
                  transitionDelay: `${i * 70}ms`,
                }}
              />
              <span className={styles.barValue}>
                {format(value)} {suite.unit}
              </span>
              {hovered === name && (
                <span className={styles.tooltip} role="tooltip">
                  <strong>{name}</strong> · {format(value)} {suite.unit}
                  {name !== HERO && (
                    <span className={styles.tooltipMuted}>
                      {' '}
                      · Rio is {relative.toFixed(1)}× {relative >= 1 ? 'ahead' : 'behind'}
                    </span>
                  )}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {{ suite: import('@site/src/data/benchmarks').Suite }} props
 */
function SuiteTable({ suite }) {
  return (
    <details className={styles.tableToggle}>
      <summary>Show as table</summary>
      <table>
        <thead>
          <tr>
            <th>Terminal</th>
            <th>
              {suite.title} ({suite.unit})
            </th>
          </tr>
        </thead>
        <tbody>
          {terminals.map((name) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{format(suite.results[name])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Tabbed horizontal bar charts, one tab per benchmark suite. */
export function BenchmarkSuites() {
  const [activeId, setActiveId] = useState(suites[0].id);
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const inView = useInView(ref);
  const [animate, setAnimate] = useState(false);
  const suite = suites.find((s) => s.id === activeId) ?? suites[0];

  // Re-run the grow-in each time a tab is picked.
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setAnimate(true);
      return;
    }
    setAnimate(false);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(frame);
  }, [inView, activeId]);

  return (
    <div className={styles.card} ref={ref}>
      <div className={styles.tabs} role="tablist" aria-label="Benchmark suite">
        {suites.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === activeId}
            className={clsx(styles.tab, s.id === activeId && styles.tabActive)}
            onClick={() => setActiveId(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            {suite.title} <PreviewBadge />
          </div>
          <div className={styles.cardSubtitle}>
            {suite.lowerIsBetter ? 'Lower is better' : 'Higher is better'} · measured with{' '}
            <a href={suite.toolUrl} target="_blank" rel="noopener noreferrer">
              {suite.tool}
            </a>
          </div>
        </div>
        <Headline suite={suite} />
      </div>

      <p className={styles.cardDescription}>{suite.description}</p>
      <Bars suite={suite} animate={animate} />
      <SuiteTable suite={suite} />
    </div>
  );
}

const FRAME_MARKERS = [
  { ms: 1000 / 120, label: '120 Hz' },
  { ms: 1000 / 60, label: '60 Hz' },
];

/**
 * Median-to-tail latency ranges, idle and under load, on one shared axis
 * with display frame budgets marked for scale.
 */
export function LatencyStrip() {
  const [mode, setMode] = useState(/** @type {'idle' | 'load'} */ ('idle'));
  const [hovered, setHovered] = useState(/** @type {string | null} */ (null));

  const axisMax = Math.ceil(Math.max(...Object.values(latency).map((l) => l.loadP99)) / 10) * 10;
  const ticks = Array.from({ length: axisMax / 10 + 1 }, (_, i) => i * 10);
  /** @param {number} ms */
  const x = (ms) => `${(ms / axisMax) * 100}%`;
  const rows = [...terminals].sort((a, b) => {
    const key = mode === 'idle' ? 'p50' : 'loadP50';
    return latency[a][key] - latency[b][key];
  });

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            Latency, median to p99.9 <PreviewBadge />
          </div>
          <div className={styles.cardSubtitle}>
            Keypress to pixels in ms · lower and tighter is better
          </div>
        </div>
        <div className={styles.segmented} role="tablist" aria-label="System load">
          {/** @type {const} */ (['idle', 'load']).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={clsx(styles.segment, mode === m && styles.segmentActive)}
              onClick={() => setMode(m)}
            >
              {m === 'idle' ? 'Idle' : 'Under load'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.strip}>
        <div className={styles.stripRow} aria-hidden="true">
          <span />
          <span className={styles.stripTrack}>
            {FRAME_MARKERS.map((m) => (
              <span key={m.label} className={styles.frameMarker} style={{ left: x(m.ms) }}>
                <span className={styles.frameLabel}>{m.label}</span>
              </span>
            ))}
          </span>
        </div>

        {rows.map((name) => {
          const l = latency[name];
          const p50 = mode === 'idle' ? l.p50 : l.loadP50;
          const p99 = mode === 'idle' ? l.p99 : l.loadP99;
          return (
            <div
              key={name}
              className={clsx(styles.stripRow, name === HERO && styles.barRowHero)}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(name)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              aria-label={`${name}: median ${format(p50)} ms, p99.9 ${format(p99)} ms`}
            >
              <span className={styles.barName}>{name}</span>
              <span className={styles.stripTrack}>
                {FRAME_MARKERS.map((m) => (
                  <span key={m.label} className={styles.frameLine} style={{ left: x(m.ms) }} />
                ))}
                <span
                  className={styles.range}
                  style={{ left: x(p50), width: `calc(${x(p99)} - ${x(p50)})` }}
                />
                <span className={styles.dotMedian} style={{ left: x(p50) }} />
                <span className={styles.dotTail} style={{ left: x(p99) }} />
                {hovered === name && (
                  <span className={styles.tooltip} role="tooltip" style={{ left: x(p99) }}>
                    <strong>{name}</strong> · median {format(p50)} ms · p99.9 {format(p99)} ms
                  </span>
                )}
              </span>
            </div>
          );
        })}

        <div className={styles.stripRow} aria-hidden="true">
          <span />
          <span className={clsx(styles.stripTrack, styles.axis)}>
            {ticks.map((t) => (
              <span key={t} className={styles.tick} style={{ left: x(t) }}>
                {t}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className={styles.legend}>
        <span>
          <span className={clsx(styles.legendDot, styles.dotMedianStatic)} /> Median
        </span>
        <span>
          <span className={clsx(styles.legendDot, styles.dotTailStatic)} /> p99.9
        </span>
        <span>
          <span className={styles.legendLine} /> Display frame budget
        </span>
      </div>
    </div>
  );
}

/**
 * Tracks an element's content width so SVG charts can draw at real pixel
 * size and keep their text legible on phones.
 *
 * @param {import('react').RefObject<HTMLElement | null>} ref
 */
function useWidth(ref) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.clientWidth));
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

/** An SVG gradient id that is safe inside `url(#…)`. */
function useGradientId() {
  return `rio-gradient-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
}

/** @param {{ id: string, vertical?: boolean }} props */
function HeroGradient({ id, vertical = false }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1={vertical ? 1 : 0} x2={vertical ? 0 : 1} y2="0">
        <stop offset="0%" stopColor="#fb43fe" />
        <stop offset="100%" stopColor="#00dbe5" />
      </linearGradient>
    </defs>
  );
}

/**
 * Hover state for SVG charts: the tooltip follows the pointer inside the
 * chart box.
 */
function useChartTooltip() {
  const [tip, setTip] = useState(
    /** @type {{ x: number, y: number, content: import('react').ReactNode } | null} */ (null),
  );
  /**
   * @param {import('react').MouseEvent} event
   * @param {import('react').ReactNode} content
   */
  const show = (event, content) => {
    const box = /** @type {HTMLElement} */ (event.currentTarget).closest(`.${styles.chart}`);
    if (!box) return;
    const rect = box.getBoundingClientRect();
    setTip({ x: event.clientX - rect.left, y: event.clientY - rect.top, content });
  };
  const hide = () => setTip(null);
  const node = tip && (
    <span
      className={clsx(styles.tooltip, styles.chartTooltip)}
      role="tooltip"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.content}
    </span>
  );
  return { show, hide, node };
}

const RIDGE_AXIS_MAX = 60;

/** @param {number} x @param {number} median @param {number} sigma */
function logNormal(x, median, sigma) {
  const d = Math.log(x) - Math.log(median);
  return Math.exp(-(d * d) / (2 * sigma * sigma)) / (x * sigma * Math.sqrt(2 * Math.PI));
}

/**
 * Ridgeline of keypress latency per terminal, modelled as a log-normal from
 * the median and p99.9. A narrow peak on the left is fast and consistent.
 */
export function LatencyCurves() {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const width = useWidth(ref);
  const gradientId = useGradientId();
  const tooltip = useChartTooltip();

  const labelW = 88;
  const rowH = 34;
  const peak = 52;
  const top = 72;
  const bottom = 26;
  const rows = [...terminals].sort((a, b) => latency[a].p50 - latency[b].p50);
  const height = top + (rows.length - 1) * rowH + bottom + 4;
  /** @param {number} ms */
  const x = (ms) => labelW + (ms / RIDGE_AXIS_MAX) * (width - labelW - 12);
  const ticks = Array.from({ length: RIDGE_AXIS_MAX / 10 + 1 }, (_, i) => i * 10);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            Latency curves <PreviewBadge />
          </div>
          <div className={styles.cardSubtitle}>
            Keypress to pixels in ms · a narrow peak on the left is best
          </div>
        </div>
      </div>

      <div className={styles.chart} ref={ref}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Latency distribution per terminal">
            <HeroGradient id={gradientId} />
            {FRAME_MARKERS.map((m) => (
              <g key={m.label}>
                <line
                  className={styles.frameRule}
                  x1={x(m.ms)}
                  x2={x(m.ms)}
                  y1={14}
                  y2={height - bottom}
                />
                <text className={styles.axisText} x={x(m.ms)} y={6} textAnchor="middle">
                  {m.label}
                </text>
              </g>
            ))}
            {ticks.map((t) => (
              <text key={t} className={styles.axisText} x={x(t)} y={height - 8} textAnchor="middle">
                {t}
              </text>
            ))}
            {/* Back to front, so the fastest curve sits on top. */}
            {[...rows].reverse().map((name) => {
              const i = rows.indexOf(name);
              const hero = name === HERO;
              const { p50, p99 } = latency[name];
              const sigma = Math.log(p99 / p50) / 3.09;
              const base = top + i * rowH;
              const points = [];
              let maxDensity = 0;
              for (let ms = 0.5; ms <= RIDGE_AXIS_MAX; ms += 0.25) {
                const d = logNormal(ms, p50, sigma);
                points.push([ms, d]);
                maxDensity = Math.max(maxDensity, d);
              }
              const curve = points
                .map(([ms, d], k) => `${k ? 'L' : 'M'}${x(ms).toFixed(1)},${(base - (d / maxDensity) * peak).toFixed(1)}`)
                .join('');
              return (
                <g
                  key={name}
                  onMouseMove={(e) =>
                    tooltip.show(
                      e,
                      <>
                        <strong>{name}</strong> · median {format(p50)} ms · p99.9 {format(p99)} ms
                      </>,
                    )
                  }
                  onMouseLeave={tooltip.hide}
                >
                  <path
                    className={hero ? undefined : styles.ridgeOther}
                    d={`${curve}L${x(RIDGE_AXIS_MAX)},${base}L${x(0.5)},${base}Z`}
                    fill={hero ? `url(#${gradientId})` : undefined}
                    fillOpacity={hero ? 0.85 : undefined}
                  />
                  <line className={styles.gridLine} x1={labelW} x2={width - 12} y1={base} y2={base} />
                  <text className={clsx(styles.labelText, hero && styles.labelHero)} x={0} y={base - 8}>
                    {name}
                  </text>
                  <rect x={0} y={base - rowH} width={width} height={rowH} fill="transparent" />
                </g>
              );
            })}
          </svg>
        )}
        {tooltip.node}
      </div>
    </div>
  );
}

const PACING_Y_MAX = 50;

/** Ten seconds of frame times while scrolling, Rio against one other terminal. */
export function FramePacing() {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const width = useWidth(ref);
  const gradientId = useGradientId();
  const [other, setOther] = useState('WezTerm');
  const [hoverIndex, setHoverIndex] = useState(/** @type {number | null} */ (null));
  const tooltip = useChartTooltip();

  const left = 34;
  const right = 64;
  const top = 10;
  const bottom = 26;
  const height = 260;
  const rio = framePacing[HERO];
  const theirs = framePacing[other];
  const last = rio.length - 1;
  /** @param {number} i */
  const x = (i) => left + (i / last) * (width - left - right);
  /** @param {number} ms */
  const y = (ms) => top + (1 - Math.min(ms, PACING_Y_MAX) / PACING_Y_MAX) * (height - top - bottom);
  /** @param {number[]} samples */
  const path = (samples) =>
    samples.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  /** @param {number[]} samples */
  const missed = (samples) => samples.filter((v) => v > 1000 / 60).length;

  /** @param {import('react').MouseEvent<SVGRectElement>} e */
  const onMove = (e) => {
    const svgLeft = /** @type {SVGRectElement} */ (e.currentTarget).ownerSVGElement?.getBoundingClientRect().left ?? 0;
    const i = Math.round(((e.clientX - svgLeft - left) / (width - left - right)) * last);
    const index = Math.max(0, Math.min(last, i));
    setHoverIndex(index);
    tooltip.show(
      e,
      <>
        <span className={styles.tooltipMuted}>{((index / last) * 10).toFixed(2)}s</span>
        <br />
        <strong>Rio</strong> {rio[index].toFixed(1)} ms
        <br />
        {other} {theirs[index].toFixed(1)} ms
      </>,
    );
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            Frame pacing while scrolling <PreviewBadge />
          </div>
          <div className={styles.cardSubtitle}>
            Frame time in ms over ten seconds at 120 Hz · flat and low is best
          </div>
        </div>
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Compare with">
        {terminals
          .filter((n) => n !== HERO)
          .map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={n === other}
              className={clsx(styles.tab, n === other && styles.tabActive)}
              onClick={() => setOther(n)}
            >
              vs {n}
            </button>
          ))}
      </div>

      <div className={styles.chart} ref={ref}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`Frame times, Rio vs ${other}`}>
            <HeroGradient id={gradientId} />
            {[0, 10, 20, 30, 40, 50].map((t) => (
              <g key={t}>
                <line className={styles.gridLine} x1={left} x2={width - right} y1={y(t)} y2={y(t)} />
                <text className={styles.axisText} x={left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
                  {t}
                </text>
              </g>
            ))}
            {[0, 2, 4, 6, 8, 10].map((s) => (
              <text key={s} className={styles.axisText} x={x((s / 10) * last)} y={height - 8} textAnchor="middle">
                {s}s
              </text>
            ))}
            {FRAME_MARKERS.map((m) => (
              <g key={m.label}>
                <line className={styles.frameRule} x1={left} x2={width - right} y1={y(m.ms)} y2={y(m.ms)} />
                <text className={styles.axisText} x={width - right + 6} y={y(m.ms)} dominantBaseline="middle">
                  {m.label}
                </text>
              </g>
            ))}
            <path className={styles.traceOther} d={path(theirs)} />
            <path d={path(rio)} fill="none" stroke={`url(#${gradientId})`} strokeWidth={2} strokeLinejoin="round" />
            {hoverIndex !== null && (
              <line className={styles.crosshair} x1={x(hoverIndex)} x2={x(hoverIndex)} y1={top} y2={height - bottom} />
            )}
            <rect
              x={left}
              y={top}
              width={Math.max(0, width - left - right)}
              height={height - top - bottom}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => {
                setHoverIndex(null);
                tooltip.hide();
              }}
            />
          </svg>
        )}
        {tooltip.node}
      </div>

      <div className={styles.legend}>
        <span>
          <span className={clsx(styles.legendSwatch, styles.legendSwatchHero)} /> Rio · {missed(rio)}{' '}
          frames over 16.7 ms
        </span>
        <span>
          <span className={styles.legendSwatch} /> {other} · {missed(theirs)} frames over 16.7 ms
        </span>
      </div>
    </div>
  );
}

/**
 * @param {import('@site/src/data/benchmarks').Suite} suite
 * @param {string} name
 */
function scoreAgainstBest(suite, name) {
  const values = Object.values(suite.results);
  const best = suite.lowerIsBetter ? Math.min(...values) : Math.max(...values);
  return suite.lowerIsBetter ? best / suite.results[name] : suite.results[name] / best;
}

/** @param {string} name */
function overallScore(name) {
  return suites.reduce((sum, s) => sum + scoreAgainstBest(s, name), 0) / suites.length;
}

/** Every terminal against every suite, shaded by how close each is to the best. */
export function Scoreboard() {
  const [sortBy, setSortBy] = useState('overall');
  const rows = [...terminals].sort((a, b) => {
    if (sortBy === 'overall') return overallScore(b) - overallScore(a);
    const suite = suites.find((s) => s.id === sortBy) ?? suites[0];
    return scoreAgainstBest(suite, b) - scoreAgainstBest(suite, a);
  });
  /** @param {number} score */
  const shade = (score) =>
    `color-mix(in oklab, var(--bench-cyan) ${Math.round(8 + score ** 1.5 * 62)}%, var(--bench-track))`;

  /** @param {{ id: string, children: import('react').ReactNode }} props */
  const SortHeader = ({ id, children }) => (
    <th scope="col" aria-sort={sortBy === id ? 'descending' : 'none'}>
      <button type="button" className={styles.sortButton} onClick={() => setSortBy(id)}>
        {children}
        {sortBy === id && ' ↓'}
      </button>
    </th>
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            Scoreboard <PreviewBadge />
          </div>
          <div className={styles.cardSubtitle}>
            Darker cells are closer to the best result · click a column to sort
          </div>
        </div>
      </div>

      <div className={styles.scoreWrap}>
        <table className={styles.scoreTable}>
          <thead>
            <tr>
              <th scope="col">Terminal</th>
              {suites.map((s) => (
                <SortHeader key={s.id} id={s.id}>
                  {s.label}
                </SortHeader>
              ))}
              <SortHeader id="overall">Overall</SortHeader>
            </tr>
          </thead>
          <tbody>
            {rows.map((name) => (
              <tr key={name} className={clsx(name === HERO && styles.scoreHero)}>
                <th scope="row">{name}</th>
                {suites.map((s) => {
                  const score = scoreAgainstBest(s, name);
                  return (
                    <td
                      key={s.id}
                      style={{ background: shade(score) }}
                      title={`${Math.round(score * 100)}% of best`}
                    >
                      {format(s.results[name])}
                      <span className={styles.scoreUnit}>{s.unit}</span>
                    </td>
                  );
                })}
                <td style={{ background: shade(overallScore(name)) }}>
                  <strong>{Math.round(overallScore(name) * 100)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const HISTORY_REFERENCES = ['Ghostty', 'Kitty', 'Alacritty'];

/** Rio's parser throughput per release, with other terminals as reference lines. */
export function ReleaseHistory() {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const width = useWidth(ref);
  const gradientId = useGradientId();
  const tooltip = useChartTooltip();
  const parser = suites.find((s) => s.id === 'parser') ?? suites[0];

  const left = 40;
  const right = 92;
  const top = 24;
  const bottom = 28;
  const height = 260;
  const yMax = Math.ceil(Math.max(...releaseHistory.map((r) => r.value)) / 60) * 60;
  const last = releaseHistory.length - 1;
  /** @param {number} i */
  const x = (i) => left + (i / last) * (width - left - right);
  /** @param {number} v */
  const y = (v) => top + (1 - v / yMax) * (height - top - bottom);
  const line = releaseHistory.map((r, i) => `${i ? 'L' : 'M'}${x(i)},${y(r.value)}`).join('');
  const everyOther = width < 480;

  // Reference labels that sit close together get nudged apart.
  /** @type {number[]} */
  const placed = [];
  const references = HISTORY_REFERENCES.map((name) => [name, parser.results[name]])
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([name, value]) => {
      let labelY = y(Number(value));
      placed.forEach((p) => {
        if (Math.abs(p - labelY) < 13) labelY = p + 13;
      });
      placed.push(labelY);
      return { name: String(name), value: Number(value), labelY };
    });

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.cardTitle}>
            Faster every release <PreviewBadge />
          </div>
          <div className={styles.cardSubtitle}>
            Parser throughput in MB/s ({parser.tool}) · higher is better
          </div>
        </div>
      </div>

      <div className={styles.chart} ref={ref}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Rio parser throughput by release">
            <HeroGradient id={gradientId} />
            {Array.from({ length: yMax / 60 + 1 }, (_, i) => i * 60).map((t) => (
              <g key={t}>
                <line className={styles.gridLine} x1={left} x2={width - right} y1={y(t)} y2={y(t)} />
                <text className={styles.axisText} x={left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
                  {t}
                </text>
              </g>
            ))}
            {references.map((r) => (
              <g key={r.name}>
                <line className={styles.frameRule} x1={left} x2={width - right} y1={y(r.value)} y2={y(r.value)} />
                <text className={styles.axisText} x={width - right + 6} y={r.labelY} dominantBaseline="middle">
                  {r.name} {format(r.value)}
                </text>
              </g>
            ))}
            <path
              className={styles.historyArea}
              d={`${line}L${x(last)},${y(0)}L${x(0)},${y(0)}Z`}
            />
            <path d={line} fill="none" stroke={`url(#${gradientId})`} strokeWidth={2.5} strokeLinejoin="round" />
            {releaseHistory.map((r, i) => (
              <g
                key={r.version}
                onMouseMove={(e) =>
                  tooltip.show(
                    e,
                    <>
                      <strong>Rio {r.version}</strong> · {format(r.value)} MB/s
                    </>,
                  )
                }
                onMouseLeave={tooltip.hide}
              >
                <circle
                  className={styles.historyDot}
                  cx={x(i)}
                  cy={y(r.value)}
                  r={i === last ? 6 : 4}
                  fill={i === last ? '#00dbe5' : '#fb43fe'}
                />
                {(!everyOther || i % 2 === 0 || i === last) && (
                  <text className={styles.axisText} x={x(i)} y={height - 8} textAnchor="middle">
                    {r.version}
                  </text>
                )}
                <circle cx={x(i)} cy={y(r.value)} r={14} fill="transparent" />
              </g>
            ))}
            <text
              className={clsx(styles.labelText, styles.labelHero)}
              x={x(last) - 10}
              y={y(releaseHistory[last].value) - 14}
              textAnchor="end"
            >
              {format(releaseHistory[last].value)} MB/s
            </text>
          </svg>
        )}
        {tooltip.node}
      </div>
    </div>
  );
}
