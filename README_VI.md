# Zealakit Chrono

[English](https://github.com/zealakit/chrono/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Các component calendar và date/time headless để xây trải nghiệm lập lịch và chọn ngày tùy biến hoàn toàn bằng Vanilla TypeScript, React, Vue và Svelte.

- **Domain độc lập** — Calendar, Date, Time và DateTime, mỗi domain dùng riêng được.
- **Core** — kernel dùng chung nội bộ cho logic date/time, được đóng gói sẵn trong mọi adapter và không publish riêng.
- **Adapter** — một package cho mỗi framework, mỗi package có root entry và một subpath cho mỗi domain.

Chrono là hạ tầng UI. Nó đề xuất thay đổi như một khoảng ngày được chọn hay một sự kiện được di chuyển; nó không bao giờ lưu trữ, fetch dữ liệu hay áp dụng business rule, và không kèm style hay theme.

> **Note**
> Chrono là bộ Calendar view headless tập trung và, ở các bản sau, các component Date, Time và DateTime. Nó không kèm CSS và không render markup có kiểu dáng, nên mọi quyết định visual đều thuộc về bạn. Bản 0.3.0 thêm event vào các Calendar view: bố cục, chọn, tràn "+N more" và vạch thời gian hiện tại. Entry `/date` mới thêm input và panel ngày; input và panel giờ chưa được triển khai.
>
> Chrono không phải là một UI library hay design system đầy đủ, và không kèm code popup, overlay hay định vị. Khi cần, hãy đặt panel của Chrono bên trong popup của riêng bạn.

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/chrono-core` | Kernel nội bộ (đóng gói sẵn, không có trên npm) | [README](https://github.com/zealakit/chrono/blob/main/packages/core/README_VI.md) |
| `@zealakit/chrono-vanilla` | Vanilla JS / TS — 0.3.0 — Calendar view và event | [README](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) |
| `@zealakit/chrono-react` | React 18 / 19 — 0.3.0 — Calendar view và event | [README](https://github.com/zealakit/chrono/blob/main/packages/react/README_VI.md) |
| `@zealakit/chrono-vue` | Vue 3.5+ — 0.3.0 — Calendar view và event | [README](https://github.com/zealakit/chrono/blob/main/packages/vue/README_VI.md) |
| `@zealakit/chrono-svelte` | Svelte 5.20+ — 0.3.0 — Calendar view và event | [README](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_VI.md) |

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
- **Input và panel ngày** — `DateInput` và `DateRangeInput` dạng ô hoặc dạng text, `DatePanel`, `DateRangePanel` và `MultiDatePanel`, preset khoảng ngày, giá trị form ẩn và hỗ trợ bàn phím, không kèm popup.

Chưa có: input và panel giờ và ngày-giờ, di chuyển và đổi kích thước event, resource và recurrence. Chúng sẽ có ở các bản sau.

## Examples

Thư mục [`examples/`](https://github.com/zealakit/chrono/blob/main/examples) chứa các dự án tích hợp cho Vanilla, React, Vue, Svelte và Next.js: một giao diện giống Outlook với CSS thuần. Chúng import package workspace đã build, nên hãy build trước.

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Agent Skills

Thêm skill tích hợp cho framework của bạn vào thư mục skills của agent:

- [Chrono React](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) — Component, controlled state, styling hook và Server Component.
- [Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) — Component, state v-model và ghi chú Nuxt.
- [Chrono Svelte](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) — Component, snippet, state bind và ghi chú SvelteKit.
- [Chrono Vanilla](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) — Controller, listener ủy quyền và lifecycle.

## License

MIT © Zealakit
