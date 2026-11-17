import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import {
  calendarSource,
  cleanupFixtures,
  miniSource,
  mountSource,
  type Mounted,
} from "./support/reference.ts";
import { resetDom } from "./support/dom.ts";
import { applyStep, readScenarios, toOptions } from "./support/scenarios.ts";
import { snapshot } from "./support/snapshot.ts";

const live: Mounted[] = [];
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

// The shared fixture (written by the React adapter) is the contract all four adapters meet.
for (const scenario of readScenarios().scenarios) {
  test(`parity snapshot: ${scenario.name}`, async () => {
    const mounted = await mountSource(
      scenario.kind === "mini" ? miniSource() : calendarSource(),
      toOptions(scenario),
    );
    live.push(mounted);
    for (const step of scenario.steps) await applyStep(mounted.target, step);
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(
      snapshot(mounted.target.firstElementChild as Element),
      scenario.snapshot,
    );
  });
}
