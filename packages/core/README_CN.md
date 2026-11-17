# @zealakit/chrono-core

[English](https://github.com/zealakit/chrono/blob/main/packages/core/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/core/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/core/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/cover.svg?raw=true)

Zealakit Chrono 所有适配器共用的内部日历与日期/时间内核。Core 是私有包，从不发布到 npm：每个适配器都打包了自己的副本，因此应用代码使用对应框架的适配器。本文档面向在 monorepo 内工作的贡献者。

Core 不渲染任何内容，不附带 CSS，也没有运行时依赖。

> **Note**
> Chrono 正在开发中，尚无公开 API；目前没有任何包发布到 npm。它将提供相互独立、可组合的 Calendar、Date、Time 和 DateTime 能力，不附带任何 CSS，视觉完全由你掌控。
>
> Chrono 不是完整的 UI 库或设计系统，也不包含弹出层、overlay 或定位代码。需要弹出层时，请把 Chrono 的面板放进你自己的弹出层中。

## Install

```bash
pnpm --filter @zealakit/chrono-core run build
```

Core 不在 npm 上，因此无法安装。它在工作区内构建，并在发布时复制到每个适配器 tarball 的 `dist/vendor/core` 下。

## Public API

尚无公开 API。组件将在后续阶段提供；发布后会在本节列出。

## License

MIT © Zealakit
