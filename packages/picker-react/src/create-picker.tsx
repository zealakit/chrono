// biome-ignore-all lint/correctness/noComponentHookFactories: `createPicker` runs once at module load (see pickers.ts), never during render, so each part keeps a stable identity.
"use client";

import {
  PopoverContent,
  type PopoverContentProps,
  Popover,
  PopoverTrigger,
  type PopoverTriggerProps,
} from "@zealakit/overlay-react";
import {
  type ComponentType,
  type ForwardRefExoticComponent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefAttributes,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** Why a picker opened or closed (plan 14 P9, P11, P13). */
export type PickerOpenChangeReason =
  | "trigger"
  | "input-key"
  | "outside-press"
  | "escape"
  | "commit";

/** Options passed to both the input and the panel when set on the root. */
export type PickerSharedOptions = {
  locale?: string;
  timeZone?: string;
  min?: unknown;
  max?: unknown;
  disabled?: boolean;
  readOnly?: boolean;
  now?: number;
};

const SHARED_KEYS = [
  "locale",
  "timeZone",
  "min",
  "max",
  "disabled",
  "readOnly",
  "now",
] as const;

/** Props every picker root takes: the value and open state, plus the shared options. */
export type PickerRootProps<V> = PickerSharedOptions & {
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  /** Fires when a choice is complete (the popup closes right after). */
  onValueCommit?: (value: V) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, reason: PickerOpenChangeReason) => void;
  children?: ReactNode;
};

type PickerContextValue = {
  value: unknown;
  setValue: (value: unknown) => void;
  commit: (value: unknown) => void;
  open: boolean;
  setOpen: (open: boolean, reason: PickerOpenChangeReason) => void;
  shared: Record<string, unknown>;
  anchor: HTMLElement | null;
  setAnchor: (element: HTMLElement | null) => void;
  triggerRef: { current: HTMLElement | null };
  contentRef: { current: HTMLElement | null };
  openerRef: { current: HTMLElement | null };
};

const PickerContext = createContext<PickerContextValue | null>(null);

function usePicker(part: string): PickerContextValue {
  const value = useContext(PickerContext);
  if (!value) {
    throw new Error(
      `[chrono-picker-react] <${part}> must be used inside the picker Root.`,
    );
  }
  return value;
}

type Ref<T> =
  | ((value: T | null) => void)
  | { current: T | null }
  | null
  | undefined;

function assign<T>(ref: Ref<T>, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

const composeRefs =
  <T,>(...refs: Ref<T>[]) =>
  (value: T | null): void => {
    for (const ref of refs) assign(ref, value);
  };

/** A value that is controlled when the prop is not `undefined` (`null` is a real value). */
function useControllable<T>(
  controlled: T | undefined,
  initial: T | undefined,
  onChange: ((value: T) => void) | undefined,
): [T | undefined, (value: T) => void] {
  const [inner, setInner] = useState<T | undefined>(initial);
  const isControlled = controlled !== undefined;
  const current = isControlled ? controlled : inner;
  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInner(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [current, set];
}

type PartConfig<InputP, PanelP> = {
  Input: ComponentType<InputP & RefAttributes<HTMLElement>>;
  Panel: ComponentType<PanelP & RefAttributes<HTMLElement>>;
  /** The popup's accessible name (plan 14 P12). */
  label: string;
};

type InputPartProps<InputP> = Omit<InputP, "value" | "defaultValue">;
type PanelPartProps<PanelP> = Omit<PanelP, "value" | "defaultValue">;
export type PickerTriggerProps = PopoverTriggerProps;
export type PickerContentProps = Omit<PopoverContentProps, "anchor"> & {
  children?: ReactNode;
};

/** The five parts of one picker (plan 14 P8). */
export type PickerParts<V, InputP, PanelP> = {
  Root: (props: PickerRootProps<V>) => ReactNode;
  Input: ForwardRefExoticComponent<
    InputPartProps<InputP> & RefAttributes<HTMLElement>
  >;
  Trigger: ForwardRefExoticComponent<
    PickerTriggerProps & RefAttributes<HTMLButtonElement>
  >;
  Content: ForwardRefExoticComponent<
    PickerContentProps & RefAttributes<HTMLDivElement>
  >;
  Panel: ForwardRefExoticComponent<
    PanelPartProps<PanelP> & RefAttributes<HTMLElement>
  >;
};

/**
 * Build the compound picker for one Chrono Input and Panel pair. State lives in
 * the root; the parts only read it, so any part can be swapped or restyled.
 * Overlay's Popover supplies positioning, layering and the trigger; outside
 * press and Escape are decided here (plan 14 §3, O1, P13).
 */
export function createPicker<V, InputP extends object, PanelP extends object>(
  config: PartConfig<InputP, PanelP>,
): PickerParts<V, InputP, PanelP> {
  const InputPart = config.Input as ComponentType<Record<string, unknown>>;
  const PanelPart = config.Panel as ComponentType<Record<string, unknown>>;

  function Root(props: PickerRootProps<V>): ReactNode {
    const {
      value: valueProp,
      defaultValue,
      onValueChange,
      onValueCommit,
      open: openProp,
      defaultOpen,
      onOpenChange,
      children,
    } = props;
    const [value, setValue] = useControllable<V | null>(
      valueProp as V | null | undefined,
      (defaultValue ?? null) as V | null,
      onValueChange as ((value: V | null) => void) | undefined,
    );
    const [open, setOpenState] = useControllable<boolean>(
      openProp,
      defaultOpen ?? false,
      undefined,
    );
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const contentRef = useRef<HTMLElement | null>(null);
    const openerRef = useRef<HTMLElement | null>(null);

    const { locale, timeZone, min, max, disabled, readOnly, now } = props;
    const shared = useMemo(() => {
      const all: Record<string, unknown> = {
        locale,
        timeZone,
        min,
        max,
        disabled,
        readOnly,
        now,
      };
      const picked: Record<string, unknown> = {};
      for (const key of SHARED_KEYS) {
        if (all[key] !== undefined) picked[key] = all[key];
      }
      return picked;
    }, [locale, timeZone, min, max, disabled, readOnly, now]);

    const isOpen = open ?? false;
    const setOpen = useCallback(
      (next: boolean, reason: PickerOpenChangeReason) => {
        if (next === isOpen) return;
        if (next) {
          const active = document.activeElement;
          openerRef.current =
            reason === "input-key" && active instanceof HTMLElement
              ? active
              : triggerRef.current;
        }
        setOpenState(next);
        onOpenChange?.(next, reason);
        if (!next && (reason === "commit" || reason === "escape")) {
          const target = openerRef.current ?? triggerRef.current;
          // After the popup unmounts, hand focus back (plan 14 P10, O4).
          queueMicrotask(() => {
            if (target?.isConnected) target.focus();
          });
        }
      },
      [isOpen, onOpenChange, setOpenState],
    );

    const commit = useCallback(
      (next: unknown) => {
        onValueCommit?.(next as V);
        setOpen(false, "commit");
      },
      [onValueCommit, setOpen],
    );

    // Outside press: anything but the popup, the field group or the trigger (plan 14 O1).
    useEffect(() => {
      if (!isOpen) return;
      const onPress = (event: PointerEvent): void => {
        const target = event.target as Node | null;
        if (!target) return;
        const inside = [contentRef.current, anchor, triggerRef.current].some(
          (element) => element?.contains(target),
        );
        if (!inside) setOpen(false, "outside-press");
      };
      document.addEventListener("pointerdown", onPress, true);
      return () => document.removeEventListener("pointerdown", onPress, true);
    }, [isOpen, anchor, setOpen]);

    const context = useMemo<PickerContextValue>(
      () => ({
        value,
        setValue: setValue as (value: unknown) => void,
        commit,
        open: isOpen,
        setOpen,
        shared,
        anchor,
        setAnchor,
        triggerRef,
        contentRef,
        openerRef,
      }),
      [value, setValue, commit, isOpen, setOpen, shared, anchor],
    );

    return (
      <PickerContext.Provider value={context}>
        <Popover
          open={isOpen}
          onOpenChange={(next) => setOpen(next, "trigger")}
          dismissOnOutsidePress={false}
          dismissOnEscape={false}
        >
          {children}
        </Popover>
      </PickerContext.Provider>
    );
  }

  const Input = forwardRef<HTMLElement, Record<string, unknown>>(
    function PickerInput(props, ref) {
      const picker = usePicker("Input");
      const { onKeyDown, onValueChange, ...rest } = props as {
        onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
        onValueChange?: (value: unknown) => void;
      } & Record<string, unknown>;
      return (
        <InputPart
          {...picker.shared}
          {...rest}
          ref={composeRefs(ref as Ref<HTMLElement>, picker.setAnchor)}
          value={picker.value}
          onValueChange={(next: unknown) => {
            picker.setValue(next);
            onValueChange?.(next);
          }}
          onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
            onKeyDown?.(event);
            if (event.defaultPrevented) return;
            if (event.altKey && event.key === "ArrowDown") {
              event.preventDefault();
              picker.setOpen(true, "input-key");
            } else if (event.key === "Escape" && picker.open) {
              event.preventDefault();
              picker.setOpen(false, "escape");
            }
          }}
        />
      );
    },
  );

  const Trigger = forwardRef<HTMLButtonElement, PickerTriggerProps>(
    function PickerTrigger(props, ref) {
      const picker = usePicker("Trigger");
      return (
        <PopoverTrigger
          aria-haspopup="dialog"
          aria-label={config.label}
          {...props}
          ref={composeRefs(
            ref as Ref<HTMLButtonElement>,
            picker.triggerRef as Ref<HTMLButtonElement>,
          )}
        />
      );
    },
  );

  const Content = forwardRef<HTMLDivElement, PickerContentProps>(
    function PickerContent({ children, onKeyDown, ...rest }, ref) {
      const picker = usePicker("Content");
      return (
        <PopoverContent
          role="dialog"
          aria-label={config.label}
          side="bottom"
          align="start"
          {...rest}
          anchor={picker.anchor ?? undefined}
          initialFocus={false}
          trapFocus={false}
          restoreFocus={false}
          ref={composeRefs(
            ref as Ref<HTMLDivElement>,
            picker.contentRef as Ref<HTMLDivElement>,
          )}
          onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
            onKeyDown?.(event);
            // The panel consumes Escape while a range preview is active (P13).
            if (event.key === "Escape" && !event.defaultPrevented) {
              event.preventDefault();
              picker.setOpen(false, "escape");
            }
          }}
        >
          {children ?? <Panel />}
        </PopoverContent>
      );
    },
  );

  const Panel = forwardRef<HTMLElement, Record<string, unknown>>(
    function PickerPanel(props, ref) {
      const picker = usePicker("Panel");
      const { onValueChange, onValueCommit, ...rest } = props as {
        onValueChange?: (value: unknown) => void;
        onValueCommit?: (value: unknown) => void;
      } & Record<string, unknown>;
      return (
        <PanelPart
          autoFocus
          {...picker.shared}
          {...rest}
          ref={ref}
          value={picker.value}
          onValueChange={(next: unknown) => {
            picker.setValue(next);
            onValueChange?.(next);
          }}
          onValueCommit={(next: unknown) => {
            onValueCommit?.(next);
            picker.commit(next);
          }}
        />
      );
    },
  );

  return { Root, Input, Trigger, Content, Panel } as unknown as PickerParts<
    V,
    InputP,
    PanelP
  >;
}
