# @zealakit/chrono-vanilla

[English](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

面向原生 DOM 的 headless Calendar 控制器：月、周、工作周、日、议程、多月和自定义视图，导航，以及 Mini Calendar。标记由你渲染，视觉样式完全由你掌控。

Chrono 不附带 CSS，也不设置任何视觉样式。各部件渲染你自己的元素和 class；状态通过 `data-*` 和 ARIA 属性暴露，所有外观都由你的 CSS 决定。

1.0 之前：API 可能在次版本之间变化。

> **Note**
> Chrono 是一组专注的 headless 日历视图，也包含 Date、Time 和 DateTime 组件。它不附带任何 CSS，也不渲染带样式的标记，视觉完全由你掌控。0.3.0 版本为日历视图加入事件：布局、选择、"还有 N 个" 溢出提示和当前时间指示线。新的 `/date` 入口加入了日期输入框与面板；`/time` 入口加入了时间输入框与面板；`/datetime` 入口把它们组合起来。
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

## Events

把 `events` 传给 `createCalendar`，用 `getCellEventSegments(day)` 取得某个单元格的片段，并用 `getEventAttributes(segment)` 逐个写入。Chrono 计算泳道、列、溢出和延续标记；标记结构由你的模板决定。监听器采用委托：点击 `[data-chrono-event-key]` 选择，双击激活，`[data-overflow]` 触发 `onMoreActivate`。

```ts
for (const segment of calendar.controller.getCellEventSegments(day)) {
  const element = document.createElement("div");
  applyAttributes(element, calendar.controller.getEventAttributes(segment));
  cell.append(element);
}
```

| Method | Returns | Purpose |
| --- | --- | --- |
| `getCellEventSegments(day)` | segments | 某个日期单元格承载的片段。 |
| `getEventAttributes(segment)` | attributes | 事件属性与 `--chrono-event-*` 位置。 |
| `getMoreAttributes(day)` | attributes | “还有 N 个”按钮；`activateMore(day.key)` 触发。 |
| `getAllDayCellAttributes(day)` | attributes | 某个日期的全天单元格。 |
| `getSelectionPreviewAttributes(day)` | attributes | 某个日期的选择预览片段。 |
| `getNowIndicatorAttributes()` | attributes | 当前时间线，超出范围时为空。 |

事件位置是 `--chrono-event-*` 自定义属性中的无单位数字，单位与布局方式由你的 CSS 决定。`applyAttributes` 会把它们写入元素的 `style`。设置 `selectable` 后，范围创建从日历根节点开始。

## Date

五个相互独立、无样式的组件：`DateInput`、`DatePanel`、`DateRangeInput`、`DateRangePanel` 和 `MultiDatePanel`。它们可单独使用，也可通过共享的值配合使用，还可放进你选择的任何弹出层。Chrono 没有弹出层：打开、定位和关闭都由你的应用负责。

### Date quick start

让输入框和面板共享同一个值。输入会让面板跳到对应月份；选择某一天会填入输入框。

```html
<div id="check-in" data-chrono-date-input data-name="check-in"></div>
<div data-chrono-date-panel data-chrono-for="check-in"></div>

<script type="module">
  import { initDateElements } from "@zealakit/chrono-vanilla/date";

  const stop = initDateElements(document);
  document.addEventListener("chrono:valuecommit", (event) => {
    console.log(event.detail.value); // "2026-11-17"
  });
</script>
```

### API

所有部件都是可选的。不带子元素的面板或输入框会绘制默认布局；也可以自行组合这些部件。

| API | Purpose | Notes |
| --- | --- | --- |
| `initDateElements(root)` | Declarative setup | Reads `data-*` options, renders unstyled markup, returns a cleanup |
| `createDateInput`, `createDateRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createDatePanel`, `createDateRangePanel`, `createMultiDatePanel` | Controller-only panels | Click, key and hover on `[data-chrono-key]`; `syncFocus()` after render |

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

```html
<div id="opens" data-chrono-time-input data-name="opens"></div>
<div data-chrono-time-panel data-chrono-for="opens" data-step="15"></div>

<script type="module">
  import { initTimeElements } from "@zealakit/chrono-vanilla/time";

  const stop = initTimeElements(document);
  document.addEventListener("chrono:valuecommit", (event) => {
    console.log(event.detail.value); // "21:30"
  });
</script>
```

### Time API

所有部件都是可选的。不带子元素的面板会绘制默认布局。

| API | Purpose | Notes |
| --- | --- | --- |
| `initTimeElements(root)` | Declarative setup | Reads `data-*` options, renders unstyled markup, returns a cleanup |
| `createTimeInput`, `createTimeRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createTimePanel`, `createTimeRangePanel` | Controller-only panels | Click, key and hover on `[role="option"]`; `syncFocus()` after render |

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

```html
<div id="at" data-chrono-datetime-input data-time-zone="Asia/Ho_Chi_Minh" data-name="at"></div>
<div data-chrono-datetime-panel data-chrono-for="at" data-time-zone="Asia/Ho_Chi_Minh" data-disable-past data-default-time="09:00"></div>

<script type="module">
  import { initDateTimeElements } from "@zealakit/chrono-vanilla/datetime";

  const stop = initDateTimeElements(document);
  document.addEventListener("chrono:valuecommit", (event) => {
    console.log(event.detail.value); // "2026-11-17T09:30:00+07:00[Asia/Ho_Chi_Minh]"
  });
</script>
```

### DateTime API

容器提供 Date 与 Time 的上下文；其中的网格、单元格、列和选项是你从 `/date` 和 `/time` 导入的部件。不带子元素的 `DateTimePanel` 会绘制默认布局。

| API | Purpose | Notes |
| --- | --- | --- |
| `initDateTimeElements(root)` | Declarative setup | Reads `data-*` options, renders the date and time markup, returns a cleanup |
| `createDateTimeInput`, `createDateTimeRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createDateTimePanel`, `createDateTimeRangePanel` | Controller-only panels | Date and time hosts: `[data-chrono-datetime-date]`, `[data-chrono-datetime-time]` |

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

[Chrono Vanilla 技能](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) 介绍面向 agent 的集成步骤。

## License

MIT © Zealakit
