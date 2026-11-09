// @ts-check

/**
 * PLACEHOLDER DATA.
 *
 * Every number below is illustrative, picked only to exercise the charts.
 * Replace each suite with real runs (same machine, same day, same window size)
 * before treating any of it as a result. The docs page shows a "preview data"
 * notice while `isPlaceholder` is true.
 */

export const isPlaceholder = true;

export const machine = {
  hardware: 'Apple M-series (TBD)',
  os: 'macOS (TBD)',
  grid: '160×48 cells, default font and config',
  date: 'TBD',
};

/** Order is fixed so a terminal keeps its position in the race and the plots. */
export const terminals = ['Rio', 'Alacritty', 'Ghostty', 'Kitty', 'WezTerm', 'iTerm2'];

/**
 * @typedef {Object} Suite
 * @property {string} id
 * @property {string} label
 * @property {string} title
 * @property {string} unit
 * @property {boolean} lowerIsBetter
 * @property {string} tool
 * @property {string} toolUrl
 * @property {string} description
 * @property {Record<string, number>} results
 */

/** @type {Suite[]} */
export const suites = [
  {
    id: 'plaintext',
    label: 'Plaintext I/O',
    title: 'cat an 11 MB text file',
    unit: 'ms',
    lowerIsBetter: true,
    tool: 'hyperfine',
    toolUrl: 'https://github.com/sharkdp/hyperfine',
    description:
      'Time to drain a large plain-text file through the PTY and onto the screen. The most common "is it fast" check.',
    results: { Rio: 92, Alacritty: 238, Ghostty: 176, Kitty: 184, WezTerm: 1180, iTerm2: 1620 },
  },
  {
    id: 'vtebench',
    label: 'vtebench',
    title: 'vtebench dense_cells',
    unit: 'ms',
    lowerIsBetter: true,
    tool: 'alacritty/vtebench',
    toolUrl: 'https://github.com/alacritty/vtebench',
    description:
      'Alacritty’s PTY read benchmark: every cell rewritten with a new style and glyph each frame.',
    results: { Rio: 6.1, Alacritty: 8.4, Ghostty: 7.2, Kitty: 9.8, WezTerm: 41.3, iTerm2: 58.6 },
  },
  {
    id: 'parser',
    label: 'Parser throughput',
    title: 'kitten __benchmark__ (average)',
    unit: 'MB/s',
    lowerIsBetter: false,
    tool: 'kitty benchmark kitten',
    toolUrl: 'https://sw.kovidgoyal.net/kitty/performance/',
    description:
      'ASCII, Unicode, CSI and image payloads written straight to the tty; the average across the four.',
    results: { Rio: 162, Alacritty: 54, Ghostty: 138, Kitty: 134, WezTerm: 48, iTerm2: 22 },
  },
  {
    id: 'latency',
    label: 'Input latency',
    title: 'Keypress to pixels (median)',
    unit: 'ms',
    lowerIsBetter: true,
    tool: 'Is It Snappy / Typometer',
    toolUrl: 'https://pavelfatin.com/typometer/',
    description:
      'Time from a key event to the glyph appearing on screen. The number you actually feel while typing.',
    results: { Rio: 9.8, Alacritty: 16.7, Ghostty: 14.2, Kitty: 12.3, WezTerm: 30.8, iTerm2: 24.1 },
  },
  {
    id: 'fps',
    label: 'Frame rate',
    title: 'DOOM-fire-zig',
    unit: 'fps',
    lowerIsBetter: false,
    tool: 'DOOM-fire-zig',
    toolUrl: 'https://github.com/const-void/DOOM-fire-zig',
    description:
      'A full-screen 256-color animation that repaints every cell as fast as the terminal accepts it.',
    results: { Rio: 910, Alacritty: 485, Ghostty: 552, Kitty: 616, WezTerm: 164, iTerm2: 120 },
  },
  {
    id: 'memory',
    label: 'Memory',
    title: 'Idle RSS after cold launch',
    unit: 'MB',
    lowerIsBetter: true,
    tool: 'ps / btop',
    toolUrl: 'https://github.com/aristocratos/btop',
    description: 'Resident memory of a single window running the default shell, six seconds after launch.',
    results: { Rio: 68, Alacritty: 75, Ghostty: 128, Kitty: 91, WezTerm: 130, iTerm2: 210 },
  },
];

/**
 * Latency distribution for the strip plot: median and tail, idle and under
 * load (a background `cargo build`), in the style of danluu.com/term-latency.
 *
 * @type {Record<string, {p50: number, p99: number, loadP50: number, loadP99: number}>}
 */
export const latency = {
  Rio: { p50: 9.8, p99: 14.6, loadP50: 11.2, loadP99: 19.8 },
  Alacritty: { p50: 16.7, p99: 22.1, loadP50: 18.4, loadP99: 31.0 },
  Ghostty: { p50: 14.2, p99: 21.5, loadP50: 16.9, loadP99: 29.3 },
  Kitty: { p50: 12.3, p99: 18.9, loadP50: 14.1, loadP99: 26.4 },
  WezTerm: { p50: 30.8, p99: 44.0, loadP50: 35.6, loadP99: 61.2 },
  iTerm2: { p50: 24.1, p99: 38.7, loadP50: 29.9, loadP99: 55.4 },
};

/**
 * Frame times (ms) for ten seconds of scrolling a large log at 120 Hz, 300
 * samples per terminal. Generated from a seeded profile until real traces
 * replace them.
 *
 * @type {Record<string, number[]>}
 */
export const framePacing = (() => {
  /** @type {Record<string, [number, number, number, number]>} base, noise, spike chance, spike ms */
  const profiles = {
    Rio: [8.33, 0.25, 0.004, 11],
    Alacritty: [8.4, 0.9, 0.02, 24],
    Ghostty: [8.4, 0.6, 0.015, 19],
    Kitty: [8.4, 0.7, 0.018, 21],
    WezTerm: [11.5, 3.5, 0.05, 42],
    iTerm2: [15.5, 4.5, 0.06, 46],
  };
  /** @param {number} seed */
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Object.fromEntries(
    Object.entries(profiles).map(([name, [base, noise, spikeChance, spike]], i) => {
      const r = rng(i * 10 + 1);
      const samples = Array.from({ length: 300 }, () => {
        const v = base + (r() - 0.5) * 2 * noise;
        return r() < spikeChance ? spike * (0.7 + r() * 0.3) : Math.max(6.5, v);
      });
      return [name, samples];
    }),
  );
})();

/** Rio's parser throughput (MB/s, kitten __benchmark__ average) per release. */
export const releaseHistory = [
  { version: '0.0.9', value: 38 },
  { version: '0.1.0', value: 52 },
  { version: '0.2.0', value: 70 },
  { version: '0.3.0', value: 88 },
  { version: '0.4.0', value: 110 },
  { version: '0.5.0', value: 140 },
  { version: '0.5.28', value: 162 },
];
