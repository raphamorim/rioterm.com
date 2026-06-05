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
- **`r`** ships a glyph for a PUA codepoint, with sizing and placement controls (`size`, `align`, `pad`, declared `width` of 1 or 2 cells).
- **`c`** removes one registration or the whole session glossary.

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
