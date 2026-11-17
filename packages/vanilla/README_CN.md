# @zealakit/chrono-vanilla

[English](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

面向原生 DOM 的 headless Calendar 控制器：月、周、工作周、日、议程、多月和自定义视图，导航，以及 Mini Calendar。标记由你渲染，视觉样式完全由你掌控。

Chrono 不附带 CSS，也不设置任何视觉样式。各部件渲染你自己的元素和 class；状态通过 `data-*` 和 ARIA 属性暴露，所有外观都由你的 CSS 决定。

1.0 之前：API 可能在次版本之间变化。此版本还没有事件；各视图展示事件将来要填充的空结构。

> **Note**
> Chrono 是一组专注的 headless 日历视图，后续版本还会加入 Date、Time 和 DateTime 组件。它不附带任何 CSS，也不渲染带样式的标记，视觉完全由你掌控。0.2.0 版本包含日历视图和 Mini Calendar。事件、日期和时间的输入框与面板尚未实现。
>
> Chrono 不是完整的 UI 库或设计系统，也不包含弹出层、overlay 或定位代码。需要弹出层时，请把 Chrono 的面板放进你自己的弹出层中。

## Install

```bash
npm install @zealakit/chrono-vanilla
```

无 peer 依赖。

## Public API

| Export | Purpose |
| --- | --- |
| `createCalendar(root, options)` | 主日历的委托监听器和控制器。返回 `controller`、`getState`、`subscribe`、`setOptions`、`syncFocus` 和 `destroy`。 |
| `createMiniCalendar(root, options)` | Mini Calendar 的同类函数。 |
| `applyAttributes(element, attributes)` | 把控制器的属性记录写到元素上，并移除过期属性。 |
| `getCalendarTitle`, `getRange`, `getVisibleRange` | 用于视图标题和范围的纯工具函数。 |
| `toPlainDate`, `toIsoString`, `isSameDay` | 从 core 重新导出的值工具函数。 |

`controller` 与其他适配器拥有相同的状态和属性 getter，这些记录在 Styling hooks 一节中说明。

## Markup

标记由你编写。用 `applyAttributes` 把 `calendar.controller` 的每条记录写到元素上，并给操作按钮加上 `data-chrono-action` 属性；其余由委托监听器完成。

## Usage

### Quick start

创建一个日历，然后组合它的各个部件。每个部件都是可选的，只渲染你需要的。

```ts
import { applyAttributes, createCalendar } from "@zealakit/chrono-vanilla";

const root = document.getElementById("calendar") as HTMLElement;
const calendar = createCalendar(root, { locale: "en-US", weekStartsOn: 1 });

function render() {
  const { controller } = calendar;
  const state = calendar.getState();
  applyAttributes(root, controller.getRootAttributes());
  // Build the markup with any templating, then stamp the records:
  //   applyAttributes(titleEl, controller.getTitleAttributes());
  //   applyAttributes(cellEl, controller.getCellAttributes(day));
  root.replaceChildren(/* ... */);
  calendar.syncFocus();
}

calendar.subscribe(render);
render();
```

### Import styles

每个领域既可从根入口导入，也可从各自的子路径导入。两者得到相同的绑定，因此可以混用。

```ts
// Domain subpath
import { applyAttributes, createCalendar } from "@zealakit/chrono-vanilla/calendar";

// Root entry: re-exports every domain, same bindings
import { createCalendar, getCalendarTitle } from "@zealakit/chrono-vanilla";
```

根入口同样重新导出这些工具函数，因此 Server Component 或 server action 可以调用它们，而无需加载任何组件代码。

### Views

视图就是数据：一种布局、一个长度和一种对齐方式。通过 `views` 添加你自己的视图。

| View | Layout | Range |
| --- | --- | --- |
| `month` | month | 一个月，含相邻日期，共 6 行。 |
| `week` | time grid | 一周。 |
| `workWeek` | time grid | 一周，不含该 locale 的周末。 |
| `day` | time grid | 一天。 |
| `agenda` | list | 从该日期起的七天。 |
| `multiMonth` | month | 三个月。 |

```ts
createCalendar(root, {
  views: { threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" } },
  defaultView: "threeDay",
});
```

### Controlled usage

不设置 `view` 和 `date` 即为非受控用法，也可以自行控制。Calendar 只报告变化，从不持久化任何内容。

```ts
const calendar = createCalendar(root, { view: "month", date: "2026-11-17" });
// You own the value: report it with onViewChange / onDateChange, apply it with setOptions.
calendar.setOptions({ view: "week" });
```

### Calendar options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `view` | `string` | — | 受控的视图 id：`month`、`week`、`workWeek`、`day`、`agenda`、`multiMonth` 或自定义视图。 |
| `defaultView` | `string` | `"month"` | 非受控时的初始视图。 |
| `date` | `DateInput` | — | 受控日期，范围围绕它构建。 |
| `defaultDate` | `DateInput` | today | 非受控时的初始日期。 |
| `onViewChange` | `(view) => void` | — | 视图已变化。 |
| `onDateChange` | `(date) => void` | — | 范围所围绕的日期已变化。 |
| `onVisibleRangeChange` | `(range, { view }) => void` | — | 挂载后触发一次，之后每当可见范围变化时触发。请为该范围加载事件。 |
| `onDateActivate` | `(date, { view, source }) => void` | — | 某一天被点击或按下了 Enter。Calendar 不会做其他事，含义由你决定。 |
| `views` | `Record<string, ViewDefinition>` | — | 自定义视图，合并到内置视图之上。 |
| `locale` | `string` | runtime locale | BCP 47 标签。服务端渲染时请传入。 |
| `weekStartsOn` | `1`–`7` | locale | 一周的第一天，1 = 星期一。 |
| `hiddenDays` | `DayOfWeek[]` | `[]` | 在所有布局中隐藏这些星期几。 |
| `timeZone` | `string` | runtime zone | 用于判断今天是哪一天的 IANA 时区。 |
| `now` | `number` | `Date.now()` | 用作“现在”的 epoch 毫秒数。服务端渲染时请传入。 |
| `min`, `max` | `DateInput` | — | 限制导航。范围之外的日期带有 `data-disabled`。 |
| `timeGrid` | `{ start, end, step, workingHours }` | 30-minute slots | 时间网格的时间轴。`step` 以分钟计；`workingHours` 为 `{ start, end, days }`。 |
| `weekNumbers` | `"iso" \| "locale" \| false` | `false` | 在月网格中显示周数。 |
| `messages` | `Partial<Messages>` | English | 无障碍名称和状态词。只提供英文；传入你自己的文案即可翻译。 |
| `selectedDate` | `DateInput` | — | 将某一天标记为 `data-selected`。Calendar 从不修改它；由你设置，例如在 `onDateActivate` 中。 |
| `highlightedDates` | `DateInput[] \| (date) => boolean` | — | 将这些日期标记为 `data-highlighted`。 |

### Mini Calendar

Mini Calendar 有自己的月份。传入 `syncWith` 后，当主日期离开其所在月份时它会跟随主日历；用户仍可独立翻页。

```ts
const mini = createMiniCalendar(miniRoot, {
  isMarked: (day) => hasEvents(day),
  onNavigate: (day) => calendar.controller.goTo(day),
});
calendar.subscribe((state) => mini.setOptions({ syncWith: { date: state.date, visibleRange: state.visibleRange } }));
```

`MiniCalendar` 接受 `month` / `defaultMonth` / `onMonthChange`、`syncWith`（主日历的 `{ date, visibleRange }`）、`isMarked`（`(date) => boolean`，例如有事件的日期）、`onNavigate`（`(date) => void`），以及共用的 `locale`、`weekStartsOn`、`timeZone`、`now`、`min`、`max`、`weekNumbers`、`messages`、`selectedDate` 和 `highlightedDates`。

### Keyboard

| Key | Action |
| --- | --- |
| `←` `→` | 上一天或下一天。在从右到左的 locale 中对调。 |
| `↑` `↓` | 月网格中为上一周或下一周；议程中为上一天或下一天。 |
| `Home` `End` | 一周的开始或结束，或时间网格和议程的第一天或最后一天。 |
| `PageUp` `PageDown` | 上一个或下一个范围（月、周等）。在月网格中，`Shift` 按年移动。 |
| `Enter` | 激活当前聚焦的日期（`onDateActivate`）。 |

### Server rendering

传入 `now` 和 `locale`（以及 `timeZone`），让服务端和客户端渲染出相同的标记。否则 Chrono 会读取运行时的时钟和 locale，而它们在服务端和浏览器之间并不相同。

```ts
createCalendar(root, { now, locale: "en-US", timeZone: "UTC" });
```

## Lifecycle

`createCalendar` 在 `root` 上添加委托的 `click`、`keydown` 和 `keyup` 监听器。每次渲染后调用 `syncFocus()`，使 roving `tabindex` 和键盘焦点在重新渲染后得以保留；调用 `destroy()` 移除监听器。

## Styling hooks

| Attribute | Where | Purpose |
| --- | --- | --- |
| `data-chrono-calendar` | root | 标记日历根元素。`data-view` 和 `data-layout` 表示当前视图和布局。 |
| `data-today` | cells, headers | 该日期是今天，同时设置 `aria-current="date"`。 |
| `data-selected`, `data-highlighted` | cells, headers | 来自 `selectedDate` 和 `highlightedDates`。 |
| `data-outside-month`, `data-weekend`, `data-hidden` | cells | 该日期在所示月份之外、在周末，或通过 `hiddenDays` 被隐藏。 |
| `data-focused` | cells, headers | 持有 roving tabindex 的日期。请为键盘焦点环设置 `:focus-visible` 样式。 |
| `data-disabled` | cells, nav buttons | 超出 `min` 和 `max`，或无法继续导航，同时设置 `aria-disabled`。 |
| `data-marked`, `data-in-range` | Mini Calendar cells | 来自 `isMarked`，以及位于同步的可见范围内。 |
| `data-slot-start`, `data-working-hours` | time grid slots | 时间槽的开始时间，以及它是否在工作时间内。 |
| `data-chrono-key` | cells, headers | 单元格的 ISO 日期。对测试和委托监听器很有用。 |

## Agent Skill

[Chrono Vanilla 技能](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) 介绍面向 agent 的集成步骤。

## License

MIT © Zealakit
