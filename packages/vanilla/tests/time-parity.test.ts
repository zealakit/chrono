import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { initTimeElements } from "../dist/time/index.js";
import {
  applyTimeStep,
  readTimeScenarios,
  toTimeDataAttributes,
} from "./support/time-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

const MARKER = {
  "time-panel": "data-chrono-time-panel",
  "time-range-panel": 'data-chrono-time-panel="range"',
  "time-input": "data-chrono-time-input",
  "time-range-input": "data-chrono-time-range-input",
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
  /^data-(locale|time-zone|now|value|default-value|name|min|max|step|layout|start|end|slot-duration|group-by|hour-cycle|granularity|allow-overnight|min-duration|max-duration|mode|required|chrono-for)$/;

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
for (const scenario of readTimeScenarios().scenarios) {
  test(`time parity snapshot: ${scenario.name}`, () => {
    const options = { ...scenario.options };
    const id = String(options.id);
    document.body.innerHTML = `<div id="${id}" ${MARKER[scenario.kind]} ${toTimeDataAttributes(options)}></div>`;
    stop = initTimeElements(document);
    const root = document.getElementById(id) as HTMLElement;
    for (const step of scenario.steps) applyTimeStep(root, step);
    const own = root.cloneNode(true) as HTMLElement;
    own.removeAttribute("id");
    withoutOptions(own);
    // `required` is also a contract attribute on the segments; keep only what the element itself renders.
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(snapshot(own), scenario.snapshot);
  });
}
