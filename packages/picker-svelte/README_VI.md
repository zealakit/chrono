# @zealakit/chrono-picker-svelte

[English](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Các picker ngày, giờ và ngày-giờ (kèm bản range) dựng sẵn cho Svelte: một input Chrono, một popover Overlay và một panel Chrono được ghép giúp bạn. Bạn sở hữu toàn bộ styling.

Picker không kèm CSS và không đặt style hiển thị. Các part render chính element và class của bạn; trạng thái được phơi bày qua thuộc tính `data-*` và ARIA. Nó chỉ dùng API công khai của Chrono và Overlay, nên bạn luôn có thể tự ghép cùng thứ đó.

Trước 1.0: API có thể thay đổi giữa các bản minor.

> **Note**
> Package này là tùy chọn. Nó kết hợp `@zealakit/chrono-svelte` và `@zealakit/overlay-svelte`, và là package Chrono duy nhất làm việc với Overlay. Core và bốn adapter không bao giờ phụ thuộc Overlay.
>
> Chrono không phải thư viện UI đầy đủ hay design system. Với thư viện popup khác, hãy tự ghép input và panel của Chrono.

## Install

```bash
npm install @zealakit/chrono-svelte @zealakit/overlay-svelte @zealakit/chrono-picker-svelte
```

Peer dependencies: `@zealakit/chrono-svelte`, `@zealakit/overlay-svelte`, `svelte`. Cả hai peer đều bắt buộc; ứng dụng chọn phiên bản và dùng chung một bản với popover và dialog của chính nó.

## Picker

### Quick start

Đặt trường nhập, nút kích hoạt và popup trong một root. Root giữ giá trị và trạng thái mở; các part chỉ đọc chúng.

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

Mọi picker có cùng năm part, với cùng props như part mà nó bọc. Date, time và date-time đều có bản đơn và bản range.

| Part | Bọc | Ghi chú |
| --- | --- | --- |
| `Root` | state | Giá trị và trạng thái mở, cùng các option chung cho trường nhập và panel (`locale`, `timeZone`, `min`, `max`, `disabled`, `readOnly`, `now`). |
| `Input` | input Chrono | Trường nhập. `Alt+ArrowDown` mở popup; gõ phím không bao giờ mở. |
| `Trigger` | trigger Overlay | Một button có `aria-haspopup="dialog"` và `aria-expanded`. |
| `Content` | popup Overlay | `role="dialog"` có tên truy cập; chứa panel. |
| `Panel` | panel Chrono | Nhận focus khi mở; chọn xong sẽ commit và đóng. |

Các part là named export (`DatePickerRoot`, `DatePickerInput`, ...). Props của popover (`placement`, `offset`, `portal`, `animation`) đặt trên root và đến Overlay, nơi định vị theo trigger.

### Components

`DatePicker`, `DateRangePicker`, `TimePicker`, `TimeRangePicker`, `DateTimePicker` và `DateTimeRangePicker`.

### Root options

Các option giá trị được chuyển nguyên cho Chrono; các option mở được chuyển cho Overlay.

| Option | Kiểu | Mô tả |
| --- | --- | --- |
| `value`, `defaultValue` | giá trị Chrono | Controlled hoặc uncontrolled; `null` là một giá trị thật. |
| `onValueChange` | `(value) => void` | Mọi thay đổi, kể cả range chưa đủ. |
| `onValueCommit` | `(value) => void` | Một lựa chọn đã hoàn tất; popup đóng ngay sau đó. |
| `open`, `defaultOpen` | `boolean` | Hiển thị controlled hoặc uncontrolled. |
| `onOpenChange` | `(open, reason) => void` | `reason` là `trigger`, `input-key`, `outside-press`, `escape` hoặc `commit`. |

### Behavior

Khi mở, focus chuyển vào panel. Đóng sau khi chọn hoặc nhấn Escape sẽ trả focus về phần tử đã mở popup (trigger, hoặc trường nhập sau `Alt+ArrowDown`). Focus không bị giữ, và bấm vào trường nhập không bao giờ đóng popup. Với range, Escape đầu tiên hủy bản xem trước và lần tiếp theo đóng popup. Outside press của Overlay không biết trường nhập thuộc picker, nên picker tự quyết định.

## Agent Skill

[Skill Chrono Svelte](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) mô tả các bước tích hợp cho agent.

## License

MIT © Zealakit
