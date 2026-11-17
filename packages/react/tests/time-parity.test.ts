import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  TimeInput,
  TimePanel,
  TimeRangeInput,
  TimeRangePanel,
} from "../dist/time/index.js";
import {
  applyTimeStep,
  type TimeScenario,
  readTimeScenarios,
  toTimeOptions,
  writeTimeScenarios,
} from "./support/time-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

beforeEach(resetDom);
afterEach(cleanup);

const COMPONENTS = {
  "time-panel": TimePanel,
  "time-range-panel": TimeRangePanel,
  "time-input": TimeInput,
  "time-range-input": TimeRangeInput,
} as const;

// The fixture is the contract: Vue, Svelte and Vanilla must produce the same snapshots.
// Regenerate with `UPDATE_PARITY=1 pnpm --filter @zealakit/chrono-react run test`.
const data = readTimeScenarios();

for (const scenario of data.scenarios) {
  test(`time parity snapshot: ${scenario.name}`, () => {
    const component = COMPONENTS[scenario.kind as TimeScenario["kind"]];
    const { container } = render(
      h(component as never, toTimeOptions(scenario) as never),
    );
    for (const step of scenario.steps) applyTimeStep(container, step);
    const actual = snapshot(container.firstElementChild as Element);
    if (process.env.UPDATE_PARITY) {
      scenario.snapshot = actual;
      writeTimeScenarios(data);
      return;
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(actual, scenario.snapshot);
  });
}
