import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { resetDom } from "./support/dom.ts";
import { ReferenceCalendar, ReferenceMini } from "./support/reference.ts";
import { applyStep, readScenarios, toOptions } from "./support/scenarios.ts";
import { snapshot } from "./support/snapshot.ts";

const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

// The shared fixture (written by the React adapter) is the contract all four adapters meet.
for (const scenario of readScenarios().scenarios) {
  test(`parity snapshot: ${scenario.name}`, async () => {
    const wrapper = mount(
      scenario.kind === "mini" ? ReferenceMini : ReferenceCalendar,
      {
        props: { options: toOptions(scenario) },
        attachTo: document.body,
      },
    );
    mounted.push(wrapper);
    for (const step of scenario.steps)
      await applyStep(wrapper.element as Element, step);
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(snapshot(wrapper.element as Element), scenario.snapshot);
  });
}
