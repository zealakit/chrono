import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  DateTimeInput,
  DateTimePanel,
  DateTimeRangeInput,
  DateTimeRangePanel,
} from "../dist/datetime/index.js";
import {
  applyDateTimeStep,
  type DateTimeScenario,
  readDateTimeScenarios,
  toDateTimeOptions,
  writeDateTimeScenarios,
} from "./support/datetime-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

beforeEach(resetDom);
afterEach(cleanup);

const COMPONENTS = {
  "datetime-panel": DateTimePanel,
  "datetime-range-panel": DateTimeRangePanel,
  "datetime-input": DateTimeInput,
  "datetime-range-input": DateTimeRangeInput,
} as const;

// The fixture is the contract: Vue, Svelte and Vanilla must produce the same snapshots.
// Regenerate with `UPDATE_PARITY=1 pnpm --filter @zealakit/chrono-react run test`.
const data = readDateTimeScenarios();

for (const scenario of data.scenarios) {
  test(`datetime parity snapshot: ${scenario.name}`, () => {
    const component = COMPONENTS[scenario.kind as DateTimeScenario["kind"]];
    const { container } = render(
      h(component as never, toDateTimeOptions(scenario) as never),
    );
    for (const step of scenario.steps) applyDateTimeStep(container, step);
    const actual = snapshot(container.firstElementChild as Element);
    if (process.env.UPDATE_PARITY) {
      scenario.snapshot = actual;
      writeDateTimeScenarios(data);
      return;
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(actual, scenario.snapshot);
  });
}
