<script lang="ts">
import {
  DatePickerContent,
  DatePickerInput,
  DatePickerRoot,
  DatePickerTrigger,
  DateRangePickerContent,
  DateRangePickerInput,
  DateRangePickerRoot,
  DateRangePickerTrigger,
  TimePickerContent,
  TimePickerInput,
  TimePickerRoot,
  TimePickerTrigger,
  DateTimePickerContent,
  DateTimePickerInput,
  DateTimePickerRoot,
  DateTimePickerTrigger,
} from "@zealakit/chrono-picker-svelte";
import { toIsoString } from "@zealakit/chrono-svelte";

// Pinned so the page looks the same for everyone; real apps omit `now`.
const fixed = {
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
};
let datePickerValue = $state<unknown>(null);
let dateRangePickerValue = $state<unknown>(null);
let timePickerValue = $state<unknown>(null);
let dateTimePickerValue = $state<unknown>(null);

const show = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  const range = value as { start?: unknown; end?: unknown };
  if ("start" in range) return `${show(range.start)} → ${show(range.end)}`;
  return toIsoString(value as never);
};
</script>

<main>
  <div>
    <h1>Chrono pickers with Overlay (Svelte)</h1>
    <p class="hint">
      Each picker is a Chrono input, an Overlay popover and a Chrono panel. Open with the button or
      Alt+ArrowDown in the field; pick to close. All styling is in styles.css.
    </p>
  </div>
    <section>
      <h2>DatePicker</h2>
      <DatePickerRoot {...fixed} bind:value={datePickerValue}>
        <div class="row">
          <DatePickerInput />
          <DatePickerTrigger>📅</DatePickerTrigger>
        </div>
        <DatePickerContent />
      </DatePickerRoot>
      <p class="value">Value: {show(datePickerValue)}</p>
    </section>
    <section>
      <h2>DateRangePicker</h2>
      <DateRangePickerRoot {...fixed} bind:value={dateRangePickerValue}>
        <div class="row">
          <DateRangePickerInput />
          <DateRangePickerTrigger>📅</DateRangePickerTrigger>
        </div>
        <DateRangePickerContent />
      </DateRangePickerRoot>
      <p class="value">Value: {show(dateRangePickerValue)}</p>
    </section>
    <section>
      <h2>TimePicker</h2>
      <TimePickerRoot {...fixed} bind:value={timePickerValue}>
        <div class="row">
          <TimePickerInput />
          <TimePickerTrigger>🕒</TimePickerTrigger>
        </div>
        <TimePickerContent />
      </TimePickerRoot>
      <p class="value">Value: {show(timePickerValue)}</p>
    </section>
    <section>
      <h2>DateTimePicker</h2>
      <DateTimePickerRoot {...fixed} bind:value={dateTimePickerValue}>
        <div class="row">
          <DateTimePickerInput />
          <DateTimePickerTrigger>📅</DateTimePickerTrigger>
        </div>
        <DateTimePickerContent />
      </DateTimePickerRoot>
      <p class="value">Value: {show(dateTimePickerValue)}</p>
    </section>
</main>
