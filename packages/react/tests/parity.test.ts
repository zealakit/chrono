import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { resetDom } from "./support/dom.ts";
import { referenceCalendar, referenceMini } from "./support/reference.ts";
import {
  applyStep,
  readScenarios,
  toOptions,
  writeScenarios,
} from "./support/scenarios.ts";
import { snapshot } from "./support/snapshot.ts";

beforeEach(resetDom);
afterEach(cleanup);

// The fixture is the contract: the Vue, Svelte and Vanilla adapters must produce the same snapshots.
// Regenerate with `UPDATE_PARITY=1 pnpm --filter @zealakit/chrono-react run test`.
const data = readScenarios();

for (const scenario of data.scenarios) {
  test(`parity snapshot: ${scenario.name}`, () => {
    const options = toOptions(scenario) as never;
    const { container } = render(
      scenario.kind === "mini"
        ? referenceMini(options)
        : referenceCalendar(options),
    );
    for (const step of scenario.steps) applyStep(container, step);
    const actual = snapshot(container.firstElementChild as Element);
    if (process.env.UPDATE_PARITY) {
      scenario.snapshot = actual;
      writeScenarios(data);
      return;
    }
    assert.ok(
      scenario.snapshot,
      `no snapshot stored for "${scenario.name}"; run with UPDATE_PARITY=1`,
    );
    assert.equal(actual, scenario.snapshot);
  });
}
