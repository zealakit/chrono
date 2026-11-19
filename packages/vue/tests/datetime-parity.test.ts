import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import {
  DateTimeInput,
  DateTimePanel,
  DateTimeRangeInput,
  DateTimeRangePanel,
} from "../dist/datetime/index.js";
import {
  applyDateTimeStep,
  readDateTimeScenarios,
  toDateTimeOptions,
} from "./support/datetime-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

const COMPONENTS = {
  "datetime-panel": DateTimePanel,
  "datetime-range-panel": DateTimeRangePanel,
  "datetime-input": DateTimeInput,
  "datetime-range-input": DateTimeRangeInput,
} as const;
const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

// The fixture is written by the React adapter; every adapter must meet it.
for (const scenario of readDateTimeScenarios().scenarios) {
  test(`datetime parity snapshot: ${scenario.name}`, async () => {
    const wrapper = mount(
      COMPONENTS[scenario.kind] as never,
      {
        props: toDateTimeOptions(scenario) as never,
        attachTo: document.body,
      } as never,
    ) as VueWrapper;
    mounted.push(wrapper);
    for (const step of scenario.steps) {
      await applyDateTimeStep(wrapper.element as Element, step, async () => {
        await nextTick();
        await nextTick();
      });
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(snapshot(wrapper.element as Element), scenario.snapshot);
  });
}
