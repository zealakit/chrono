import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  TimePicker,
} from "../dist/index.js";
import { resetDom } from "./support/dom.ts";

const NOW = Date.UTC(2026, 10, 17, 12);
const wait = (ms = 30) =>
  act(() => new Promise<void>((r) => setTimeout(r, ms)));
const base = { locale: "en-US", timeZone: "UTC", now: NOW };

const datePicker = (props: Record<string, unknown> = {}) =>
  h(
    DatePicker.Root as never,
    { ...base, ...props },
    h(DatePicker.Input, { "data-testid": "input" } as never),
    h(DatePicker.Trigger, { "data-testid": "trigger" } as never, "Open"),
    h(
      DatePicker.Content,
      { portal: false, "data-testid": "content" } as never,
      h(DatePicker.Panel, null),
    ),
  );
const rangePicker = () =>
  h(
    DateRangePicker.Root as never,
    base,
    h(DateRangePicker.Input, null),
    h(DateRangePicker.Trigger, { "data-testid": "trigger" } as never, "Open"),
    h(
      DateRangePicker.Content,
      { portal: false, "data-testid": "content" } as never,
      h(DateRangePicker.Panel, null),
    ),
  );
const day = (key: string) =>
  document.body.querySelector(
    `[data-chrono-key="${key}"]:not([data-outside-month])`,
  ) as HTMLElement;

beforeEach(resetDom);
afterEach(cleanup);

test("the trigger opens a labelled dialog and the ARIA contract is set", async () => {
  const { getByTestId, queryByTestId } = render(datePicker());
  assert.equal(queryByTestId("content"), null);
  const trigger = getByTestId("trigger");
  assert.equal(trigger.getAttribute("aria-haspopup"), "dialog");
  fireEvent.click(trigger);
  await wait();
  const content = getByTestId("content");
  assert.equal(content.getAttribute("role"), "dialog");
  assert.equal(content.getAttribute("aria-label"), "Choose date");
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
});

test("Alt+ArrowDown on the input opens it, plain keys do not", async () => {
  const { getByTestId, queryByTestId } = render(datePicker());
  const input = getByTestId("input");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  await wait();
  assert.equal(queryByTestId("content"), null);
  fireEvent.keyDown(input, { key: "ArrowDown", altKey: true });
  await wait();
  assert.ok(getByTestId("content"));
});

test("picking a day commits, closes, fills the field and returns focus to the trigger", async () => {
  const commits: unknown[] = [];
  const { getByTestId, queryByTestId, container } = render(
    datePicker({ onValueCommit: (v: unknown) => commits.push(v) }),
  );
  fireEvent.click(getByTestId("trigger"));
  await wait();
  fireEvent.click(day("2026-11-20"));
  await wait();
  assert.equal(queryByTestId("content"), null);
  assert.equal(commits.length, 1);
  assert.equal(document.activeElement, getByTestId("trigger"));
  assert.match(container.textContent ?? "", /20/);
});

test("a press on an input segment while open keeps it open (O1); a press outside closes", async () => {
  const { getByTestId, queryByTestId } = render(
    h(
      "div",
      null,
      datePicker(),
      h("p", { "data-testid": "outside" }, "outside"),
    ),
  );
  fireEvent.click(getByTestId("trigger"));
  await wait();
  const segment = getByTestId("input").querySelector(
    "[role=spinbutton]",
  ) as HTMLElement;
  fireEvent.pointerDown(segment);
  await wait();
  assert.ok(queryByTestId("content"), "still open");
  fireEvent.pointerDown(getByTestId("outside"));
  await wait();
  assert.equal(queryByTestId("content"), null);
});

test("Escape closes the popup, returns focus and reports the reasons", async () => {
  const reasons: string[] = [];
  const { getByTestId, queryByTestId } = render(
    datePicker({
      onOpenChange: (_: boolean, reason: string) => reasons.push(reason),
    }),
  );
  fireEvent.click(getByTestId("trigger"));
  await wait();
  fireEvent.keyDown(getByTestId("content"), { key: "Escape" });
  await wait();
  assert.equal(queryByTestId("content"), null);
  assert.deepEqual(reasons, ["trigger", "escape"]);
  assert.equal(document.activeElement, getByTestId("trigger"));
});

test("controlled open stays closed until the app opens it", async () => {
  const opens: boolean[] = [];
  const { getByTestId, queryByTestId, rerender } = render(
    datePicker({
      open: false,
      value: null,
      onOpenChange: (o: boolean) => opens.push(o),
    }),
  );
  fireEvent.click(getByTestId("trigger"));
  await wait();
  assert.equal(queryByTestId("content"), null);
  assert.deepEqual(opens, [true]);
  rerender(datePicker({ open: true, value: null }));
  await wait();
  assert.ok(queryByTestId("content"));
});

test("a range keeps the popup open after the first pick and closes after the second", async () => {
  const { getByTestId, queryByTestId } = render(rangePicker());
  fireEvent.click(getByTestId("trigger"));
  await wait();
  fireEvent.click(day("2026-11-10"));
  await wait();
  assert.ok(queryByTestId("content"), "first pick keeps it open");
  fireEvent.click(day("2026-11-14"));
  await wait();
  assert.equal(queryByTestId("content"), null);
});

test("Escape during a range preview cancels the preview only, then closes", async () => {
  const { getByTestId, queryByTestId } = render(rangePicker());
  fireEvent.click(getByTestId("trigger"));
  await wait();
  fireEvent.click(day("2026-11-10"));
  await wait();
  fireEvent.keyDown(day("2026-11-10"), { key: "Escape" });
  await wait();
  assert.ok(
    queryByTestId("content"),
    "the draft is cancelled, the popup stays",
  );
  fireEvent.keyDown(day("2026-11-10"), { key: "Escape" });
  await wait();
  assert.equal(queryByTestId("content"), null);
});

test("time and date-time pickers open with their own labels", async () => {
  const time = render(
    h(
      TimePicker.Root as never,
      base,
      h(TimePicker.Input, null),
      h(TimePicker.Trigger, { "data-testid": "trigger" } as never, "t"),
      h(TimePicker.Content, {
        portal: false,
        "data-testid": "content",
      } as never),
    ),
  );
  fireEvent.click(time.getByTestId("trigger"));
  await wait();
  assert.equal(
    time.getByTestId("content").getAttribute("aria-label"),
    "Choose time",
  );
  cleanup();
  const dateTime = render(
    h(
      DateTimePicker.Root as never,
      base,
      h(DateTimePicker.Input, null),
      h(DateTimePicker.Trigger, { "data-testid": "trigger" } as never, "t"),
      h(DateTimePicker.Content, {
        portal: false,
        "data-testid": "content",
      } as never),
    ),
  );
  fireEvent.click(dateTime.getByTestId("trigger"));
  await wait();
  assert.equal(
    dateTime.getByTestId("content").getAttribute("aria-label"),
    "Choose date and time",
  );
});
