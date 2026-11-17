import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { initDateElements } from "../dist/date/index.js";
import {
  applyDateStep,
  readDateScenarios,
  toDataAttributes,
} from "./support/date-scenarios.ts";
import { resetDom } from "./support/dom.ts";
import { snapshot } from "./support/snapshot.ts";

const MARKER = {
  "date-panel": "data-chrono-date-panel",
  "date-range-panel": 'data-chrono-date-panel="range"',
  "multi-date-panel": 'data-chrono-date-panel="multi"',
  "date-input": "data-chrono-date-input",
  "date-range-input": "data-chrono-date-range-input",
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
  /^data-(locale|time-zone|now|week-starts-on|week-numbers|value|default-value|name|months|min|max|min-days|max-days|max-selected|required|auto-focus|chrono-for)$/;

function withoutOptions(root: Element): void {
  for (const element of [root, ...root.querySelectorAll("*")]) {
    for (const attribute of [...element.attributes]) {
      if (OPTION_ATTRIBUTES.test(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

// The fixture is written by the React adapter; every adapter must meet it.
for (const scenario of readDateScenarios().scenarios) {
  test(`date parity snapshot: ${scenario.name}`, () => {
    const options = { ...scenario.options };
    const id = String(options.id);
    document.body.innerHTML = `<div id="${id}" ${MARKER[scenario.kind]} ${toDataAttributes(options)}></div>`;
    stop = initDateElements(document);
    const root = document.getElementById(id) as HTMLElement;
    for (const step of scenario.steps) applyDateStep(root, step);
    const own = root.cloneNode(true) as HTMLElement;
    own.removeAttribute("id");
    withoutOptions(own);
    // `required` is also a contract attribute on the segments; keep only what the element itself renders.
    assert.ok(scenario.snapshot, `no snapshot stored for "${scenario.name}"`);
    assert.equal(snapshot(own), scenario.snapshot);
  });
}
