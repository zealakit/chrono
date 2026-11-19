import {
  type DateRangeValue,
  type DateTimeValue,
  type DateValue,
  type TimeValue,
  toIsoString,
} from "@zealakit/chrono-react";
import {
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  TimePicker,
} from "@zealakit/chrono-picker-react";
import { useState } from "react";

// Pinned so the page looks the same for everyone; real apps omit `now`.
const FIXED = {
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
};

const show = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  const range = value as { start?: unknown; end?: unknown };
  if ("start" in range) return `${show(range.start)} → ${show(range.end)}`;
  return toIsoString(value as never);
};

export function App() {
  const [date, setDate] = useState<DateValue>(null);
  const [range, setRange] = useState<DateRangeValue>(null);
  const [time, setTime] = useState<TimeValue>(null);
  const [dateTime, setDateTime] = useState<DateTimeValue>(null);
  const [reason, setReason] = useState("—");

  return (
    <main>
      <div>
        <h1>Chrono pickers with Overlay (React)</h1>
        <p className="hint">
          Each picker is a Chrono input, an Overlay popover and a Chrono panel.
          Open with the button or Alt+ArrowDown in the field; pick to close. All
          styling is in styles.css.
        </p>
      </div>

      <section>
        <h2>DatePicker</h2>
        <DatePicker.Root
          {...FIXED}
          value={date}
          onValueChange={setDate}
          onOpenChange={(open, why) =>
            setReason(`${open ? "open" : "close"} (${why})`)
          }
        >
          <div className="row">
            <DatePicker.Input />
            <DatePicker.Trigger>📅</DatePicker.Trigger>
          </div>
          <DatePicker.Content />
        </DatePicker.Root>
        <p className="value">
          Value: {show(date)} · last change: {reason}
        </p>
      </section>

      <section>
        <h2>DateRangePicker</h2>
        <DateRangePicker.Root {...FIXED} value={range} onValueChange={setRange}>
          <div className="row">
            <DateRangePicker.Input />
            <DateRangePicker.Trigger>📅</DateRangePicker.Trigger>
          </div>
          <DateRangePicker.Content />
        </DateRangePicker.Root>
        <p className="value">Value: {show(range)}</p>
      </section>

      <section>
        <h2>TimePicker</h2>
        <TimePicker.Root {...FIXED} value={time} onValueChange={setTime}>
          <div className="row">
            <TimePicker.Input />
            <TimePicker.Trigger>🕒</TimePicker.Trigger>
          </div>
          <TimePicker.Content />
        </TimePicker.Root>
        <p className="value">Value: {show(time)}</p>
      </section>

      <section>
        <h2>DateTimePicker</h2>
        <DateTimePicker.Root
          {...FIXED}
          value={dateTime}
          onValueChange={setDateTime}
        >
          <div className="row">
            <DateTimePicker.Input />
            <DateTimePicker.Trigger>📅</DateTimePicker.Trigger>
          </div>
          <DateTimePicker.Content />
        </DateTimePicker.Root>
        <p className="value">Value: {show(dateTime)}</p>
      </section>
    </main>
  );
}
