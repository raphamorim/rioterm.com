---
layout: post
title: "riotermjs: Rio's terminal engine, now on the web"
date: 2026-08-10 09:00
description: "Rio's Rust VT engine compiled to WebAssembly, published as rioterm on npm. Faster than xterm.js on every metric we measured, and already running inside Lovable."
categories: web wasm
authors: raphamorim
---

Hey folks!

Two weeks ago I wrote about [splitting Rio's engine into rio-vt and librio](/blog/2026/07/27/rio-vt-and-librio). The whole point of that split was that the engine, the part that took years to get right, should be embeddable anywhere. Today "anywhere" includes your browser.

[riotermjs](https://github.com/raphamorim/riotermjs) is Rio's terminal for the web: the same Rust VT core the desktop app ships, compiled to WebAssembly, wrapped in an xterm.js-shaped API, published on npm as `rioterm` (0.1.4).

```sh
npm i rioterm --save
```

<!-- truncate -->

## Not a reimplementation

Every terminal on the web today reimplements the terminal in JavaScript. riotermjs does not. The parser, the grid, scrollback, selection, kitty keyboard protocol, bracketed paste, OSC 8 hyperlinks, all of it is `librio`, the exact code paths Rio runs on macOS and Linux, executing as wasm.

There is no PTY in a browser, so the engine hands you the transport instead. The whole integration surface is two directions of bytes:

```js
import { open } from 'rioterm';

const { terminal } = await open(document.getElementById('term'), {
  renderer: 'canvas', // or 'dom'
});

// bytes the terminal wants delivered to the child
terminal.onData((bytes) => socket.send(bytes));
// child output to display
socket.onmessage = (e) => terminal.write(new Uint8Array(e.data));
```

Wire those two lines to a WebSocket bridging a real shell, or to anything else that speaks bytes. The [demo site](https://riotermjs.pages.dev) plugs them into a whole Linux virtual machine ([v86](https://github.com/copy/v86) restoring a pre-booted snapshot) and into a real bash running under [WASIX](https://wasmer.io/posts/announcing-wasix). Client-side only, no server anywhere.

You pick the renderer per instance: a canvas painter or DOM rows of styled spans, with identical input, selection, and clipboard behavior. There is also a React wrapper, published as `react-rioterm`, and a fully headless mode if you bring your own renderer or want to run the engine in Node for tests.

## The numbers

Byte-identical workloads, fixed 120x40 grid, medians of three runs in Chrome on Apple Silicon: xterm.js with its WebGL addon (its fastest renderer), and [wterm](https://github.com/vercel-labs/wterm) with its DOM renderer, run on both of its VT cores, the default Zig core and the libghostty core. The benchmark suite lives in the repo under [`benchmark/`](https://github.com/raphamorim/riotermjs/tree/main/benchmark), so run your own.

![rioterm vs xterm.js vs wterm benchmark: rioterm leads every measured throughput metric](/assets/rioterm-vs-xterm.png)

| Metric | xterm.js (webgl) | rioterm 0.1.4 (canvas) | rioterm 0.1.4 (dom) | wterm 0.3.2 (zig) | wterm 0.3.2 (ghostty) |
| --- | --- | --- | --- | --- | --- |
| Cold init | 33.7 ms | 18.6 ms | 19.6 ms | 17.0 ms | 12.1 ms |
| Plain text, parse and paint | 178 MB/s | 576 MB/s | 501 MB/s | 51 MB/s | 1.6 MB/s |
| ANSI colors, parse and paint | 108 MB/s | 251 MB/s | 247 MB/s | 136 MB/s | 1.2 MB/s |
| VT parsing, plain (headless) | 167 MB/s | 1105 MB/s | 1105 MB/s | 50 MB/s | 1 MB/s |
| VT parsing, ANSI (headless) | 103 MB/s | 231 MB/s | 231 MB/s | 140 MB/s | 1 MB/s |
| Full-screen TUI redraw | 120 fps (capped) | 120 fps (capped) | 120 fps (capped) | 120 fps (capped) | 120 fps † |
| Frame time p95, TUI redraw | 10.0 ms | 8.5 ms | 8.5 ms | 9.0 ms | 9.0 ms † |

Both rioterm renderers are the same wasm engine, so the headless rows are identical; the renderer choice only moves paint-side numbers, and the DOM renderer posts the tightest frame times, a nice property for something that doubles as the accessibility-friendly option. wterm is interesting to include twice: the same DOM renderer on its two VT cores. Its minimal Zig core is fast to start and holds a real ANSI number; its libghostty core is the real Ghostty VT parser, vendored from source, but the published wasm build is size-first — Zig `ReleaseSmall` with SIMD switched off — so the scalar fallback runs and it parses at 1-2 MB/s, two-plus orders of magnitude behind everything else, unable to keep up with real output. Worth being precise there: that is the shipped npm build, not a debug build and not Ghostty's native speed, which is `ReleaseFast` with SIMD and an entirely different story; I include it because it is the only way to run wterm on libghostty today. Against rioterm, nothing led on throughput; wterm's Zig core came closest on frame p95, half a millisecond behind, where all engines are display-capped anyway.

† The frame scenarios write only a few KB per frame, which fits the budget even at 1-2 MB/s, so the libghostty core looks fine on these two rows. It is not: it is throughput-bound (the rows above), and under real terminal output those frames would blow the budget. Read those two cells as "not measured against its bottleneck," not as a pass.

Honest caveats are in the benchmark README: rioterm's grid lives in wasm linear memory that JS heap numbers don't count, and the two engines have different write-path designs (xterm queues asynchronously, rioterm parses synchronously), so the runs measure submit-to-parsed-and-painted for both.

Chasing these numbers also made the engine itself faster. Profiling the ANSI-heavy path found that SGR attributes were round-tripping the style intern table once per attribute; they now mutate a pending style that interns once per cell write, and intern verification became a single 128-bit compare. Those wins shipped back to `rio-vt`, so the desktop Rio benefits from the web port too.

## Tested where it runs

One nice property of an engine with no DOM in it: the test suite runs the real wasm headless in Node. Over a hundred tests cover the things terminals actually get wrong: wide-character cells, erase semantics, scrollback anchoring, reflow on resize, the kitty keyboard protocol, mouse report encodings, bracketed paste gating, OSC 52 clipboard, wrapped OSC 8 hyperlinks, and the exact packed-cell format renderers consume. No browser automation, no flaky screenshots, just bytes in and state out.

## Reconnect and search, built in

The two addons every cloud IDE reaches for first are part of the core. `terminal.serialize()` dumps scrollback plus screen as a VT stream with styling and OSC 8 hyperlinks preserved; write it into a fresh terminal on reconnect and the user keeps their buffer exactly as they left it. `terminal.search()` runs regex over the whole buffer inside the engine, and `findNext()`/`findPrevious()` cycle through matches, select them so the renderer highlights them, and scroll them into view. No addon wiring, no second copy of the buffer in JavaScript.

## Running in production at Lovable

This is not a demo project. At [Lovable](https://lovable.dev) we replaced xterm.js with rioterm for the internal terminal that powers admin access to preview sandboxes: multi-tab sessions over a WebSocket transport, with observer mode, session replay, and mobile touch support. The swap kept the existing component contract, deleted the xterm dependency entirely, and the parts that used to need xterm internals (touch scrolling, application cursor detection, bracketed paste) now sit on engine APIs that behave the same way the desktop Rio does.

## Where this goes

The web target is now a first-class citizen of the Rio engine family: `rio-vt` for Rust, `librio` for C ABI consumers, `rioterm` for the web. One engine, one set of protocol behaviors, three ways in.

Try the live demo at [riotermjs.pages.dev](https://riotermjs.pages.dev), star the [repo](https://github.com/raphamorim/riotermjs) if this is useful to you, and file issues for whatever you hit. The engine is the same one Rio users have been hammering for years, but the web wrapper is young (0.1.4) and moving fast.

All the best,

Raphael.
