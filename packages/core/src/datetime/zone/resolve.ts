import {
  type Disambiguation,
  type PlainDateTime,
  type ZonedDateTime,
  toZoned,
  withTimeZone,
} from "../../foundation/index.js";

export type ResolvedWall = {
  zoned: ZonedDateTime;
  /** The resolved wall fields differ from the typed ones (a DST gap was crossed). */
  adjusted: boolean;
  /** The wall time happens twice (a DST overlap). */
  ambiguous: boolean;
};

const sameWall = (a: PlainDateTime, b: PlainDateTime): boolean =>
  a.year === b.year &&
  a.month === b.month &&
  a.day === b.day &&
  a.hour === b.hour &&
  a.minute === b.minute &&
  a.second === b.second;

/**
 * Pin a wall time to a zone (plan 08 X3). A gap resolves per `disambiguation` and sets
 * `adjusted`; an overlap resolves per `disambiguation` and sets `ambiguous`. With
 * `"reject"` both throw a `RangeError`.
 */
export function resolveWall(
  wall: PlainDateTime,
  zone: string,
  disambiguation: Disambiguation = "compatible",
): ResolvedWall {
  const zoned = toZoned(wall, zone, disambiguation);
  const earlier = toZoned(wall, zone, "earlier");
  const later = toZoned(wall, zone, "later");
  return {
    zoned,
    adjusted: !sameWall(zoned, wall),
    ambiguous:
      earlier.offset !== later.offset &&
      sameWall(earlier, wall) &&
      sameWall(later, wall),
  };
}

/** The same instant in the zone the app stores values in (plan 08 X2). */
export const toValueZone = (
  zoned: ZonedDateTime,
  valueTimeZone: string | undefined,
): ZonedDateTime =>
  valueTimeZone === undefined ? zoned : withTimeZone(zoned, valueTimeZone);
