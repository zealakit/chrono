# Zealakit Chrono

[English](https://github.com/zealakit/chrono/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Các component calendar và date/time headless để xây trải nghiệm lập lịch và chọn ngày tùy biến hoàn toàn bằng Vanilla TypeScript, React, Vue và Svelte.

- **Domain độc lập** — Calendar, Date, Time và DateTime, mỗi domain dùng riêng được.
- **Core** — kernel dùng chung nội bộ cho logic date/time, được đóng gói sẵn trong mọi adapter và không publish riêng.
- **Adapter** — một package cho mỗi framework, mỗi package có root entry và một subpath cho mỗi domain.

Chrono là hạ tầng UI. Nó đề xuất thay đổi như một khoảng ngày được chọn hay một sự kiện được di chuyển; nó không bao giờ lưu trữ, fetch dữ liệu hay áp dụng business rule, và không kèm style hay theme.

> **Note**
> Chrono là bộ Calendar view headless tập trung và các component Date, Time và DateTime. Nó không kèm CSS và không render markup có kiểu dáng, nên mọi quyết định visual đều thuộc về bạn. Bản 0.8.0 thêm sự kiện lặp dưới dạng pack tùy chọn (rule RFC 5545, ngoại lệ, override và helper áp dụng this/following/all), resource view và chỉnh sửa bằng kéo thả. Một mô hình availability (giờ mở cửa, nghỉ trưa, ngày lễ, lead time) tô nền calendar và chặn đúng những thời điểm đó trong mọi picker. Entry `/date` mới thêm input và panel ngày; entry `/time` thêm input và panel giờ; entry `/datetime` kết hợp chúng.
>
> Chrono không phải là một UI library hay design system đầy đủ, và không kèm code popup, overlay hay định vị. Khi cần, hãy đặt panel của Chrono bên trong popup của riêng bạn.

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/chrono-core` | Kernel nội bộ (đóng gói sẵn, không có trên npm) | [README](https://github.com/zealakit/chrono/blob/main/packages/core/README_VI.md) |
| `@zealakit/chrono-vanilla` | Vanilla JS / TS — 0.8.0 — Calendar view và event | [README](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) |
| `@zealakit/chrono-react` | React 18 / 19 — 0.8.0 — Calendar view và event | [README](https://github.com/zealakit/chrono/blob/main/packages/react/README_VI.md) |
| `@zealakit/chrono-vue` | Vue 3.5+ — 0.8.0 — Calendar view và event | [README](https://github.com/zealakit/chrono/blob/main/packages/vue/README_VI.md) |
| `@zealakit/chrono-svelte` | Svelte 5.20+ — 0.8.0 — Calendar view và event | [README](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_VI.md) |
| `@zealakit/chrono-picker-vanilla` | Vanilla JS / TS — 0.8.0 — Picker ngày, giờ và ngày-giờ (tùy chọn, cần Overlay) | [README](https://github.com/zealakit/chrono/blob/main/packages/picker-vanilla/README_VI.md) |
| `@zealakit/chrono-picker-react` | React 18 / 19 — 0.8.0 — Picker ngày, giờ và ngày-giờ (tùy chọn, cần Overlay) | [README](https://github.com/zealakit/chrono/blob/main/packages/picker-react/README_VI.md) |
| `@zealakit/chrono-picker-vue` | Vue 3.5+ — 0.8.0 — Picker ngày, giờ và ngày-giờ (tùy chọn, cần Overlay) | [README](https://github.com/zealakit/chrono/blob/main/packages/picker-vue/README_VI.md) |
| `@zealakit/chrono-picker-svelte` | Svelte 5.20+ — 0.8.0 — Picker ngày, giờ và ngày-giờ (tùy chọn, cần Overlay) | [README](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README_VI.md) |

Cài một adapter cho framework của bạn và import từ root entry hoặc từ subpath của domain như `/calendar`. Mỗi adapter đóng gói sẵn `@zealakit/chrono-core`; bạn không bao giờ cài core trực tiếp. API có thể thay đổi giữa các bản minor cho đến 1.0.

## Installation

```bash
npm i @zealakit/chrono-vanilla
npm i @zealakit/chrono-react
npm i @zealakit/chrono-vue
npm i @zealakit/chrono-svelte

# or yarn, pnpm, ...
```

## Available now

- **Calendar view** — tháng, tuần, tuần làm việc, ngày, agenda, nhiều tháng và view tùy chỉnh, kèm điều hướng, tiêu đề, số tuần và hỗ trợ bàn phím.
- **Mini Calendar** — calendar tháng đồng bộ với calendar chính và đánh dấu các ngày bạn chọn.
- **Event** — bố cục trong mọi view (lane tháng, cột time-grid, hàng all-day và agenda), tràn "+N more", vạch thời gian hiện tại, focus bàn phím trên event và tạo khoảng chọn.
- **Chỉnh sửa** — kéo, thả và thay đổi kích thước trong view tháng, time grid và hàng all-day; Chrono chỉ đề xuất thay đổi và app của bạn lưu.
- **Resource view** — pack `resourceViews` tùy chọn: resource time-grid và timeline, nhóm, thu gọn và zoom.
- **Sự kiện lặp** — pack `recurrence` tùy chọn: tập con RFC 5545, EXDATE/RDATE, override, helper áp dụng theo scope và mở rộng phía server.
- **Input và panel ngày** — `DateInput` và `DateRangeInput` dạng ô hoặc dạng text, `DatePanel`, `DateRangePanel` và `MultiDatePanel`, preset khoảng ngày, giá trị form ẩn và hỗ trợ bàn phím, không kèm popup.
- **Input và panel giờ** — `TimeInput` và `TimeRangeInput` dạng ô hoặc dạng text, `TimePanel` và `TimeRangePanel` dạng cột hoặc danh sách slot, 12/24 giờ, bước phút, khoảng giờ qua đêm và giá trị form ẩn, không kèm ngày và popup.
- **Input và panel ngày-giờ** — `DateTimeInput` và `DateTimeRangeInput`, `DateTimePanel` và `DateTimeRangePanel` kết hợp các part Date và Time, có múi giờ, xử lý giờ mùa hè, `disablePast` và một quy tắc commit.

Chưa có: UI chỉnh sửa recurrence, mô tả recurrence bằng ngôn ngữ tự nhiên, di chuyển event giữa resource và mô hình bàn phím treegrid. Chúng sẽ có ở các bản sau.

## Examples

Thư mục [`examples/`](https://github.com/zealakit/chrono/blob/main/examples) chứa các dự án tích hợp cho Vanilla, React, Vue, Svelte và Next.js: một giao diện giống Outlook với CSS thuần. Chúng import package workspace đã build, nên hãy build trước.

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Compatibility

**API công khai** (từ 1.0) gồm mọi export của một entry adapter, props và sự kiện của component, các thuộc tính `data-*` và vai trò ARIA đã được tài liệu hóa, mọi custom property `--chrono-*`, hành vi bàn phím đã được tài liệu hóa và các kiểu giá trị. Thay đổi phá vỡ chỉ xuất hiện ở phiên bản major, và đổi tên hay xóa một thuộc tính `data-*` hoặc custom property được tính là phá vỡ. Một tính năng bị deprecated được thông báo ở bản minor kèm cảnh báo trong môi trường phát triển và ghi chú trong README, sớm nhất là bị gỡ ở bản major kế tiếp. Phần nội bộ của core, `src/shared/`, cấu trúc tệp trong `dist` và nội dung chính xác của cảnh báo phát triển không thuộc API công khai.

**Môi trường được hỗ trợ:** hai phiên bản gần nhất của Chrome, Edge, Firefox và Safari, cùng iOS Safari và Android Chrome hiện tại. React 18 và 19, Vue 3.5 trở lên, Svelte 5.

## Agent Skills

Thêm skill tích hợp cho framework của bạn vào thư mục skills của agent:

- [Chrono React](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) — Component, controlled state, styling hook và Server Component.
- [Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) — Component, state v-model và ghi chú Nuxt.
- [Chrono Svelte](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) — Component, snippet, state bind và ghi chú SvelteKit.
- [Chrono Vanilla](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) — Controller, listener ủy quyền và lifecycle.

## License

MIT © Zealakit
