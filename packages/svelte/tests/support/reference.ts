import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compile } from "svelte/compiler";
import { flushSync, mount, tick, unmount } from "svelte";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
export const entryUrl = pathToFileURL(
  join(packageRoot, "dist", "index.js"),
).href;
export const calendarEntryUrl = pathToFileURL(
  join(packageRoot, "dist", "calendar", "index.js"),
).href;

const IMPORTS = (from: string) => `
  import {
    Calendar, CalendarAgenda, CalendarAgendaDay, CalendarMonthGrid, CalendarNextButton,
    CalendarPrevButton, CalendarTimeGrid, CalendarTimeGridColumnHeader, CalendarTimeGridSlot,
    CalendarTitle, CalendarTodayButton, CalendarViewButton,
    MiniCalendar, MiniCalendarGrid, MiniCalendarNextButton, MiniCalendarPrevButton, MiniCalendarTitle,
  } from "${from}";`;

/** The reference composition every adapter renders for the parity scenarios. */
export const calendarSource = (from = entryUrl): string => `
<script>
  ${IMPORTS(from)}
  let { initial = {} } = $props();
  let options = $state(initial);
  export function update(next) { options = next; }
  const views = ["month", "week", "workWeek", "day", "agenda", "multiMonth"];
</script>
<Calendar {...options}>
  <header>
    <CalendarPrevButton />
    <CalendarTodayButton />
    <CalendarNextButton />
    <CalendarTitle />
    {#each views as view (view)}<CalendarViewButton {view} />{/each}
  </header>
  <CalendarMonthGrid month={0} />
  <CalendarMonthGrid month={1} />
  <CalendarMonthGrid month={2} />
  <CalendarTimeGrid>
    {#snippet children({ days, slots })}
      <div role="presentation">
        <div role="row">
          {#each days as day (day.key)}<CalendarTimeGridColumnHeader {day}>{day.date.day}</CalendarTimeGridColumnHeader>{/each}
        </div>
        {#each slots as slot (slot.index)}
          <div role="row">{#each days as day (day.key)}<CalendarTimeGridSlot {slot} {day} />{/each}</div>
        {/each}
      </div>
    {/snippet}
  </CalendarTimeGrid>
  <CalendarAgenda>
    {#snippet children(days)}
      {#each days as day (day.key)}<CalendarAgendaDay {day}>{day.date.day}</CalendarAgendaDay>{/each}
    {/snippet}
  </CalendarAgenda>
</Calendar>`;

export const miniSource = (from = entryUrl): string => `
<script>
  ${IMPORTS(from)}
  let { initial = {} } = $props();
  let options = $state(initial);
  export function update(next) { options = next; }
</script>
<MiniCalendar {...options}>
  <MiniCalendarPrevButton />
  <MiniCalendarTitle />
  <MiniCalendarNextButton />
  <MiniCalendarGrid />
</MiniCalendar>`;

const directory = mkdtempSync(join(packageRoot, "tests", "fixtures-"));
let count = 0;
export const cleanupFixtures = (): void =>
  rmSync(directory, { recursive: true, force: true });

export type Mounted = {
  app: Record<string, unknown>;
  target: HTMLElement;
  update(next: object): Promise<void>;
  destroy(): void;
};

/** Compile a Svelte source string and mount it into a fresh element. */
export async function mountSource(
  source: string,
  initial: object = {},
): Promise<Mounted> {
  count += 1;
  const compiled = compile(source, {
    generate: "client",
    dev: true,
    filename: `fixture-${count}.svelte`,
  });
  const file = join(directory, `fixture-${count}.mjs`);
  writeFileSync(file, compiled.js.code, "utf8");
  const module = (await import(pathToFileURL(file).href)) as {
    default: Parameters<typeof mount>[0];
  };
  const target = document.createElement("div");
  document.body.append(target);
  const app = mount(module.default, { target, props: { initial } }) as Record<
    string,
    unknown
  >;
  flushSync();
  await tick();
  return {
    app,
    target,
    async update(next) {
      (app.update as (value: object) => void)(next);
      flushSync();
      await tick();
    },
    destroy() {
      unmount(app as never);
      target.remove();
    },
  };
}

export const settle = async (): Promise<void> => {
  flushSync();
  await tick();
  await tick();
};
