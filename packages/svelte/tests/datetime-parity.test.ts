import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";
import {
  applyDateTimeStep,
  readDateTimeScenarios,
  toDateTimeOptions,
} from "./support/datetime-scenarios.ts";
import {
  cleanupFixtures,
  entryUrl,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { snapshot } from "./support/snapshot.ts";

const COMPONENTS = {
  "datetime-panel": "DateTimePanel",
  "datetime-range-panel": "DateTimeRangePanel",
  "datetime-input": "DateTimeInput",
  "datetime-range-input": "DateTimeRangeInput",
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
for (const scenario of readDateTimeScenarios().scenarios) {
  test(`datetime parity snapshot: ${scenario.name}`, async () => {
    const mounted = await mountSource(
      source(COMPONENTS[scenario.kind]),
      toDateTimeOptions(scenario),
    );
    live.push(mounted);
    for (const step of scenario.steps) {
      await applyDateTimeStep(mounted.target, step, settle);
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(
      snapshot(mounted.target.firstElementChild as Element),
      scenario.snapshot,
    );
  });
}
