<script setup lang="ts">
import {
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  TimePicker,
} from "@zealakit/chrono-picker-vue";
import { toIsoString } from "@zealakit/chrono-vue";
import { ref } from "vue";

// Pinned so the page looks the same for everyone; real apps omit `now`.
const fixed = {
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
};

const date = ref<unknown>(null);
const range = ref<unknown>(null);
const time = ref<unknown>(null);
const dateTime = ref<unknown>(null);
const reason = ref("—");

const show = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  const range = value as { start?: unknown; end?: unknown };
  if ("start" in range) return `${show(range.start)} → ${show(range.end)}`;
  return toIsoString(value as never);
};
</script>

<template>
  <main>
    <div>
      <h1>Chrono pickers with Overlay (Vue)</h1>
      <p class="hint">
        Each picker is a Chrono input, an Overlay popover and a Chrono panel. Open with the button
        or Alt+ArrowDown in the field; pick to close. All styling is in styles.css.
      </p>
    </div>

    <section>
      <h2>DatePicker</h2>
      <DatePicker.Root
        v-bind="fixed"
        v-model:value="date"
        @open-change="(open: boolean, why: string) => (reason = `${open ? 'open' : 'close'} (${why})`)"
      >
        <div class="row">
          <DatePicker.Input />
          <DatePicker.Trigger>📅</DatePicker.Trigger>
        </div>
        <DatePicker.Content />
      </DatePicker.Root>
      <p class="value">Value: {{ show(date) }} · last change: {{ reason }}</p>
    </section>

    <section>
      <h2>DateRangePicker</h2>
      <DateRangePicker.Root v-bind="fixed" v-model:value="range">
        <div class="row">
          <DateRangePicker.Input />
          <DateRangePicker.Trigger>📅</DateRangePicker.Trigger>
        </div>
        <DateRangePicker.Content />
      </DateRangePicker.Root>
      <p class="value">Value: {{ show(range) }}</p>
    </section>

    <section>
      <h2>TimePicker</h2>
      <TimePicker.Root v-bind="fixed" v-model:value="time">
        <div class="row">
          <TimePicker.Input />
          <TimePicker.Trigger>🕒</TimePicker.Trigger>
        </div>
        <TimePicker.Content />
      </TimePicker.Root>
      <p class="value">Value: {{ show(time) }}</p>
    </section>

    <section>
      <h2>DateTimePicker</h2>
      <DateTimePicker.Root v-bind="fixed" v-model:value="dateTime">
        <div class="row">
          <DateTimePicker.Input />
          <DateTimePicker.Trigger>📅</DateTimePicker.Trigger>
        </div>
        <DateTimePicker.Content />
      </DateTimePicker.Root>
      <p class="value">Value: {{ show(dateTime) }}</p>
    </section>
  </main>
</template>
