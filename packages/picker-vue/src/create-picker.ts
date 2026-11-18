import { Popover, PopoverContent, PopoverTrigger } from "@zealakit/overlay-vue";
import {
  type Component,
  type InjectionKey,
  type PropType,
  type Ref,
  defineComponent,
  h,
  inject,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  watch,
} from "vue";

/** Why a picker opened or closed (plan 14 P9, P11, P13). */
export type PickerOpenChangeReason =
  | "trigger"
  | "input-key"
  | "outside-press"
  | "escape"
  | "commit";

/** Options the root passes to both the input and the panel. */
const SHARED_KEYS = [
  "locale",
  "timeZone",
  "min",
  "max",
  "disabled",
  "readOnly",
  "now",
] as const;

type PickerState = {
  value: Ref<unknown>;
  setValue: (value: unknown) => void;
  commit: (value: unknown) => void;
  open: Ref<boolean>;
  setOpen: (open: boolean, reason: PickerOpenChangeReason) => void;
  shared: () => Record<string, unknown>;
  anchor: Ref<HTMLElement | null>;
  trigger: Ref<HTMLElement | null>;
  content: Ref<HTMLElement | null>;
};

const PickerKey: InjectionKey<PickerState> = Symbol("chrono-picker");

function usePicker(part: string): PickerState {
  const state = inject(PickerKey, null);
  if (!state) {
    throw new Error(
      `[chrono-picker-vue] <${part}> must be used inside the picker Root.`,
    );
  }
  return state;
}

const elementOf = (instance: unknown): HTMLElement | null => {
  const node = (instance as { $el?: unknown } | null)?.$el ?? instance;
  return node instanceof HTMLElement ? node : null;
};

export type PickerConfig = {
  Input: Component;
  Panel: Component;
  /** The popup's accessible name (plan 14 P12). */
  label: string;
};

/**
 * One compound picker (plan 14 P8). State lives in the root; the parts read it.
 * Overlay's Popover supplies layering and the trigger; outside press and Escape
 * are decided here because the Input sits outside Overlay's trigger (O1).
 * Positioning props (`placement`, `offset`, `portal` …) go on the Root and are
 * forwarded to the Popover; the popup is positioned against the trigger.
 */
export function createPicker(config: PickerConfig) {
  const Root = defineComponent({
    name: "PickerRoot",
    inheritAttrs: false,
    props: {
      value: { type: null as unknown as PropType<unknown>, default: undefined },
      defaultValue: {
        type: null as unknown as PropType<unknown>,
        default: undefined,
      },
      open: { type: Boolean, default: undefined },
      defaultOpen: { type: Boolean, default: false },
      locale: String,
      timeZone: String,
      min: null as unknown as PropType<unknown>,
      max: null as unknown as PropType<unknown>,
      disabled: { type: Boolean, default: undefined },
      readOnly: { type: Boolean, default: undefined },
      now: Number,
    },
    emits: ["update:value", "valueCommit", "update:open", "openChange"],
    setup(props, { slots, attrs, emit }) {
      const innerValue = ref<unknown>(props.defaultValue ?? null);
      const innerOpen = ref(props.defaultOpen);
      const value = ref<unknown>(null) as Ref<unknown>;
      const open = ref(false);
      watch(
        () => [props.value, innerValue.value] as const,
        ([controlled, inner]) => {
          value.value = controlled !== undefined ? controlled : inner;
        },
        { immediate: true },
      );
      watch(
        () => [props.open, innerOpen.value] as const,
        ([controlled, inner]) => {
          open.value = controlled !== undefined ? controlled : inner;
        },
        { immediate: true },
      );
      const anchor = ref<HTMLElement | null>(null);
      const trigger = ref<HTMLElement | null>(null);
      const content = ref<HTMLElement | null>(null);
      let opener: HTMLElement | null = null;

      const setValue = (next: unknown): void => {
        if (props.value === undefined) innerValue.value = next;
        emit("update:value", next);
      };
      const setOpen = (next: boolean, reason: PickerOpenChangeReason): void => {
        if (next === open.value) return;
        if (next) {
          const active = document.activeElement;
          opener =
            reason === "input-key" && active instanceof HTMLElement
              ? active
              : trigger.value;
        }
        if (props.open === undefined) innerOpen.value = next;
        emit("update:open", next);
        emit("openChange", next, reason);
        if (!next && (reason === "commit" || reason === "escape")) {
          const target = opener ?? trigger.value;
          void nextTick(() => {
            if (target?.isConnected) target.focus();
          });
        }
      };
      const commit = (next: unknown): void => {
        emit("valueCommit", next);
        setOpen(false, "commit");
      };

      const onPress = (event: PointerEvent): void => {
        const target = event.target as Node | null;
        if (!target) return;
        const inside = [content.value, anchor.value, trigger.value].some((el) =>
          el?.contains(target),
        );
        if (!inside) setOpen(false, "outside-press");
      };
      watch(
        open,
        (isOpen, _previous, onCleanup) => {
          if (!isOpen || typeof document === "undefined") return;
          document.addEventListener("pointerdown", onPress, true);
          onCleanup(() =>
            document.removeEventListener("pointerdown", onPress, true),
          );
        },
        { immediate: true, flush: "post" },
      );
      onBeforeUnmount(() =>
        document.removeEventListener("pointerdown", onPress, true),
      );

      provide(PickerKey, {
        value,
        setValue,
        commit,
        open,
        setOpen,
        shared: () => {
          const picked: Record<string, unknown> = {};
          for (const key of SHARED_KEYS) {
            if (props[key] !== undefined) picked[key] = props[key];
          }
          return picked;
        },
        anchor,
        trigger,
        content,
      });

      return () =>
        h(
          Popover,
          mergeProps(attrs, {
            open: open.value,
            dismissOnOutsidePress: false,
            dismissOnEscape: false,
            initialFocus: false,
            restoreFocus: false,
            "onUpdate:open": (next: boolean) => setOpen(next, "trigger"),
          }),
          { default: () => slots.default?.() },
        );
    },
  });

  const Input = defineComponent({
    name: "PickerInput",
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const picker = usePicker("Input");
      return () =>
        h(
          config.Input,
          mergeProps(picker.shared(), attrs, {
            value: picker.value.value,
            "onUpdate:value": (next: unknown) => picker.setValue(next),
            ref: (instance: unknown) => {
              picker.anchor.value = elementOf(instance);
            },
            onKeydown: (event: KeyboardEvent) => {
              if (event.defaultPrevented) return;
              if (event.altKey && event.key === "ArrowDown") {
                event.preventDefault();
                picker.setOpen(true, "input-key");
              } else if (event.key === "Escape" && picker.open.value) {
                event.preventDefault();
                picker.setOpen(false, "escape");
              }
            },
          }),
          slots,
        );
    },
  });

  const Trigger = defineComponent({
    name: "PickerTrigger",
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const picker = usePicker("Trigger");
      return () =>
        h(
          PopoverTrigger,
          mergeProps(
            { "aria-haspopup": "dialog", "aria-label": config.label },
            attrs,
            {
              ref: (instance: unknown) => {
                picker.trigger.value = elementOf(instance);
              },
            },
          ),
          slots,
        );
    },
  });

  const Panel = defineComponent({
    name: "PickerPanel",
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const picker = usePicker("Panel");
      return () =>
        h(
          config.Panel,
          mergeProps({ autoFocus: true }, picker.shared(), attrs, {
            value: picker.value.value,
            "onUpdate:value": (next: unknown) => picker.setValue(next),
            onValueCommit: (next: unknown) => picker.commit(next),
          }),
          slots,
        );
    },
  });

  const Content = defineComponent({
    name: "PickerContent",
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      const picker = usePicker("Content");
      return () =>
        h(
          PopoverContent,
          mergeProps({ role: "dialog", "aria-label": config.label }, attrs, {
            ref: (instance: unknown) => {
              picker.content.value = elementOf(instance);
            },
            onKeydown: (event: KeyboardEvent) => {
              // The panel consumes Escape while a range preview is active (P13).
              if (event.key === "Escape" && !event.defaultPrevented) {
                event.preventDefault();
                picker.setOpen(false, "escape");
              }
            },
          }),
          {
            // Overlay keeps the popup mounted while closed; the panel mounts on open so
            // `autoFocus` runs each time it opens.
            default: () =>
              picker.open.value ? (slots.default?.() ?? h(Panel)) : null,
          },
        );
    },
  });

  return { Root, Input, Trigger, Content, Panel };
}
