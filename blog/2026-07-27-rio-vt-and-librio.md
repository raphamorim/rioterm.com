---
layout: post
title: "rio-vt and librio: Rio's terminal engine, now embeddable"
date: 2026-07-27 18:32
description: "Rio's terminal core is now a standalone, dependency-light engine you can embed anywhere: rio-vt as a safe Rust crate and librio as a C ABI."
categories: macos linux windows
authors: raphamorim
---

Hey folks!

For a while now Rio's terminal core has been tangled up with its renderer, its config, and the app around it. That made it hard for anyone (including me) to reuse the parts that took years to get right: the VT state machine, the grid, scrollback, selection, search, and the image protocols.

With Rio 0.5 that changes. The engine is now split into clean, embeddable layers, and I want to walk you through them: **rio-vt** and **librio**.

<!-- truncate -->

## Two layers

The idea is simple. Most projects that want a terminal don't want a whole terminal app, they want the *engine*. So the engine now ships as two layers you can pick from:

- **`rio-vt`** is a safe Rust crate. The VT state machine, ANSI/escape parser, grid with scrollback, selection, search, PTY driver, and the sixel / Kitty / iTerm2 image protocols. No rendering, no GPU, no font shaping. If you write Rust, you depend on this directly. Think of it as a modern alternative to `alacritty_terminal`.
- **`librio`** is the same core behind a C ABI, in the spirit of [libghostty](https://ghostty.org). If you're writing Swift, C, Go, Python, or anything that speaks C, you link this: it ships as a prebuilt static library, no Rust toolchain required. All the `unsafe` lives here and `rio-vt` itself stays safe Rust.

Both are lean by default. Building `rio-vt` with no features pulls in **no** renderer, GPU, or font-shaping dependencies, it's just the terminal.

## rio-vt in practice

The core is driven the way a real terminal is: feed it bytes, then pull the grid state back out. Here's the whole loop, no PTY, no renderer, no threads:

```rust
use rio_vt::ansi::CursorShape;
use rio_vt::crosswords::grid::Dimensions;
use rio_vt::crosswords::pos::Column;
use rio_vt::crosswords::{Crosswords, CrosswordsSize};
use rio_vt::event::{VoidListener, WindowId};
use rio_vt::performer::handler::Processor;

// An 80x24 terminal with 10k lines of scrollback.
let size = CrosswordsSize::new(80, 24);
let cols = size.columns();
let mut term = Crosswords::new(
    size, CursorShape::Block, VoidListener, WindowId::from(0), 0, 10_000,
);

// Feed raw PTY bytes: SGR red "hello", reset, then " world".
let mut parser = Processor::default();
parser.advance(&mut term, b"\x1b[31mhello\x1b[0m world");

// Pull the visible grid and read the first row.
let rows = term.visible_rows();
let line: String = (0..cols).map(|x| rows[0][Column(x)].c()).collect();
assert!(line.starts_with("hello world"));
```

That "pull the grid back out" model is the whole point: `rio-vt` never draws anything, so you can pair it with any renderer, or none at all.

### Selection and search come for free

```rust
use rio_vt::crosswords::pos::{Column, Line, Pos, Side};
use rio_vt::selection::{Selection, SelectionType};

let mut selection = Selection::new(
    SelectionType::Simple, Pos::new(Line(0), Column(0)), Side::Left,
);
selection.update(Pos::new(Line(0), Column(4)), Side::Right);
term.selection = Some(selection);

assert_eq!(term.selection_to_string().as_deref(), Some("hello")); // columns 0..=4
```

### Images, too

Sixel, Kitty, and iTerm2 image transmissions are decoded by the core and surfaced through an event, so a frontend records them the way it records anything else. Here's a Kitty graphics-protocol transmission captured headless:

```rust
impl EventListener for ImageSink {
    fn event(&self) -> (Option<RioEvent>, bool) { (None, false) }
    fn send_event(&self, event: RioEvent, _: WindowId) {
        if let RioEvent::UpdateGraphics { queues, .. } = event {
            for (id, g) in &queues.pending_images {
                // id, g.width, g.height, g.pixels (RGBA) ...
            }
        }
    }
}

// f=32 RGBA, 2x2 px, a=T transmit+display, base64 pixels:
parser.advance(&mut term, b"\x1b_Gf=32,s=2,v=2,a=T;/wAA//8AAP//AAD//wAA/w==\x1b\\");
// -> kitty image: id=..., 2x2px, 16 rgba bytes
```

## librio: the same core, from any language

`librio` wraps that engine in a small C ABI: create an engine, create a surface (which spawns a PTY under the hood), write to it, and pull a render state that tells you which rows changed and what each cell holds.

```c
#include "librio.h"

rio_engine_t  *engine  = rio_engine_new(&config);
rio_surface_t *surface = rio_surface_new(engine, &desc);

// Send input to the shell.
rio_surface_text(surface, "ls -la\n", 7);

// Pull only the rows that changed and draw them.
rio_render_state_t *state = rio_render_state_new(surface);
rio_render_state_update(state);

for (uint16_t line = 0; line < rio_render_state_lines(state); line++) {
    if (!rio_render_state_row_dirty(state, line)) continue;
    for (uint16_t col = 0; col < rio_render_state_columns(state); col++) {
        rio_cell_s cell = rio_render_state_cell(state, line, col);
        // hand `cell` to your own renderer...
    }
}
rio_render_state_reset_dirty(state);
```

That's the exact surface a native Swift or C frontend consumes, cell for cell. The dirty-row render state is what makes CPU rendering practical: a consumer only repaints the cells the terminal says changed, without reimplementing a single escape sequence.

## Already in production

This isn't a science project. **`rio-vt` is already used in production by companies like [Lovable](https://lovable.dev)**, powering real terminal workloads. Extracting the core into its own crate wasn't just cleanup, it was so other products could build on the same engine Rio ships.

## How it performs

I keep a standalone benchmark, [rio-vt-benchmark](https://github.com/raphamorim/rio-vt-benchmark), that pits `rio-vt` against [`vt100`](https://crates.io/crates/vt100) (doy's excellent parser) and [`alacritty_terminal`](https://crates.io/crates/alacritty_terminal) on the same workloads: parse a byte stream, serialize a filled screen, and resize one, all at a fixed 80x24. The numbers below are Criterion medians on an Apple Silicon Mac (rio-vt 0.5, vt100 0.15, alacritty_terminal 0.26). They depend on the CPU and the input, so run it yourself.

**Parsing** a byte stream into the screen (throughput, higher is better):

| Workload | rio-vt | vt100 | alacritty | winner |
| --- | --- | --- | --- | --- |
| mixed | 302 MiB/s | 221 MiB/s | 254 MiB/s | rio-vt |
| ascii_plain | 835 MiB/s | 196 MiB/s | 279 MiB/s | rio-vt 3.0× |
| sgr_churn | 235 MiB/s | 349 MiB/s | 332 MiB/s | vt100 |
| scroll_storm | 274 MiB/s | 101 MiB/s | 266 MiB/s | rio-vt |
| alt_screen_redraw | 588 MiB/s | 231 MiB/s | 282 MiB/s | rio-vt 2.1× |
| unicode_wide | 248 MiB/s | 203 MiB/s | 337 MiB/s | alacritty |

**Serializing** the filled screen back out (lower is better; only rio-vt and vt100 expose a screen dump):

| Operation | rio-vt | vt100 | winner |
| --- | --- | --- | --- |
| contents_formatted (ANSI) | 4.3 µs | 18.6 µs | rio-vt 4.3× |
| contents_plain (text) | 3.8 µs | 13.9 µs | rio-vt 3.7× |

**Resizing** 80x24 to 100x40 and back (lower is better):

| Operation | rio-vt | vt100 | alacritty | winner |
| --- | --- | --- | --- | --- |
| resize | 5.0 µs | 7.5 µs | 227 µs | rio-vt |

rio-vt parses faster on most shapes, and by a wide margin when the work is plain glyphs (`ascii_plain`) or full-screen repaints (`alt_screen_redraw`). It serializes a screen several times faster, and resizes far quicker than either, while still reflowing wrapped lines (vt100 skips reflow, so it clips content on shrink, alacritty reflows but is two orders of magnitude slower here).

It's not a clean sweep: vt100 takes `sgr_churn`, where rio-vt's per-cell style interning costs more than a plain per-cell style, and alacritty takes `unicode_wide`. Different engines, different trade-offs, which is exactly why the benchmark is public.

## Where this is going

- `rio-vt` is on crates.io, versioned alongside Rio (0.5), so any Rust project can depend on it today.
- `librio` isn't a crate you install: each GitHub release carries a `RioKit.xcframework` for Swift, plus the bare `librio.a` + `librio.h` for C, so the Swift/C path is a drop-in with no Rust toolchain.
- WebAssembly support.

If you've ever wanted to embed a real terminal, in a Rust app, a native macOS app, or something different behind the C ABI, this is for you. And if you build something on it, I'd love to hear about it.

That being said. Thanks for following and using Rio!

All the best,

Raphael.
