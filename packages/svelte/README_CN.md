# @zealakit/chrono-svelte

[English](https://github.com/zealakit/chrono/blob/main/packages/svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

面向 Svelte 的 headless Calendar 组件：月、周、工作周、日、议程、多月和自定义视图，导航，以及 Mini Calendar。视觉样式完全由你掌控。

Chrono 不附带 CSS，也不设置任何视觉样式。各部件渲染你自己的元素和 class；状态通过 `data-*` 和 ARIA 属性暴露，所有外观都由你的 CSS 决定。

1.0 之前：API 可能在次版本之间变化。

> **Note**
> Chrono 是一组专注的 headless 日历视图，也包含 Date、Time 和 DateTime 组件。它不附带任何 CSS，也不渲染带样式的标记，视觉完全由你掌控。0.3.0 版本为日历视图加入事件：布局、选择、"还有 N 个" 溢出提示和当前时间指示线。新的 `/date` 入口加入了日期输入框与面板；`/time` 入口加入了时间输入框与面板；`/datetime` 入口把它们组合起来。
>
> Chrono 不是完整的 UI 库或设计系统，也不包含弹出层、overlay 或定位代码。需要弹出层时，请把 Chrono 的面板放进你自己的弹出层中。

## Install

```bash
npm install @zealakit/chrono-svelte
```

Peer 依赖：`svelte` `^5.20.0`。

## Calendar

### Quick start

创建一个日历，然后组合它的各个部件。每个部件都是可选的，只渲染你需要的。

```svelte
<script lang="ts">
  import {
    Calendar,
    CalendarMonthGrid,
    CalendarNextButton,
    CalendarPrevButton,
    CalendarTitle,
  } from "@zealakit/chrono-svelte";
</script>

<Calendar locale="en-US" weekStartsOn={1}>
  <CalendarPrevButton>Prev</CalendarPrevButton>
  <CalendarTitle />
  <CalendarNextButton>Next</CalendarNextButton>
  <CalendarMonthGrid class="month" />
</Calendar>
```

### Import styles

每个领域既可从根入口导入，也可从各自的子路径导入。两者得到相同的绑定，因此可以混用。

```ts
// Domain subpath
import { Calendar, CalendarMonthGrid } from "@zealakit/chrono-svelte/calendar";

// Root entry: re-exports every domain, same bindings
import { Calendar, getCalendarTitle } from "@zealakit/chrono-svelte";
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

```svelte
<Calendar
  views={{ threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" } }}
  defaultView="threeDay"
/>
```

### Controlled usage

不设置 `view` 和 `date` 即为非受控用法，也可以自行控制。Calendar 只报告变化，从不持久化任何内容。

```svelte
<script lang="ts">
  let view = $state("month");
  let date = $state(toPlainDate("2026-11-17"));
</script>

<Calendar bind:view {date} onDateChange={(next) => (date = next)} />
```

### Mini Calendar

Mini Calendar 有自己的月份。传入 `syncWith` 后，当主日期离开其所在月份时它会跟随主日历；用户仍可独立翻页。

```svelte
<MiniCalendar
  syncWith={range ? { date, visibleRange: range } : undefined}
  isMarked={hasEvents}
  onNavigate={(next) => (date = next)}
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

```svelte
<Calendar {now} locale="en-US" timeZone="UTC" />
```

## SvelteKit

渲染期间不会触碰 DOM。在 SvelteKit 中照常渲染日历，并从服务端传入 `now` 和 `locale`。

```ts
// Utilities have no browser dependency and run on the server.
import { getCalendarTitle, getRange } from "@zealakit/chrono-svelte/calendar";
```

## Events

传入 `events`，用 `CalendarEvents` 和 `CalendarEvent` 渲染每个单元格的片段；Chrono 计算泳道、列、溢出和延续标记，你负责渲染内容。使用 `eventLimit="auto"` 测量可见单元格，并监听 `onSelectRange` 实现拖拽创建。

```svelte
<Calendar {events} eventLimit="auto" onSelectRange={create}>
  <CalendarMonthGrid>
    {#snippet children(day)}
      <CalendarEvents {day}>
        {#snippet children(segments)}
          {#each segments as segment (segment.key)}<CalendarEvent {segment} />{/each}
        {/snippet}
      </CalendarEvents>
    {/snippet}
  </CalendarMonthGrid>
</Calendar>
```

| Part | Renders | Purpose |
| --- | --- | --- |
| `CalendarEvents` | `div` | 某个单元格的事件列表；代码片段接收该单元格的片段。 |
| `CalendarEvent` | `div` | 一个片段，`segment.event` 是你传入的原始对象。 |
| `CalendarMoreButton` | `button` | “还有 N 个”按钮；调用 `onMoreActivate`。 |
| `CalendarAllDayRow` | `div` | 时间网格的全天行；代码片段接收 `{ days, segments }`。 |
| `CalendarNowIndicator` | `div` | 当前时间线，仅在轴线范围内时渲染。 |
| `CalendarSelectionPreview` | `div` | 每个覆盖日期的选择预览片段。 |

事件位置是 `--chrono-event-*` 自定义属性中的无单位数字，单位与布局方式由你的 CSS 决定。按 `Enter` 或 `F2` 进入单元格的事件，`Space` 选择，`Enter` 激活，`Escape` 返回日期。

### Move and resize

设置 `editable` 即可让用户移动和调整事件大小。Chrono 只会**提出**变更：`onEventChange(proposal)` 接收 `{ kind, event, from, to, source }`，由你的应用决定。返回 `false`（或解析为 `false` 的 promise）表示拒绝，其他返回值表示接受；在你的 `events` 包含新时间之前（或 `pendingTimeout` 超时，默认 10 秒），事件保持 `data-pending` 状态。Chrono 不会自行修改 `events`、持久化或同步。

```svelte
<Calendar editable {events} onEventChange={(change) => save(change)}>
  <CalendarMonthGrid>
    {#snippet children(day)}
      <CalendarEvents {day}>
        {#snippet children(segments)}
          {#each segments as segment (segment.key)}
            <CalendarEvent {segment}>
              <CalendarEventResizeHandle {segment} edge="end" />
            </CalendarEvent>
          {/each}
        {/snippet}
      </CalendarEvents>
      <CalendarEventDragPreview {day} />
    {/snippet}
  </CalendarMonthGrid>
</Calendar>
```

| Option | 用途 |
| --- | --- |
| `editable`, `isEventEditable` | 为整个日历或单个事件开启编辑。事件也可以把 `editable`、`movable` 或 `resizable` 设为 `false`。 |
| `snapDuration`, `defaultTimedDuration` | 吸附的分钟数（默认：时间槽时长），以及全天事件拖入时间网格后的时长（默认 60）。 |
| `allowAllDayConversion` | 允许在全天行与时间网格之间拖动（默认 `true`）。 |
| `validateEventChange` | 返回 `false` 会把目标标记为 `data-invalid` 并阻止放下。 |
| `autoScroll`, `scrollContainer` | 指针靠近容器边缘时自动滚动。 |
| `keyboardShortcuts` | `M` 移动，`R` 调整结束时间，`Shift+R` 调整开始时间；`false` 关闭。方向键逐步移动，`Enter` 放下，`Escape` 取消。 |

`CalendarEventResizeHandle` 在事件内渲染拖拽手柄，`CalendarEventDragPreview` 在拖动期间为每个覆盖的单元格渲染一个 `aria-hidden` 预览片段。Chrono 只写入 `data-*` 状态和 `--chrono-*` 数值：请在你的 CSS 中为事件和手柄设置 `touch-action: none`，并自行为 `[data-dragging]`、`[data-pending]` 和 `[data-invalid]` 设置样式。需要移动 4 px 才会开始拖动（触摸需长按 400 毫秒），因此点击仍然是选择。

## Date

五个相互独立、无样式的组件：`DateInput`、`DatePanel`、`DateRangeInput`、`DateRangePanel` 和 `MultiDatePanel`。它们可单独使用，也可通过共享的值配合使用，还可放进你选择的任何弹出层。Chrono 没有弹出层：打开、定位和关闭都由你的应用负责。

### Date quick start

让输入框和面板共享同一个值。输入会让面板跳到对应月份；选择某一天会填入输入框。

```svelte
<script lang="ts">
import { DateInput, DatePanel } from "@zealakit/chrono-svelte/date";
import type { DateValue } from "@zealakit/chrono-svelte/date";

let value = $state<DateValue>(null);
</script>

<DateInput bind:value name="check-in" />
<DatePanel bind:value />
```

### Date parts

所有部件都是可选的。不带子元素的面板或输入框会绘制默认布局；也可以自行组合这些部件。

| Part | Default element | Notes |
| --- | --- | --- |
| `DateInput` | `div` | Group of segments, or a text field with `mode="text"` |
| `DateInputSegment, DateInputLiteral` | `span` | One part (spinbutton) and a separator |
| `DateInputTextField, DateInputClearButton` | `input, button` | Text mode field and clear |
| `DateRangeInput, DateRangeInputStart, DateRangeInputEnd` | `div` | Two fields in one group |
| `DatePanel, DateRangePanel, MultiDatePanel` | `div` | The three panel roots; range shows two months |
| `DatePanelTitle, DatePanelLevelButton` | `h2, button` | Title, and the title as a level switch |
| `DatePanelPrevButton, DatePanelNextButton, DatePanelTodayButton` | `button` | Paging and today |
| `DatePanelGrid, DatePanelWeekdayHeader, DatePanelWeekNumber, DatePanelCell` | `table, th, td` | The grid of the current level |

### Change and commit

`onValueChange` 在每次变化时触发，包括未完成的范围。`onValueCommit` 在选择完成时触发：选了某一天、范围两端都已选定，或输入的值在失焦或回车时有效。请在 commit 时关闭你的弹出层。多选不会自动 commit，请调用 `commit()`。

### Date keyboard

方向键、Home/End 和 PageUp/PageDown 移动焦点。回车或空格选择（多选面板中为切换；Shift+回车会添加从上一天开始的整段）。Ctrl 或 Cmd 加向上箭头可上升一级（日、月、年）。Escape 取消未完成的范围，其余情况不处理，以便你的弹出层关闭。在输入框中，数字会输入并自动前进，上下箭头循环调整，退格清除一部分，左右箭头在各部分之间移动（从右到左的语言中方向互换）。

### Forms and validity

设置 `name` 后，根元素会渲染一个携带 ISO 值（`2026-11-17`）的隐藏输入。范围使用 `name-start` 和 `name-end`（或 `startName` 和 `endName`）；多选面板不是表单字段。表单重置会恢复 `defaultValue`。无效输入会保留已键入的内容，并通过 `aria-invalid` 和 `data-invalid` 报告 `validity`（`empty`、`incomplete`、`invalid-date`、`before-min`、`after-max`、`disabled`、`unavailable`、`valid`）；错误文案由你编写。

### Range presets

`getPresetRange(preset, { today, weekStartsOn, fiscalYearStartMonth })` 返回 `today`、`yesterday`、`last7Days`、`last30Days`、`thisWeek`、`lastWeek`、`thisMonth`、`lastMonth`、`thisQuarter`、`lastQuarter`、`yearToDate`、`thisYear`、`lastYear` 或自定义 `{ unit, amount, align }` 的闭区间。`matchPreset` 告诉你哪个预设等于当前值，可用于你自己按钮上的 `aria-pressed`。预设只是纯函数：按钮由你自己提供。

### Popup recipes

可把面板放进任何弹出层库：设置 `autoFocus` 让焦点进入面板（默认关闭，所以内联面板不会抢焦点），在 `onValueCommit` 时关闭，并让弹出层恢复焦点。面板不会拦截 Escape，除非它刚取消了一个未完成的范围。适配器把基础类型 `DateInput` 导出为 `DateInputValue`，因为 `DateInput` 现在是一个组件。

## Time

四个相互独立、无样式、不含日期和时区的组件：`TimeInput`、`TimePanel`、`TimeRangeInput` 和 `TimeRangePanel`。适用于营业时间、工作时间、每日日程和预约时段。与 Date 组件一样，它们没有自己的弹出层。

### Time quick start

让分段输入框和面板共享同一个值。输入会更新面板；选择某个选项会填入输入框。

```svelte
<script lang="ts">
import { TimeInput, TimePanel } from "@zealakit/chrono-svelte/time";
import type { TimeValue } from "@zealakit/chrono-svelte/time";

let value = $state<TimeValue>(null);
</script>

<TimeInput bind:value name="opens" />
<TimePanel bind:value step={{ minutes: 15 }} />
```

### Time parts

所有部件都是可选的。不带子元素的面板会绘制默认布局。

| Part | Default element | Notes |
| --- | --- | --- |
| `TimeInput` | `div` | Group of segments, or a text field with `mode="text"` |
| `TimeInputSegment, TimeInputLiteral` | `span` | One part (spinbutton) and a separator |
| `TimeInputTextField, TimeInputClearButton` | `input, button` | Text mode field and clear |
| `TimeRangeInput, TimeRangeInputStart, TimeRangeInputEnd` | `div` | Two fields in one group |
| `TimePanel, TimeRangePanel` | `div` | Both layouts; a range list is the default |
| `TimePanelColumn` | `div` | Columns layout: one listbox per part |
| `TimePanelList, TimePanelGroup, TimePanelGroupLabel` | `div` | List layout and its groups |
| `TimePanelOption` | `div` | One time or slot; custom content can read `slot.data` |
| `TimeRangePanelStart, TimeRangePanelEnd` | `div` | Columns layout of a range: one column set each |

### Layouts and slots

`layout="columns"` 为每个部分（时、分、秒、上下午）显示一个列表框。`layout="list"` 显示按 `step` 间隔的时间列表，或按 `slotDuration` 或显式 `slots` 数组（`{ start, end?, available?, data? }`）生成的时段列表。时段的 `data` 由你决定：在选项内容中读取。`groupBy` 接受 `"hour"`、`"dayPeriod"`（标签来自 `Intl`）或你自己的函数。`granularity` 为 `hour`、`minute` 或 `second`，`hourCycle` 为 `h12` 或 `h23`（默认来自语言环境），`step` 设置分钟或秒的间隔。不允许的小时或选项仍可聚焦，但不能选择。

### Overnight ranges

时间范围是半开区间 `[start, end)`。设置 `allowOvernight` 后，早于 `start` 的 `end` 表示次日（`23:00` 到 `02:00`，`duration` 为 180 分钟，`crossesMidnight` 为 true）。`09:00` 到 `09:00` 始终是 `end-before-start`。`minDuration` 和 `maxDuration`（分钟）会用 `data-range-blocked` 标出会违反它们的选项。在列表中，两次选择构成一个范围：设置 `slotDuration` 时，结束时间是所选时段的结束。

### Time keyboard

一个面板只有一个 Tab 停靠点。在列模式中，左右箭头切换列，上下箭头在列内移动，Home 和 End 跳到两端，PageUp 和 PageDown 以 3 小时或 15 分钟移动，数字可预输入（先按 `1` 再按 `5` 聚焦 15），回车或空格选择。在列表模式中，上下箭头、Home、End、PageUp 和 PageDown 移动，数字可预输入。Escape 只取消未完成的范围。在输入框中，数字会输入并自动前进，上下箭头按 `step` 循环调整，输入 `a` 或 `p`（本地化标签的首字母）设置上下午。

### Time forms and validity

设置 `name` 后，根元素会渲染一个值为 `09:30` 的隐藏输入（`granularity="second"` 时为 `09:30:15`）；范围使用 `name-start` 和 `name-end`。已键入的值不会被改写：不在 `step` 上的值会被保留并报告为 `validity: "off-step"`（如需在失焦时取整，可用 `snapTime`）。其他状态有 `empty`、`incomplete`、`before-min`、`after-max`、`disabled`、`unavailable`、`valid`，范围另有 `end-before-start`、`too-short` 和 `too-long`。文本模式下 `9`、`930`、`9:30`、`9.30`、`9h30`、`21:30`、`9:30 pm` 和 `9 PM` 都能解析。

### Time popup recipes

像 Date 面板一样，可把面板放进任何弹出层库：在弹出层内设置 `autoFocus`，在 `onValueCommit` 时关闭（列模式的范围面板为结束列组的最后一列），并让弹出层恢复焦点。适配器把基础类型 `TimeInput` 导出为 `TimeInputValue`，因为 `TimeInput` 现在是一个组件。`BookingSlot` 是时段类型（基础类型 `TimeSlot` 是 Calendar 的时间轴时段）。

## DateTime

四个组合 Date 与 Time 的组件：`DateTimeInput`、`DateTimePanel`、`DateTimeRangeInput` 和 `DateTimeRangePanel`。它们复用 Date 和 Time 的控制器与部件，只增加同时需要两者的部分：跨部分限制、时区和夏令时。没有弹出层，也没有时区选择器；选择时区是你自己的界面。

### DateTime quick start

输入框和面板共享同一个值。设置时区后值为 `ZonedDateTime`；不设置则为普通的墙上时间 `PlainDateTime`。

```svelte
<script lang="ts">
import { DateTimeInput, DateTimePanel } from "@zealakit/chrono-svelte/datetime";
import type { DateTimeValue } from "@zealakit/chrono-svelte/datetime";

let value = $state<DateTimeValue>(null);
</script>

<DateTimeInput bind:value timeZone="Asia/Ho_Chi_Minh" valueTimeZone="UTC" name="at" />
<DateTimePanel bind:value timeZone="Asia/Ho_Chi_Minh" valueTimeZone="UTC" disablePast defaultTime="09:00" />
```

### DateTime parts

容器提供 Date 与 Time 的上下文；其中的网格、单元格、列和选项是你从 `/date` 和 `/time` 导入的部件。不带子元素的 `DateTimePanel` 会绘制默认布局。

| Part | Default element | Notes |
| --- | --- | --- |
| `DateTimeInput` | `div` | One segment group, or a date field and a time field |
| `DateTimeInputSegment, DateTimeInputLiteral, DateTimeInputClearButton` | `span, span, button` | Any date or time part, and clear |
| `DateTimeInputDateField, DateTimeInputTimeField` | `input, input` | Text mode: the two fields |
| `DateTimeInputTimeZone` | `span` | The display zone as text |
| `DateTimeRangeInput, DateTimeRangeInputStart, DateTimeRangeInputEnd` | `div` | Two fields in one group |
| `DateTimePanel, DateTimePanelDate, DateTimePanelTime` | `div` | Container and the two contexts |
| `DateTimeRangePanel, DateTimeRangePanelDate` | `div` | Container and the date range context |
| `DateTimeRangePanelStartTime, DateTimeRangePanelEndTime` | `div` | The two time contexts of a range |

### Time zones and daylight saving time

`timeZone` 是用户看到并编辑的时区。`valueTimeZone`（例如 `"UTC"`）是发出值所用的时区：同一时刻，按你的方式存储。`disambiguation`（`compatible`、`earlier`、`later`、`reject`）决定落在夏令时空档或重叠中的墙上时间。空档中的时间会在屏幕上保留键入的墙上时间并设置 `data-adjusted`；使用 `reject` 时状态为 `nonexistent-time`。`getDayInstants` 列出一天中真实的时刻（重复的小时会带偏移量出现两次），`resolveWall` 展示一个墙上时间如何被解析。

### Limits, default time and commit

`min` 和 `max` 接受日期时间：范围外的日期会被禁用，边界日则禁用早于 `min` 或晚于 `max` 的时间。`disablePast` 让 `min` 成为 `timeZone` 中的当前时间（`now` 可注入）。`isTimeDisabled(time, date)` 会收到所选日期。`defaultTime` 会在先选日期时填入时间，使值立即完整。选择新日期会保留时间；若该时间被禁用，则值变为 `null` 并标记该选项。`onValueCommit` 在时间部分 commit 时触发，选择日期时从不触发。范围在结束时间 commit 时 commit；`minDuration` 和 `maxDuration`（分钟）会禁用违反它们的结束时间。

### DateTime forms and text mode

设置 `name` 后，根元素会渲染一个隐藏输入：带时区值时为含偏移的 ISO 值（`2026-11-17T09:30:00+07:00`），否则为 `2026-11-17T09:30`。`formValue(value)` 可替换它（例如发送 UTC）。范围使用 `name-start` 和 `name-end`。分段模式下日期和时间部分共用一个 Tab 停靠点；文本模式有两个带标签的原生输入，各自独立解析，粘贴完整的日期时间（如 `2026-11-17T09:30` 或 `17/11/2026 9:30`）会同时填充两者。

### Which component do I need?

请选择能容纳你的值的最小组件。`DateTimeInputValue` 是基础类型 `DateTimeInput`（现在同名的是一个组件）。

| I need | Use |
| --- | --- |
| A day | `DateInput`, `DatePanel` (`/date`) |
| A range of days or many days | `DateRangeInput`, `DateRangePanel`, `MultiDatePanel` (`/date`) |
| A time of day or a slot | `TimeInput`, `TimePanel` (`/time`) |
| Opening hours or a shift | `TimeRangeInput`, `TimeRangePanel` (`/time`) |
| A moment, with a time zone | `DateTimeInput`, `DateTimePanel` (`/datetime`) |
| A booking from a moment to a moment | `DateTimeRangeInput`, `DateTimeRangePanel` (`/datetime`) |
| Views of days with events | `Calendar`, `MiniCalendar` (`/calendar`) |

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

[Chrono Svelte 技能](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) 介绍面向 agent 的集成步骤。

## License

MIT © Zealakit
