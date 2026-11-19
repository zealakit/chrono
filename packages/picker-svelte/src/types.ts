import type { Snippet } from "svelte";
import type { PickerOpenChangeReason } from "./picker-context.js";

/** Props every picker root takes: the value and open state, shared options, and the Popover's own props. */
export type PickerRootProps<V> = {
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  /** Fires when a choice is complete (the popup closes right after). */
  onValueCommit?: (value: V) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, reason: PickerOpenChangeReason) => void;
  locale?: string;
  timeZone?: string;
  min?: unknown;
  max?: unknown;
  disabled?: boolean;
  readOnly?: boolean;
  now?: number;
  children?: Snippet;
  /** Popover options (`placement`, `offset`, `portal` …) go through to Overlay. */
  [popoverOption: string]: unknown;
};

/** Props of the Input and Panel parts: those of the Chrono component they wrap. */
export type PickerPartProps = Record<string, unknown>;
export type PickerTriggerProps = {
  children?: Snippet;
  [attribute: string]: unknown;
};
export type PickerContentProps = {
  children?: Snippet;
  [attribute: string]: unknown;
};
