import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";
import {
  applyTimeStep,
  readTimeScenarios,
  toTimeOptions,
} from "./support/time-scenarios.ts";
import {
  cleanupFixtures,
  entryUrl,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { snapshot } from "./support/snapshot.ts";

const COMPONENTS = {
  "time-panel": "TimePanel",
  "time-range-panel": "TimeRangePanel",
  "time-input": "TimeInput",
  "time-range-input": "TimeRangeInput",
} as const;
const live: Mounted[] = [];
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

const source = (component: string) => `
<script>
  import { ${component} } from "${entryUrl}";
  let { initial = {} } = $props();
</script>
<${component} {...initial} />`;

// The fixture is written by the React adapter; every adapter must meet it.
for (const scenario of readTimeScenarios().scenarios) {
  test(`time parity snapshot: ${scenario.name}`, async () => {
    const mounted = await mountSource(
      source(COMPONENTS[scenario.kind]),
      toTimeOptions(scenario),
    );
    live.push(mounted);
    for (const step of scenario.steps) {
      await applyTimeStep(mounted.target, step, settle);
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(
      snapshot(mounted.target.firstElementChild as Element),
      scenario.snapshot,
    );
  });
}
