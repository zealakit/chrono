import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import {
  DateInput,
  DatePanel,
  DateRangeInput,
  DateRangePanel,
  MultiDatePanel,
} from "../dist/date/index.js";
import { resetDom } from "./support/dom.ts";

const options = {
  id: "d",
  locale: "en-US",
  timeZone: "Asia/Ho_Chi_Minh",
  now: Date.UTC(2026, 10, 17, 23, 30),
} as const;
const panelOptions = { ...options, weekStartsOn: 1 } as const;

beforeEach(resetDom);
afterEach(cleanup);

const components = {
  DatePanel,
  DateRangePanel,
  MultiDatePanel,
  DateInput,
  DateRangeInput,
};

for (const [name, component] of Object.entries(components)) {
  test(`${name}: server render equals the client's first render, with no styles and no focus work`, () => {
    const given = name.endsWith("Panel") ? panelOptions : options;
    const make = () => h(component as never, given as never);
    const server = renderToString(make());
    const { container } = render(make());
    assert.equal(container.innerHTML, server);
    assert.equal(container.querySelectorAll("[style], [class]").length, 0);
    assert.notEqual(document.activeElement?.tagName, "TD");
  });
}

test("hidden form inputs are part of the server markup", () => {
  const named = { ...options, name: "when" } as never;
  const html = renderToString(h(DateInput as never, named));
  assert.match(html, /<input [^>]*name="when"/);
  const { container } = render(h(DateInput as never, named));
  assert.equal(
    container.querySelector("input[type=hidden]")?.getAttribute("name"),
    "when",
  );
});
