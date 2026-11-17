/** ISO weekday number: 1 = Monday ... 7 = Sunday (plan 03 D2). */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A calendar date with no time and no time zone. Months are 1-based (D2). */
export type PlainDate = Readonly<{
  calendar: "gregory";
  year: number;
  month: number;
  day: number;
}>;

/** A wall-clock time with no date and no time zone. Second precision (D6). */
export type PlainTime = Readonly<{
  hour: number;
  minute: number;
  second: number;
}>;

export type PlainDateTime = Readonly<PlainDate & PlainTime>;

/** A wall-clock date-time pinned to a time zone. `offset` is minutes east of UTC (D7). */
export type ZonedDateTime = Readonly<
  PlainDateTime & { timeZone: string; offset: number }
>;

/** How a wall time that is skipped or repeated by a DST change is resolved (D8). */
export type Disambiguation = "compatible" | "earlier" | "later" | "reject";

/** What public props accept for a date. */
export type DateInput = PlainDate | string | Date;

/** What public props accept for a time. */
export type TimeInput = PlainTime | string;

/** `constrain` clamps an overflowing day; `reject` throws (D5). */
export type Overflow = "constrain" | "reject";

/** Locale week rules (D12). */
export type WeekInfo = Readonly<{
  firstDay: DayOfWeek;
  weekend: readonly DayOfWeek[];
  minimalDays: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}>;
