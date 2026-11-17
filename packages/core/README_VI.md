# @zealakit/chrono-core

[English](https://github.com/zealakit/chrono/blob/main/packages/core/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/core/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/core/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/cover.svg?raw=true)

Kernel calendar và date/time nội bộ cho mọi adapter của Zealakit Chrono. Core là private và không bao giờ được publish lên npm: mỗi adapter đóng gói sẵn bản sao riêng, nên code ứng dụng dùng adapter cho framework của mình. Tài liệu này dành cho người đóng góp làm việc trong monorepo.

Core không render gì, không kèm CSS và không có runtime dependency.

> **Note**
> Chrono đang được phát triển và chưa có public API; chưa có package nào được phát hành lên npm. Chrono sẽ cung cấp các khả năng Calendar, Date, Time và DateTime độc lập, kết hợp được, không kèm CSS, nên mọi quyết định visual đều thuộc về bạn.
>
> Chrono không phải là một UI library hay design system đầy đủ, và không kèm code popup, overlay hay định vị. Khi cần, hãy đặt panel của Chrono bên trong popup của riêng bạn.

## Install

```bash
pnpm --filter @zealakit/chrono-core run build
```

Core không có trên npm nên không thể cài đặt. Nó được build trong workspace và, khi phát hành, được sao chép vào tarball của mỗi adapter tại `dist/vendor/core`.

## Public API

Chưa có public API. Component sẽ có ở các giai đoạn sau; mục này liệt kê chúng khi phát hành.

## License

MIT © Zealakit
