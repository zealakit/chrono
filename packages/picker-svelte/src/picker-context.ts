import type { Component } from "svelte";

/** Why a picker opened or closed (plan 14 P9, P11, P13). */
export type PickerOpenChangeReason =
  | "trigger"
  | "input-key"
  | "outside-press"
  | "escape"
  | "commit";

/** The Chrono Input and Panel a picker joins, and the popup's accessible name. */
export type PickerConfig = {
  Input: Component<Record<string, unknown>>;
  Panel: Component<Record<string, unknown>>;
  label: string;
};

/** What the parts read from their root. */
export type PickerContext = {
  readonly config: PickerConfig;
  /** Marks the elements that belong to this picker (outside-press boundary). */
  readonly uid: string;
  readonly value: unknown;
  setValue(value: unknown): void;
  commit(value: unknown): void;
  readonly open: boolean;
  setOpen(open: boolean, reason: PickerOpenChangeReason): void;
  readonly shared: Record<string, unknown>;
};

export const PICKER_KEY = Symbol("chrono-picker");
