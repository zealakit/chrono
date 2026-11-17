# Zealakit Chrono

[English](https://github.com/zealakit/chrono/blob/main/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg)

Các component calendar và date/time headless để xây trải nghiệm lập lịch và chọn ngày tùy biến hoàn toàn bằng Vanilla TypeScript, React, Vue và Svelte.

- **Domain độc lập** — Calendar, Date, Time và DateTime, mỗi domain dùng riêng được.
- **Core** — kernel dùng chung nội bộ cho logic date/time, được đóng gói sẵn trong mọi adapter và không publish riêng.
- **Adapter** — một package cho mỗi framework, mỗi package có root entry và một subpath cho mỗi domain.

Chrono là hạ tầng UI. Nó đề xuất thay đổi như một khoảng ngày được chọn hay một sự kiện được di chuyển; nó không bao giờ lưu trữ, fetch dữ liệu hay áp dụng business rule, và không kèm style hay theme.

> **Note**
> Chrono đang được phát triển và chưa có public API; chưa có package nào được phát hành lên npm. Chrono sẽ cung cấp các khả năng Calendar, Date, Time và DateTime độc lập, kết hợp được, không kèm CSS, nên mọi quyết định visual đều thuộc về bạn.
>
> Chrono không phải là một UI library hay design system đầy đủ, và không kèm code popup, overlay hay định vị. Khi cần, hãy đặt panel của Chrono bên trong popup của riêng bạn.

## Packages

| Package | Framework/Runtime | Documentation |
| --- | --- | --- |
| `@zealakit/chrono-core` | Kernel nội bộ (đóng gói sẵn, không có trên npm) | [README](https://github.com/zealakit/chrono/blob/main/packages/core/README_VI.md) |
| `@zealakit/chrono-vanilla` | Vanilla JS / TS — Đang phát triển | [README](https://github.com/zealakit/chrono/blob/main/packages/vanilla/README_VI.md) |
| `@zealakit/chrono-react` | React 18 / 19 — Đang phát triển | [README](https://github.com/zealakit/chrono/blob/main/packages/react/README_VI.md) |
| `@zealakit/chrono-vue` | Vue 3.5+ — Đang phát triển | [README](https://github.com/zealakit/chrono/blob/main/packages/vue/README_VI.md) |
| `@zealakit/chrono-svelte` | Svelte 5 — Đang phát triển | [README](https://github.com/zealakit/chrono/blob/main/packages/svelte/README_VI.md) |

Chưa có package nào được phát hành. Khi phát hành, bạn cài một adapter cho framework của mình và import từ root entry hoặc từ subpath của domain: `/calendar`, `/date`, `/time` hoặc `/datetime`. Mỗi adapter đóng gói sẵn `@zealakit/chrono-core`; bạn không bao giờ cài core trực tiếp.

## Examples

Thư mục [`examples/`](https://github.com/zealakit/chrono/blob/main/examples) chứa các dự án tích hợp cho Vanilla, React, Vue, Svelte và Next.js. Chúng import package workspace đã build, nên hãy build trước.

```bash
pnpm install
pnpm build
pnpm dev:vanilla   # or dev:react, dev:vue, dev:svelte, dev:nextjs
```

## Agent Skills

Skill tích hợp cho agent sẽ được phát hành ở đây khi từng framework có component:

- [Chrono React](https://github.com/zealakit/chrono/blob/main/skills/chrono-react.md) — chưa có.
- [Chrono Vue](https://github.com/zealakit/chrono/blob/main/skills/chrono-vue.md) — chưa có.
- [Chrono Svelte](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) — chưa có.
- [Chrono Vanilla](https://github.com/zealakit/chrono/blob/main/skills/chrono-vanilla.md) — chưa có.

## License

MIT © Zealakit
