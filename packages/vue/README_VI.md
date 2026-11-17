# @zealakit/chrono-vue

[English](https://github.com/zealakit/chrono/blob/main/packages/vue/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vue/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vue/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Các component Calendar headless cho Vue: view tháng, tuần, tuần làm việc, ngày, agenda, nhiều tháng và view tùy chỉnh, điều hướng và Mini Calendar. Bạn sở hữu toàn bộ styling.

Chrono không kèm CSS và không đặt style hiển thị. Các part render chính element và class của bạn; trạng thái được phơi bày qua thuộc tính `data-*` và ARIA, nên CSS của bạn quyết định mọi giao diện.

Trước 1.0: API có thể thay đổi giữa các bản minor. Bản này chưa có event; các view hiển thị cấu trúc rỗng mà event sẽ lấp vào.

> **Note**
> Chrono là bộ Calendar view headless tập trung và, ở các bản sau, các component Date, Time và DateTime. Nó không kèm CSS và không render markup có kiểu dáng, nên mọi quyết định visual đều thuộc về bạn. Bản 0.2.0 có các Calendar view và Mini Calendar. Event, input và panel cho ngày/giờ chưa được triển khai.
>
> Chrono không phải là một UI library hay design system đầy đủ, và không kèm code popup, overlay hay định vị. Khi cần, hãy đặt panel của Chrono bên trong popup của riêng bạn.

## Install

```bash
npm install @zealakit/chrono-vue
```

Peer dependency: `vue` `^3.5.0`.

## Calendar

### Quick start

Tạo một calendar rồi ghép các part của nó. Mọi part đều tùy chọn; chỉ render những gì bạn cần.

```vue
<script setup lang="ts">
import {
  Calendar,
  CalendarMonthGrid,
  CalendarNextButton,
  CalendarPrevButton,
  CalendarTitle,
} from "@zealakit/chrono-vue";
</script>

<template>
  <Calendar locale="en-US" :week-starts-on="1">
    <CalendarPrevButton>Prev</CalendarPrevButton>
    <CalendarTitle />
    <CalendarNextButton>Next</CalendarNextButton>
    <CalendarMonthGrid class="month" />
  </Calendar>
</template>
```

### Import styles

Mỗi domain có thể import từ root entry và từ subpath riêng. Cả hai cho cùng một binding, nên bạn có thể dùng lẫn lộn.

```ts
// Domain subpath
import { Calendar, CalendarMonthGrid } from "@zealakit/chrono-vue/calendar";

// Root entry: re-exports every domain, same bindings
import { Calendar, getCalendarTitle } from "@zealakit/chrono-vue";
```

Root cũng re-export các utility này, nên Server Component hoặc server action có thể gọi chúng mà không tải code component.

### Parts

| Part | Renders | Purpose |
| --- | --- | --- |
| `Calendar` | `div` | Tạo calendar. Nhận các option bên dưới. |
| `CalendarTitle` | `h2` | Văn bản tiêu đề. Được thông báo nhẹ nhàng khi thay đổi. |
| `CalendarPrevButton`, `CalendarNextButton`, `CalendarTodayButton` | `button` | Điều hướng. Nút trước và sau có `aria-disabled` tại `min` và `max`. |
| `CalendarViewButton` | `button` | Chuyển sang `view` của nó. `aria-pressed` đánh dấu nút đang hoạt động. |
| `CalendarMonthGrid` | `table` | Tiêu đề thứ, số tuần tùy chọn và một ô cho mỗi ngày. `month` chọn lưới của view nhiều tháng. |
| `CalendarWeekdayHeader`, `CalendarWeekNumber`, `CalendarCell` | `th`, `th`, `td` | Các mảnh của lưới tháng. Dùng chúng để tự xây lưới. |
| `CalendarTimeGrid` | `div` | Cột ngày và khung giờ, chưa có event. |
| `CalendarTimeGridColumnHeader` | `div` | Tiêu đề ngày có thể focus của lưới thời gian. |
| `CalendarTimeGridSlot` | `div` | Một khung giờ của một ngày. Chưa thể focus. |
| `CalendarAgenda`, `CalendarAgendaDay` | `ul`, `li` | Danh sách agenda và các ngày của nó. |
| `MiniCalendar` | `div` | Một calendar tháng, có thể đồng bộ với calendar chính. |
| `MiniCalendarTitle`, `MiniCalendarPrevButton`, `MiniCalendarNextButton` | `h2`, `button`, `button` | Tiêu đề và lật trang của Mini Calendar. |
| `MiniCalendarGrid`, `MiniCalendarWeekdayHeader`, `MiniCalendarCell` | `table`, `th`, `td` | Lưới của Mini Calendar và các mảnh của nó. |

### Calendar options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `view` | `string` | — | Id view được điều khiển: `month`, `week`, `workWeek`, `day`, `agenda`, `multiMonth` hoặc view tùy chỉnh. |
| `defaultView` | `string` | `"month"` | View ban đầu khi uncontrolled. |
| `date` | `DateInput` | — | Ngày được điều khiển mà range được xây quanh. |
| `defaultDate` | `DateInput` | today | Ngày ban đầu khi uncontrolled. |
| `onViewChange` | `(view) => void` | — | View đã thay đổi. |
| `onDateChange` | `(date) => void` | — | Ngày mà range được xây quanh đã thay đổi. |
| `onVisibleRangeChange` | `(range, { view }) => void` | — | Chạy một lần sau khi mount và mỗi khi visible range thay đổi. Hãy tải event cho range này. |
| `onDateActivate` | `(date, { view, source }) => void` | — | Một ngày được click hoặc nhấn Enter. Calendar không làm gì thêm; bạn quyết định ý nghĩa. |
| `views` | `Record<string, ViewDefinition>` | — | View tùy chỉnh, gộp lên các view có sẵn. |
| `locale` | `string` | runtime locale | Thẻ BCP 47. Hãy truyền khi render phía server. |
| `weekStartsOn` | `1`–`7` | locale | Ngày đầu tuần, 1 = Thứ Hai. |
| `hiddenDays` | `DayOfWeek[]` | `[]` | Ẩn các thứ trong mọi layout. |
| `timeZone` | `string` | runtime zone | Múi giờ IANA dùng để xác định hôm nay là ngày nào. |
| `now` | `number` | `Date.now()` | Epoch millisecond dùng làm hiện tại. Hãy truyền khi render phía server. |
| `min`, `max` | `DateInput` | — | Giới hạn điều hướng. Các ngày ngoài khoảng được đánh dấu `data-disabled`. |
| `timeGrid` | `{ start, end, step, workingHours }` | 30-minute slots | Trục thời gian của lưới thời gian. `step` tính bằng phút; `workingHours` là `{ start, end, days }`. |
| `weekNumbers` | `"iso" \| "locale" \| false` | `false` | Hiện số tuần trong lưới tháng. |
| `messages` | `Partial<Messages>` | English | Tên truy cập và từ trạng thái. Chỉ có tiếng Anh; hãy truyền bản của bạn để dịch. |
| `selectedDate` | `DateInput` | — | Đánh dấu một ngày `data-selected`. Calendar không bao giờ đổi nó; bạn đặt nó, ví dụ từ `onDateActivate`. |
| `highlightedDates` | `DateInput[] \| (date) => boolean` | — | Đánh dấu các ngày `data-highlighted`. |

### Views

View là dữ liệu: một layout, một độ dài và một cách căn. Thêm view của bạn qua `views`.

| View | Layout | Range |
| --- | --- | --- |
| `month` | month | Một tháng kèm các ngày kề, 6 hàng. |
| `week` | time grid | Một tuần. |
| `workWeek` | time grid | Một tuần không có cuối tuần của locale. |
| `day` | time grid | Một ngày. |
| `agenda` | list | Bảy ngày kể từ ngày đó. |
| `multiMonth` | month | Ba tháng. |

```vue
<Calendar
  :views="{ threeDay: { layout: 'time-grid', length: { days: 3 }, align: 'day' } }"
  default-view="threeDay"
/>
```

### Controlled usage

Để trống `view` và `date` để dùng uncontrolled, hoặc tự điều khiển chúng. Calendar chỉ báo thay đổi và không bao giờ lưu trữ gì.

```vue
<script setup lang="ts">
const view = ref("month");
const date = ref(toPlainDate("2026-11-17"));
</script>

<template>
  <Calendar v-model:view="view" v-model:date="date" />
</template>
```

### Mini Calendar

Mini Calendar có tháng riêng. Truyền `syncWith` và nó sẽ theo calendar chính khi ngày chính rời khỏi tháng của nó; người dùng vẫn có thể lật trang độc lập.

```vue
<MiniCalendar
  :sync-with="range ? { date, visibleRange: range } : undefined"
  :is-marked="hasEvents"
  @navigate="(next) => (date = next)"
>
  <MiniCalendarPrevButton />
  <MiniCalendarTitle />
  <MiniCalendarNextButton />
  <MiniCalendarGrid />
</MiniCalendar>
```

`MiniCalendar` nhận `month` / `defaultMonth` / `onMonthChange`, `syncWith` (`{ date, visibleRange }` của calendar chính), `isMarked` (`(date) => boolean`, ví dụ các ngày có event), `onNavigate` (`(date) => void`) và các option dùng chung `locale`, `weekStartsOn`, `timeZone`, `now`, `min`, `max`, `weekNumbers`, `messages`, `selectedDate` và `highlightedDates`.

### Keyboard

| Key | Action |
| --- | --- |
| `←` `→` | Ngày trước hoặc sau. Đảo chiều trong locale phải sang trái. |
| `↑` `↓` | Tuần trước hoặc sau trong lưới tháng; ngày trước hoặc sau trong agenda. |
| `Home` `End` | Đầu hoặc cuối tuần, hoặc ngày đầu hoặc cuối của lưới thời gian hay agenda. |
| `PageUp` `PageDown` | Range trước hoặc sau (tháng, tuần, ...). Trong lưới tháng, `Shift` chuyển một năm. |
| `Enter` | Kích hoạt ngày đang focus (`onDateActivate`). |

### Server rendering

Truyền `now` và `locale` (và `timeZone`) để server và client render cùng một markup. Nếu không, Chrono đọc đồng hồ và locale của runtime, vốn khác nhau giữa server và trình duyệt.

```vue
<Calendar :now="now" locale="en-US" time-zone="UTC" />
```

## Nuxt

Không có gì chạm vào DOM khi render. Trong Nuxt, render calendar như bình thường và truyền `now` và `locale` từ server.

```ts
// Utilities have no browser dependency and run on the server.
import { getCalendarTitle, getRange } from "@zealakit/chrono-vue/calendar";
```

## Styling hooks

| Attribute | Where | Purpose |
| --- | --- | --- |
| `data-chrono-calendar` | root | Đánh dấu root của calendar. `data-view` và `data-layout` cho biết view và layout đang dùng. |
| `data-today` | cells, headers | Ngày là hôm nay. `aria-current="date"` cũng được đặt. |
| `data-selected`, `data-highlighted` | cells, headers | Được đặt từ `selectedDate` và `highlightedDates`. |
| `data-outside-month`, `data-weekend`, `data-hidden` | cells | Ngày nằm ngoài tháng đang hiển thị, vào cuối tuần, hoặc bị ẩn qua `hiddenDays`. |
| `data-focused` | cells, headers | Ngày giữ roving tabindex. Hãy style `:focus-visible` cho vòng focus bàn phím. |
| `data-disabled` | cells, nav buttons | Nằm ngoài `min` và `max`, hoặc không thể điều hướng thêm. `aria-disabled` cũng được đặt. |
| `data-marked`, `data-in-range` | Mini Calendar cells | Từ `isMarked`, và nằm trong visible range đã đồng bộ. |
| `data-slot-start`, `data-working-hours` | time grid slots | Giờ bắt đầu của khung giờ, và nó có nằm trong giờ làm việc không. |
| `data-chrono-key` | cells, headers | Ngày ISO của ô. Hữu ích cho test và listener ủy quyền. |

## Agent Skill

[Skill Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) mô tả các bước tích hợp cho agent.

## License

MIT © Zealakit
