# @zealakit/chrono-picker-svelte

[English](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

面向 Svelte 的现成日期、时间和日期时间选择器（含范围版本）：为你组合好 Chrono 输入框、Overlay 弹出层和 Chrono 面板。视觉样式由你负责。

选择器不附带 CSS，也不设置视觉样式。各部件渲染你自己的元素和 class；状态通过 `data-*` 和 ARIA 属性暴露。它只使用 Chrono 和 Overlay 的公开 API，因此你随时可以自己组合出同样的东西。

1.0 之前：API 可能在次版本之间变化。

> **Note**
> 本包是可选的。它组合 `@zealakit/chrono-svelte` 和 `@zealakit/overlay-svelte`，并且是唯一与 Overlay 配合的 Chrono 包。core 和四个适配器从不依赖 Overlay。
>
> Chrono 不是完整的 UI 库或设计系统。若使用其他弹出层库，请自行组合 Chrono 的输入框和面板。

## Install

```bash
npm install @zealakit/chrono-svelte @zealakit/overlay-svelte @zealakit/chrono-picker-svelte
```

Peer dependencies: `@zealakit/chrono-svelte`, `@zealakit/overlay-svelte`, `svelte`. 两个 peer 都是必需的；版本由应用选择，并与应用自己的弹出层和对话框共用同一份。

## Picker

### Quick start

把输入框、触发按钮和弹出层放进同一个 root。root 持有值和打开状态，各部件只读取它们。

```svelte
<script lang="ts">
  import {
    DatePickerContent,
    DatePickerInput,
    DatePickerRoot,
    DatePickerTrigger,
  } from "@zealakit/chrono-picker-svelte";
  let value = $state(null);
</script>

<DatePickerRoot bind:value>
  <DatePickerInput />
  <DatePickerTrigger>Open</DatePickerTrigger>
  <DatePickerContent />
</DatePickerRoot>
```

### Parts

每个选择器都有相同的五个部件，props 与其包装的部件相同。日期、时间和日期时间各有单值和范围两种选择器。

| Part | 包装 | 说明 |
| --- | --- | --- |
| `Root` | state | 值和打开状态，以及输入框与面板共享的选项（`locale`、`timeZone`、`min`、`max`、`disabled`、`readOnly`、`now`）。 |
| `Input` | Chrono 输入框 | 输入框。`Alt+ArrowDown` 打开弹出层；输入字符从不打开。 |
| `Trigger` | Overlay 触发器 | 带有 `aria-haspopup="dialog"` 和 `aria-expanded` 的按钮。 |
| `Content` | Overlay 弹出层 | `role="dialog"`，带无障碍名称；容纳面板。 |
| `Panel` | Chrono 面板 | 打开时获得焦点；选择后提交并关闭。 |

部件是具名导出（`DatePickerRoot`、`DatePickerInput` 等）。弹出层 props（`placement`、`offset`、`portal`、`animation`）放在 root 上并传给 Overlay，它相对触发器定位。

### Components

`DatePicker`、`DateRangePicker`、`TimePicker`、`TimeRangePicker`、`DateTimePicker` 和 `DateTimeRangePicker`。

### Root options

值相关的选项原样传给 Chrono；打开相关的选项传给 Overlay。

| Option | 类型 | 说明 |
| --- | --- | --- |
| `value`, `defaultValue` | Chrono 的值 | 受控或非受控；`null` 是真实的值。 |
| `onValueChange` | `(value) => void` | 每次变化，包括未完成的范围。 |
| `onValueCommit` | `(value) => void` | 一次选择已完成；弹出层随后关闭。 |
| `open`, `defaultOpen` | `boolean` | 受控或非受控的可见性。 |
| `onOpenChange` | `(open, reason) => void` | `reason` 为 `trigger`、`input-key`、`outside-press`、`escape` 或 `commit`。 |

### Behavior

打开时焦点移入面板。选择或按 Escape 关闭后，焦点回到打开弹出层的元素（触发器，或 `Alt+ArrowDown` 之后的输入框）。焦点不会被困住，按下输入框也不会关闭弹出层。在范围选择中，第一次 Escape 取消预览，下一次关闭弹出层。Overlay 的外部点击不知道输入框属于选择器，因此由选择器自己判断。

## Agent Skill

[Chrono Svelte skill](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) 介绍面向 agent 的集成步骤。

## License

MIT © Zealakit
