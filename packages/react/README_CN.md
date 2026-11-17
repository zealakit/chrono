# @zealakit/chrono-react

[English](https://github.com/zealakit/chrono/blob/main/packages/react/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/react/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/react/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

面向 React 的 headless Calendar 组件：月、周、工作周、日、议程、多月和自定义视图，导航，以及 Mini Calendar。视觉样式完全由你掌控。

Chrono 不附带 CSS，也不设置任何视觉样式。各部件渲染你自己的元素和 class；状态通过 `data-*` 和 ARIA 属性暴露，所有外观都由你的 CSS 决定。

1.0 之前：API 可能在次版本之间变化。

> **Note**
> Chrono 是一组专注的 headless 日历视图，后续版本还会加入 Date、Time 和 DateTime 组件。它不附带任何 CSS，也不渲染带样式的标记，视觉完全由你掌控。0.3.0 版本为日历视图加入事件：布局、选择、"还有 N 个" 溢出提示和当前时间指示线。日期和时间的输入框与面板尚未实现。
>
> Chrono 不是完整的 UI 库或设计系统，也不包含弹出层、overlay 或定位代码。需要弹出层时，请把 Chrono 的面板放进你自己的弹出层中。

## Install

```bash
npm install @zealakit/chrono-react
```

Peer 依赖：`react` `^18.0.0 || ^19.0.0`, `react-dom` `^18.0.0 || ^19.0.0`。

## Calendar

### Quick start

创建一个日历，然后组合它的各个部件。每个部件都是可选的，只渲染你需要的。

```tsx
import {
  Calendar,
  CalendarMonthGrid,
  CalendarNextButton,
  CalendarPrevButton,
  CalendarTitle,
} from "@zealakit/chrono-react";

export function Planner() {
  return (
    <Calendar locale="en-US" weekStartsOn={1}>
      <CalendarPrevButton>Prev</CalendarPrevButton>
      <CalendarTitle />
      <CalendarNextButton>Next</CalendarNextButton>
      <CalendarMonthGrid className="month" />
    </Calendar>
  );
}
```

### Import styles

每个领域既可从根入口导入，也可从各自的子路径导入。两者得到相同的绑定，因此可以混用。

```ts
// Domain subpath
import { Calendar, CalendarMonthGrid } from "@zealakit/chrono-react/calendar";

// Root entry: re-exports every domain, same bindings
import { Calendar, getCalendarTitle } from "@zealakit/chrono-react";
```

根入口同样重新导出这些工具函数，因此 Server Component 或 server action 可以调用它们，而无需加载任何组件代码。

### Parts

| Part | Renders | Purpose |
| --- | --- | --- |
| `Calendar` | `div` | 创建日历，接受下面的选项。 |
| `CalendarTitle` | `h2` | 标题文本，变化时会以礼貌方式播报。 |
| `CalendarPrevButton`, `CalendarNextButton`, `CalendarTodayButton` | `button` | 导航按钮。到达 `min` 和 `max` 时，上一个和下一个按钮带有 `aria-disabled`。 |
| `CalendarViewButton` | `button` | 切换到它的 `view`，`aria-pressed` 标记当前视图。 |
| `CalendarMonthGrid` | `table` | 星期标题、可选的周数和每天一个单元格。`month` 选择多月视图中的网格。 |
| `CalendarWeekdayHeader`, `CalendarWeekNumber`, `CalendarCell` | `th`, `th`, `td` | 月网格的组成部分，可用来构建你自己的网格。 |
| `CalendarTimeGrid` | `div` | 日期列和时间槽，暂时没有事件。 |
| `CalendarTimeGridColumnHeader` | `div` | 时间网格中可聚焦的日期标题。 |
| `CalendarTimeGridSlot` | `div` | 某一天的一个时间槽，暂时不可聚焦。 |
| `CalendarAgenda`, `CalendarAgendaDay` | `ul`, `li` | 议程列表及其日期。 |
| `MiniCalendar` | `div` | 月份日历，可与主日历同步。 |
| `MiniCalendarTitle`, `MiniCalendarPrevButton`, `MiniCalendarNextButton` | `h2`, `button`, `button` | Mini Calendar 的标题和翻页。 |
| `MiniCalendarGrid`, `MiniCalendarWeekdayHeader`, `MiniCalendarCell` | `table`, `th`, `td` | Mini Calendar 的网格及其组成部分。 |

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

```tsx
<Calendar
  views={{ threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" } }}
  defaultView="threeDay"
/>
```

### Controlled usage

不设置 `view` 和 `date` 即为非受控用法，也可以自行控制。Calendar 只报告变化，从不持久化任何内容。

```tsx
const [view, setView] = useState("month");
const [date, setDate] = useState(toPlainDate("2026-11-17"));

<Calendar view={view} onViewChange={setView} date={date} onDateChange={setDate} />
```

### Mini Calendar

Mini Calendar 有自己的月份。传入 `syncWith` 后，当主日期离开其所在月份时它会跟随主日历；用户仍可独立翻页。

```tsx
<MiniCalendar
  syncWith={range ? { date, visibleRange: range } : undefined}
  isMarked={(day) => hasEvents(day)}
  onNavigate={setDate}
>
  <MiniCalendarPrevButton />
  <MiniCalendarTitle />
  <MiniCalendarNextButton />
  <MiniCalendarGrid />
</MiniCalendar>
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

```tsx
<Calendar now={now} locale="en-US" timeZone="UTC" />
```

## React Server Components

组件和 hook 是客户端组件。工具函数（`getCalendarTitle`、`getRange`、`getVisibleRange`、`toPlainDate`、`toIsoString`、`isSameDay`）没有 directive，因此 Server Component 和 server action 可以从任一入口调用它们。

```ts
// A Server Component: no "use client" needed for utilities.
import { getCalendarTitle, getRange } from "@zealakit/chrono-react/calendar";
```

## Events

传入 `events`，用 `CalendarEvents` 和 `CalendarEvent` 渲染每个单元格的片段；Chrono 计算泳道、列、溢出和延续标记，你负责渲染内容。使用 `eventLimit="auto"` 测量可见单元格，并监听 `onSelectRange` 实现拖拽创建。

```tsx
<Calendar events={events} eventLimit="auto" onSelectRange={create}>
  <CalendarMonthGrid>
    {(day) => (
      <CalendarEvents day={day}>
        {(segments) =>
          segments.map((segment) => (
            <CalendarEvent key={segment.key} segment={segment} />
          ))
        }
      </CalendarEvents>
    )}
  </CalendarMonthGrid>
</Calendar>
```

| Part | Renders | Purpose |
| --- | --- | --- |
| `CalendarEvents` | `div` | 某个单元格的事件列表；渲染函数接收该单元格的片段。 |
| `CalendarEvent` | `div` | 一个片段，`segment.event` 是你传入的原始对象。 |
| `CalendarMoreButton` | `button` | “还有 N 个”按钮；触发 `onMoreActivate`。 |
| `CalendarAllDayRow` | `div` | 时间网格的全天行；渲染函数接收 `{ days, segments }`。 |
| `CalendarNowIndicator` | `div` | 当前时间线，仅在轴线范围内时渲染。 |
| `CalendarSelectionPreview` | `div` | 每个覆盖日期的选择预览片段。 |

事件位置是 `--chrono-event-*` 自定义属性中的无单位数字，单位与布局方式由你的 CSS 决定。按 `Enter` 或 `F2` 进入单元格的事件，`Space` 选择，`Enter` 激活，`Escape` 返回日期。

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

[Chrono React 技能](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) 介绍面向 agent 的集成步骤。

## License

MIT © Zealakit
