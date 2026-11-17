import assert from "node:assert/strict";
import { test } from "node:test";
import { createTicker } from "../dist/foundation/index.js";

test("aligns to the next minute and ticks every minute", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: number[] = [];
  const ticker = createTicker((now) => calls.push(now));
  ticker.start(30_000); // half past a minute → next boundary at 60_000
  assert.equal(ticker.running(), true);

  t.mock.timers.tick(29_999);
  assert.equal(calls.length, 0);

  t.mock.timers.tick(1);
  assert.equal(calls.length, 1);

  t.mock.timers.tick(60_000);
  assert.equal(calls.length, 2);

  ticker.stop();
  assert.equal(ticker.running(), false);
  t.mock.timers.tick(60_000);
  assert.equal(calls.length, 2);
});

test("start is idempotent", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const ticker = createTicker(() => {
    calls += 1;
  });
  ticker.start(30_000);
  ticker.start(30_000);
  t.mock.timers.tick(30_000);
  assert.equal(calls, 1);
  ticker.stop();
});
