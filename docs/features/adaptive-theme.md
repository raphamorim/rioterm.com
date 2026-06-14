---
title: 'Adaptive theme'
language: 'en'
---

### Adaptive theme

Rio supports theming based on the system theme (light and dark). This works on Web, macOS, Windows, and Linux (Wayland and X11, where it follows the XDG Desktop Portal `color-scheme` preference).

```toml
[adaptive-theme]
light = "belafonte-day"
dark = "belafonte-night"
```

Example of usage with MacOS:

![Adaptive theme](/assets/features/adaptive-theme.gif)
