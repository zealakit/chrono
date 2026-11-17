# Zealakit Chrono

[English](https://github.com/zealakit/chrono/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg)

Headless calendar and date/time components for building fully customizable scheduling and date selection experiences in Vanilla TypeScript, React, Vue, and Svelte.

- **Independent domains** — Calendar, Date, Time and DateTime, each usable on its own.
- **Core** — an internal shared kernel for date/time logic, bundled inside every adapter and never published on its own.
- **Adapters** — one package per framework, each with a root entry and one subpath per domain.

Chrono is UI infrastructure. It proposes changes such as a selected range or a moved event; it never persists, fetches, or applies business rules, and it ships no styles or themes.

> **Note**
> Chrono is in development and has no public API yet; no package is released to npm. It will provide independent, composable Calendar, Date, Time and DateTime capabilities that ship no CSS, so you keep full control of the visuals.
>
> Chrono is not a full UI library or design system, and it ships no popup, overlay, or positioning code. Put its panels inside your own popup when you need one.

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/chrono-core` | Internal kernel (bundled, not on npm) | [README](https://github.com/zealakit/chrono/blob/main/packages/core/README.md) |
| `@zealakit/chrono-vanilla` | Vanilla JS / TS — In development | [README](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) |
| `@zealakit/chrono-react` | React 18 / 19 — In development | [README](https://github.com/zealakit/chrono/blob/main/packages/react/README.md) |
| `@zealakit/chrono-vue` | Vue 3.5+ — In development | [README](https://github.com/zealakit/chrono/blob/main/packages/vue/README.md) |
| `@zealakit/chrono-svelte` | Svelte 5 — In development | [README](https://github.com/zealakit/chrono/blob/main/packages/svelte/README.md) |

No package is released yet. Once released, you install one adapter for your framework and import from its root entry or from a domain subpath: `/calendar`, `/date`, `/time`, or `/datetime`. Each adapter bundles `@zealakit/chrono-core`; you never install core directly.

## Examples

The [`examples/`](https://github.com/zealakit/chrono/blob/main/examples) folder holds integration projects for Vanilla, React, Vue, Svelte, and Next.js. They import the compiled workspace packages, so build first.

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Agent Skills

Integration skills for agents are published here as each framework gains components:

- [Chrono React](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) — not yet available.
- [Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) — not yet available.
- [Chrono Svelte](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) — not yet available.
- [Chrono Vanilla](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) — not yet available.

## License

MIT © Zealakit
