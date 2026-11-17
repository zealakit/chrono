import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { initDateTimeElements } from "../dist/datetime/index.js";
import {
  applyDateTimeStep,
  readDateTimeScenarios,
  toDateTimeDataAttributes,
} from "./support/datetime-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

const MARKER = {
  "datetime-panel": "data-chrono-datetime-panel",
  "datetime-range-panel": 'data-chrono-datetime-panel="range"',
  "datetime-input": "data-chrono-datetime-input",
  "datetime-range-input": "data-chrono-datetime-range-input",
} as const;
let stop: (() => void) | undefined;
beforeEach(resetDom);
afterEach(() => {
  stop?.();
  stop = undefined;
  resetDom();
});

/** Option attributes the declarative path reads; they are inputs, not part of the contract. */
const OPTION_ATTRIBUTES =
  /^data-(locale|time-zone|now|value|default-value|default-time|name|min|max|step|hour-cycle|granularity|mode|required|disable-past|min-duration|max-duration|week-starts-on|months|chrono-for)$/;

function withoutOptions(root: Element): void {
  // The options are attributes of the root element only; descendants carry the contract.
  for (const attribute of [...root.attributes]) {
    if (
      OPTION_ATTRIBUTES.test(attribute.name) &&
      !/^data-(mode|layout)$/.test(attribute.name)
    ) {
      root.removeAttribute(attribute.name);
    }
  }
}

// The fixture is written by the React adapter; every adapter must meet it.
for (const scenario of readDateTimeScenarios().scenarios) {
  test(`datetime parity snapshot: ${scenario.name}`, () => {
    const options = { ...scenario.options };
    const id = String(options.id);
    document.body.innerHTML = `<div id="${id}" ${MARKER[scenario.kind]} ${toDateTimeDataAttributes(options)}></div>`;
    stop = initDateTimeElements(document);
    const root = document.getElementById(id) as HTMLElement;
    for (const step of scenario.steps) applyDateTimeStep(root, step);
    const own = root.cloneNode(true) as HTMLElement;
    own.removeAttribute("id");
    withoutOptions(own);
    // `required` is also a contract attribute on the segments; keep only what the element itself renders.
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(snapshot(own), scenario.snapshot);
  });
}
