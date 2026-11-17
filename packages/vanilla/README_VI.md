# @zealakit/chrono-vanilla

[English](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Các controller Calendar headless cho DOM thuần: view tháng, tuần, tuần làm việc, ngày, agenda, nhiều tháng và view tùy chỉnh, điều hướng và Mini Calendar. Bạn tự render markup và sở hữu toàn bộ styling.

Chrono không kèm CSS và không đặt style hiển thị. Các part render chính element và class của bạn; trạng thái được phơi bày qua thuộc tính `data-*` và ARIA, nên CSS của bạn quyết định mọi giao diện.

Trước 1.0: API có thể thay đổi giữa các bản minor.

> **Note**
> Chrono là bộ Calendar view headless tập trung và, ở các bản sau, các component Date, Time và DateTime. Nó không kèm CSS và không render markup có kiểu dáng, nên mọi quyết định visual đều thuộc về bạn. Bản 0.3.0 thêm event vào các Calendar view: bố cục, chọn, tràn "+N more" và vạch thời gian hiện tại. Input và panel cho ngày/giờ chưa được triển khai.
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
