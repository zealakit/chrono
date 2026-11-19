import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";
import { mountCalendar, mountMini } from "./support/reference.ts";
import { applyStep, readScenarios, toOptions } from "./support/scenarios.ts";
import { snapshot } from "./support/snapshot.ts";

beforeEach(resetDom);
afterEach(resetDom);

// The shared fixture (written by the React adapter) is the contract all four adapters meet.
for (const scenario of readScenarios().scenarios) {
  test(`parity snapshot: ${scenario.name}`, () => {
    const options = toOptions(scenario) as never;
    const root =
      scenario.kind === "mini"
        ? mountMini(options).root
        : mountCalendar(options).root;
    for (const step of scenario.steps) applyStep(root, step);
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(snapshot(root), scenario.snapshot);
  });
}
