import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { resetDom } from "./support/dom.ts";
import { mountCalendar, mountMini } from "./support/reference.ts";

const options = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
} as const;
beforeEach(resetDom);
afterEach(resetDom);

test("markup of every view has no style attribute and no class", () => {
  for (const view of [
    "month",
    "week",
    "workWeek",
    "day",
    "agenda",
    "multiMonth",
  ]) {
    const { root, calendar } = mountCalendar({
      ...options,
      defaultView: view,
      selectedDate: "2026-11-18",
    });
    assert.equal(
      root.querySelectorAll("[style], [class]").length +
        (root.hasAttribute("class") ? 1 : 0),
      0,
      view,
    );
    calendar.destroy();
  }
  const { root, mini } = mountMini({
    ...options,
    id: "mini",
    isMarked: () => true,
  });
  assert.equal(root.querySelectorAll("[style], [class]").length, 0);
  mini.destroy();
});

test("dist contains no .css file and no CSS import", () => {
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  const files = walk(dist);
  assert.equal(files.filter((file) => file.endsWith(".css")).length, 0);
  for (const file of files.filter((f) => f.endsWith(".js"))) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /\.css["']/, file);
    assert.doesNotMatch(readFileSync(file, "utf8"), /\bstyle\s*[:=]/, file);
  }
});
