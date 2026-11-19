import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";
import {
  cleanupFixtures,
  entryUrl,
  mountSource,
  settle,
  type Mounted,
} from "./support/mount.ts";

const source = (name: string) => `
<script>
  import { ${name}Root, ${name}Input, ${name}Trigger, ${name}Content, ${name}Panel } from "${entryUrl}";
  let { initial = {} } = $props();
</script>
<${name}Root locale="en-US" timeZone="UTC" now={${Date.UTC(2026, 10, 17, 12)}} portal={false} {...initial}>
  <${name}Input data-testid="input" />
  <${name}Trigger data-testid="trigger">Open</${name}Trigger>
  <${name}Content data-testid="content"><${name}Panel /></${name}Content>
</${name}Root>`;

const live: Mounted[] = [];
afterEach(() => {
  for (const m of live.splice(0)) m.destroy();
  resetDom();
});
after(cleanupFixtures);

const open = async (name = "DatePicker", initial: object = {}) => {
  const m = await mountSource(source(name), initial);
  live.push(m);
  await settle();
  return m.target;
};
const q = (id: string) =>
  document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const isOpen = () => q("content")?.getAttribute("data-state") === "open";
const day = (key: string) =>
  document.body.querySelector(
    `[data-chrono-key="${key}"]:not([data-outside-month])`,
  ) as HTMLElement;
const click = (el: Element) =>
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const pointer = (el: Element) =>
  el.dispatchEvent(
    new (window as never as { PointerEvent: typeof PointerEvent }).PointerEvent(
      "pointerdown",
      { bubbles: true, button: 0 },
    ),
  );
const key = (el: Element, init: KeyboardEventInit) =>
  el.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );

test("the trigger opens a labelled dialog and the ARIA contract is set", async () => {
  await open();
  assert.equal(isOpen(), false);
  click(q("trigger") as HTMLElement);
  await settle();
  const content = q("content") as HTMLElement;
  assert.equal(isOpen(), true);
  assert.equal(content.getAttribute("role"), "dialog");
  assert.equal(content.getAttribute("aria-label"), "Choose date");
  assert.equal(
    (q("trigger") as HTMLElement).getAttribute("aria-haspopup"),
    "dialog",
  );
});

test("Alt+ArrowDown on the input opens it, plain keys do not", async () => {
  await open();
  const input = q("input") as HTMLElement;
  key(input, { key: "ArrowDown" });
  await settle();
  assert.equal(isOpen(), false);
  key(input, { key: "ArrowDown", altKey: true });
  await settle();
  assert.equal(isOpen(), true);
});

test("picking a day commits, closes and returns focus to the trigger", async () => {
  const commits: unknown[] = [];
  await open("DatePicker", { onValueCommit: (v: unknown) => commits.push(v) });
  click(q("trigger") as HTMLElement);
  await settle();
  click(day("2026-11-20"));
  await settle();
  assert.equal(isOpen(), false);
  assert.equal(commits.length, 1);
  assert.equal(document.activeElement, q("trigger"));
});

test("a press on an input segment keeps it open; a press outside closes", async () => {
  await open();
  click(q("trigger") as HTMLElement);
  await settle();
  pointer(
    (q("input") as HTMLElement).querySelector("[role=spinbutton]") as Element,
  );
  await settle();
  assert.equal(isOpen(), true, "still open");
  pointer(document.body);
  await settle();
  assert.equal(isOpen(), false);
});

test("Escape closes and reports the reasons", async () => {
  const reasons: string[] = [];
  await open("DatePicker", {
    onOpenChange: (_o: boolean, reason: string) => reasons.push(reason),
  });
  click(q("trigger") as HTMLElement);
  await settle();
  key(q("content") as HTMLElement, { key: "Escape" });
  await settle();
  assert.equal(isOpen(), false);
  assert.deepEqual(reasons, ["trigger", "escape"]);
});

test("a range keeps the popup open after the first pick, cancels a draft with Escape, closes after the second", async () => {
  await open("DateRangePicker");
  click(q("trigger") as HTMLElement);
  await settle();
  click(day("2026-11-10"));
  await settle();
  assert.equal(isOpen(), true, "first pick keeps it open");
  key(day("2026-11-10"), { key: "Escape" });
  await settle();
  assert.equal(isOpen(), true, "Escape cancels the draft only");
  click(day("2026-11-10"));
  await settle();
  click(day("2026-11-14"));
  await settle();
  assert.equal(isOpen(), false);
});

test("time and date-time pickers open with their own labels", async () => {
  await open("TimePicker");
  click(q("trigger") as HTMLElement);
  await settle();
  assert.equal(
    (q("content") as HTMLElement).getAttribute("aria-label"),
    "Choose time",
  );
  live.pop()?.destroy();
  resetDom();
  await open("DateTimePicker");
  click(q("trigger") as HTMLElement);
  await settle();
  assert.equal(
    (q("content") as HTMLElement).getAttribute("aria-label"),
    "Choose date and time",
  );
});
