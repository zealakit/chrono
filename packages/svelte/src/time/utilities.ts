// Pure utilities and value helpers re-exported from core. No "use client":
// they stay ordinary functions in Server Components and server actions.
export {
  checkTimeRangeValue,
  getBookingSlots,
  parseTime,
} from "@zealakit/chrono-core/time";
export {
  getHourCycle,
  getTimeStatus,
  isSameTime,
  snapTime,
  toPlainTime,
} from "@zealakit/chrono-core/foundation";
export type {
  BookingSlot,
  BookingSlotInput,
  HourCycle,
  TimeGranularity,
  TimeParseResult,
  TimeRangeInputState,
  TimeValidity,
  TimeValue,
  TimeRangeValue,
} from "@zealakit/chrono-core/time";
export type { TimeInput as TimeInputValue } from "@zealakit/chrono-core/foundation";
