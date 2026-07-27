---
title: 'Librio'
language: 'en'
---

`librio` is Rio's terminal engine ([Rio-VT](./rio-vt.md)) exposed as a C ABI for Swift, C, and anything that speaks C. All the `unsafe` lives here; rio-vt itself stays safe Rust.

## Usage

Create an engine, create a surface (which spawns a PTY under the hood), write to it, and pull a render state that tells you which rows changed and what each cell holds.

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

The dirty-row render state is what makes CPU rendering practical: a consumer repaints only the cells the terminal says changed, without reimplementing a single escape sequence. Every `extern "C"` entry point is wrapped in `catch_unwind`, so a Rust panic never unwinds into C.

## Distribution

librio is not published to crates.io. It lives in the Rio source tree and ships as static artifacts attached to each GitHub release:

- `RioKit.xcframework` for Swift (static lib, curated header, and a `module.modulemap` exposing `module RioKit`).
- a bare `librio.a` and `librio.h` for C.

The same C ABI builds and runs on macOS, Linux, and Windows (ConPTY on Windows). On Linux and Windows you build the static library from the Rio source:

```
cargo build -p librio --release
```

If you write Rust, depend on [Rio-VT](./rio-vt.md) directly rather than librio; librio is the C boundary for everyone else.

## Links

- Benchmark against vt100 and alacritty_terminal: [rio-vt-benchmark](https://github.com/raphamorim/rio-vt-benchmark)
- Background and announcement: [rio-vt and librio](/blog/2026/07/27/rio-vt-and-librio)
