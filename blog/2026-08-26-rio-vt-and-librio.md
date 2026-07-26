---
layout: post
title: "rio-vt and librio: Rio's terminal engine, now embeddable"
date: 2026-08-26 12:00
description: "Rio's terminal core is now a standalone, dependency-light engine you can embed anywhere: rio-vt as a safe Rust crate, librio as a C ABI, and canario as the native app built on top."
categories: macos linux windows
authors: raphamorim
---

Hey folks!

For a while now Rio's terminal core has been tangled up with its renderer, its config, and the app around it. That made it hard for anyone (including me) to reuse the parts that took years to get right: the VT state machine, the grid, scrollback, selection, search, and the image protocols.

With Rio 0.5 that changes. The engine is now split into clean, embeddable layers, and I want to walk you through them: **rio-vt**, **librio**, and the native app I've been building on top, **canario**.

<!-- truncate -->

## Two layers

The idea is simple. Most projects that want a terminal don't want a whole terminal app, they want the *engine*. So the engine now ships as two layers you can pick from:

- **`rio-vt`** is a safe Rust crate. The VT state machine, ANSI/escape parser, grid with scrollback, selection, search, PTY driver, and the sixel / Kitty / iTerm2 image protocols. No rendering, no GPU, no font shaping. If you write Rust, you depend on this directly. Think of it as a modern alternative to `alacritty_terminal`.
- **`librio`** is the same core behind a C ABI, in the spirit of [libghostty](https://ghostty.org). If you're writing Swift, C, Go, Python, or anything that speaks C, you link this. All the `unsafe` lives here; `rio-vt` itself stays safe Rust.

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

The crate ships runnable versions of all of these (`quickstart`, `sixel`, `kitty_image`, `selection`, `resize`):

```bash
cargo run -p rio-vt --example kitty_image
```

## librio: the same core, from any language

`librio` wraps that engine in a small C ABI: create an engine, create a surface (which spawns a PTY under the hood), write to it, and pull a render state that tells you which rows changed and what each cell holds.

```c
#include "librio-vt.h"

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

That's the exact surface Swift consumes in canario, cell for cell.

## canario: a native app on librio

To prove the engine really is self-contained, I've been building **canario** (the project I previously teased as *Super Rio*), a fully native macOS frontend written in SwiftUI. It's driven entirely by `librio` through that C ABI, and does all of its drawing on the Swift side with CPU rendering, no GPU renderer from Rio involved at all. Rio's Rust frontend and canario's Swift frontend now run the *same* terminal core, one via the crate, one via the C boundary.

The dirty-row render state above is exactly what makes CPU rendering practical: canario only repaints the cells the terminal says changed, so the Swift side stays cheap without reimplementing a single escape sequence.

## Already in production

This isn't a science project. **`rio-vt` is already running in production at [Lovable](https://lovable.dev)**, powering real terminal workloads. Extracting the core into its own crate wasn't just cleanup, it was so other products could build on the same engine Rio ships.

## rio-vt vs. vt100

The closest thing in the Rust ecosystem is [`vt100`](https://crates.io/crates/vt100), doy's excellent parser. It's worth being clear about how they differ, because they aim at different problems.

`vt100` is a **parser and screen model**: you feed it bytes and read back a screen with cells, colors, and a cursor. It's minimal, well-documented, and ideal for scraping or asserting on terminal output (multiplexers, tests, automation).

`rio-vt` is a **complete terminal engine**: the parser is one piece, alongside a PTY driver, scrollback, selection, search, image protocols, damage tracking, and a C ABI, all of it battle-tested by shipping in Rio.

| | `vt100` | `rio-vt` |
| --- | --- | --- |
| Role | ANSI parser + screen model | full terminal engine |
| Parse ANSI / VT | ✅ | ✅ |
| PTY driver | ❌ (bring your own) | ✅ (built in) |
| Scrollback | ❌ | ✅ |
| Reflow on resize | ❌ | ✅ |
| Selection | ❌ | ✅ |
| Regex search | ❌ | ✅ |
| Sixel / Kitty / iTerm2 images | ❌ | ✅ |
| Damage model | screen diff | per-row dirty + pull API |
| Mouse | ✅ | ✅ |
| Colors & attributes | ✅ | ✅ (palette + truecolor) |
| C ABI for other languages | ❌ | ✅ (`librio`) |
| Dependency footprint | very small | larger (a real terminal) |
| License | MIT | MIT |

If you want the smallest possible thing that turns bytes into a screen, `vt100` is a great pick and I'd genuinely recommend it. If you want the engine a real terminal runs on, PTY and images and selection included, without wiring five crates together, that's `rio-vt`.

## Where this is going

- `rio-vt` and `librio` are versioned alongside Rio (0.5) and will be published so anyone can depend on them.
- The C header ships with the library; a universal xcframework makes the Swift path a drop-in.
- canario is the flagship consumer today, but the whole point is that it doesn't have to be the only one.

If you've ever wanted to embed a real terminal, in a Rust app, a native macOS app, or something exotic behind the C ABI, this is for you. And if you build something on it, I'd love to hear about it.

As always, happy hacking!
