# Zealakit Chrono

[English](https://github.com/zealakit/chrono/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/cover.svg?raw=true)

无样式（headless）的日历与日期/时间组件，用于在 Vanilla TypeScript、React、Vue 和 Svelte 中构建完全可定制的排程与日期选择体验。

- **独立的领域** — Calendar、Date、Time 和 DateTime，每个都可单独使用。
- **Core** — 内部共享的日期/时间逻辑内核，打包在每个适配器中，从不单独发布。
- **适配器** — 每个框架一个包，每个包都有根入口和每个领域的子路径。

Chrono 是 UI 基础设施。它只提出变更，例如选中的范围或移动后的事件；它从不持久化、请求数据或应用业务规则，也不附带样式或主题。

> **Note**
> Chrono 正在开发中，尚无公开 API；目前没有任何包发布到 npm。它将提供相互独立、可组合的 Calendar、Date、Time 和 DateTime 能力，不附带任何 CSS，视觉完全由你掌控。
>
> Chrono 不是完整的 UI 库或设计系统，也不包含弹出层、overlay 或定位代码。需要弹出层时，请把 Chrono 的面板放进你自己的弹出层中。

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/chrono-core` | 内部内核（已打包，不在 npm 上） | [README](https://github.com/zealakit/chrono/blob/main/packages/core/README_CN.md) |
| `@zealakit/chrono-vanilla` | Vanilla JS / TS — 开发中 | [README](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md) |
| `@zealakit/chrono-react` | React 18 / 19 — 开发中 | [README](https://github.com/zealakit/chrono/blob/main/packages/react/README_CN.md) |
| `@zealakit/chrono-vue` | Vue 3.5+ — 开发中 | [README](https://github.com/zealakit/chrono/blob/main/packages/vue/README_CN.md) |
| `@zealakit/chrono-svelte` | Svelte 5 — 开发中 | [README](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_CN.md) |

目前还没有发布任何包。发布后，你只需为所用框架安装一个适配器，并从根入口或领域子路径导入：`/calendar`、`/date`、`/time` 或 `/datetime`。每个适配器都打包了 `@zealakit/chrono-core`；你从不需要直接安装 core。

## Examples

[`examples/`](https://github.com/zealakit/chrono/blob/main/examples) 目录包含 Vanilla、React、Vue、Svelte 和 Next.js 的集成项目。它们导入已编译的工作区包，所以请先构建。

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Agent Skills

随着各框架获得组件，面向 agent 的集成技能会在这里发布：

- [Chrono React](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) — 暂不可用。
- [Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) — 暂不可用。
- [Chrono Svelte](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) — 暂不可用。
- [Chrono Vanilla](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) — 暂不可用。

## License

MIT © Zealakit
