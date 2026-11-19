import assert from "node:assert/strict";
import { test } from "node:test";
import { nowZoned, plainDate, today } from "../dist/foundation/index.js";

test("today() with an injected now near midnight in different zones", () => {
  const now = Date.UTC(2026, 10, 17, 23, 30);
  assert.deepEqual(today("UTC", now), plainDate(2026, 11, 17));
  assert.deepEqual(today("Asia/Ho_Chi_Minh", now), plainDate(2026, 11, 18));
  assert.deepEqual(today("America/New_York", now), plainDate(2026, 11, 17));
  assert.deepEqual(today("Pacific/Kiritimati", now), plainDate(2026, 11, 18));
  assert.deepEqual(
    today("Pacific/Pago_Pago", Date.UTC(2026, 10, 18, 5)),
    plainDate(2026, 11, 17),
  );
});

test("nowZoned uses the injected now", () => {
  const value = nowZoned(
    "Asia/Ho_Chi_Minh",
    Date.UTC(2026, 10, 17, 23, 30, 5, 999),
  );
  assert.deepEqual(
    [value.day, value.hour, value.minute, value.second, value.offset],
    [18, 6, 30, 5, 420],
  );
});

test("without now it reads the clock", () => {
  const before = Date.now();
  const value = nowZoned("UTC");
  const after = Date.now();
  const ms = Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
  );
  assert.ok(ms >= Math.floor(before / 1000) * 1000 && ms <= after);
  assert.ok(typeof today().year === "number");
});
