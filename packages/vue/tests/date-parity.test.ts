import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import {
  DateInput,
  DatePanel,
  DateRangeInput,
  DateRangePanel,
  MultiDatePanel,
} from "../dist/date/index.js";
import {
  applyDateStep,
  readDateScenarios,
  toDateOptions,
} from "./support/date-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

const COMPONENTS = {
  "date-panel": DatePanel,
  "date-range-panel": DateRangePanel,
  "multi-date-panel": MultiDatePanel,
  "date-input": DateInput,
  "date-range-input": DateRangeInput,
} as const;
const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

// The fixture is written by the React adapter; every adapter must meet it.
for (const scenario of readDateScenarios().scenarios) {
  test(`date parity snapshot: ${scenario.name}`, async () => {
    const wrapper = mount(
      COMPONENTS[scenario.kind] as never,
      {
        props: toDateOptions(scenario) as never,
        attachTo: document.body,
      } as never,
    ) as VueWrapper;
    mounted.push(wrapper);
    for (const step of scenario.steps) {
      await applyDateStep(wrapper.element as Element, step, async () => {
        await nextTick();
        await nextTick();
      });
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(snapshot(wrapper.element as Element), scenario.snapshot);
  });
}
