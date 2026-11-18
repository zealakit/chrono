# Zealakit Chrono

[English](https://github.com/zealakit/chrono/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

无样式（headless）的日历与日期/时间组件，用于在 Vanilla TypeScript、React、Vue 和 Svelte 中构建完全可定制的排程与日期选择体验。

- **独立的领域** — Calendar、Date、Time 和 DateTime，每个都可单独使用。
- **Core** — 内部共享的日期/时间逻辑内核，打包在每个适配器中，从不单独发布。
- **适配器** — 每个框架一个包，每个包都有根入口和每个领域的子路径。

Chrono 是 UI 基础设施。它只提出变更，例如选中的范围或移动后的事件；它从不持久化、请求数据或应用业务规则，也不附带样式或主题。

> **Note**
> Chrono 是一组专注的 headless 日历视图，也包含 Date、Time 和 DateTime 组件。它不附带任何 CSS，也不渲染带样式的标记，视觉完全由你掌控。0.8.0 版本加入可选包形式的重复事件（RFC 5545 规则、例外、覆盖，以及 this/following/all 应用辅助函数）、资源视图和拖拽编辑。统一可用性模型（营业时间、午休、节假日、提前期）会为日历着色，并在所有选择器中屏蔽相同时间。新的 `/date` 入口加入了日期输入框与面板；`/time` 入口加入了时间输入框与面板；`/datetime` 入口把它们组合起来。
>
> Chrono 不是完整的 UI 库或设计系统，也不包含弹出层、overlay 或定位代码。需要弹出层时，请把 Chrono 的面板放进你自己的弹出层中。

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/chrono-core` | 内部内核（已打包，不在 npm 上） | [README](https://github.com/zealakit/chrono/blob/main/packages/core/README_CN.md) |
| `@zealakit/chrono-vanilla` | Vanilla JS / TS — 0.8.0 — 日历视图与事件 | [README](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md) |
| `@zealakit/chrono-react` | React 18 / 19 — 0.8.0 — 日历视图与事件 | [README](https://github.com/zealakit/chrono/blob/main/packages/react/README_CN.md) |
| `@zealakit/chrono-vue` | Vue 3.5+ — 0.8.0 — 日历视图与事件 | [README](https://github.com/zealakit/chrono/blob/main/packages/vue/README_CN.md) |
| `@zealakit/chrono-svelte` | Svelte 5.20+ — 0.8.0 — 日历视图与事件 | [README](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_CN.md) |

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
- **事件** — 在所有视图中布局（月视图泳道、时间网格列、全天行和议程），"还有 N 个" 溢出提示，当前时间指示线，事件键盘焦点和范围创建。
- **编辑** — 在月视图、时间网格和全天行中拖放与调整大小；Chrono 只提议更改，由你的应用保存。
- **资源视图** — 可选 `resourceViews` 包：资源时间网格与 timeline、分组、折叠和缩放。
- **重复事件** — 可选 `recurrence` 包：RFC 5545 子集、EXDATE/RDATE、覆盖、按范围应用的辅助函数及服务端展开。
- **日期输入框与面板** — 分段或文本形式的 `DateInput` 与 `DateRangeInput`、`DatePanel`、`DateRangePanel` 和 `MultiDatePanel`，范围预设、隐藏表单值和键盘支持，不自带弹出层。
- **时间输入框与面板** — 分段或文本形式的 `TimeInput` 与 `TimeRangeInput`，列式或时段列表的 `TimePanel` 与 `TimeRangePanel`，12/24 小时制、分钟步长、跨夜范围和隐藏表单值，不含日期，也没有弹出层。
- **日期时间输入框与面板** — `DateTimeInput` 与 `DateTimeRangeInput`、`DateTimePanel` 与 `DateTimeRangePanel`，组合 Date 和 Time 部件，支持时区、夏令时处理、`disablePast` 和统一的 commit 规则。

尚未提供：重复事件编辑界面、自然语言重复描述、在资源之间移动事件，以及 treegrid 键盘模型。它们将在后续版本中推出。

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
