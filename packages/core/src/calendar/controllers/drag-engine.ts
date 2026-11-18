import {
  type Attributes,
  type Messages,
  type PlainDate,
  type PlainDateTime,
  type ZonedDateTime,
  announce,
  formatDateTime,
  formatMessage,
  fromInstant,
  parseCellKey,
  plainDate,
  plainDateTime,
  toInstant,
  toZoned,
} from "../../foundation/index.js";
import type {
  AllDayRowSegment,
  CalendarEventInput,
  CalendarEvents,
  NormalizedEvent,
} from "../events/types.js";
import {
  type DragTarget,
  type EditValue,
  type GeometryOptions,
  grabOf,
  moveEvent,
  nudgeEvent,
  resizeEvent,
  toSeconds,
} from "../interaction/drag-geometry.js";
import {
  DEFAULT_SHORTCUTS,
  type EditKind,
  type Shortcuts,
  editStep,
  matchShortcut,
} from "../interaction/drag-keyboard.js";
import type { HitTarget } from "../interaction/hit-test.js";
import type { RecurrenceInfo } from "../recurrence/types.js";
import { type PendingChange, unresolved } from "../interaction/pending.js";
import type { Modifiers } from "./shared.js";

export type ChangeValue = {
  start: PlainDateTime | ZonedDateTime | PlainDate;
  end: PlainDateTime | ZonedDateTime | PlainDate;
  allDay: boolean;
};

/** The proposal a drop emits (plan 09 M2). Values use the types the event used; all-day ends are exclusive. */
export type EventChangeProposal<
  TEvent extends CalendarEventInput = CalendarEventInput,
> = {
  kind: EditKind;
  event: TEvent;
  from: ChangeValue;
  to: ChangeValue;
  source: "pointer" | "keyboard";
  /** The series occurrence this change belongs to (plan 12 RR8). */
  recurrence?: RecurrenceInfo<TEvent>;
};

export type DragState<TEvent extends CalendarEventInput = CalendarEventInput> =
  {
    kind: EditKind;
    /** The segment key the drag started on. */
    segmentKey: string;
    /** The normalized event key. */
    eventKey: string;
    eventId: string | number;
    source: "pointer" | "keyboard";
    from: EditValue;
    to: EditValue;
    /** `false`: the target is not allowed, or `validateEventChange` said no. */
    valid: boolean;
    preview: {
      events: CalendarEvents<TEvent>;
      allDayRow: AllDayRowSegment<TEvent>[];
    };
  };

export type DragOptions<TEvent extends CalendarEventInput> = {
  editable?: boolean;
  isEventEditable?: (event: TEvent, kind: EditKind) => boolean;
  snapDuration?: number;
  allowAllDayConversion?: boolean;
  defaultTimedDuration?: number;
  onEventChange?: (
    proposal: EventChangeProposal<TEvent>,
  ) => void | boolean | Promise<boolean>;
  validateEventChange?: (proposal: EventChangeProposal<TEvent>) => boolean;
  pendingTimeout?: number;
  keyboardShortcuts?: Partial<Shortcuts> | false;
  getEventLabel?: (event: TEvent) => string;
  announcer?: HTMLElement | false;
};

export type DragContext<TEvent extends CalendarEventInput> = {
  options(): DragOptions<TEvent> & { timeGrid?: { step?: number } };
  layoutKind(): "month" | "time-grid" | "list";
  timeZone(): string;
  locale(): string | undefined;
  messages(): Messages;
  rtl(): boolean;
  normalized(): NormalizedEvent<TEvent>[];
  segmentEvent(segmentKey: string): TEvent | undefined;
  /** The normalized occurrence a segment key belongs to (plan 12 RR7). */
  segmentNormalized(segmentKey: string): NormalizedEvent<TEvent> | undefined;
  buildPreview(event: NormalizedEvent<TEvent>): DragState<TEvent>["preview"];
  refresh(): void;
};

const isZonedInput = (value: unknown): boolean =>
  (typeof value === "object" && value !== null && "timeZone" in value) ||
  (typeof value === "string" && /\[|Z$|[+-]\d{2}:?\d{2}$/.test(value));

/** Pointer and keyboard editing of events, and the accepted changes still pending (plan 09). */
export function createDragEngine<TEvent extends CalendarEventInput>(
  ctx: DragContext<TEvent>,
) {
  let drag: DragState<TEvent> | null = null;
  let pending: PendingChange[] = [];
  let grab = { dayOffset: 0, minuteOffset: 0 };
  let lastAnnounce = 0;
  let token = 0;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const shortcuts = (): Shortcuts | false => {
    const configured = ctx.options().keyboardShortcuts;
    return configured === false
      ? false
      : { ...DEFAULT_SHORTCUTS, ...configured };
  };
  const geometry = (): GeometryOptions => {
    const options = ctx.options();
    const slot = options.timeGrid?.step ?? 30;
    return {
      view: ctx.layoutKind() === "month" ? "month" : "time-grid",
      snap: options.snapDuration ?? slot,
      slot,
      allowAllDayConversion: options.allowAllDayConversion ?? true,
      defaultTimedDuration: options.defaultTimedDuration ?? 60,
    };
  };

  const normalizedOf = (
    segmentKey: string,
  ): NormalizedEvent<TEvent> | undefined => ctx.segmentNormalized(segmentKey);

  const canEdit = (norm: NormalizedEvent<TEvent>, kind: EditKind): boolean => {
    const options = ctx.options();
    if (!options.editable || ctx.layoutKind() === "list") return false;
    const event = norm.event;
    if (event.editable === false) return false;
    if (kind === "move" ? event.movable === false : event.resizable === false)
      return false;
    return options.isEventEditable
      ? options.isEventEditable(event, kind)
      : true;
  };

  const editValueOf = (norm: NormalizedEvent<TEvent>): EditValue => ({
    start: norm.start,
    end: norm.end,
    allDay: norm.allDay,
  });

  const toChange = (
    norm: NormalizedEvent<TEvent>,
    value: EditValue,
  ): ChangeValue => {
    const date = (v: PlainDateTime): PlainDate =>
      plainDate(v.year, v.month, v.day);
    if (value.allDay) {
      return { start: date(value.start), end: date(value.end), allDay: true };
    }
    if (isZonedInput(norm.event.start)) {
      const zone = ctx.timeZone();
      return {
        start: toZoned(value.start, zone),
        end: toZoned(value.end, zone),
        allDay: false,
      };
    }
    return { start: value.start, end: value.end, allDay: false };
  };

  const proposalOf = (
    state: Pick<DragState<TEvent>, "kind" | "from" | "to" | "source">,
    norm: NormalizedEvent<TEvent>,
  ): EventChangeProposal<TEvent> => ({
    kind: state.kind,
    event: norm.event,
    from: toChange(norm, state.from),
    to: toChange(norm, state.to),
    source: state.source,
    recurrence: norm.recurrence,
  });

  /** A zoned event keeps its real duration across DST (plan 09 §13.2); plain events keep wall time. */
  const keepRealDuration = (
    norm: NormalizedEvent<TEvent>,
    to: EditValue,
  ): EditValue => {
    if (to.allDay || !isZonedInput(norm.event.start)) return to;
    const zone = ctx.timeZone();
    const duration =
      toInstant(toZoned(norm.end, zone)) - toInstant(toZoned(norm.start, zone));
    const start = toZoned(to.start, zone);
    const end = fromInstant(toInstant(start) + duration, zone);
    return { ...to, end: plainDateTime(end, end) };
  };

  const rangeText = (value: EditValue): string => {
    const locale = ctx.locale();
    const format = {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    } as const;
    return value.allDay
      ? formatDateTime(value.start, locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : `${formatDateTime(value.start, locale, format)} – ${formatDateTime(value.end, locale, { hour: "numeric", minute: "2-digit" })}`;
  };
  const say = (
    template: keyof Messages,
    value: EditValue,
    norm?: NormalizedEvent<TEvent>,
  ): void => {
    const label = norm
      ? (ctx.options().getEventLabel?.(norm.event) ?? String(norm.id))
      : "";
    announce(
      formatMessage(ctx.messages()[template], {
        event: label,
        range: rangeText(value),
      }),
      ctx.options().announcer,
    );
  };

  const build = (
    kind: EditKind,
    segmentKey: string,
    norm: NormalizedEvent<TEvent>,
    from: EditValue,
    candidate: EditValue | null,
    source: "pointer" | "keyboard",
  ): DragState<TEvent> => {
    const to = candidate
      ? kind === "move"
        ? keepRealDuration(norm, candidate)
        : candidate
      : from;
    const partial = { kind, from, to, source };
    const valid =
      candidate !== null &&
      (ctx.options().validateEventChange?.(proposalOf(partial, norm)) ?? true);
    const preview = ctx.buildPreview({
      ...norm,
      key: `${norm.key}:preview`,
      start: to.start,
      end: to.end,
      allDay: to.allDay,
    });
    return {
      ...partial,
      segmentKey,
      eventKey: norm.key,
      eventId: norm.id,
      valid,
      preview,
    };
  };

  const targetOf = (hit: HitTarget): DragTarget => {
    const { date, time } = parseCellKey(hit.cellKey);
    return { date, time, allDayRow: hit.allDay };
  };

  const removePending = (eventKey: string, expected?: number): void => {
    const timer = timers.get(eventKey);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(eventKey);
    }
    const before = pending.length;
    pending = pending.filter(
      (change) =>
        change.eventKey !== eventKey ||
        (expected !== undefined && tokens.get(eventKey) !== expected),
    );
    if (pending.length !== before) tokens.delete(eventKey);
    ctx.refresh();
  };
  const tokens = new Map<string, number>();

  const commit = (
    state: DragState<TEvent>,
    norm: NormalizedEvent<TEvent>,
  ): void => {
    const proposal = proposalOf(state, norm);
    let result: void | boolean | Promise<boolean>;
    try {
      result = ctx.options().onEventChange?.(proposal);
    } catch (error) {
      console.error(
        "[chrono] onEventChange threw; the change is rejected.",
        error,
      );
      say("changeCancelled", state.from);
      return;
    }
    if (result === false) {
      say("changeCancelled", state.from);
      return;
    }
    const mine = ++token;
    tokens.set(norm.key, mine);
    pending = [
      ...pending.filter((change) => change.eventKey !== norm.key),
      { eventKey: norm.key, eventId: norm.id, to: state.to },
    ];
    const timer = timers.get(norm.key);
    if (timer !== undefined) clearTimeout(timer);
    timers.set(
      norm.key,
      setTimeout(
        () => removePending(norm.key, mine),
        ctx.options().pendingTimeout ?? 10_000,
      ),
    );
    say(state.kind === "move" ? "movedTo" : "resizedTo", state.to);
    if (result && typeof (result as Promise<boolean>).then === "function") {
      (result as Promise<boolean>).then(
        (ok) => {
          if (ok === false) removePending(norm.key, mine);
        },
        (error) => {
          console.error(
            "[chrono] onEventChange rejected; the change is dropped.",
            error,
          );
          removePending(norm.key, mine);
        },
      );
    }
  };

  const engine = {
    get drag(): DragState<TEvent> | null {
      return drag;
    },
    get pending(): PendingChange[] {
      return pending;
    },
    isEditing: (): boolean => drag !== null && drag.source === "keyboard",
    canEdit,
    canEditSegment(segmentKey: string, kind: EditKind): boolean {
      const norm = normalizedOf(segmentKey);
      return !!norm && canEdit(norm, kind);
    },
    /** Start an edit. `hit` is where the pointer grabbed the event (pointer drags). */
    start(
      kind: EditKind,
      segmentKey: string,
      source: "pointer" | "keyboard",
      hit?: HitTarget,
    ): boolean {
      const norm = normalizedOf(segmentKey);
      if (!norm || !canEdit(norm, kind) || drag) return false;
      const from = editValueOf(norm);
      grab = hit
        ? grabOf(from, targetOf(hit))
        : { dayOffset: 0, minuteOffset: 0 };
      drag = build(kind, segmentKey, norm, from, from, source);
      say(kind === "move" ? "moving" : "resizing", from, norm);
      ctx.refresh();
      return true;
    },
    update(hit: HitTarget): void {
      if (!drag) return;
      const norm = ctx.normalized().find((n) => n.key === drag?.eventKey);
      if (!norm) return;
      const target = targetOf(hit);
      const g = geometry();
      const candidate =
        drag.kind === "move"
          ? moveEvent(drag.from, grab, target, g)
          : resizeEvent(
              drag.from,
              drag.kind === "resize-start" ? "start" : "end",
              target,
              g,
            );
      const next = build(
        drag.kind,
        drag.segmentKey,
        norm,
        drag.from,
        candidate,
        drag.source,
      );
      if (
        toSeconds(next.to.start) === toSeconds(drag.to.start) &&
        toSeconds(next.to.end) === toSeconds(drag.to.end) &&
        next.to.allDay === drag.to.allDay &&
        next.valid === drag.valid
      ) {
        return;
      }
      drag = next;
      const now = Date.now();
      if (now - lastAnnounce >= 500) {
        lastAnnounce = now;
        say(
          drag.valid
            ? drag.kind === "move"
              ? "moving"
              : "resizing"
            : "notAllowedHere",
          drag.to,
          norm,
        );
      }
      ctx.refresh();
    },
    drop(): void {
      const current = drag;
      if (!current) return;
      const norm = ctx.normalized().find((n) => n.key === current.eventKey);
      drag = null;
      if (
        norm &&
        current.valid &&
        (toSeconds(current.to.start) !== toSeconds(current.from.start) ||
          toSeconds(current.to.end) !== toSeconds(current.from.end) ||
          current.to.allDay !== current.from.allDay)
      ) {
        commit(current, norm);
      } else if (norm && !current.valid) {
        say("notAllowedHere", current.to);
      }
      ctx.refresh();
    },
    cancel(): void {
      if (!drag) return;
      const from = drag.from;
      drag = null;
      say("changeCancelled", from);
      ctx.refresh();
    },
    /** Keyboard editing keys. Returns `true` when the key was consumed. */
    handleKey(key: string, modifiers: Modifiers): boolean {
      const current = drag;
      if (!current) return false;
      if (key === "Tab") return true; // focus cannot leave mid-edit
      const step = editStep(current.kind, key, {
        timeGrid: ctx.layoutKind() === "time-grid" && !current.to.allDay,
        snap: geometry().snap,
        rtl: ctx.rtl(),
      });
      void modifiers;
      if (!step) return false;
      const norm = ctx.normalized().find((n) => n.key === current.eventKey);
      if (!norm) return false;
      if (step.type === "cancel") {
        engine.cancel();
        return true;
      }
      if (step.type === "drop") {
        if (!current.valid) {
          say("notAllowedHere", current.to);
          return true;
        }
        engine.drop();
        return true;
      }
      const moved = nudgeEvent(current.to, current.kind, step, geometry());
      drag = build(
        current.kind,
        current.segmentKey,
        norm,
        current.from,
        moved,
        "keyboard",
      );
      say(
        drag.valid
          ? drag.kind === "move"
            ? "moving"
            : "resizing"
          : "notAllowedHere",
        drag.to,
        norm,
      );
      ctx.refresh();
      return true;
    },
    /** The edit a shortcut starts for the focused event, or `null`. */
    shortcut(
      key: string,
      modifiers: Modifiers & { alt?: boolean },
    ): EditKind | null {
      return matchShortcut(key, modifiers, shortcuts());
    },
    /** A pending change shows the event at its new position (plan 09 M3). */
    override(norm: NormalizedEvent<TEvent>): NormalizedEvent<TEvent> {
      const change = pending.find((item) => item.eventKey === norm.key);
      return change
        ? {
            ...norm,
            start: change.to.start,
            end: change.to.end,
            allDay: change.to.allDay,
          }
        : norm;
    },
    pendingSignature: (): string =>
      pending
        .map(
          (c) =>
            `${c.eventKey}@${toSeconds(c.to.start)}-${toSeconds(c.to.end)}${c.to.allDay ? "d" : ""}`,
        )
        .join(","),
    /** `events` changed: resolve pending changes, cancel a drag whose event vanished (M14). */
    onEventsChanged(incoming: readonly NormalizedEvent<TEvent>[]): void {
      const remaining = unresolved(pending, incoming);
      if (remaining.length !== pending.length) {
        for (const change of pending) {
          if (!remaining.includes(change)) {
            const timer = timers.get(change.eventKey);
            if (timer !== undefined) clearTimeout(timer);
            timers.delete(change.eventKey);
            tokens.delete(change.eventKey);
          }
        }
        pending = remaining;
      }
      if (drag && !incoming.some((n) => n.key === drag?.eventKey)) {
        drag = null;
      }
    },
    attributes(segmentKey: string): Attributes {
      const norm = ctx.segmentNormalized(segmentKey);
      const editable =
        !!norm && (canEdit(norm, "move") || canEdit(norm, "resize-end"));
      const keys = shortcuts();
      return {
        "data-editable": editable,
        "data-dragging": !!drag && !!norm && drag.eventKey === norm.key,
        "data-pending": !!norm && pending.some((c) => c.eventKey === norm.key),
        "aria-keyshortcuts":
          editable && keys
            ? `${keys.move.toUpperCase()} ${keys.resizeEnd.toUpperCase()} Shift+${keys.resizeEnd.toUpperCase()}`
            : undefined,
        "aria-description": editable
          ? ctx.messages().editInstructions
          : undefined,
      };
    },
    resizeHandle(segmentKey: string, edge: "start" | "end"): Attributes {
      const norm = normalizedOf(segmentKey);
      return {
        "data-chrono-resize": edge,
        "aria-hidden": "true",
        "data-disabled":
          !norm ||
          !canEdit(norm, edge === "start" ? "resize-start" : "resize-end"),
      };
    },
    dispose(): void {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      drag = null;
      pending = [];
    },
  };
  return engine;
}

export type DragEngine<TEvent extends CalendarEventInput> = ReturnType<
  typeof createDragEngine<TEvent>
>;
