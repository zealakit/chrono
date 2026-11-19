import assert from "node:assert/strict";
import { test } from "node:test";
import { createTimePanelController } from "../dist/time/index.js";
import type { AvailabilitySpec } from "../dist/foundation/index.js";

const base = {
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 9, 10),
};

type Option = {
  key: string;
  text: string;
  disabled: boolean;
  unavailable: boolean;
  label: string;
};
type State = {
  sets: { columns: { part: string; options: Option[] }[] }[];
  groups: { options: Option[] }[];
};

const hourOptions = (c: { getState(): State }): Option[] =>
  c.getState().sets[0]?.columns.find((column) => column.part === "hour")
    ?.options ?? [];
const listOptions = (c: { getState(): State }): Option[] =>
  c.getState().groups.flatMap((group) => group.options);

const lunch: AvailabilitySpec = {
  blocked: [{ type: "daily", start: "12:00", end: "13:00" }],
};

test("list options inside a blocked window are unavailable", () => {
  const c = createTimePanelController({
    ...base,
    layout: "list",
    availability: lunch,
  });
  const options = listOptions(c);
  const noon = options.find((option) => option.key === "12:00");
  assert.ok(noon);
  assert.equal(noon.unavailable, true);
  assert.equal(
    options.find((option) => option.key === "11:00")?.unavailable,
    false,
  );
  const attributes = c.getOptionAttributes(noon as never);
  assert.equal(attributes["data-unavailable"], true);
  assert.match(attributes["aria-label"] as string, /unavailable/);
});

test("a fully blocked hour is disabled in the columns layout", () => {
  // The columns layout disables an hour only when no minute in it is selectable.
  const c = createTimePanelController({
    ...base,
    availability: {
      blocked: [{ type: "daily", start: "00:00", end: "24:00" }],
    },
  });
  assert.equal(
    hourOptions(c).every((option) => option.disabled),
    true,
  );
});

test("time-only components ignore non-daily rules (plan 11 V6)", () => {
  const c = createTimePanelController({
    ...base,
    availability: {
      blocked: [{ type: "weekly", days: [1, 2, 3, 4, 5, 6, 7] }],
    },
  });
  assert.equal(
    hourOptions(c).some((option) => option.disabled),
    false,
  );
});

test("the existing isTimeUnavailable predicate is still combined", () => {
  const c = createTimePanelController({
    ...base,
    layout: "list",
    isTimeUnavailable: (time) => time.hour === 15,
    availability: lunch,
  });
  const options = listOptions(c);
  assert.equal(
    options.find((option) => option.key === "12:00")?.unavailable,
    true,
  );
  assert.equal(
    options.find((option) => option.key === "15:00")?.unavailable,
    true,
  );
  assert.equal(
    options.find((option) => option.key === "11:00")?.unavailable,
    false,
  );
});
