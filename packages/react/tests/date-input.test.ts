import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { plainDate } from "@zealakit/chrono-core/foundation";
import { createElement as h, useState } from "react";
import {
  DateInput,
  DateInputClearButton,
  DatePanel,
  DateRangeInput,
} from "../dist/date/index.js";
import { resetDom } from "./support/dom.ts";

const base = {
  id: "d",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
} as const;

beforeEach(resetDom);
afterEach(cleanup);

const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const press = (text: string) => {
  for (const key of text) {
    fireEvent.keyDown(document.activeElement as Element, { key });
  }
};

test("segments are spinbuttons with one tab stop and placeholders", () => {
  const { container } = render(h(DateInput, base as never));
  const parts = segments(container);
  assert.deepEqual(
    parts.map((p) => p.getAttribute("data-chrono-part")),
    ["month", "day", "year"],
  );
  assert.deepEqual(
    parts.map((p) => p.textContent),
    ["mm", "dd", "yyyy"],
  );
  assert.equal(
    parts.filter((p) => p.getAttribute("tabindex") === "0").length,
    1,
  );
  assert.ok(parts.every((p) => p.getAttribute("role") === "spinbutton"));
  assert.equal(container.querySelectorAll("[aria-hidden=true]").length, 2);
});

test("typing a date advances focus and fires change", () => {
  const changes: unknown[] = [];
  const { container } = render(
    h(DateInput, {
      ...base,
      onValueChange: (v: { day: number } | null) =>
        changes.push(v?.day ?? null),
    } as never),
  );
  segments(container)[0]?.focus();
  press("11");
  assert.equal(document.activeElement, segments(container)[1]);
  press("17");
  assert.equal(document.activeElement, segments(container)[2]);
  press("2026");
  assert.deepEqual(changes, [17]);
  assert.deepEqual(
    segments(container).map((p) => p.textContent),
    ["11", "17", "2026"],
  );
  assert.equal(container.querySelector("[data-invalid]"), null);
});

test("arrows step, an invalid date marks the group", () => {
  const { container } = render(
    h(DateInput, { ...base, defaultValue: plainDate(2026, 1, 31) } as never),
  );
  segments(container)[0]?.focus();
  fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
  assert.deepEqual(
    segments(container).map((p) => p.textContent),
    ["02", "28", "2026"],
  );
  fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
  assert.equal(document.activeElement, segments(container)[1]);
  const bad = render(
    h(DateInput, {
      ...base,
      id: "e",
      min: "2027-01-01",
      defaultValue: plainDate(2026, 5, 1),
    } as never),
  );
  assert.equal(
    bad.container.firstElementChild?.hasAttribute("data-invalid"),
    true,
  );
  assert.equal(
    segments(bad.container)[0]?.getAttribute("aria-invalid"),
    "true",
  );
});

test("text mode parses on blur, keeps invalid text, Escape reverts", () => {
  const { container } = render(
    h(DateInput, { ...base, mode: "text" } as never),
  );
  const input = container.querySelector("input[type=text]") as HTMLInputElement;
  assert.equal(input.getAttribute("placeholder"), "mm/dd/yyyy");
  fireEvent.change(input, { target: { value: "Nov 17 2026" } });
  fireEvent.blur(input);
  assert.equal(input.value, "11/17/2026");
  fireEvent.change(input, { target: { value: "garbage" } });
  fireEvent.blur(input);
  assert.equal(input.value, "garbage");
  assert.equal(input.getAttribute("aria-invalid"), "true");
  fireEvent.keyDown(input, { key: "Escape" });
  assert.equal(input.value, "11/17/2026");
});

test("clear button, disabled and read-only", () => {
  const { container } = render(
    h(
      DateInput,
      { ...base, defaultValue: plainDate(2026, 5, 1) } as never,
      h(DateInputClearButton),
    ),
  );
  fireEvent.click(container.querySelector("button") as Element);
  assert.equal(container.querySelectorAll("[data-chrono-part]").length, 0);
  const off = render(
    h(DateInput, { ...base, id: "f", disabled: true } as never),
  );
  assert.equal(
    off.container.firstElementChild?.getAttribute("aria-disabled"),
    "true",
  );
  assert.equal(
    off.container.querySelector("[data-chrono-part]")?.hasAttribute("tabindex"),
    false,
  );
});

test("forms: hidden input value, and form reset restores the default", () => {
  const { container } = render(
    h(
      "form",
      null,
      h(DateInput, {
        ...base,
        name: "when",
        defaultValue: plainDate(2026, 5, 1),
      } as never),
    ),
  );
  const form = container.querySelector("form") as HTMLFormElement;
  const hidden = () =>
    form.querySelector("input[type=hidden]") as HTMLInputElement;
  assert.equal(hidden().name, "when");
  assert.equal(hidden().value, "2026-05-01");
  segments(container)[0]?.focus();
  fireEvent.keyDown(document.activeElement as Element, { key: "End" });
  assert.equal(hidden().value, "2026-12-01");
  fireEvent.reset(form);
  assert.equal(hidden().value, "2026-05-01");
});

test("range input: two groups, names and shared validity", () => {
  const { container } = render(
    h(DateRangeInput, {
      ...base,
      name: "stay",
      defaultValue: {
        start: plainDate(2026, 6, 1),
        end: plainDate(2026, 6, 9),
      },
    } as never),
  );
  const groups = container.querySelectorAll("[data-chrono-date-input]");
  assert.equal(groups.length, 2);
  assert.deepEqual(
    [...container.querySelectorAll("input[type=hidden]")].map(
      (i) => `${(i as HTMLInputElement).name}=${(i as HTMLInputElement).value}`,
    ),
    ["stay-start=2026-06-01", "stay-end=2026-06-09"],
  );
  assert.equal(
    container.firstElementChild?.hasAttribute("data-invalid"),
    false,
  );
});

test("input + panel share a value: typing moves the panel, picking fills the input", () => {
  function Both() {
    const [value, setValue] = useState<unknown>(null);
    const props = { ...base, value, onValueChange: setValue } as object;
    return h(
      "div",
      null,
      h(DateInput, { ...props, id: "in" } as never),
      h(DatePanel, { ...props, id: "pn" } as never),
    );
  }
  const { container } = render(h(Both));
  segments(container)[0]?.focus();
  press("03092027");
  assert.equal(container.querySelector("h2")?.textContent, "March 2027");
  fireEvent.click(
    container.querySelector('[data-chrono-key="2027-03-15"]') as Element,
  );
  assert.deepEqual(
    segments(container).map((p) => p.textContent),
    ["03", "15", "2027"],
  );
});

test("commit fires on blur out of the group", () => {
  const commits: number[] = [];
  const { container } = render(
    h(
      "div",
      null,
      h(DateInput, {
        ...base,
        onValueCommit: (v: { day: number }) => commits.push(v.day),
      } as never),
      h("button", { id: "next", type: "button" }, "next"),
    ),
  );
  segments(container)[0]?.focus();
  press("11172026");
  (container.querySelector("#next") as HTMLElement).focus();
  assert.deepEqual(commits, [17]);
});
