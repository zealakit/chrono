# @zealakit/chrono-picker-svelte

[English](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README.md) | [Tiếng Việt](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README_VI.md) | [中文](https://github.com/zealakit/chrono/blob/main/packages/picker-svelte/README_CN.md)

![Zealakit Chrono cover](https://github.com/zealakit/chrono/blob/main/assets/images/chrono-cover.jpg?raw=true)

Ready-made date, time and date-time pickers (with range variants) for Svelte: a Chrono input, an Overlay popover and a Chrono panel, composed for you. You own visual styling.

The picker ships no CSS and sets no visual styles. Parts render your own elements and classes; state is exposed as `data-*` and ARIA attributes. It is built only from public Chrono and Overlay APIs, so you can always compose the same thing yourself.

Pre-1.0: the API may change between minor versions.

> **Note**
> This package is optional. It combines `@zealakit/chrono-svelte` and `@zealakit/overlay-svelte`, and is the only Chrono package that works with Overlay. Core and the four adapters never depend on Overlay.
>
> Chrono is not a full UI library or design system. For another popup library, compose a Chrono input and panel yourself.

## Install

```bash
npm install @zealakit/chrono-svelte @zealakit/overlay-svelte @zealakit/chrono-picker-svelte
```

Peer dependencies: `@zealakit/chrono-svelte`, `@zealakit/overlay-svelte`, `svelte`. Both peers are required; the app chooses their versions and shares one copy with its own popovers and dialogs.

## Picker

### Quick start

Put a field, a trigger and the popup in one root. The root owns the value and the open state; the parts read them.

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

Every picker has the same five parts, with the same props as the part they wrap. Date, time and date-time each have a single and a range picker.

| Part | Wraps | Notes |
| --- | --- | --- |
| `Root` | state | Value and open state, plus options shared by the field and the panel (`locale`, `timeZone`, `min`, `max`, `disabled`, `readOnly`, `now`). |
| `Input` | Chrono input | The field. `Alt+ArrowDown` opens the popup; typing never does. |
| `Trigger` | Overlay trigger | A button with `aria-haspopup="dialog"` and `aria-expanded`. |
| `Content` | Overlay popup | `role="dialog"` with an accessible name; holds the panel. |
| `Panel` | Chrono panel | Takes focus on open; a pick commits and closes. |

Parts are named exports (`DatePickerRoot`, `DatePickerInput`, ...). Popover props (`placement`, `offset`, `portal`, `animation`) go on the root and reach Overlay, which positions against the trigger.

### Components

`DatePicker`, `DateRangePicker`, `TimePicker`, `TimeRangePicker`, `DateTimePicker` and `DateTimeRangePicker`.

### Root options

Value options pass through to Chrono unchanged; open options pass through to Overlay.

| Option | Type | Description |
| --- | --- | --- |
| `value`, `defaultValue` | the Chrono value | Controlled or uncontrolled; `null` is a real value. |
| `onValueChange` | `(value) => void` | Every change, including a partial range. |
| `onValueCommit` | `(value) => void` | A choice is complete; the popup closes right after. |
| `open`, `defaultOpen` | `boolean` | Controlled or uncontrolled visibility. |
| `onOpenChange` | `(open, reason) => void` | `reason` is `trigger`, `input-key`, `outside-press`, `escape` or `commit`. |

### Behavior

Opening moves focus into the panel. Closing after a pick or Escape returns focus to what opened the popup (the trigger, or the field after `Alt+ArrowDown`). Focus is not trapped, and pressing the field never closes the popup. In a range, the first Escape cancels the preview and the next one closes the popup. Overlay's outside press does not know the field is part of the picker, so the picker decides it itself.

## Agent Skill

The [Chrono Svelte skill](https://github.com/zealakit/chrono/blob/main/skills/chrono-svelte.md) covers integration steps for agents.

## License

MIT © Zealakit
