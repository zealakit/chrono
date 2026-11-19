import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import {
  TimeInput,
  TimePanel,
  TimeRangeInput,
  TimeRangePanel,
} from "../dist/time/index.js";
import {
  applyTimeStep,
  readTimeScenarios,
  toTimeOptions,
} from "./support/time-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

const COMPONENTS = {
  "time-panel": TimePanel,
  "time-range-panel": TimeRangePanel,
  "time-input": TimeInput,
  "time-range-input": TimeRangeInput,
} as const;
const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

// The fixture is written by the React adapter; every adapter must meet it.
for (const scenario of readTimeScenarios().scenarios) {
  test(`time parity snapshot: ${scenario.name}`, async () => {
    const wrapper = mount(
      COMPONENTS[scenario.kind] as never,
      {
        props: toTimeOptions(scenario) as never,
        attachTo: document.body,
      } as never,
    ) as VueWrapper;
    mounted.push(wrapper);
    for (const step of scenario.steps) {
      await applyTimeStep(wrapper.element as Element, step, async () => {
        await nextTick();
        await nextTick();
      });
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(snapshot(wrapper.element as Element), scenario.snapshot);
  });
}
