import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { announce } from "../dist/foundation/index.js";
import { resetDom } from "./support/dom.ts";

beforeEach(resetDom);

test("creates a shared polite live region lazily", () => {
  announce("hello");
  const regions = document.querySelectorAll('[aria-live="polite"]');
  assert.equal(regions.length, 1);
  assert.equal(regions[0]?.textContent, "hello");
  assert.equal(regions[0]?.getAttribute("role"), "status");

  announce("world");
  assert.equal(document.querySelectorAll('[aria-live="polite"]').length, 1);
  assert.equal(regions[0]?.textContent, "world");
});

test("uses an app-provided element", () => {
  const element = document.createElement("div");
  announce("custom", element);
  assert.equal(element.textContent, "custom");
  assert.equal(document.querySelectorAll('[aria-live="polite"]').length, 0);
});

test("announce(false) is a no-op", () => {
  announce("nothing", false);
  assert.equal(document.querySelectorAll('[aria-live="polite"]').length, 0);
});
