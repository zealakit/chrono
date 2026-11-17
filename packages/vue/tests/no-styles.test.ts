import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { mount, type VueWrapper } from "@vue/test-utils";
import { resetDom } from "./support/dom.ts";
import { ReferenceCalendar, ReferenceMini } from "./support/reference.ts";

const options = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

test("markup of every part has no style attribute and no class the consumer did not pass", () => {
  for (const view of [
    "month",
    "week",
    "workWeek",
    "day",
    "agenda",
    "multiMonth",
  ]) {
    const wrapper = mount(ReferenceCalendar, {
      props: {
        options: { ...options, defaultView: view, selectedDate: "2026-11-18" },
      },
    });
    mounted.push(wrapper);
    const root = wrapper.element as Element;
    assert.equal(
      root.querySelectorAll("[style]").length +
        (root.hasAttribute("style") ? 1 : 0),
      0,
      view,
    );
    assert.equal(
      root.querySelectorAll("[class]").length +
        (root.hasAttribute("class") ? 1 : 0),
      0,
      view,
    );
  }
  const mini = mount(ReferenceMini, {
    props: { options: { ...options, id: "mini", isMarked: () => true } },
  });
  mounted.push(mini);
  assert.equal(
    (mini.element as Element).querySelectorAll("[style], [class]").length,
    0,
  );
});

test("the consumer's class is the only class", () => {
  const wrapper = mount(ReferenceCalendar, {
    props: { options },
    attrs: { class: "mine" },
  });
  mounted.push(wrapper);
  const root = wrapper.element as Element;
  assert.equal(root.className, "mine");
  assert.equal(root.querySelectorAll("[class]").length, 0);
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
