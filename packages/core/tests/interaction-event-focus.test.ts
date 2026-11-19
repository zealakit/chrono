import assert from "node:assert/strict";
import { test } from "node:test";
import {
  enterCell,
  isExitKey,
  stepFocus,
  type FocusState,
} from "../dist/calendar/index.js";

const items = ["evt-a", "evt-b", "more"];

test("enterCell focuses the first item in interaction mode", () => {
  assert.deepEqual(enterCell("2026-11-17", items), {
    mode: "interaction",
    cellKey: "2026-11-17",
    itemKey: "evt-a",
  });
});

test("ArrowDown and Tab move to the next item, wrapping", () => {
  let focus: FocusState = enterCell("c", items);
  focus = stepFocus(focus, "ArrowDown", { shift: false }, items) as FocusState;
  assert.equal(focus.itemKey, "evt-b");
  focus = stepFocus(focus, "Tab", { shift: false }, items) as FocusState;
  assert.equal(focus.itemKey, "more");
  focus = stepFocus(focus, "ArrowDown", { shift: false }, items) as FocusState;
  assert.equal(focus.itemKey, "evt-a");
});

test("ArrowUp and Shift+Tab move to the previous item, wrapping", () => {
  const focus: FocusState = {
    mode: "interaction",
    cellKey: "c",
    itemKey: "evt-a",
  };
  const prev = stepFocus(
    focus,
    "ArrowUp",
    { shift: false },
    items,
  ) as FocusState;
  assert.equal(prev.itemKey, "more");
  const shiftTab = stepFocus(
    focus,
    "Tab",
    { shift: true },
    items,
  ) as FocusState;
  assert.equal(shiftTab.itemKey, "more");
});

test("Home and End jump to the first and last item", () => {
  const focus: FocusState = {
    mode: "interaction",
    cellKey: "c",
    itemKey: "evt-b",
  };
  assert.equal(
    (stepFocus(focus, "Home", { shift: false }, items) as FocusState).itemKey,
    "evt-a",
  );
  assert.equal(
    (stepFocus(focus, "End", { shift: false }, items) as FocusState).itemKey,
    "more",
  );
});

test("Escape and F2 return to navigation mode on the owning cell", () => {
  const focus: FocusState = {
    mode: "interaction",
    cellKey: "c",
    itemKey: "evt-a",
  };
  assert.deepEqual(stepFocus(focus, "Escape", { shift: false }, items), {
    mode: "navigation",
    cellKey: "c",
  });
  assert.deepEqual(stepFocus(focus, "F2", { shift: false }, items), {
    mode: "navigation",
    cellKey: "c",
  });
  assert.equal(isExitKey("Escape"), true);
  assert.equal(isExitKey("F2"), true);
  assert.equal(isExitKey("Enter"), false);
});

test("Space and Enter are not focus-movement keys", () => {
  const focus: FocusState = {
    mode: "interaction",
    cellKey: "c",
    itemKey: "evt-a",
  };
  assert.equal(stepFocus(focus, " ", { shift: false }, items), null);
  assert.equal(stepFocus(focus, "Enter", { shift: false }, items), null);
});

test("an empty cell has no interaction focus", () => {
  assert.equal(
    stepFocus(
      { mode: "interaction", cellKey: "c" },
      "ArrowDown",
      { shift: false },
      [],
    ),
    null,
  );
});
