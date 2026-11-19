import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { after, afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  calendarSource,
  cleanupFixtures,
  miniSource,
  mountSource,
  type Mounted,
} from "./support/reference.ts";
import { resetDom } from "./support/dom.ts";

const options = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const live: Mounted[] = [];
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

test("markup of every part has no style attribute and no class the consumer did not pass", async () => {
  for (const view of [
    "month",
    "week",
    "workWeek",
    "day",
    "agenda",
    "multiMonth",
  ]) {
    const mounted = await mountSource(calendarSource(), {
      ...options,
      defaultView: view,
      selectedDate: "2026-11-18",
    });
    live.push(mounted);
    assert.equal(
      mounted.target.querySelectorAll("[style], [class]").length,
      0,
      view,
    );
  }
  const mini = await mountSource(miniSource(), {
    ...options,
    id: "mini",
    isMarked: () => true,
  });
  live.push(mini);
  assert.equal(mini.target.querySelectorAll("[style], [class]").length, 0);
});

test("dist contains no .css file and no <style> block or CSS import", () => {
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  const files = walk(dist);
  assert.equal(files.filter((file) => file.endsWith(".css")).length, 0);
  for (const file of files.filter((f) => /\.(js|svelte)$/.test(f))) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /\.css["']/, file);
    assert.doesNotMatch(text, /<style[\s>]/, file);
  }
});
