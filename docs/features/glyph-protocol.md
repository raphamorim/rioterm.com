---
title: 'Glyph protocol'
language: 'en'
---

Rio is the reference implementation of the [Glyph Protocol](https://github.com/raphamorim/rio/blob/main/specs/glyph-protocol.md), a terminal protocol created by [Raphael Amorim](https://rapha.land) that lets applications ship custom vector glyphs to the terminal at runtime, without requiring the user to install a patched font (Nerd Fonts, Powerline, etc.).

An application registers an outline for a Private Use Area codepoint, then simply prints that codepoint. The terminal rasterizes the registered outline at render time, at any font size, on any display. When the application exits, the registrations expire with the session.

Read the announcement: [Introducing Glyph Protocol for terminals](https://rapha.land/introducing-glyph-protocol-for-terminals).

> Color glyphs (OpenType `COLR`) registered at runtime via Glyph Protocol, rendered in Rio.

![Demo of color glyphs registered via Glyph Protocol](https://rapha.land/assets/images/posts/glyph-protocol-color-banner.png)

## Why

Terminal iconography today depends on out-of-band font distribution: the application picks PUA codepoints, the user installs a multi-megabyte patched font and switches their terminal to it, and the application emits codepoints hoping the mapping is right. If it isn't, the user sees tofu, and the application can't even tell.

Glyph Protocol moves glyph ownership from the font file to the application, and gives applications a way to ask the terminal what it can render before rendering it.

## How it works

Messages ride APC escape sequences (`ESC _ 25a1 ; ... ESC \`) with four verbs:

- **`s`** lists the payload formats the terminal accepts, and doubles as a protocol-detection ping.
- **`q`** asks whether a codepoint is covered by a system font, a registration, both, or nothing.
- **`r`** ships a glyph for a PUA codepoint, with sizing and placement controls.
- **`c`** removes one registration or the whole session glossary.

## Sizing and placement

Registrations describe how the outline maps onto the cell, so the same bytes render correctly at any font size. Every glyph passes through three transforms at render time: **pad** (compute the effective render span), **size** (pick scale factors), **align** (position the scaled outline within the span).

- `width` declares the glyph's render span as 1 (narrow) or 2 (wide) cells. It is honored purely at render time: a wide glyph paints across two cells, but the codepoint's logical width stays at one cell (its `wcwidth`), so cursor advance, wrapping, and selection never desync from width-unaware applications. Authors of wide glyphs emit a trailing space so the overflow lands on an empty cell.
- `aw` and `lh` declare the authored extent (advance width and line height, in `upm` units), so the terminal scales by glyph intent instead of by bounding box.
- `size` picks the scale policy: `height` (default, line-height drives, like regular characters), `advance`, `contain` (fits entirely inside the span), `cover` (fills the span), or `stretch` (each axis independent, useful for box-drawing).
- `align` positions the scaled outline in the span (`start`/`center`/`end` per axis), including `baseline` vertical alignment for character-like glyphs that must sit on the text baseline, with descenders extending below it naturally.
- `pad` insets the render span by fractional amounts on each edge.

Glyphs that must visually align as a set, like spinner frames or progress-bar steps, align automatically when authored with the same extent and placement parameters.

## Payload formats

| Format | Contents |
|--------|----------|
| `glyf` | Monochrome vector outline (the OpenType simple-glyph record), rendered in the current foreground color. Typical icons are 50-400 bytes on the wire. |
| `colrv0` | Layered flat color, via the OpenType `COLR` v0 + `CPAL` tables. |
| `colrv1` | Full color paint graph (gradients, transforms, composites) via OpenType `COLR` v1. |

Every terminal that renders OpenType text already links a `glyf` rasterizer, and terminals that render color emoji already parse `COLR`/`CPAL`. The protocol reuses tables the font stack already decodes.

## Key properties

- **No patched fonts.** Applications carry exactly the icons they use, as bytes 2-4x smaller than the equivalent SVG.
- **Resolution independent.** Glyphs are vector; nothing is re-registered on font size or scale factor changes.
- **Can't touch real text.** Registrations are restricted to the Unicode Private Use Areas, ranges users never type and existing text never contains. The rendered appearance of `a`, `ssh`, or any URL cannot be changed.
- **Honest cell buffer.** Selection, copy, and search always return the codepoint the application emitted, never the rendered glyph.
- **Graceful degradation.** Terminals that don't implement the protocol ignore the messages; applications detect support with a query and fall back.
- **Bounded.** At most 1024 registrations per session, 64 KiB per payload, FIFO eviction. Registrations never leak between tabs, panes, or sessions.

## Try it

The [glyph-protocol-examples](https://github.com/raphamorim/glyph-protocol-examples) repository contains example apps for ratatui, bubbletea v2, and ink that register real Nerd Font outlines and COLR emojis at empty PUA-B slots.

For the full wire format, sizing model, and conformance requirements, see the [specification](https://github.com/raphamorim/rio/blob/main/specs/glyph-protocol.md).
