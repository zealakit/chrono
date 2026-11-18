<script lang="ts">
import { Popover } from "@zealakit/overlay-svelte";
import { setContext, tick, untrack } from "svelte";
import {
  PICKER_KEY,
  type PickerConfig,
  type PickerContext,
  type PickerOpenChangeReason,
} from "./picker-context.js";
import type { PickerRootProps } from "./types.js";

let {
  config,
  value = $bindable(),
  defaultValue,
  onValueChange,
  onValueCommit,
  open = $bindable(),
  defaultOpen = false,
  onOpenChange,
  locale,
  timeZone,
  min,
  max,
  disabled,
  readOnly,
  now,
  children,
  ...popover
}: PickerRootProps<unknown> & { config: PickerConfig } = $props();

const uid = $props.id();
let currentValue = $state<unknown>(
  untrack(() => (value !== undefined ? value : (defaultValue ?? null))),
);
let isOpen = $state(untrack(() => (open !== undefined ? open : defaultOpen)));
let opener: HTMLElement | null = null;

$effect.pre(() => {
  if (value !== undefined) currentValue = value;
});
$effect.pre(() => {
  if (open !== undefined) isOpen = open;
});

const part = (name: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    `[data-chrono-picker="${uid}"][data-chrono-picker-part="${name}"]`,
  );

function setOpen(next: boolean, reason: PickerOpenChangeReason): void {
  if (next === isOpen) return;
  if (next) {
    const active = document.activeElement;
    opener =
      reason === "input-key" && active instanceof HTMLElement
        ? active
        : part("trigger");
  }
  isOpen = next;
  open = next;
  onOpenChange?.(next, reason);
  if (!next && (reason === "commit" || reason === "escape")) {
    const target = opener ?? part("trigger");
    void tick().then(() => {
      if (target?.isConnected) target.focus();
    });
  }
}

$effect(() => {
  if (!isOpen) return;
  // Anything inside the field, trigger or popup is inside (plan 14 O1).
  const onPress = (event: PointerEvent): void => {
    const target = event.target as Element | null;
    if (target && !target.closest(`[data-chrono-picker="${uid}"]`)) {
      setOpen(false, "outside-press");
    }
  };
  document.addEventListener("pointerdown", onPress, true);
  return () => document.removeEventListener("pointerdown", onPress, true);
});

const context: PickerContext = {
  get config() {
    return config;
  },
  uid,
  get value() {
    return currentValue;
  },
  setValue(next) {
    currentValue = next;
    value = next;
    (onValueChange as ((v: unknown) => void) | undefined)?.(next);
  },
  commit(next) {
    (onValueCommit as ((v: unknown) => void) | undefined)?.(next);
    setOpen(false, "commit");
  },
  get open() {
    return isOpen;
  },
  setOpen,
  get shared() {
    const picked: Record<string, unknown> = {};
    const all = { locale, timeZone, min, max, disabled, readOnly, now };
    for (const [key, entry] of Object.entries(all)) {
      if (entry !== undefined) picked[key] = entry;
    }
    return picked;
  },
};
setContext(PICKER_KEY, context);
</script>

<Popover
  {...popover}
  open={isOpen}
  onOpenChange={(next: boolean) => setOpen(next, "trigger")}
  dismissOnOutsidePress={false}
  dismissOnEscape={false}
  initialFocus={false}
  restoreFocus={false}
>
  {@render children?.()}
</Popover>
