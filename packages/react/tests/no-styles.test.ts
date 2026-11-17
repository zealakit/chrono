import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { cleanup, render } from "@testing-library/react";
import { resetDom } from "./support/dom.ts";
import { referenceCalendar, referenceMini } from "./support/reference.ts";

const options = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
} as const;

beforeEach(resetDom);
afterEach(cleanup);

test("markup of every part has no style attribute and no class the consumer did not pass", () => {
  for (const view of [
    "month",
    "week",
    "workWeek",
    "day",
    "agenda",
    "multiMonth",
  ]) {
    const { container } = render(
      referenceCalendar({
        ...options,
        defaultView: view,
        selectedDate: "2026-11-18",
      }),
    );
    assert.equal(container.querySelectorAll("[style]").length, 0, view);
    assert.equal(container.querySelectorAll("[class]").length, 0, view);
    cleanup();
  }
  const mini = render(
    referenceMini({ ...options, id: "mini", isMarked: () => true } as never),
  );
  assert.equal(mini.container.querySelectorAll("[style], [class]").length, 0);
});

test("the consumer's class is the only class", () => {
  const { container } = render(
    referenceCalendar({ ...options, className: "mine" } as never),
  );
  assert.equal(container.querySelectorAll("[class]").length, 1);
  assert.equal(container.querySelector("[class]")?.className, "mine");
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
    // No literal inline style string; --chrono-* properties are set as an object (R2).
    assert.doesNotMatch(readFileSync(file, "utf8"), /\bstyle\s*=\s*["']/, file);
  }
  // The one style-applying helper exists (plan 05 R2).
  assert.ok(
    files.some(
      (file) =>
        file.endsWith("style-properties.js") ||
        file.endsWith("/style-properties.js"),
    ),
  );
});
