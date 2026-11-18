import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import {
  calendarEntryUrl,
  cleanupFixtures,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { resetDom } from "./support/dom.ts";

const source = `
<script>
  import {
    Calendar, CalendarEvent, CalendarEventDragPreview, CalendarEventResizeHandle,
    CalendarEvents, CalendarMonthGrid,
  } from "${calendarEntryUrl}";
  let { initial = {} } = $props();
</script>
<Calendar {...initial}>
  <CalendarMonthGrid month={0}>
    {#snippet children(day)}
      <CalendarEvents {day}>
        {#snippet children(segments)}
          {#each segments as segment (segment.key)}
            <CalendarEvent {segment}>Stand-up<CalendarEventResizeHandle {segment} edge="end" /></CalendarEvent>
          {/each}
        {/snippet}
      </CalendarEvents>
      <CalendarEventDragPreview {day}>ghost</CalendarEventDragPreview>
    {/snippet}
  </CalendarMonthGrid>
</Calendar>`;

const base = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
  editable: true,
  events: [{ id: "A", start: "2026-11-17T09:00", end: "2026-11-17T10:00" }],
};
const live: Mounted[] = [];
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

const open = async (options: object) => {
  const mounted = await mountSource(source, options);
  live.push(mounted);
  await settle();
  return mounted.target;
};
const pointer = (el: Element, type: string, x: number, y: number) =>
  el.dispatchEvent(
    new (window as any).PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );

test("an editable event carries data-editable and a resize handle", async () => {
  const root = await open(base);
  assert.equal(
    root.querySelector("[data-chrono-event]")?.hasAttribute("data-editable"),
    true,
  );
  assert.equal(
    root
      .querySelector("[data-chrono-resize]")
      ?.getAttribute("data-chrono-resize"),
    "end",
  );
});

test("a pointer drag proposes a move; a click does not", async () => {
  const proposals: any[] = [];
  const root = await open({
    ...base,
    hitTest: () => ({ cellKey: "2026-11-19" }),
    onEventChange: (p: any) => void proposals.push(p),
  });
  const event = root.querySelector("[data-chrono-event]") as Element;
  pointer(event, "pointerdown", 10, 10);
  pointer(event, "pointerup", 10, 10);
  assert.equal(proposals.length, 0);
  pointer(event, "pointerdown", 10, 10);
  pointer(event, "pointermove", 60, 10);
  await new Promise((r) => setTimeout(r, 40));
  await settle();
  assert.ok(root.querySelector("[data-drag-preview]"));
  pointer(event, "pointerup", 60, 10);
  await settle();
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].kind, "move");
  assert.equal(root.querySelector("[data-drag-preview]"), null);
});

test("without editable there is no data-editable", async () => {
  const root = await open({ ...base, editable: false });
  assert.equal(
    root.querySelector("[data-chrono-event]")?.hasAttribute("data-editable"),
    false,
  );
});
