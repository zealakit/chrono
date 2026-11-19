# @zealakit/chrono-vue

[English](https://github.com/zealakit/chrono/blob/main/packages/vue/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vue/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vue/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Các component Calendar headless cho Vue: view tháng, tuần, tuần làm việc, ngày, agenda, nhiều tháng và view tùy chỉnh, điều hướng và Mini Calendar. Bạn sở hữu toàn bộ styling.

Chrono không kèm CSS và không đặt style hiển thị. Các part render chính element và class của bạn; trạng thái được phơi bày qua thuộc tính `data-*` và ARIA, nên CSS của bạn quyết định mọi giao diện.

Trước 1.0: API có thể thay đổi giữa các bản minor.

> **Note**
> Chrono là bộ Calendar view headless tập trung và các component Date, Time và DateTime. Nó không kèm CSS và không render markup có kiểu dáng, nên mọi quyết định visual đều thuộc về bạn. Bản 0.8.0 thêm sự kiện lặp dưới dạng pack tùy chọn. Entry `/date` mới thêm input và panel ngày; entry `/time` thêm input và panel giờ; entry `/datetime` kết hợp chúng.
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

## Events

Truyền `events` và render segment của từng ô bằng `CalendarEvents` và `CalendarEvent`; Chrono tính lane, cột, tràn và cờ tiếp nối, bạn render nội dung. Dùng `event-limit="auto"` để đo ô hiển thị và lắng nghe `select-range` cho kéo-tạo.

```vue
<Calendar :events="events" event-limit="auto" @select-range="create">
  <CalendarMonthGrid>
    <template #default="{ day }">
      <CalendarEvents :day="day">
        <template #default="{ segments }">
          <CalendarEvent v-for="segment in segments" :key="segment.key" :segment="segment" />
        </template>
      </CalendarEvents>
    </template>
  </CalendarMonthGrid>
</Calendar>
```

| Part | Renders | Purpose |
| --- | --- | --- |
| `CalendarEvents` | `div` | Danh sách event của một ô; scoped slot nhận segment của ô đó. |
| `CalendarEvent` | `div` | Một segment, với `segment.event` là object gốc của bạn. |
| `CalendarMoreButton` | `button` | Nút "+N more"; phát `moreActivate`. |
| `CalendarAllDayRow` | `div` | Hàng all-day của time grid; scoped slot nhận `{ days, segments }`. |
| `CalendarNowIndicator` | `div` | Vạch thời gian hiện tại, chỉ render khi nằm trong trục. |
| `CalendarSelectionPreview` | `div` | Một mảnh preview chọn cho mỗi ngày bị phủ. |

Vị trí event là số không đơn vị trong các custom property `--chrono-event-*`, nên CSS của bạn quyết định đơn vị và cách bố trí. `Enter` hoặc `F2` vào event của một ô, `Space` chọn, `Enter` kích hoạt và `Escape` quay về ngày.

### Recurring events

Sự kiện lặp là một **pack tùy chọn**: import `recurrence` và truyền vào option `recurrence`. App không import pack sẽ giữ kích thước cơ bản và chỉ thấy lần xuất hiện đầu tiên của mỗi chuỗi.

```vue
<script setup lang="ts">
import { Calendar, CalendarEvent, CalendarEvents, CalendarMonthGrid, recurrence } from "@zealakit/chrono-vue";
</script>

<template>
  <Calendar :recurrence="recurrence" :events="events">
    <CalendarMonthGrid>
      <template #default="{ day }">
        <CalendarEvents :day="day">
          <template #default="{ segments }">
            <CalendarEvent v-for="segment in segments" :key="segment.key" :segment="segment" />
          </template>
        </CalendarEvents>
      </template>
    </CalendarMonthGrid>
  </Calendar>
</template>
```

Cho một chuỗi một `rrule` (giá trị RFC 5545 hoặc rule đã parse), và tùy chọn `exdates` và `rdates`. Chrono hỗ trợ `FREQ` DAILY, WEEKLY, MONTHLY và YEARLY với `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY` (kể cả thứ tự như `-1FR`), `BYMONTHDAY`, `BYMONTH` và `WKST`. Phần nằm ngoài tập con đó sẽ quay về lần xuất hiện đầu tiên và gọi `onRecurrenceError(event, error)` một lần cho mỗi chuỗi và mã lỗi.

- Các lần xuất hiện giữ giờ tường của chuỗi theo `timeZone` hiển thị, nên stand-up 09:00 vẫn 09:00 khi qua DST.
- `COUNT` đếm các lần sinh ra trước `exdates`; `UNTIL` bao gồm mốc cuối. Ngày không hợp lệ (31 tháng 2) bị bỏ qua.
- Override là event có `recurringId` (id chuỗi) và `recurrenceId` (giờ bắt đầu gốc). Nó thay thế lần xuất hiện đó.
- `segment.recurrence` chứa `{ recurringId, occurrenceStart, isOverride, series }`; key của occurrence là `${seriesId}:${occurrenceStart}`.
- Chỉnh sửa vẫn là đề xuất: `onEventChange` cũng nhận `change.recurrence`. Hỏi người dùng muốn đổi lần này, lần này và các lần sau, hay tất cả, rồi gọi `applyRecurrenceChange` hoặc `applyRecurrenceDelete` và tự lưu các event trả về. Chrono không bao giờ ghi vào `events`.
- `expandRecurrence`, `parseRRule` và `stringifyRRule` là hàm thuần, nên có thể mở rộng cùng rule ở server.

### Move and resize

Đặt `editable` để cho phép di chuyển và đổi kích thước sự kiện. Chrono chỉ **đề xuất** thay đổi: `onEventChange(proposal)` nhận `{ kind, event, from, to, source }` và ứng dụng của bạn quyết định. Trả về `false` (hoặc một promise trả về `false`) để từ chối; giá trị khác là chấp nhận, và sự kiện giữ trạng thái `data-pending` cho đến khi `events` của bạn chứa thời gian mới (hoặc hết `pendingTimeout`, mặc định 10 giây). Chrono không bao giờ tự sửa `events`, lưu trữ hay đồng bộ.

```vue
<Calendar editable :events="events" :on-event-change="(change) => save(change)">
  <CalendarMonthGrid>
    <template #default="{ day }">
      <CalendarEvents :day="day">
        <template #default="{ segments }">
          <CalendarEvent v-for="segment in segments" :key="segment.key" :segment="segment">
            <CalendarEventResizeHandle :segment="segment" edge="end" />
          </CalendarEvent>
        </template>
      </CalendarEvents>
      <CalendarEventDragPreview :day="day" />
    </template>
  </CalendarMonthGrid>
</Calendar>
```

In Vue `onEventChange` is a prop, not an emitted event, so its return value reaches Chrono.

| Option | Mục đích |
| --- | --- |
| `editable`, `isEventEditable` | Bật chỉnh sửa cho cả lịch hoặc từng sự kiện. Mỗi sự kiện cũng có thể đặt `editable`, `movable` hoặc `resizable` là `false`. |
| `snapDuration`, `defaultTimedDuration` | Số phút để căn (mặc định: độ dài ô giờ) và độ dài của sự kiện cả ngày khi thả vào lưới giờ (mặc định 60). |
| `allowAllDayConversion` | Cho phép kéo giữa hàng cả ngày và lưới giờ (mặc định `true`). |
| `validateEventChange` | Trả về `false` để đánh dấu đích `data-invalid` và chặn việc thả. |
| `autoScroll`, `scrollContainer` | Cuộn vùng chứa khi con trỏ gần mép. |
| `keyboardShortcuts` | `M` di chuyển, `R` đổi cạnh cuối, `Shift+R` đổi cạnh đầu; `false` tắt chúng. Phím mũi tên di chuyển từng bước, `Enter` thả, `Escape` hủy. |

`CalendarEventResizeHandle` render tay nắm trong sự kiện, và `CalendarEventDragPreview` render một mảnh xem trước `aria-hidden` cho mỗi ô được phủ trong lúc kéo. Chrono chỉ ghi trạng thái `data-*` và số `--chrono-*`: hãy đặt `touch-action: none` cho sự kiện và tay nắm trong CSS của bạn, và tự tạo kiểu cho `[data-dragging]`, `[data-pending]` và `[data-invalid]`. Cần di chuyển 4 px mới bắt đầu kéo (cảm ứng cần giữ 400 ms), nên nhấp vẫn chọn sự kiện.

### Resources

Các view tài nguyên là một **gói view tùy chọn**: import `resourceViews` và truyền vào `views`, nên ứng dụng không dùng tài nguyên sẽ không phải tải mã này. Truyền `resources` (danh sách phẳng; `parentId` tạo cây) và gán `resourceId` cho sự kiện (một id, hoặc một mảng để hiện sự kiện ở nhiều tài nguyên). Chrono bố trí cột, hàng và sự kiện; ứng dụng của bạn sở hữu tài nguyên, quyền và quy tắc.

```vue
<Calendar :views="resourceViews" default-view="timelineWeek" :resources="rooms" :events="bookings">
  <CalendarTimeline v-slot="{ layout }">
    <CalendarTimelineRow v-for="row in layout.rows" :key="row.key" :row="row">
      <CalendarTimelineRowHeader :row="row" />
      <CalendarResourceEvent
        v-for="piece in layout.pieces.filter((p) => p.rowKey === row.key)"
        :key="piece.key"
        :piece="piece"
      />
    </CalendarTimelineRow>
  </CalendarTimeline>
</Calendar>
```

Collapse state is `v-model:collapsed-resource-ids`.

| View | Bố cục |
| --- | --- |
| `resourceDay`, `resourceWeek` | Cột là ngày × tài nguyên (`resourceGrouping`: `"resource-first"` hoặc `"date-first"`), mỗi cột được bố trí như một ngày lưới giờ thông thường. |
| `timelineDay`, `timelineWeek`, `timelineMonth` | Mỗi tài nguyên một hàng trên trục ngang. Định nghĩa đặt `slot` (`{ minutes }`, `{ days }` hoặc `{ weeks }`) và `headerRows` (ví dụ `["day", "hour"]`). |

Các part: `CalendarResourceGrid`, `CalendarResourceHeader`, `CalendarResourceGroupHeader`, `CalendarTimeline`, `CalendarTimelineHeaderCell`, `CalendarTimelineRow`, `CalendarTimelineRowHeader`, `CalendarTimelineCell` và `CalendarResourceEvent`.

Trong timeline, sự kiện mang `--chrono-event-left` và `--chrono-event-width` (tỉ lệ của trục), mỗi hàng mang `--chrono-row-lanes`, nên CSS của bạn quyết định kích thước. Tài nguyên có nhóm dùng mẫu `treegrid` (`aria-level`, `aria-expanded`); `collapsedResourceIds` (hoặc `toggleResource`) thu gọn một nhóm. `zoomLevels` liệt kê id view từ mịn nhất đến thô nhất cho `zoomIn()` và `zoomOut()`. `resourceWindow` và `slotWindow` (nửa mở) chỉ bố trí một cửa sổ và công bố tổng số, để virtualizer của ứng dụng điều khiển; Chrono không kèm virtualizer. Sự kiện không có `resourceId` không hiện trong view tài nguyên. Chưa có: kéo giữa các tài nguyên, giờ làm việc theo tài nguyên, `scrollToTime` và điều hướng phím mũi tên của treegrid.

## Date

Năm component độc lập, không style: `DateInput`, `DatePanel`, `DateRangeInput`, `DateRangePanel` và `MultiDatePanel`. Chúng chạy riêng lẻ, cùng nhau qua một giá trị chung và bên trong bất kỳ popup nào bạn chọn. Chrono không có popup: mở, định vị và đóng đều thuộc về app của bạn.

### Date quick start

Dùng chung một giá trị giữa ô nhập và panel. Gõ sẽ đưa panel tới tháng đó; chọn một ngày sẽ điền vào ô nhập.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DateInput, DatePanel } from "@zealakit/chrono-vue/date";
import type { DateValue } from "@zealakit/chrono-vue/date";

const value = ref<DateValue>(null);
</script>

<template>
  <DateInput v-model:value="value" name="check-in" />
  <DatePanel v-model:value="value" />
</template>
```

### Date parts

Mọi part đều tùy chọn. Panel hoặc input không có children sẽ vẽ bố cục mặc định; hãy ghép các part theo ý bạn.

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

`onValueChange` chạy ở mọi thay đổi, kể cả khoảng chọn dở dang. `onValueCommit` chạy khi lựa chọn hoàn tất: đã chọn một ngày, khoảng có đủ hai đầu, hoặc giá trị gõ hợp lệ khi blur hay Enter. Hãy đóng popup khi commit. Chọn nhiều ngày không tự commit; hãy gọi `commit()`.

### Date keyboard

Phím mũi tên, Home/End và PageUp/PageDown di chuyển focus. Enter hoặc Space để chọn (đảo chọn trong panel nhiều ngày; Shift+Enter thêm cả đoạn từ ngày trước). Ctrl hoặc Cmd cùng ArrowUp lên một cấp (ngày, tháng, năm). Escape hủy khoảng chọn dở dang, còn lại không xử lý để popup của bạn đóng được. Trong input, gõ số sẽ tự chuyển ô, ArrowUp và ArrowDown tăng giảm có vòng lặp, Backspace xóa một phần và ArrowLeft, ArrowRight chuyển giữa các phần (đảo chiều với ngôn ngữ phải sang trái).

### Forms and validity

Đặt `name` và root sẽ render một input ẩn mang giá trị ISO (`2026-11-17`). Khoảng ngày dùng `name-start` và `name-end` (hoặc `startName` và `endName`); panel nhiều ngày không phải là field. Reset form khôi phục `defaultValue`. Input không hợp lệ giữ nguyên nội dung đã gõ và báo `validity` (`empty`, `incomplete`, `invalid-date`, `before-min`, `after-max`, `disabled`, `unavailable`, `valid`) qua `aria-invalid` và `data-invalid`; nội dung lỗi do bạn viết.

### Range presets

`getPresetRange(preset, { today, weekStartsOn, fiscalYearStartMonth })` trả về khoảng ngày (gồm cả hai đầu) của `today`, `yesterday`, `last7Days`, `last30Days`, `thisWeek`, `lastWeek`, `thisMonth`, `lastMonth`, `thisQuarter`, `lastQuarter`, `yearToDate`, `thisYear`, `lastYear` hoặc preset tùy chỉnh `{ unit, amount, align }`. `matchPreset` cho biết preset nào khớp giá trị hiện tại, dùng cho `aria-pressed` trên nút của bạn. Preset chỉ là hàm thuần: nút do bạn tự làm.

### Popup recipes

Đặt panel vào bất kỳ thư viện popup nào: bật `autoFocus` để focus chuyển vào panel (mặc định tắt để panel inline không giành focus), đóng khi `onValueCommit` và để popup trả focus. Panel không chặn Escape trừ khi vừa hủy một khoảng chọn dở dang. Kiểu foundation `DateInput` được adapter xuất ra với tên `DateInputValue`, vì `DateInput` giờ là một component.

## Time

Bốn component độc lập, không style, không có ngày và không có múi giờ: `TimeInput`, `TimePanel`, `TimeRangeInput` và `TimeRangePanel`. Phù hợp với giờ mở cửa, giờ làm việc, lịch hằng ngày và khung giờ hẹn. Giống các component Date, chúng không có popup riêng.

### Time quick start

Dùng chung một giá trị giữa ô nhập dạng phân đoạn và panel. Gõ sẽ cập nhật panel; chọn một mục sẽ điền vào ô nhập.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TimeInput, TimePanel } from "@zealakit/chrono-vue/time";
import type { TimeValue } from "@zealakit/chrono-vue/time";

const value = ref<TimeValue>(null);
</script>

<template>
  <TimeInput v-model:value="value" name="opens" />
  <TimePanel v-model:value="value" :step="{ minutes: 15 }" />
</template>
```

### Time parts

Mọi part đều tùy chọn. Panel không có children sẽ vẽ bố cục mặc định.

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

`layout="columns"` hiện một listbox cho mỗi phần (giờ, phút, giây, buổi). `layout="list"` hiện một listbox các mốc giờ cách nhau `step`, hoặc các slot với `slotDuration` hay mảng `slots` tường minh (`{ start, end?, available?, data? }`). `data` của slot do bạn quyết định: đọc nó trong nội dung option. `groupBy` nhận `"hour"`, `"dayPeriod"` (nhãn lấy từ `Intl`) hoặc hàm của bạn. `granularity` là `hour`, `minute` hoặc `second`, `hourCycle` là `h12` hoặc `h23` (mặc định theo locale) và `step` đặt khoảng phút hoặc giây. Giờ hoặc mục không được phép vẫn focus được nhưng không chọn được.

### Overnight ranges

Khoảng giờ là nửa mở `[start, end)`. Với `allowOvernight`, `end` trước `start` nghĩa là ngày hôm sau (`23:00` đến `02:00`, `duration` 180 phút, `crossesMidnight` là true). `09:00` đến `09:00` luôn là `end-before-start`. `minDuration` và `maxDuration` (phút) đánh dấu các mục vi phạm bằng `data-range-blocked`. Trong danh sách, hai lần chọn tạo thành một khoảng: với `slotDuration`, điểm cuối là cuối của slot được chọn.

### Time keyboard

Một panel là một điểm dừng Tab. Với cột, mũi tên trái phải đổi cột, mũi tên lên xuống di chuyển trong cột, Home và End nhảy tới hai đầu, PageUp và PageDown di chuyển 3 giờ hoặc 15 phút, gõ số để nhảy nhanh (`1` rồi `5` focus vào 15) và Enter hoặc Space để chọn. Với danh sách, mũi tên lên xuống, Home, End, PageUp và PageDown di chuyển và gõ số để nhảy nhanh. Escape chỉ hủy khoảng chọn dở dang. Trong input, gõ số sẽ tự chuyển ô, ArrowUp và ArrowDown tăng giảm theo `step` có vòng lặp, và gõ `a` hoặc `p` (chữ cái đầu của nhãn địa phương hóa) để đặt buổi.

### Time forms and validity

Đặt `name` và root sẽ render một input ẩn với `09:30` (`09:30:15` khi `granularity="second"`); khoảng giờ dùng `name-start` và `name-end`. Giá trị đã gõ không bao giờ bị sửa: giá trị lệch `step` được giữ nguyên và báo `validity: "off-step"` (có `snapTime` nếu bạn muốn làm tròn khi blur). Các trạng thái khác là `empty`, `incomplete`, `before-min`, `after-max`, `disabled`, `unavailable`, `valid`, cùng `end-before-start`, `too-short` và `too-long` cho khoảng giờ. Ở chế độ text, `9`, `930`, `9:30`, `9.30`, `9h30`, `21:30`, `9:30 pm` và `9 PM` đều được hiểu.

### Time popup recipes

Đặt panel vào bất kỳ thư viện popup nào như panel Date: bật `autoFocus` trong popup, đóng khi `onValueCommit` (cột cuối của bộ cột kết thúc với khoảng giờ dạng cột) và để popup trả focus. Kiểu foundation `TimeInput` được adapter xuất ra với tên `TimeInputValue`, vì `TimeInput` giờ là một component. `BookingSlot` là kiểu slot (`TimeSlot` của foundation là slot trục thời gian của Calendar).

## DateTime

Bốn component kết hợp Date và Time: `DateTimeInput`, `DateTimePanel`, `DateTimeRangeInput` và `DateTimeRangePanel`. Chúng dùng lại controller và part của Date và Time, chỉ thêm phần cần cả hai: giới hạn chéo, múi giờ và giờ mùa hè. Không có popup và không có bộ chọn múi giờ; chọn múi giờ là UI của bạn.

### DateTime quick start

Một ô nhập và một panel dùng chung một giá trị. Có múi giờ thì giá trị là `ZonedDateTime`; không có thì là `PlainDateTime` giờ treo tường.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DateTimeInput, DateTimePanel } from "@zealakit/chrono-vue/datetime";
import type { DateTimeValue } from "@zealakit/chrono-vue/datetime";

const value = ref<DateTimeValue>(null);
</script>

<template>
  <DateTimeInput v-model:value="value" time-zone="Asia/Ho_Chi_Minh" value-time-zone="UTC" name="at" />
  <DateTimePanel v-model:value="value" time-zone="Asia/Ho_Chi_Minh" value-time-zone="UTC" disable-past default-time="09:00" />
</template>
```

### DateTime parts

Các container cung cấp context Date và Time; lưới, ô, cột và mục bên trong là các part bạn import từ `/date` và `/time`. `DateTimePanel` không có children sẽ vẽ bố cục mặc định.

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

`timeZone` là múi giờ người dùng thấy và chỉnh sửa. `valueTimeZone` (ví dụ `"UTC"`) là múi giờ của giá trị phát ra: cùng một thời điểm, lưu theo cách của bạn. `disambiguation` (`compatible`, `earlier`, `later`, `reject`) quyết định giờ rơi vào khoảng trống hoặc khoảng lặp của giờ mùa hè. Giờ trong khoảng trống giữ nguyên giờ đã gõ trên màn hình và đặt `data-adjusted`; với `reject` trạng thái là `nonexistent-time`. `getDayInstants` liệt kê các thời điểm thật của một ngày (giờ lặp xuất hiện hai lần kèm offset), còn `resolveWall` cho thấy một giờ treo tường được giải quyết ra sao.

### Limits, default time and commit

`min` và `max` nhận date-time: ngày ngoài khoảng bị vô hiệu hóa và, ở ngày biên, các giờ trước `min` hoặc sau `max`. `disablePast` đặt `min` là bây giờ theo `timeZone` (`now` có thể truyền vào). `isTimeDisabled(time, date)` nhận ngày đã chọn. `defaultTime` điền giờ khi chọn ngày trước, nên giá trị hoàn chỉnh ngay. Chọn ngày mới giữ nguyên giờ; nếu giờ đó bị vô hiệu hóa thì giá trị là `null` và mục được đánh dấu. `onValueCommit` chạy khi phần giờ commit, không bao giờ khi chọn ngày. Khoảng ngày-giờ commit khi giờ kết thúc commit; `minDuration` và `maxDuration` (phút) vô hiệu hóa giờ kết thúc vi phạm.

### DateTime forms and text mode

Đặt `name` và root sẽ render một input ẩn: giá trị ISO kèm offset với giá trị có múi giờ (`2026-11-17T09:30:00+07:00`), còn lại là `2026-11-17T09:30`. `formValue(value)` thay thế nó (ví dụ để gửi UTC). Khoảng dùng `name-start` và `name-end`. Ở chế độ phân đoạn, các phần ngày và giờ là một điểm dừng Tab; ở chế độ text có hai ô gốc có nhãn, mỗi ô tự phân tích, và dán cả date-time như `2026-11-17T09:30` hoặc `17/11/2026 9:30` sẽ điền cả hai.

### Which component do I need?

Hãy chọn component nhỏ nhất chứa được giá trị của bạn. `DateTimeInputValue` là kiểu foundation `DateTimeInput` (giờ đã có component trùng tên).

| I need | Use |
| --- | --- |
| A day | `DateInput`, `DatePanel` (`/date`) |
| A range of days or many days | `DateRangeInput`, `DateRangePanel`, `MultiDatePanel` (`/date`) |
| A time of day or a slot | `TimeInput`, `TimePanel` (`/time`) |
| Opening hours or a shift | `TimeRangeInput`, `TimeRangePanel` (`/time`) |
| A moment, with a time zone | `DateTimeInput`, `DateTimePanel` (`/datetime`) |
| A booking from a moment to a moment | `DateTimeRangeInput`, `DateTimeRangePanel` (`/datetime`) |
| Views of days with events | `Calendar`, `MiniCalendar` (`/calendar`) |

## Availability

Mô tả availability một lần và truyền qua `availability`; Chrono tô nền giờ đóng trong calendar và chặn đúng những thời điểm đó trong mọi picker. `blocked` thắng `open`, rule chạy theo `timeZone` của spec, và `leadTime`/`cutoffTime`/`bookingWindow` giới hạn thời điểm sớm nhất và xa nhất có thể chọn.

```vue
<script setup lang="ts">
import { CalendarBackground, useCalendarState } from "@zealakit/chrono-vue/calendar";
const state = useCalendarState();
</script>

<template>
  <Calendar :availability="{ blocked: [{ type: 'daily', start: '18:00', end: '08:00' }] }">
    <CalendarTimeGrid>
      <template #default>
        <CalendarBackground
          v-for="piece in state.value.backgrounds"
          :key="piece.key"
          :piece="piece"
        />
      </template>
    </CalendarTimeGrid>
  </Calendar>
</template>
```

| Option | Where | Purpose |
| --- | --- | --- |
| `availability` | Calendar và mọi part date/time/datetime | Một spec, một model đã compile, hoặc hàm nhận context của drag. |
| `backgrounds` | Calendar | `"unavailable"` (mặc định), `"available"`, `"both"` hoặc `false`. |
| `availabilityBlocksInteraction` | Calendar | Mặc định `true`; chọn và di chuyển qua giờ đóng là không hợp lệ. |
| `getResourceAvailability` | Calendar | Giờ riêng theo resource, cho resource view. |
| `getAvailabilityLabel` | Calendar | Câu chữ cho rule bị chặn (mặc định là `reason` của rule đầu). |

Chrono chỉ đề xuất; ứng dụng quyết định. Availability thật (phòng, nhân viên, tồn kho) thuộc data layer của bạn. Ô tháng có `data-unavailable` và `data-partially-available`; background piece là `aria-hidden` và mang `data-status`, `data-rule-id` cùng vị trí `--chrono-background-*`.

## Messages

Mọi tên truy cập và từ trạng thái đều là một message. Truyền `messages` với bất kỳ khóa nào dưới đây để ghi đè (các khóa còn lại giữ mặc định tiếng Anh). Giá trị có `{name}` phải giữ nguyên các placeholder.

| Key | Mặc định |
| --- | --- |
| `today` | `today` |
| `selected` | `selected` |
| `unavailable` | `unavailable` |
| `partiallyAvailable` | `partially available` |
| `disabled` | `disabled` |
| `rangeStart` | `range start` |
| `rangeEnd` | `range end` |
| `inRange` | `in range` |
| `previous` | `Previous` |
| `next` | `Next` |
| `goToToday` | `Today` |
| `calendar` | `Calendar` |
| `weekNumber` | `Week {number}` |
| `hasEvents` | `has events` |
| `events` | `events` |
| `moreEvents` | `{count} more events` |
| `allDay` | `All day` |
| `cellEvents` | `{count} events` |
| `selectionCreated` | `Selected {range}` |
| `selectionCancelled` | `Selection cancelled` |
| `eventSelected` | `Event selected` |
| `recurring` | `recurring event` |
| `editInstructions` | `Press M to move, R to resize` |
| `moving` | `Moving {event}, {range}` |
| `resizing` | `Resizing {event}, {range}` |
| `movedTo` | `Moved to {range}` |
| `resizedTo` | `Resized to {range}` |
| `changeCancelled` | `Change cancelled` |
| `notAllowedHere` | `Not allowed here` |
| `chooseMonth` | `Choose month` |
| `chooseYear` | `Choose year` |
| `clear` | `Clear` |
| `startDate` | `Start date` |
| `endDate` | `End date` |
| `selectedCount` | `{count} dates selected` |
| `placeholderDay` | `dd` |
| `placeholderMonth` | `mm` |
| `placeholderYear` | `yyyy` |
| `day` | `Day` |
| `month` | `Month` |
| `year` | `Year` |
| `empty` | `Empty` |
| `placeholderHour` | `hh` |
| `placeholderMinute` | `mm` |
| `placeholderSecond` | `ss` |
| `placeholderDayPeriod` | `--` |
| `hour` | `Hour` |
| `minute` | `Minute` |
| `second` | `Second` |
| `dayPeriod` | `AM/PM` |
| `startTime` | `Start time` |
| `endTime` | `End time` |
| `time` | `Time` |
| `date` | `Date` |
| `adjustedTime` | `adjusted for daylight saving time` |
| `timeZone` | `Time zone` |
| `startDateTime` | `Start date and time` |
| `endDateTime` | `End date and time` |

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

## Compatibility

**API công khai** (từ 1.0) gồm mọi export của một entry adapter, props và sự kiện của component, các thuộc tính `data-*` và vai trò ARIA đã được tài liệu hóa, mọi custom property `--chrono-*`, hành vi bàn phím đã được tài liệu hóa và các kiểu giá trị. Thay đổi phá vỡ chỉ xuất hiện ở phiên bản major, và đổi tên hay xóa một thuộc tính `data-*` hoặc custom property được tính là phá vỡ. Một tính năng bị deprecated được thông báo ở bản minor kèm cảnh báo trong môi trường phát triển và ghi chú trong README, sớm nhất là bị gỡ ở bản major kế tiếp. Phần nội bộ của core, `src/shared/`, cấu trúc tệp trong `dist` và nội dung chính xác của cảnh báo phát triển không thuộc API công khai.

**Môi trường được hỗ trợ:** hai phiên bản gần nhất của Chrome, Edge, Firefox và Safari, cùng iOS Safari và Android Chrome hiện tại. React 18 và 19, Vue 3.5 trở lên, Svelte 5.

## Agent Skill

[Skill Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) mô tả các bước tích hợp cho agent.

## License

MIT © Zealakit
