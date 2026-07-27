---
title: 'Rio-VT'
language: 'en'
---

`rio-vt` is Rio's terminal engine as a safe Rust crate: the VT state machine, ANSI/escape parser, grid with scrollback, selection, search, PTY driver, and the sixel / Kitty / iTerm2 image protocols. No rendering, no GPU, no font shaping. If you write Rust, you depend on this directly.

For Swift, C, and anything that speaks C, see [Librio](./librio.md), the same core behind a C ABI.

rio-vt is already used in production, for example at [Lovable](https://lovable.dev).

## Install

```
cargo add rio-vt
```

rio-vt is lean by default: built with no features it pulls in no renderer, GPU, or font-shaping dependencies, it is just the terminal.

## Driving the engine

The core is driven the way a real terminal is: feed it bytes, then pull the grid state back out. No PTY, no renderer, and no threads are required.

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

// Feed raw bytes: SGR red "hello", reset, then " world".
let mut parser = Processor::default();
parser.advance(&mut term, b"\x1b[31mhello\x1b[0m world");

// Pull the visible grid and read the first row.
let rows = term.visible_rows();
let line: String = (0..cols).map(|x| rows[0][Column(x)].c()).collect();
assert!(line.starts_with("hello world"));
```

Because rio-vt never draws anything, you decide what happens with the grid: pair it with any renderer, or none at all.

## Snapshots

Serialize the visible screen back to text or ANSI. This is handy for reconnect snapshots, logs, or feeding terminal state to another process:

```rust
use rio_vt::crosswords::formatter::FormatOptions;

let plain = term.format(FormatOptions::plain()); // plain UTF-8 text
let ansi = term.contents_formatted();            // bytes with escape sequences
```

## Selection and search

```rust
use rio_vt::crosswords::pos::{Column, Line, Pos, Side};
use rio_vt::selection::{Selection, SelectionType};

let mut selection = Selection::new(
    SelectionType::Simple, Pos::new(Line(0), Column(0)), Side::Left,
);
selection.update(Pos::new(Line(0), Column(4)), Side::Right);
term.selection = Some(selection);
assert_eq!(term.selection_to_string().as_deref(), Some("hello"));
```

Regex search over the grid and scrollback lives in `rio_vt::crosswords::search`.

## Images

Sixel, Kitty, and iTerm2 image transmissions are decoded by the core and surfaced through an event, so a frontend records them the way it records anything else, no image-format handling of its own.

## Runnable examples

The crate ships runnable examples covering the common paths:

```
cargo run -p rio-vt --example quickstart
cargo run -p rio-vt --example sixel
cargo run -p rio-vt --example kitty_image
cargo run -p rio-vt --example selection
cargo run -p rio-vt --example resize
```

## Links

- rio-vt on [crates.io](https://crates.io/crates/rio-vt)
- Benchmark against vt100 and alacritty_terminal: [rio-vt-benchmark](https://github.com/raphamorim/rio-vt-benchmark)
- Background and announcement: [rio-vt and librio](/blog/2026/07/27/rio-vt-and-librio)
