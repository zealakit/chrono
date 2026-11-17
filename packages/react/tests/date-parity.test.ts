import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  DateInput,
  DatePanel,
  DateRangeInput,
  DateRangePanel,
  MultiDatePanel,
} from "../dist/date/index.js";
import {
  applyDateStep,
  type DateScenario,
  readDateScenarios,
  toDateOptions,
  writeDateScenarios,
} from "./support/date-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

beforeEach(resetDom);
afterEach(cleanup);

const COMPONENTS = {
  "date-panel": DatePanel,
  "date-range-panel": DateRangePanel,
  "multi-date-panel": MultiDatePanel,
  "date-input": DateInput,
  "date-range-input": DateRangeInput,
} as const;

// The fixture is the contract: Vue, Svelte and Vanilla must produce the same snapshots.
// Regenerate with `UPDATE_PARITY=1 pnpm --filter @zealakit/chrono-react run test`.
const data = readDateScenarios();

for (const scenario of data.scenarios) {
  test(`date parity snapshot: ${scenario.name}`, () => {
    const component = COMPONENTS[scenario.kind as DateScenario["kind"]];
    const { container } = render(
      h(component as never, toDateOptions(scenario) as never),
    );
    for (const step of scenario.steps) applyDateStep(container, step);
    const actual = snapshot(container.firstElementChild as Element);
    if (process.env.UPDATE_PARITY) {
      scenario.snapshot = actual;
      writeDateScenarios(data);
      return;
    }
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(actual, scenario.snapshot);
  });
}
