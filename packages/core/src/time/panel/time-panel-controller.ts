import {
  type Attributes,
  type Messages,
  type PlainTime,
  type TimeConstraints,
  type TimeInput,
  createControllable,
  createId,
  defaultMessages,
  formatTime,
  fromSecondOfDay,
  getDayPeriodLabel,
  getDayPeriodNames,
  getHourCycle,
  getTextDirection,
  getTimeStatus,
  isSameTime,
  mergeMessages,
  nowZoned,
  plainTime,
  resolveLocale,
  toLatinDigits,
  toPlainTime,
  toSecondOfDay,
} from "../../foundation/index.js";
import {
  type TimeRangeInvalidReason,
  type TimeRangeLimits,
  checkTimeRangeValue,
} from "../selection/range.js";
import {
  type BookingSlot,
  type BookingSlotInput,
  getBookingSlots,
  timeKey,
} from "../selection/slots.js";
import type {
  HourCycle,
  TimeGranularity,
  TimePartName,
  TimeRangeValue,
  TimeValue,
} from "../types.js";

const DAY = 86400;
export type TimePanelModifiers = {
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
};
export type TimePanelKind = "single" | "range";

export type TimePanelBaseOptions = {
  id?: string;
  granularity?: TimeGranularity;
  hourCycle?: HourCycle;
  step?: { minutes?: number; seconds?: number };
  /** List layout: first entry (default 00:00). */
  start?: TimeInput;
  /** List layout: exclusive end (default end of day). */
  end?: TimeInput;
  /** Minutes: each entry becomes a slot `[start, start + slotDuration)`. */
  slotDuration?: number;
  slots?: readonly BookingSlotInput[];
  groupBy?:
    | false
    | "hour"
    | "dayPeriod"
    | ((time: PlainTime) => { key: string; label: string });
  min?: TimeInput;
  max?: TimeInput;
  disabledRanges?: readonly { start: TimeInput; end: TimeInput }[];
  isTimeDisabled?: (time: PlainTime) => boolean;
  isTimeUnavailable?: (time: PlainTime) => boolean;
  scrollToSelected?: boolean;
  autoFocus?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  locale?: string;
  timeZone?: string;
  now?: number;
  messages?: Partial<Messages>;
  /** Clock for type-ahead (milliseconds). Default `Date.now`. */
  timer?: () => number;
};

export type TimePanelOptions = TimePanelBaseOptions & {
  layout?: "columns" | "list";
  value?: TimeValue;
  defaultValue?: TimeValue;
  onValueChange?: (value: TimeValue, info: { slot?: BookingSlot }) => void;
  onValueCommit?: (value: PlainTime, info: { slot?: BookingSlot }) => void;
};

export type TimeRangePanelOptions = TimePanelBaseOptions & {
  layout?: "list" | "columns";
  value?: TimeRangeValue;
  defaultValue?: TimeRangeValue;
  onValueChange?: (value: TimeRangeValue) => void;
  onValueCommit?: (value: { start: PlainTime; end: PlainTime }) => void;
  onRangePreviewChange?: (
    preview: { start: PlainTime; end: PlainTime } | null,
  ) => void;
  onInvalidRange?: (reason: TimeRangeInvalidReason) => void;
  allowOvernight?: boolean;
  /** Minutes. */
  minDuration?: number;
  maxDuration?: number;
};

export type TimePanelOptionState = {
  key: string;
  text: string;
  label: string;
  /** Columns: the part value; list: seconds since midnight of the start. */
  value: number;
  selected: boolean;
  disabled: boolean;
  unavailable: boolean;
  focused: boolean;
  now: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
  preview: boolean;
  blocked: boolean;
};

export type TimePanelColumnState = {
  key: string;
  part: TimePartName;
  label: string;
  options: TimePanelOptionState[];
};
export type TimePanelSetState = {
  key: "value" | "start" | "end";
  label: string;
  columns: TimePanelColumnState[];
};
export type TimePanelGroupState = {
  key: string;
  label: string;
  options: TimePanelOptionState[];
};

export type TimePanelState = {
  id: string;
  kind: TimePanelKind;
  layout: "columns" | "list";
  value: TimeValue | TimeRangeValue;
  draft: boolean;
  preview: { start: PlainTime; end: PlainTime } | null;
  sets: TimePanelSetState[];
  groups: TimePanelGroupState[];
  focusKey: string;
  crossesMidnight: boolean;
  /** Minutes of a complete range. */
  duration: number | null;
  readOnly: boolean;
  disabled: boolean;
  autoFocus: boolean;
  scrollToSelected: boolean;
  direction: "ltr" | "rtl";
  locale?: string;
  messages: Messages;
};

type P = {
  hour: number | null;
  minute: number | null;
  second: number | null;
  period: 0 | 1 | null;
};
type SetKey = "value" | "start" | "end";
const EMPTY: P = { hour: null, minute: null, second: null, period: null };

const sameT = (a: TimeValue, b: TimeValue): boolean =>
  a === b || (a !== null && b !== null && isSameTime(a, b));
const sameR = (a: TimeRangeValue, b: TimeRangeValue): boolean =>
  a === b ||
  (a !== null && b !== null && sameT(a.start, b.start) && sameT(a.end, b.end));

export type TimePanelController<V, O> = {
  getState(): TimePanelState;
  subscribe(listener: (state: TimePanelState) => void): () => void;
  setOptions(options: Partial<O>): void;
  getValue(): V;
  getSlot(key: string): BookingSlot | undefined;
  pick(key: string, source: "pointer" | "keyboard"): void;
  setPreview(key: string | null): void;
  cancelDraft(): void;
  clear(): void;
  commit(): void;
  focusOption(key: string): void;
  handleKeyDown(key: string, modifiers: TimePanelModifiers): boolean;
  getRootAttributes(): Attributes;
  getSetAttributes(set: TimePanelSetState): Attributes;
  getColumnAttributes(column: TimePanelColumnState): Attributes;
  getGroupAttributes(group: TimePanelGroupState): Attributes;
  getListAttributes(): Attributes;
  getOptionAttributes(option: TimePanelOptionState): Attributes;
  destroy(): void;
};

type AnyOptions = TimePanelBaseOptions & {
  layout?: "columns" | "list";
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: never, info?: never) => void;
  onValueCommit?: (value: never, info?: never) => void;
  onRangePreviewChange?: (
    preview: { start: PlainTime; end: PlainTime } | null,
  ) => void;
  onInvalidRange?: (reason: TimeRangeInvalidReason) => void;
  allowOvernight?: boolean;
  minDuration?: number;
  maxDuration?: number;
};

type Entry = {
  key: string;
  time: PlainTime;
  startSecond: number;
  endSecond: number;
  available: boolean;
  slot?: BookingSlot;
};

function createPanel<V, O>(
  kind: TimePanelKind,
  initial: O,
): TimePanelController<V, O> {
  let options = initial as unknown as AnyOptions;
  const id = options.id ?? createId("chrono-time-panel");
  const range = kind === "range";
  const layout = (): "columns" | "list" =>
    options.layout ?? (range ? "list" : "columns");
  const localeOf = (): string | undefined =>
    options.locale === undefined ? undefined : resolveLocale(options.locale);
  const gran = (): TimeGranularity => options.granularity ?? "minute";
  const cycle = (): HourCycle => options.hourCycle ?? getHourCycle(localeOf());
  const bound = (value: TimeInput | undefined): PlainTime | undefined =>
    value === undefined ? undefined : toPlainTime(value);
  const constraints = (): TimeConstraints => ({
    min: bound(options.min),
    max: bound(options.max),
    disabledRanges: options.disabledRanges?.map((r) => ({
      start: toPlainTime(r.start),
      end: toPlainTime(r.end),
    })),
    isTimeDisabled: options.isTimeDisabled,
  });
  const selectable = (time: PlainTime): boolean =>
    getTimeStatus(time, constraints()).selectable &&
    !options.isTimeUnavailable?.(time);
  const limits = (): TimeRangeLimits => ({
    ...constraints(),
    isTimeUnavailable: options.isTimeUnavailable,
    allowOvernight: options.allowOvernight,
    minDuration: options.minDuration,
    maxDuration: options.maxDuration,
  });

  const control = createControllable<unknown>({
    value: options.value,
    defaultValue: options.defaultValue ?? null,
    onChange: (value) => {
      if (range) (options.onValueChange as (v: unknown) => void)?.(value);
      else
        (options.onValueChange as (v: unknown, i: unknown) => void)?.(value, {
          slot: slotOf(value as TimeValue),
        });
    },
    equals: (a, b) =>
      range
        ? sameR(a as TimeRangeValue, b as TimeRangeValue)
        : sameT(a as TimeValue, b as TimeValue),
  });

  // ---- entries (list layout)
  let entryCache: { sig: string; entries: Entry[] } | undefined;
  const entries = (): Entry[] => {
    const stepSeconds =
      (options.step?.minutes ?? 0) * 60 + (options.step?.seconds ?? 0) || 1800;
    const sig = JSON.stringify([
      options.start,
      options.end,
      options.slotDuration,
      options.step,
      options.slots,
      options.min,
      options.max,
      options.disabledRanges,
    ]);
    // Functions cannot be part of the signature; recompute when they are present.
    if (
      entryCache?.sig === sig &&
      !options.isTimeDisabled &&
      !options.isTimeUnavailable
    ) {
      return entryCache.entries;
    }
    const slotMode =
      options.slots !== undefined || options.slotDuration !== undefined;
    let list: Entry[];
    if (slotMode) {
      list = getBookingSlots({
        start: options.start,
        end: options.end,
        slotDuration: options.slotDuration,
        step: options.step?.minutes,
        slots: options.slots,
        min: options.min,
        max: options.max,
        disabledRanges: options.disabledRanges,
        isTimeDisabled: options.isTimeDisabled,
        isTimeUnavailable: options.isTimeUnavailable,
      }).map((slot) => ({
        key: slot.key,
        time: slot.start,
        startSecond: slot.startSecond,
        endSecond: slot.endSecond,
        available: slot.available,
        slot,
      }));
    } else {
      const first =
        options.start === undefined
          ? 0
          : toSecondOfDay(toPlainTime(options.start));
      const last =
        options.end === undefined
          ? DAY
          : toSecondOfDay(toPlainTime(options.end)) || DAY;
      list = [];
      for (let at = first; at < last; at += stepSeconds) {
        const time = fromSecondOfDay(at);
        list.push({
          key: timeKey(time),
          time,
          startSecond: at,
          endSecond: at,
          available: selectable(time),
        });
      }
    }
    entryCache = { sig, entries: list };
    return list;
  };
  const slotOf = (value: TimeValue): BookingSlot | undefined => {
    if (!value || range || layout() !== "list") return undefined;
    return entries().find((e) => e.key === timeKey(value))?.slot;
  };

  // ---- columns state (partial parts per set)
  const parts: Record<SetKey, P> = { value: EMPTY, start: EMPTY, end: EMPTY };
  const requiredParts = (): TimePartName[] => {
    const list: TimePartName[] = ["hour"];
    if (gran() !== "hour") list.push("minute");
    if (gran() === "second") list.push("second");
    if (cycle() === "h12") list.push("dayPeriod");
    return list;
  };
  const to24 = (hour: number, period: 0 | 1 | null): number =>
    cycle() === "h12" ? (hour % 12) + (period === 1 ? 12 : 0) : hour;
  const fromTime = (time: PlainTime | null): P =>
    time
      ? {
          hour: cycle() === "h12" ? time.hour % 12 || 12 : time.hour,
          minute: time.minute,
          second: time.second,
          period: time.hour >= 12 ? 1 : 0,
        }
      : EMPTY;
  const toTime = (p: P): PlainTime | null => {
    const need = requiredParts();
    const has = (part: TimePartName) =>
      part === "dayPeriod"
        ? p.period !== null
        : p[part as "hour" | "minute" | "second"] !== null;
    if (!need.every(has)) return null;
    return plainTime(
      to24(p.hour as number, p.period),
      gran() === "hour" ? 0 : (p.minute as number),
      gran() === "second" ? (p.second as number) : 0,
    );
  };
  const syncParts = (): void => {
    const value = control.get();
    if (range) {
      const r = value as TimeRangeValue;
      if (!sameT(toTime(parts.start), r?.start ?? null))
        parts.start = fromTime(r?.start ?? null);
      if (!sameT(toTime(parts.end), r?.end ?? null))
        parts.end = fromTime(r?.end ?? null);
    } else if (!sameT(toTime(parts.value), value as TimeValue)) {
      parts.value = fromTime(value as TimeValue);
    }
  };
  syncParts();

  let focusKey = "";
  let hover: string | null = null;
  let draftStart: Entry | null = null;
  let beforeDraft: TimeRangeValue = null;
  let lastPreview = "";
  let typeBuffer = "";
  let typeAt = 0;
  let state: TimePanelState;
  const listeners = new Set<(state: TimePanelState) => void>();

  const minuteValues = (): number[] => {
    const size = options.step?.minutes ?? 1;
    return Array.from({ length: Math.ceil(60 / size) }, (_, i) => i * size);
  };
  const secondValues = (): number[] => {
    const size = options.step?.seconds ?? 1;
    return Array.from({ length: Math.ceil(60 / size) }, (_, i) => i * size);
  };
  const hourValues = (): number[] =>
    cycle() === "h12"
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : Array.from({ length: 24 }, (_, i) => i);

  /** Does any time in the given hour/minute/second sets satisfy `ok`? Early exit. */
  const anyOk = (
    hours: number[],
    minutes: number[],
    seconds: number[],
    ok: (time: PlainTime) => boolean,
  ): boolean => {
    for (const h of hours) {
      for (const m of minutes) {
        for (const s of seconds) if (ok(plainTime(h, m, s))) return true;
      }
    }
    return false;
  };

  const text = (time: PlainTime): string =>
    formatTime(time, localeOf(), {
      hour: "numeric",
      minute: gran() === "hour" ? undefined : "2-digit",
      second: gran() === "second" ? "2-digit" : undefined,
      hourCycle: cycle(),
    });

  const buildColumns = (
    setKey: SetKey,
    messages: Messages,
  ): TimePanelColumnState[] => {
    const p = parts[setKey];
    const names = getDayPeriodNames(localeOf());
    const isEnd = range && setKey === "end";
    const start = isEnd ? toTime(parts.start) : null;
    const rangeOk = (end: PlainTime): boolean =>
      !start || checkTimeRangeValue(start, end, limits()).valid;
    const ok = (time: PlainTime): boolean => (isEnd ? true : selectable(time));
    const restMinutes = gran() === "hour" ? [0] : minuteValues();
    const restSeconds = gran() === "second" ? secondValues() : [0];
    const hoursFor = (hour: number | null, period: 0 | 1 | null): number[] => {
      if (hour === null)
        return Array.from({ length: 24 }, (_, i) => i).filter(
          (h) =>
            cycle() !== "h12" || period === null || h >= 12 === (period === 1),
        );
      return cycle() === "h12"
        ? period === null
          ? [to24(hour, 0), to24(hour, 1)]
          : [to24(hour, period)]
        : [hour];
    };
    const mark = (hours: number[], minutes: number[], seconds: number[]) => {
      const free = anyOk(hours, minutes, seconds, ok);
      const blocked =
        isEnd && start
          ? !anyOk(hours, minutes, seconds, (t) => rangeOk(t))
          : false;
      return { disabled: !free && !isEnd, blocked };
    };
    const columns: TimePanelColumnState[] = [];
    const prefix = setKey === "value" ? "" : `${setKey}:`;
    const selectedTime = toTime(p);
    const option = (
      part: TimePartName,
      value: number,
      label: string,
      shown: string,
      flags: { disabled: boolean; blocked: boolean },
      selected: boolean,
    ): TimePanelOptionState => ({
      key: `${prefix}${part}:${value}`,
      text: shown,
      label: `${label}, ${shown}`,
      value,
      selected,
      disabled: flags.disabled,
      unavailable: false,
      focused: false,
      now: false,
      rangeStart: false,
      rangeEnd: false,
      inRange: false,
      preview: false,
      blocked: flags.blocked,
    });
    const pad = (n: number) => String(n).padStart(2, "0");
    columns.push({
      key: `${prefix}hour`,
      part: "hour",
      label: messages.hour,
      options: hourValues().map((h) =>
        option(
          "hour",
          h,
          messages.hour,
          cycle() === "h12" ? String(h) : pad(h),
          mark(hoursFor(h, p.period), restMinutes, restSeconds),
          p.hour === h,
        ),
      ),
    });
    if (gran() !== "hour") {
      columns.push({
        key: `${prefix}minute`,
        part: "minute",
        label: messages.minute,
        options: minuteValues().map((m) =>
          option(
            "minute",
            m,
            messages.minute,
            pad(m),
            mark(hoursFor(p.hour, p.period), [m], restSeconds),
            p.minute === m,
          ),
        ),
      });
    }
    if (gran() === "second") {
      columns.push({
        key: `${prefix}second`,
        part: "second",
        label: messages.second,
        options: secondValues().map((s) =>
          option(
            "second",
            s,
            messages.second,
            pad(s),
            mark(
              hoursFor(p.hour, p.period),
              p.minute === null ? restMinutes : [p.minute],
              [s],
            ),
            p.second === s,
          ),
        ),
      });
    }
    if (cycle() === "h12") {
      columns.push({
        key: `${prefix}dayPeriod`,
        part: "dayPeriod",
        label: messages.dayPeriod,
        options: ([0, 1] as const).map((period) =>
          option(
            "dayPeriod",
            period,
            messages.dayPeriod,
            period === 1 ? names.pm : names.am,
            mark(
              p.hour === null
                ? Array.from({ length: 12 }, (_, i) => i + period * 12)
                : [to24(p.hour, period)],
              restMinutes,
              restSeconds,
            ),
            p.period === period,
          ),
        ),
      });
    }
    void selectedTime;
    return columns;
  };

  const compute = (): TimePanelState => {
    syncParts();
    const locale = localeOf();
    const messages = mergeMessages(defaultMessages, options.messages);
    const value = control.get();
    const draft =
      range &&
      (value as TimeRangeValue)?.start != null &&
      (value as TimeRangeValue)?.end == null;
    const rv = range ? (value as TimeRangeValue) : null;
    const lay = layout();
    let sets: TimePanelSetState[] = [];
    const groups: TimePanelGroupState[] = [];
    let preview: TimePanelState["preview"] = null;
    let crossesMidnight = false;
    let duration: number | null = null;
    if (rv?.start && rv.end) {
      const check = checkTimeRangeValue(rv.start, rv.end, limits());
      if (check.valid) {
        crossesMidnight = check.crossesMidnight;
        duration = check.duration;
      }
    }

    if (lay === "columns") {
      sets = (range ? (["start", "end"] as const) : (["value"] as const)).map(
        (key) => ({
          key,
          label:
            key === "start"
              ? messages.startTime
              : key === "end"
                ? messages.endTime
                : messages.time,
          columns: buildColumns(key, messages),
        }),
      );
      if (
        !focusKey ||
        !sets.some((s) =>
          s.columns.some((c) => c.options.some((o) => o.key === focusKey)),
        )
      ) {
        const firstSet = sets[0] as TimePanelSetState;
        const chosen = firstSet.columns[0]?.options.find((o) => o.selected);
        focusKey =
          (
            chosen ??
            firstSet.columns[0]?.options.find((o) => !o.disabled) ??
            firstSet.columns[0]?.options[0]
          )?.key ?? "";
      }
      for (const set of sets)
        for (const column of set.columns)
          for (const o of column.options) o.focused = o.key === focusKey;
    } else {
      const list = entries();
      const nowSecond =
        options.now === undefined
          ? null
          : (() => {
              const z = nowZoned(options.timeZone ?? "UTC", options.now);
              return z.hour * 3600 + z.minute * 60 + z.second;
            })();
      const target = hover ?? focusKey;
      const startEntry = draft
        ? (draftStart ??
          list.find((e) => e.key === timeKey(rv?.start as PlainTime)) ??
          null)
        : null;
      const rangeFor = (
        a: Entry,
        b: Entry,
      ): {
        start: PlainTime;
        end: PlainTime;
        endSecond: number;
        valid: boolean;
      } => {
        let from = a;
        let to = b;
        if (to.startSecond < from.startSecond && !options.allowOvernight)
          [from, to] = [to, from];
        const endSecond =
          to.endSecond % DAY === 0 && to.endSecond > 0 ? DAY : to.endSecond;
        const end = fromSecondOfDay(endSecond % DAY);
        const check = checkTimeRangeValue(from.time, end, limits(), endSecond);
        return { start: from.time, end, endSecond, valid: check.valid };
      };
      if (draft && startEntry) {
        const targetEntry = list.find((e) => e.key === target);
        if (targetEntry) {
          const r = rangeFor(startEntry, targetEntry);
          if (r.valid) preview = { start: r.start, end: r.end };
        }
      }
      const shown: { start: PlainTime; end: PlainTime } | null =
        rv?.start && rv.end ? { start: rv.start, end: rv.end } : preview;
      const startSec = shown ? toSecondOfDay(shown.start) : null;
      let endSec = shown ? toSecondOfDay(shown.end) : null;
      if (startSec !== null && endSec !== null && endSec === 0 && startSec > 0)
        endSec = DAY;
      const flat: TimePanelOptionState[] = list.map((e) => {
        const selectedSingle =
          !range && value !== null && timeKey(value as PlainTime) === e.key;
        const inShown =
          startSec !== null &&
          endSec !== null &&
          (endSec > startSec
            ? e.startSecond >= startSec && e.startSecond < endSec
            : e.startSecond >= startSec || e.startSecond < endSec - DAY);
        const complete = !!(rv?.start && rv.end);
        const slotMode = e.slot !== undefined;
        return {
          key: e.key,
          text: text(e.time),
          label: [
            slotMode
              ? `${text(e.time)} – ${text(fromSecondOfDay(e.endSecond % DAY))}`
              : text(e.time),
            ...(selectedSingle ? [messages.selected] : []),
            ...(!e.available ? [messages.unavailable] : []),
          ].join(", "),
          value: e.startSecond,
          selected:
            selectedSingle ||
            (range && !!rv?.start && sameT(rv.start, e.time)) ||
            (range && complete && endMatches(e, rv?.end ?? null)),
          disabled: false,
          unavailable: !e.available,
          focused: e.key === focusKey,
          now:
            nowSecond !== null &&
            nowSecond >= e.startSecond &&
            nowSecond <
              (e.endSecond > e.startSecond
                ? e.endSecond
                : e.startSecond + (options.step?.minutes ?? 30) * 60),
          rangeStart: range && !!shown && sameT(shown.start, e.time),
          rangeEnd: range && !!shown && endMatches(e, shown.end),
          inRange: range && complete && inShown,
          preview: range && !complete && inShown,
          blocked: !!(draft && startEntry && !rangeFor(startEntry, e).valid),
        };
      });
      const groupOf = (e: Entry): { key: string; label: string } => {
        const by = options.groupBy;
        if (!by) return { key: "all", label: "" };
        if (typeof by === "function") return by(e.time);
        if (by === "hour")
          return {
            key: String(e.time.hour),
            label: text(plainTime(e.time.hour, 0, 0)),
          };
        const label = getDayPeriodLabel(e.time.hour, locale);
        return { key: label, label };
      };
      for (let i = 0; i < list.length; i += 1) {
        const g = groupOf(list[i] as Entry);
        const last = groups[groups.length - 1];
        if (last && last.key === g.key)
          last.options.push(flat[i] as TimePanelOptionState);
        else
          groups.push({
            key: g.key,
            label: g.label,
            options: [flat[i] as TimePanelOptionState],
          });
      }
      if (!focusKey || !flat.some((o) => o.key === focusKey)) {
        focusKey =
          (
            flat.find((o) => o.selected) ??
            flat.find((o) => !o.unavailable) ??
            flat[0]
          )?.key ?? "";
        for (const o of flat) o.focused = o.key === focusKey;
      }
    }
    function endMatches(e: Entry, end: PlainTime | null): boolean {
      if (!end) return false;
      const endSecond = toSecondOfDay(end);
      return e.slot
        ? e.endSecond % DAY === endSecond
        : e.startSecond === endSecond;
    }
    return {
      id,
      kind,
      layout: lay,
      value: value as TimePanelState["value"],
      draft,
      preview,
      sets,
      groups,
      focusKey,
      crossesMidnight,
      duration,
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      autoFocus: options.autoFocus ?? false,
      scrollToSelected: options.scrollToSelected ?? true,
      direction: getTextDirection(locale),
      locale,
      messages,
    };
  };

  const refresh = (): void => {
    const next = compute();
    if (state && JSON.stringify(state) === JSON.stringify(next)) return;
    state = next;
    if (range) {
      const key = next.preview
        ? `${timeKey(next.preview.start)}|${timeKey(next.preview.end)}`
        : "";
      if (key !== lastPreview) {
        lastPreview = key;
        options.onRangePreviewChange?.(next.preview);
      }
    }
    for (const listener of [...listeners]) listener(state);
  };
  state = compute();

  const setValue = (value: unknown): void => control.set(value);

  const flatOptions = (): TimePanelOptionState[] =>
    state.layout === "list"
      ? state.groups.flatMap((g) => g.options)
      : state.sets.flatMap((s) => s.columns.flatMap((c) => c.options));

  const parseColumnKey = (
    key: string,
  ): { set: SetKey; part: TimePartName; value: number } => {
    const bits = key.split(":");
    const set = (bits.length === 3 ? bits[0] : "value") as SetKey;
    return {
      set,
      part: bits[bits.length - 2] as TimePartName,
      value: Number(bits[bits.length - 1]),
    };
  };

  const commitSingle = (time: PlainTime): void => {
    (
      options.onValueCommit as
        | ((v: PlainTime, i: { slot?: BookingSlot }) => void)
        | undefined
    )?.(time, { slot: slotOf(time) });
  };

  const pickColumn = (key: string): void => {
    const { set, part, value } = parseColumnKey(key);
    const option = flatOptions().find((o) => o.key === key);
    if (!option || (option.disabled && set !== "end")) return;
    const next: P = { ...parts[set] };
    if (part === "hour") next.hour = value;
    else if (part === "minute") next.minute = value;
    else if (part === "second") next.second = value;
    else next.period = value as 0 | 1;
    // A part that became disabled by this pick is cleared, never moved silently.
    parts[set] = next;
    const probe = (p: P): boolean => {
      const time = toTime(p);
      return time ? (set === "end" ? true : selectable(time)) : true;
    };
    if (!probe(next)) {
      const cleared: P = { ...next };
      if (part === "hour" || part === "dayPeriod")
        cleared.minute = gran() === "hour" ? cleared.minute : null;
      if (cleared.minute === null && gran() === "second") cleared.second = null;
      parts[set] = cleared;
    }
    focusKey = key;
    const last = requiredParts()[requiredParts().length - 1];
    if (range) {
      const start = toTime(parts.start);
      const end = toTime(parts.end);
      const current = control.get() as TimeRangeValue;
      const nextValue: TimeRangeValue =
        start === null && end === null ? null : { start, end };
      if (!sameR(current, nextValue)) setValue(nextValue);
      if (set === "end" && part === last && start && end) {
        const check = checkTimeRangeValue(start, end, limits());
        if (check.valid)
          (options.onValueCommit as ((v: unknown) => void) | undefined)?.({
            start,
            end,
          });
        else options.onInvalidRange?.(check.reason);
      }
    } else {
      const time = toTime(parts.value);
      if (!sameT(control.get() as TimeValue, time)) setValue(time);
      if (part === last && time && selectable(time)) commitSingle(time);
    }
  };

  const pickList = (key: string): void => {
    const list = entries();
    const entry = list.find((e) => e.key === key);
    if (!entry) return;
    focusKey = key;
    if (!entry.available) {
      if (range) options.onInvalidRange?.("start-invalid");
      return;
    }
    if (!range) {
      setValue(entry.time);
      commitSingle(entry.time);
      return;
    }
    const current = control.get() as TimeRangeValue;
    if (!current?.start || current.end) {
      beforeDraft = current?.start && current.end ? current : null;
      draftStart = entry;
      setValue({ start: entry.time, end: null });
      return;
    }
    const first =
      draftStart ??
      list.find((e) => e.key === timeKey(current.start as PlainTime)) ??
      entry;
    let from = first;
    let to = entry;
    if (to.startSecond < from.startSecond && !options.allowOvernight)
      [from, to] = [to, from];
    const endSecond =
      to.endSecond % DAY === 0 && to.endSecond > 0 ? DAY : to.endSecond;
    const end = fromSecondOfDay(endSecond % DAY);
    const check = checkTimeRangeValue(from.time, end, limits(), endSecond);
    if (!check.valid) {
      options.onInvalidRange?.(check.reason);
      return;
    }
    draftStart = null;
    setValue({ start: from.time, end });
    (options.onValueCommit as ((v: unknown) => void) | undefined)?.({
      start: from.time,
      end,
    });
  };

  const move = (to: string | undefined): boolean => {
    if (!to) return true;
    focusKey = to;
    hover = null;
    refresh();
    return true;
  };

  const controller: TimePanelController<V, O> = {
    getState: () => state,
    getValue: () => control.get() as V,
    getSlot: (key) => entries().find((e) => e.key === key)?.slot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions(next) {
      options = { ...options, ...(next as AnyOptions) };
      control.sync({ value: options.value });
      refresh();
    },
    pick(key, _source) {
      if (options.disabled || options.readOnly) {
        focusKey = key;
        refresh();
        return;
      }
      if (layout() === "columns") pickColumn(key);
      else pickList(key);
      hover = null;
      refresh();
    },
    setPreview(key) {
      hover = key;
      refresh();
    },
    cancelDraft() {
      if (!range || !state.draft) return;
      hover = null;
      draftStart = null;
      setValue(beforeDraft);
      beforeDraft = null;
      refresh();
    },
    clear() {
      if (options.disabled || options.readOnly) return;
      parts.value = EMPTY;
      parts.start = EMPTY;
      parts.end = EMPTY;
      draftStart = null;
      setValue(range ? null : null);
      refresh();
    },
    commit() {
      const value = control.get();
      if (range) {
        const r = value as TimeRangeValue;
        if (r?.start && r.end)
          (options.onValueCommit as ((v: unknown) => void) | undefined)?.({
            start: r.start,
            end: r.end,
          });
      } else if (value) commitSingle(value as PlainTime);
    },
    focusOption(key) {
      focusKey = key;
      refresh();
    },
    handleKeyDown(key, modifiers) {
      if (options.disabled || modifiers.ctrl || modifiers.meta) return false;
      if (key === "Escape") {
        if (range && state.draft) {
          controller.cancelDraft();
          return true;
        }
        return false;
      }
      if (key === "Enter" || key === " ") {
        controller.pick(state.focusKey, "keyboard");
        return true;
      }
      const all = flatOptions();
      const index = all.findIndex((o) => o.key === focusKey);
      const current = all[index];
      const digit = toLatinDigits(key, localeOf());
      if (/^\d$/.test(digit)) {
        const now = (options.timer ?? Date.now)();
        typeBuffer = now - typeAt > 700 ? digit : typeBuffer + digit;
        typeAt = now;
        const norm = (value: string) =>
          toLatinDigits(value, localeOf()).replace(/^0+(?=\d)/, "");
        const scope =
          state.layout === "columns"
            ? (state.sets
                .flatMap((s) => s.columns)
                .find((c) => c.options.some((o) => o.key === focusKey))
                ?.options ?? all)
            : all;
        const found = scope.find((o) =>
          norm(o.text).startsWith(norm(typeBuffer)),
        );
        return move(found?.key);
      }
      if (state.layout === "list") {
        const perHour = Math.max(
          1,
          Math.round(
            3600 /
              ((options.step?.minutes ?? 0) * 60 +
                (options.step?.seconds ?? 0) ||
                (options.slotDuration
                  ? (options.step?.minutes ?? options.slotDuration) * 60
                  : 1800)),
          ),
        );
        const by: Record<string, number> = {
          ArrowDown: 1,
          ArrowUp: -1,
          PageDown: perHour,
          PageUp: -perHour,
        };
        if (key in by)
          return move(
            all[
              Math.max(0, Math.min(all.length - 1, index + (by[key] as number)))
            ]?.key,
          );
        if (key === "Home") return move(all[0]?.key);
        if (key === "End") return move(all[all.length - 1]?.key);
        return false;
      }
      // columns: flat list of columns across sets
      const columns = state.sets.flatMap((s) => s.columns);
      const ci = columns.findIndex((c) =>
        c.options.some((o) => o.key === focusKey),
      );
      const column = columns[ci];
      if (!column || !current) return false;
      const at = column.options.findIndex((o) => o.key === focusKey);
      const rtl = state.direction === "rtl";
      const clamp = (n: number) =>
        Math.max(0, Math.min(column.options.length - 1, n));
      if (key === "ArrowDown") return move(column.options[clamp(at + 1)]?.key);
      if (key === "ArrowUp") return move(column.options[clamp(at - 1)]?.key);
      if (key === "Home") return move(column.options[0]?.key);
      if (key === "End")
        return move(column.options[column.options.length - 1]?.key);
      if (key === "PageDown" || key === "PageUp") {
        const size =
          column.part === "hour" ? 3 : column.part === "dayPeriod" ? 1 : 15;
        return move(
          column.options[clamp(at + (key === "PageDown" ? size : -size))]?.key,
        );
      }
      if (key === "ArrowLeft" || key === "ArrowRight") {
        const step = (key === "ArrowRight") !== rtl ? 1 : -1;
        const target = columns[ci + step];
        if (!target) return true;
        return move(
          target.options[Math.min(at, target.options.length - 1)]?.key,
        );
      }
      return false;
    },

    getRootAttributes: () => ({
      role: "group",
      "data-chrono-time-panel": range ? "range" : true,
      "data-layout": state.layout,
      "data-disabled": state.disabled,
      "data-readonly": state.readOnly,
      dir: state.direction,
    }),
    getSetAttributes: (set) => ({
      role: "group",
      "aria-label": set.label,
      "data-chrono-set": set.key,
    }),
    getColumnAttributes: (column) => ({
      role: "listbox",
      "aria-label": column.label,
      "data-chrono-part": column.part,
    }),
    getGroupAttributes: (group) => ({
      role: "group",
      "aria-label": group.label || undefined,
      "data-chrono-group": group.key,
    }),
    getListAttributes: () => ({
      role: "listbox",
      "aria-multiselectable": range ? "true" : undefined,
    }),
    getOptionAttributes: (option) => ({
      role: "option",
      "aria-selected": option.selected
        ? "true"
        : option.disabled || option.unavailable
          ? undefined
          : "false",
      "aria-disabled":
        option.disabled || option.unavailable || option.blocked
          ? "true"
          : undefined,
      "aria-label": option.label,
      tabindex: option.focused ? 0 : -1,
      "data-chrono-key": option.key,
      "data-selected": option.selected,
      "data-focused": option.focused,
      "data-disabled": option.disabled,
      "data-unavailable": option.unavailable,
      "data-now": option.now,
      "data-range-start": option.rangeStart,
      "data-range-end": option.rangeEnd,
      "data-in-range": option.inRange,
      "data-range-preview": option.preview,
      "data-range-blocked": option.blocked,
    }),
    destroy() {
      listeners.clear();
    },
  };
  return controller;
}

export const createTimePanelController = (
  options: TimePanelOptions = {},
): TimePanelController<TimeValue, TimePanelOptions> =>
  createPanel("single", options);

export const createTimeRangePanelController = (
  options: TimeRangePanelOptions = {},
): TimePanelController<TimeRangeValue, TimeRangePanelOptions> =>
  createPanel("range", options);
