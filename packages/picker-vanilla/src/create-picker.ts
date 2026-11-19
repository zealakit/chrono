import { initDateElements } from "@zealakit/chrono-vanilla/date";
import { initDateTimeElements } from "@zealakit/chrono-vanilla/datetime";
import { initTimeElements } from "@zealakit/chrono-vanilla/time";
import {
  type PopoverController,
  type PopoverOptions,
  createPopover,
} from "@zealakit/overlay-vanilla";

/** Why a picker opened or closed (plan 14 P9, P11, P13). */
export type PickerOpenChangeReason =
  | "trigger"
  | "input-key"
  | "outside-press"
  | "escape"
  | "commit";

export type PickerKind =
  | "date"
  | "date-range"
  | "time"
  | "time-range"
  | "datetime"
  | "datetime-range";

const LABELS: Record<PickerKind, string> = {
  date: "Choose date",
  "date-range": "Choose dates",
  time: "Choose time",
  "time-range": "Choose times",
  datetime: "Choose date and time",
  "datetime-range": "Choose dates and times",
};

const INIT: Record<PickerKind, (root: ParentNode) => () => void> = {
  date: initDateElements,
  "date-range": initDateElements,
  time: initTimeElements,
  "time-range": initTimeElements,
  datetime: initDateTimeElements,
  "datetime-range": initDateTimeElements,
};

/** The Chrono input roots a picker host may contain (plan 14 P8). */
const FIELD_SELECTOR = [
  "[data-chrono-date-input]",
  "[data-chrono-date-range-input]",
  "[data-chrono-time-input]",
  "[data-chrono-time-range-input]",
  "[data-chrono-datetime-input]",
  "[data-chrono-datetime-range-input]",
].join(",");

export type PickerOptions = {
  /** Placement, offset, portal … go through to Overlay's popover. */
  placement?: PopoverOptions["placement"];
  offset?: number;
  alignOffset?: number;
  portal?: Element | null;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, reason: PickerOpenChangeReason) => void;
  /** Fires when a choice is complete (the popup closes right after). */
  onValueCommit?: (event: CustomEvent<{ value: unknown }>) => void;
  /** Override the popup's accessible name. */
  label?: string;
};

export type VanillaPicker = {
  readonly isOpen: boolean;
  readonly controller: PopoverController;
  open(): void;
  close(): void;
  destroy(): void;
};

let counter = 0;

/**
 * One picker over markup you own (plan 14 P14): a host holding a Chrono input
 * (`data-chrono-*-input`), a `[data-trigger]` button and a hidden `[data-content]`
 * with a Chrono panel inside. The field and the panel share one value
 * (`data-chrono-for` is set for you when the panel has none). Overlay's popover
 * supplies layering and positioning; Escape and the focus return are decided here.
 */
export function createPicker(
  kind: PickerKind,
  host: HTMLElement,
  options: PickerOptions = {},
): VanillaPicker {
  const field = host.querySelector<HTMLElement>(FIELD_SELECTOR);
  const trigger = host.querySelector<HTMLElement>("[data-trigger]");
  const content = host.querySelector<HTMLElement>("[data-content]");
  if (!field || !trigger || !content) {
    throw new Error(
      "[chrono-picker-vanilla] A picker needs a Chrono input, a [data-trigger] and a [data-content].",
    );
  }
  const label = options.label ?? LABELS[kind];
  if (!field.id) {
    counter += 1;
    field.id = `chrono-picker-${counter}`;
  }
  for (const panel of content.querySelectorAll<HTMLElement>(
    "[data-chrono-date-panel], [data-chrono-date-range-panel], [data-chrono-time-panel], [data-chrono-time-range-panel], [data-chrono-datetime-panel], [data-chrono-datetime-range-panel]",
  )) {
    if (!panel.hasAttribute("data-chrono-for")) {
      panel.setAttribute("data-chrono-for", field.id);
    }
  }
  const stopChrono = INIT[kind](host);

  trigger.setAttribute("aria-haspopup", "dialog");
  if (!trigger.hasAttribute("aria-label") && !trigger.textContent?.trim()) {
    trigger.setAttribute("aria-label", label);
  }
  content.setAttribute("role", "dialog");
  if (!content.hasAttribute("aria-label"))
    content.setAttribute("aria-label", label);

  let reason: PickerOpenChangeReason = "trigger";
  let opener: HTMLElement | null = null;
  let pending: PickerOpenChangeReason | null = null;

  const controller = createPopover({
    trigger,
    content,
    placement: "bottom-start",
    portal: null,
    ...("placement" in options ? { placement: options.placement } : {}),
    offset: options.offset,
    alignOffset: options.alignOffset,
    ...(options.portal !== undefined ? { portal: options.portal } : {}),
    defaultOpen: options.defaultOpen,
    // The field sits outside Overlay's trigger but inside the picker (plan 14 O1).
    boundaries: [field],
    dismissOnEscape: false,
    initialFocus: false,
    restoreFocus: false,
    trapFocus: false,
    onOpenChange: (open, overlayReason) => {
      if (open) {
        // Overlay reports a click on the trigger; Alt+ArrowDown sets `input-key` first.
        if (reason !== "input-key") reason = "trigger";
        const active = document.activeElement;
        opener =
          reason === "input-key" && active instanceof HTMLElement
            ? active
            : trigger;
        queueMicrotask(() => {
          // Focus lands in the panel (plan 14 P10).
          content.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
        });
        options.onOpenChange?.(true, reason);
        reason = "trigger";
        return;
      }
      const why: PickerOpenChangeReason =
        pending ??
        (String(overlayReason) === "outside-press"
          ? "outside-press"
          : "trigger");
      pending = null;
      options.onOpenChange?.(false, why);
      if (why === "commit" || why === "escape") {
        const target = opener ?? trigger;
        queueMicrotask(() => {
          if (target.isConnected) target.focus();
        });
      }
    },
  });
  const closeWith = (why: PickerOpenChangeReason): void => {
    if (!controller.isOpen) return;
    pending = why;
    controller.close("programmatic");
  };

  const onFieldKey = (event: Event): void => {
    const key = event as KeyboardEvent;
    if (key.defaultPrevented) return;
    if (key.altKey && key.key === "ArrowDown") {
      key.preventDefault();
      reason = "input-key";
      controller.open("programmatic");
    } else if (key.key === "Escape" && controller.isOpen) {
      key.preventDefault();
      closeWith("escape");
    }
  };
  const onContentKey = (event: Event): void => {
    // The panel consumes Escape while a range preview is active (P13).
    const key = event as KeyboardEvent;
    if (key.key === "Escape" && !key.defaultPrevented) {
      key.preventDefault();
      closeWith("escape");
    }
  };
  const onCommit = (event: Event): void => {
    // Only a pick in the popup closes it; a typed value committed in the field does not.
    if (!content.contains(event.target as Node)) return;
    options.onValueCommit?.(event as CustomEvent<{ value: unknown }>);
    closeWith("commit");
  };
  field.addEventListener("keydown", onFieldKey);
  content.addEventListener("keydown", onContentKey);
  content.addEventListener("chrono:valuecommit", onCommit);

  return {
    get isOpen() {
      return controller.isOpen;
    },
    controller,
    open: () => controller.open("programmatic"),
    close: () => closeWith("trigger"),
    destroy() {
      field.removeEventListener("keydown", onFieldKey);
      content.removeEventListener("keydown", onContentKey);
      content.removeEventListener("chrono:valuecommit", onCommit);
      controller.destroy();
      stopChrono();
    },
  };
}

export const createDatePicker = (host: HTMLElement, options?: PickerOptions) =>
  createPicker("date", host, options);
export const createDateRangePicker = (
  host: HTMLElement,
  options?: PickerOptions,
) => createPicker("date-range", host, options);
export const createTimePicker = (host: HTMLElement, options?: PickerOptions) =>
  createPicker("time", host, options);
export const createTimeRangePicker = (
  host: HTMLElement,
  options?: PickerOptions,
) => createPicker("time-range", host, options);
export const createDateTimePicker = (
  host: HTMLElement,
  options?: PickerOptions,
) => createPicker("datetime", host, options);
export const createDateTimeRangePicker = (
  host: HTMLElement,
  options?: PickerOptions,
) => createPicker("datetime-range", host, options);

const KINDS = new Set<string>(Object.keys(LABELS));

/**
 * Declarative init (plan 14 P14): turns every `[data-chrono-picker="date|date-range|time|
 * time-range|datetime|datetime-range"]` host under `root` into a picker. Options come from
 * `data-placement`, `data-offset`, `data-align-offset` and `data-portal` (`inline` or a selector).
 * Returns a cleanup function.
 */
export function initPickers(root: ParentNode = document): () => void {
  const pickers: VanillaPicker[] = [];
  for (const host of root.querySelectorAll<HTMLElement>(
    "[data-chrono-picker]",
  )) {
    const kind = host.getAttribute("data-chrono-picker") ?? "";
    if (!KINDS.has(kind)) continue;
    const portal = host.getAttribute("data-portal");
    const number = (name: string): number | undefined => {
      const value = host.getAttribute(name);
      return value === null || value === "" ? undefined : Number(value);
    };
    pickers.push(
      createPicker(kind as PickerKind, host, {
        placement: (host.getAttribute("data-placement") ??
          undefined) as PickerOptions["placement"],
        offset: number("data-offset"),
        alignOffset: number("data-align-offset"),
        portal:
          portal === null || portal === "inline"
            ? undefined
            : document.querySelector(portal),
        defaultOpen: host.hasAttribute("data-default-open"),
      }),
    );
  }
  return () => {
    for (const picker of pickers.splice(0)) picker.destroy();
  };
}
