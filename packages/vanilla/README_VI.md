# @zealakit/chrono-vanilla

[English](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Các controller Calendar headless cho DOM thuần: view tháng, tuần, tuần làm việc, ngày, agenda, nhiều tháng và view tùy chỉnh, điều hướng và Mini Calendar. Bạn tự render markup và sở hữu toàn bộ styling.

Chrono không kèm CSS và không đặt style hiển thị. Các part render chính element và class của bạn; trạng thái được phơi bày qua thuộc tính `data-*` và ARIA, nên CSS của bạn quyết định mọi giao diện.

Trước 1.0: API có thể thay đổi giữa các bản minor.

> **Note**
> Chrono là bộ Calendar view headless tập trung và các component Date, Time và DateTime. Nó không kèm CSS và không render markup có kiểu dáng, nên mọi quyết định visual đều thuộc về bạn. Bản 0.3.0 thêm event vào các Calendar view: bố cục, chọn, tràn "+N more" và vạch thời gian hiện tại. Entry `/date` mới thêm input và panel ngày; entry `/time` thêm input và panel giờ; entry `/datetime` kết hợp chúng.
>
> Chrono không phải là một UI library hay design system đầy đủ, và không kèm code popup, overlay hay định vị. Khi cần, hãy đặt panel của Chrono bên trong popup của riêng bạn.

## Install

```bash
npm install @zealakit/chrono-vanilla
```

Không có peer dependency.

## Public API

| Export | Purpose |
| --- | --- |
| `createCalendar(root, options)` | Listener ủy quyền và controller cho calendar chính. Trả về `controller`, `getState`, `subscribe`, `setOptions`, `syncFocus` và `destroy`. |
| `createMiniCalendar(root, options)` | Tương tự cho Mini Calendar. |
| `applyAttributes(element, attributes)` | Gắn một record thuộc tính của controller lên element và gỡ các thuộc tính cũ. |
| `getCalendarTitle`, `getRange`, `getVisibleRange` | Utility thuần cho tiêu đề và range của một view. |
| `toPlainDate`, `toIsoString`, `isSameDay` | Hàm giá trị được re-export từ core. |

`controller` có cùng state và các getter thuộc tính như các adapter khác. Các record được mô tả ở mục Styling hooks.

## Markup

Bạn tự viết markup. Dùng `applyAttributes` để gắn từng record từ `calendar.controller` và thêm thuộc tính `data-chrono-action` cho nút hành động; các listener ủy quyền lo phần còn lại.

## Usage

### Quick start

Tạo một calendar rồi ghép các part của nó. Mọi part đều tùy chọn; chỉ render những gì bạn cần.

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

Mỗi domain có thể import từ root entry và từ subpath riêng. Cả hai cho cùng một binding, nên bạn có thể dùng lẫn lộn.

```ts
// Domain subpath
import { applyAttributes, createCalendar } from "@zealakit/chrono-vanilla/calendar";

// Root entry: re-exports every domain, same bindings
import { createCalendar, getCalendarTitle } from "@zealakit/chrono-vanilla";
```

Root cũng re-export các utility này, nên Server Component hoặc server action có thể gọi chúng mà không tải code component.

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

```ts
createCalendar(root, {
  views: { threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" } },
  defaultView: "threeDay",
});
```

### Controlled usage

Để trống `view` và `date` để dùng uncontrolled, hoặc tự điều khiển chúng. Calendar chỉ báo thay đổi và không bao giờ lưu trữ gì.

```ts
const calendar = createCalendar(root, { view: "month", date: "2026-11-17" });
// You own the value: report it with onViewChange / onDateChange, apply it with setOptions.
calendar.setOptions({ view: "week" });
```

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

### Mini Calendar

Mini Calendar có tháng riêng. Truyền `syncWith` và nó sẽ theo calendar chính khi ngày chính rời khỏi tháng của nó; người dùng vẫn có thể lật trang độc lập.

```ts
const mini = createMiniCalendar(miniRoot, {
  isMarked: (day) => hasEvents(day),
  onNavigate: (day) => calendar.controller.goTo(day),
});
calendar.subscribe((state) => mini.setOptions({ syncWith: { date: state.date, visibleRange: state.visibleRange } }));
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

```ts
createCalendar(root, { now, locale: "en-US", timeZone: "UTC" });
```

## Lifecycle

`createCalendar` thêm các listener ủy quyền `click`, `keydown` và `keyup` trên `root`. Gọi `syncFocus()` sau mỗi lần render để `tabindex` roving và focus bàn phím được giữ qua re-render, và `destroy()` để gỡ listener.

## Events

Truyền `events` cho `createCalendar`, render segment của một ô từ `getCellEventSegments(day)` và stamp từng cái bằng `getEventAttributes(segment)`. Chrono tính lane, cột, tràn và cờ tiếp nối; template của bạn quyết định markup. Listener được ủy quyền: click `[data-chrono-event-key]` để chọn, double-click để kích hoạt, `[data-overflow]` phát `onMoreActivate`.

```ts
for (const segment of calendar.controller.getCellEventSegments(day)) {
  const element = document.createElement("div");
  applyAttributes(element, calendar.controller.getEventAttributes(segment));
  cell.append(element);
}
```

| Method | Returns | Purpose |
| --- | --- | --- |
| `getCellEventSegments(day)` | segments | Các segment thuộc một ô ngày. |
| `getEventAttributes(segment)` | attributes | Thuộc tính event và vị trí `--chrono-event-*`. |
| `getMoreAttributes(day)` | attributes | Nút "+N more"; `activateMore(day.key)` kích hoạt. |
| `getAllDayCellAttributes(day)` | attributes | Ô all-day của một ngày. |
| `getSelectionPreviewAttributes(day)` | attributes | Một mảnh preview chọn cho một ngày. |
| `getNowIndicatorAttributes()` | attributes | Vạch thời gian hiện tại, rỗng khi ngoài tầm. |

Vị trí event là số không đơn vị trong các custom property `--chrono-event-*`, nên CSS của bạn quyết định đơn vị và cách bố trí. `applyAttributes` ghi chúng vào `style` của element. Tạo khoảng chọn bắt đầu trên root khi bật `selectable`.

### Move and resize

Đặt `editable` để cho phép di chuyển và đổi kích thước sự kiện. Chrono chỉ **đề xuất** thay đổi: `onEventChange(proposal)` nhận `{ kind, event, from, to, source }` và ứng dụng của bạn quyết định. Trả về `false` (hoặc một promise trả về `false`) để từ chối; giá trị khác là chấp nhận, và sự kiện giữ trạng thái `data-pending` cho đến khi `events` của bạn chứa thời gian mới (hoặc hết `pendingTimeout`, mặc định 10 giây). Chrono không bao giờ tự sửa `events`, lưu trữ hay đồng bộ.

```ts
const calendar = createCalendar(root, {
  editable: true,
  events,
  onEventChange: (change) => save(change),
});
// Per cell, next to the event segments:
const { controller } = calendar;
for (const segment of controller.getCellEventSegments(day)) {
  const element = document.createElement("div");
  applyAttributes(element, controller.getEventAttributes(segment));
  const handle = document.createElement("div");
  applyAttributes(handle, controller.getResizeHandleAttributes(segment, "end"));
  element.append(handle);
}
for (const piece of controller.getCellDragPreviewSegments(day)) {
  const ghost = document.createElement("div");
  applyAttributes(ghost, controller.getDragPreviewAttributes(piece));
}
```

Re-render from `calendar.subscribe`; the pointer and keyboard handling is already wired on `root`.

| Option | Mục đích |
| --- | --- |
| `editable`, `isEventEditable` | Bật chỉnh sửa cho cả lịch hoặc từng sự kiện. Mỗi sự kiện cũng có thể đặt `editable`, `movable` hoặc `resizable` là `false`. |
| `snapDuration`, `defaultTimedDuration` | Số phút để căn (mặc định: độ dài ô giờ) và độ dài của sự kiện cả ngày khi thả vào lưới giờ (mặc định 60). |
| `allowAllDayConversion` | Cho phép kéo giữa hàng cả ngày và lưới giờ (mặc định `true`). |
| `validateEventChange` | Trả về `false` để đánh dấu đích `data-invalid` và chặn việc thả. |
| `autoScroll`, `scrollContainer` | Cuộn vùng chứa khi con trỏ gần mép. |
| `keyboardShortcuts` | `M` di chuyển, `R` đổi cạnh cuối, `Shift+R` đổi cạnh đầu; `false` tắt chúng. Phím mũi tên di chuyển từng bước, `Enter` thả, `Escape` hủy. |

`getResizeHandleAttributes` gắn tay nắm trong sự kiện, và `getCellDragPreviewSegments` cung cấp một mảnh xem trước `aria-hidden` cho mỗi ô được phủ trong lúc kéo. Chrono chỉ ghi trạng thái `data-*` và số `--chrono-*`: hãy đặt `touch-action: none` cho sự kiện và tay nắm trong CSS của bạn, và tự tạo kiểu cho `[data-dragging]`, `[data-pending]` và `[data-invalid]`. Cần di chuyển 4 px mới bắt đầu kéo (cảm ứng cần giữ 400 ms), nên nhấp vẫn chọn sự kiện.

## Date

Năm component độc lập, không style: `DateInput`, `DatePanel`, `DateRangeInput`, `DateRangePanel` và `MultiDatePanel`. Chúng chạy riêng lẻ, cùng nhau qua một giá trị chung và bên trong bất kỳ popup nào bạn chọn. Chrono không có popup: mở, định vị và đóng đều thuộc về app của bạn.

### Date quick start

Dùng chung một giá trị giữa ô nhập và panel. Gõ sẽ đưa panel tới tháng đó; chọn một ngày sẽ điền vào ô nhập.

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

Mọi part đều tùy chọn. Panel hoặc input không có children sẽ vẽ bố cục mặc định; hãy ghép các part theo ý bạn.

| API | Purpose | Notes |
| --- | --- | --- |
| `initDateElements(root)` | Declarative setup | Reads `data-*` options, renders unstyled markup, returns a cleanup |
| `createDateInput`, `createDateRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createDatePanel`, `createDateRangePanel`, `createMultiDatePanel` | Controller-only panels | Click, key and hover on `[data-chrono-key]`; `syncFocus()` after render |

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

Mọi part đều tùy chọn. Panel không có children sẽ vẽ bố cục mặc định.

| API | Purpose | Notes |
| --- | --- | --- |
| `initTimeElements(root)` | Declarative setup | Reads `data-*` options, renders unstyled markup, returns a cleanup |
| `createTimeInput`, `createTimeRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createTimePanel`, `createTimeRangePanel` | Controller-only panels | Click, key and hover on `[role="option"]`; `syncFocus()` after render |

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

Các container cung cấp context Date và Time; lưới, ô, cột và mục bên trong là các part bạn import từ `/date` và `/time`. `DateTimePanel` không có children sẽ vẽ bố cục mặc định.

| API | Purpose | Notes |
| --- | --- | --- |
| `initDateTimeElements(root)` | Declarative setup | Reads `data-*` options, renders the date and time markup, returns a cleanup |
| `createDateTimeInput`, `createDateTimeRangeInput` | Controller-only fields | Delegated listeners; you render and call `applyAttributes` |
| `createDateTimePanel`, `createDateTimeRangePanel` | Controller-only panels | Date and time hosts: `[data-chrono-datetime-date]`, `[data-chrono-datetime-time]` |

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

[Skill Chrono Vanilla](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) mô tả các bước tích hợp cho agent.

## License

MIT © Zealakit
