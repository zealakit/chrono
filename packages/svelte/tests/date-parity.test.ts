import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";
import {
  applyDateStep,
  readDateScenarios,
  toDateOptions,
} from "./support/date-scenarios.ts";
import {
  cleanupFixtures,
  entryUrl,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { snapshot } from "./support/snapshot.ts";

const COMPONENTS = {
  "date-panel": "DatePanel",
  "date-range-panel": "DateRangePanel",
  "multi-date-panel": "MultiDatePanel",
  "date-input": "DateInput",
  "date-range-input": "DateRangeInput",
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
for (const scenario of readDateScenarios().scenarios) {
  test(`date parity snapshot: ${scenario.name}`, async () => {
    const mounted = await mountSource(
      source(COMPONENTS[scenario.kind]),
      toDateOptions(scenario),
    );
    live.push(mounted);
    for (const step of scenario.steps) {
      await applyDateStep(mounted.target, step, settle);
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(
      snapshot(mounted.target.firstElementChild as Element),
      scenario.snapshot,
    );
  });
}
