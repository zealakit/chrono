# @zealakit/chrono-core

[English](https://github.com/zealakit/chrono/blob/main/packages/core/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/core/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/core/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/cover.svg?raw=true)

Internal calendar and date/time kernel for every Zealakit Chrono adapter. Core is private and never published to npm: every adapter bundles its own copy, so application code uses the adapter for its framework. This reference is for contributors working inside the monorepo.

Core renders nothing, ships no CSS, and has no runtime dependencies.

> **Note**
> Chrono is in development and has no public API yet; no package is released to npm. It will provide independent, composable Calendar, Date, Time and DateTime capabilities that ship no CSS, so you keep full control of the visuals.
>
> Chrono is not a full UI library or design system, and it ships no popup, overlay, or positioning code. Put its panels inside your own popup when you need one.

## Install

```bash
pnpm --filter @zealakit/chrono-core run build
```

Core is not on npm, so it cannot be installed. It is built inside the workspace and, at release time, copied into each adapter tarball under `dist/vendor/core`.

## Public API

No public API yet. Components arrive in later stages; this section lists them once they ship.

## License

MIT © Zealakit
