# @zealakit/chrono-core

[English](https://github.com/zealakit/chrono/blob/main/packages/core/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/core/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/core/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Kernel calendar và date/time nội bộ cho mọi adapter của Zealakit Chrono. Core là private và không bao giờ được publish lên npm: mỗi adapter đóng gói sẵn bản sao riêng, nên code ứng dụng dùng adapter cho framework của mình. Tài liệu này dành cho người đóng góp làm việc trong monorepo.

Core không render gì, không kèm CSS và không có runtime dependency.

> **Note**
> Chrono là bộ Calendar view headless tập trung và, ở các bản sau, các component Date, Time và DateTime. Nó không kèm CSS và không render markup có kiểu dáng, nên mọi quyết định visual đều thuộc về bạn. Bản 0.2.0 có các Calendar view và Mini Calendar. Event, input và panel cho ngày/giờ chưa được triển khai.
>
> Chrono không phải là một UI library hay design system đầy đủ, và không kèm code popup, overlay hay định vị. Khi cần, hãy đặt panel của Chrono bên trong popup của riêng bạn.

## Install

```bash
pnpm --filter @zealakit/chrono-core run build
```

Core không có trên npm nên không thể cài đặt. Nó được build trong workspace và, khi phát hành, được sao chép vào tarball của mỗi adapter tại `dist/vendor/core`.

## Public API

Core cung cấp entry `.` (re-export mọi domain), `./foundation` và `./calendar`. Domain Calendar chỉ import foundation. Các adapter import các subpath tương ứng.

| Module | Folder | Contents |
| --- | --- | --- |
| `values` | `foundation/values/` | `PlainDate`, `PlainTime`, `PlainDateTime`, `ZonedDateTime`; tính toán epoch-day, cộng trừ, mốc đầu/cuối, so sánh, ISO 8601, chuyển đổi `Date`, `today()` và `nowZoned()`. |
| `locale` | `foundation/locale/` | Wrapper của `Intl`: thông tin tuần kèm bảng dự phòng CLDR, tên tháng và thứ, hour cycle, hướng chữ, định dạng, thứ tự thành phần ngày. |
| `constraints` | `foundation/constraints/` | `getDateStatus`, `getTimeStatus`, `snapTime`, `checkDateRange`, `checkTimeRange`, `createAvailability`. |
| `ranges` | `foundation/ranges/` | Khoảng ngày đóng hai đầu, khoảng nửa mở, `splitIntervalByDay`. |
| `grid` | `foundation/grid/` | `getMonthGrid`, `getMonths`, `getYearGrid`, `getDecadeGrid`, `getWeekdayHeaders`, `getTimeAxis`. |
| `a11y` | `foundation/a11y/` | `nextFocusedDate` thuần, nhãn ngày và giờ, thông điệp tiếng Anh mặc định. |
| `store` | `foundation/store/` | `createStore`, `createControllable`, `getGlobalState`, `isBrowser`. |
| `calendar` | `calendar/` | Định nghĩa view, hàm range, điều hướng và tiêu đề, layout tháng, lưới thời gian, danh sách và Mini Calendar, `createCalendarController`, `createMiniCalendarController`. |

## Conventions

- Tháng bắt đầu từ 1 và Thứ Hai là 1. Quy tắc tuần lấy từ `Intl`, có bảng dự phòng tích hợp.
- Giá trị là object thuần đã đóng băng, xử lý bằng hàm tự do. Không có class.
- Khoảng ngày đóng hai đầu. Khoảng date-time nửa mở.
- Không hàm nào trong `values/` dùng múi giờ của máy chủ. Hãy truyền `timeZone`, `now` và `locale` tường minh, nhất là với SSR.
- Chỉ có từ trạng thái tiếng Anh (`today`, `selected`, ...). Ứng dụng tự dịch bằng cách truyền `messages`.
- `pnpm check:domains` kiểm soát folder nào được import folder nào. Bộ test của core chạy một lần cho mỗi múi giờ và cần full ICU.

## License

MIT © Zealakit
