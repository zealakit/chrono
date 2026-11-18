# Zealakit Chrono

[English](https://github.com/zealakit/chrono/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Headless calendar and date/time components for building fully customizable scheduling and date selection experiences in Vanilla TypeScript, React, Vue, and Svelte.

- **Independent domains** — Calendar, Date, Time and DateTime, each usable on its own.
- **Core** — an internal shared kernel for date/time logic, bundled inside every adapter and never published on its own.
- **Adapters** — one package per framework, each with a root entry and one subpath per domain.

Chrono is UI infrastructure. It proposes changes such as a selected range or a moved event; it never persists, fetches, or applies business rules, and it ships no styles or themes.

> **Note**
> Chrono is a focused, headless set of Calendar views and Date, Time and DateTime components. It ships no CSS and renders no styled markup, so you keep full control of the visuals. Release 0.8.0 adds recurring events as an opt-in pack (RFC 5545 rules, exceptions, overrides and this/following/all apply helpers), resource views and drag-to-edit. One availability model (opening hours, lunch breaks, holidays, lead time) shades the calendar and blocks the same times in every picker. The new `/date` entry adds date inputs and panels; the `/time` entry adds time inputs and panels; the `/datetime` entry composes them.
>
> Chrono is not a full UI library or design system, and it ships no popup, overlay, or positioning code. Put its panels inside your own popup when you need one.

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/chrono-core` | Internal kernel (bundled, not on npm) | [README](https://github.com/zealakit/chrono/blob/main/packages/core/README.md) |
| `@zealakit/chrono-vanilla` | Vanilla JS / TS — 0.8.0 — Calendar views and events | [README](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) |
| `@zealakit/chrono-react` | React 18 / 19 — 0.8.0 — Calendar views and events | [README](https://github.com/zealakit/chrono/blob/main/packages/react/README.md) |
| `@zealakit/chrono-vue` | Vue 3.5+ — 0.8.0 — Calendar views and events | [README](https://github.com/zealakit/chrono/blob/main/packages/vue/README.md) |
| `@zealakit/chrono-svelte` | Svelte 5.20+ — 0.8.0 — Calendar views and events | [README](https://github.com/zealakit/chrono/blob/main/packages/svelte/README.md) |
| `@zealakit/chrono-picker-vanilla` | Vanilla JS / TS — 0.8.0 — Date, time and date-time pickers (optional, needs Overlay) | [README](https://github.com/zealakit/chrono/blob/main/packages/picker-vanilla/README.md) |
| `@zealakit/chrono-picker-react` | React 18 / 19 — 0.8.0 — Date, time and date-time pickers (optional, needs Overlay) | [README](https://github.com/zealakit/chrono/blob/main/packages/picker-react/README.md) |
| `@zealakit/chrono-picker-vue` | Vue 3.5+ — 0.8.0 — Date, time and date-time pickers (optional, needs Overlay) | [README](https://github.com/zealakit/chrono/blob/main/packages/picker-vue/README.md) |
| `@zealakit/chrono-picker-svelte` | Svelte 5.20+ — 0.8.0 — Date, time and date-time pickers (optional, needs Overlay) | [README](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README.md) |

Install one adapter for your framework and import from its root entry or from a domain subpath such as `/calendar`. Each adapter bundles `@zealakit/chrono-core`; you never install core directly. The API may change between minor versions until 1.0.

## Installation

```bash
npm i @zealakit/chrono-vanilla
npm i @zealakit/chrono-react
npm i @zealakit/chrono-vue
npm i @zealakit/chrono-svelte

# or yarn, pnpm, ...
```

## Available now

- **Calendar views** — month, week, work week, day, agenda, multi-month and custom views, with navigation, headers, week numbers and keyboard support.
- **Mini Calendar** — a month calendar that syncs with the main one and marks days of your choice.
- **Events** — layout in every view (month lanes, time-grid columns, the all-day row and the agenda), "+N more" overflow, the now-indicator, keyboard focus on events and range creation.
- **Editing** — drag, drop and resize in the month view, the time grid and the all-day row; Chrono proposes the change and your app saves it.
- **Resource views** — the opt-in `resourceViews` pack: resource time-grids and timelines, groups, collapse and zoom.
- **Recurring events** — the opt-in `recurrence` pack: an RFC 5545 subset, EXDATE/RDATE, overrides, scope-aware apply helpers and server-side expansion.
- **Date inputs and panels** — segmented or text `DateInput` and `DateRangeInput`, `DatePanel`, `DateRangePanel` and `MultiDatePanel`, range presets, hidden form values and keyboard support, with no popup of their own.
- **Time inputs and panels** — segmented or text `TimeInput` and `TimeRangeInput`, columns or slot-list `TimePanel` and `TimeRangePanel`, 12/24-hour, minute steps, overnight ranges and hidden form values, with no date and no popup.
- **Date-time inputs and panels** — `DateTimeInput` and `DateTimeRangeInput`, `DateTimePanel` and `DateTimeRangePanel` that compose the Date and Time parts, with time zones, daylight-saving handling, `disablePast` and one commit rule.
- **Availability** — one `open`/`blocked` rule model with per-resource rules, time zones, lead time, cutoffs and booking windows, shared by calendar backgrounds, selection blocking and every picker.

Not yet: recurrence editing UI, natural-language recurrence descriptions, moving events between resources and the treegrid keyboard model. They arrive in later releases.

## Examples

The [`examples/`](https://github.com/zealakit/chrono/blob/main/examples) folder holds integration projects for Vanilla, React, Vue, Svelte, and Next.js: an Outlook-like shell with plain CSS. They import the compiled workspace packages, so build first.

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Compatibility

**Public API** (from 1.0) is every export of an adapter entry, component props and events, the documented `data-*` attributes and ARIA roles, every `--chrono-*` custom property, the documented keyboard behavior and the value types. Breaking changes only ship in major versions, and renaming or removing a `data-*` attribute or custom property counts as breaking. A deprecation is announced in a minor with a development warning and a README note, and removed in the next major at the earliest. Core internals, `src/shared/`, the file layout inside `dist` and the exact text of development warnings are not public.

**Supported environments:** the last two versions of Chrome, Edge, Firefox and Safari, plus current iOS Safari and Android Chrome. React 18 and 19, Vue 3.5 and later, Svelte 5.

## Agent Skills

Add the integration skill for your framework to your agent's skills directory:

- [Chrono React](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) — Components, controlled state, styling hooks and Server Components.
- [Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) — Components, v-model state and Nuxt notes.
- [Chrono Svelte](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) — Components, snippets, bound state and SvelteKit notes.
- [Chrono Vanilla](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) — Controllers, delegated listeners and lifecycle.

## License

MIT © Zealakit
