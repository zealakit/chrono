# Zealakit Chrono

[English](https://github.com/zealakit/chrono/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

无样式（headless）的日历与日期/时间组件，用于在 Vanilla TypeScript、React、Vue 和 Svelte 中构建完全可定制的排程与日期选择体验。

- **独立的领域** — Calendar、Date、Time 和 DateTime，每个都可单独使用。
- **Core** — 内部共享的日期/时间逻辑内核，打包在每个适配器中，从不单独发布。
- **适配器** — 每个框架一个包，每个包都有根入口和每个领域的子路径。

Chrono 是 UI 基础设施。它只提出变更，例如选中的范围或移动后的事件；它从不持久化、请求数据或应用业务规则，也不附带样式或主题。

> **Note**
> Chrono 是一组专注的 headless 日历视图，后续版本还会加入 Date、Time 和 DateTime 组件。它不附带任何 CSS，也不渲染带样式的标记，视觉完全由你掌控。0.2.0 版本包含日历视图和 Mini Calendar。事件、日期和时间的输入框与面板尚未实现。
>
> Chrono 不是完整的 UI 库或设计系统，也不包含弹出层、overlay 或定位代码。需要弹出层时，请把 Chrono 的面板放进你自己的弹出层中。

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/chrono-core` | 内部内核（已打包，不在 npm 上） | [README](https://github.com/zealakit/chrono/blob/main/packages/core/README_CN.md) |
| `@zealakit/chrono-vanilla` | Vanilla JS / TS — 0.2.0 — 日历视图 | [README](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md) |
| `@zealakit/chrono-react` | React 18 / 19 — 0.2.0 — 日历视图 | [README](https://github.com/zealakit/chrono/blob/main/packages/react/README_CN.md) |
| `@zealakit/chrono-vue` | Vue 3.5+ — 0.2.0 — 日历视图 | [README](https://github.com/zealakit/chrono/blob/main/packages/vue/README_CN.md) |
| `@zealakit/chrono-svelte` | Svelte 5.20+ — 0.2.0 — 日历视图 | [README](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_CN.md) |

为所用框架安装一个适配器，并从根入口或 `/calendar` 这样的领域子路径导入。每个适配器都打包了 `@zealakit/chrono-core`；你从不需要直接安装 core。在 1.0 之前，API 可能在次版本之间变化。

## Installation

```bash
npm i @zealakit/chrono-vanilla
npm i @zealakit/chrono-react
npm i @zealakit/chrono-vue
npm i @zealakit/chrono-svelte

# or yarn, pnpm, ...
```

## Available now

- **日历视图** — 月、周、工作周、日、议程、多月和自定义视图，带导航、标题、周数和键盘支持。
- **Mini Calendar** — 与主日历同步的月历，可标记你选择的日期。

尚未提供：事件、日期和时间的输入框与面板、拖拽与调整大小、资源和重复规则。它们将在后续版本中推出。

## Examples

[`examples/`](https://github.com/zealakit/chrono/blob/main/examples) 目录包含 Vanilla、React、Vue、Svelte 和 Next.js 的集成项目：用纯 CSS 实现的类 Outlook 界面。它们导入已编译的工作区包，所以请先构建。

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Agent Skills

把适合你框架的集成技能添加到 agent 的技能目录中：

- [Chrono React](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) — 组件、受控状态、样式钩子和 Server Component。
- [Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) — 组件、v-model 状态和 Nuxt 说明。
- [Chrono Svelte](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) — 组件、snippet、绑定状态和 SvelteKit 说明。
- [Chrono Vanilla](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) — 控制器、委托监听器和生命周期。

## License

MIT © Zealakit
