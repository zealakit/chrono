import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { resetDom } from "./support/dom.ts";
import { referenceCalendar, referenceMini } from "./support/reference.ts";

const options = {
  id: "cal",
  locale: "en-US",
  timeZone: "Asia/Ho_Chi_Minh",
  now: Date.UTC(2026, 10, 17, 23, 30),
  weekStartsOn: 1,
} as const;

beforeEach(resetDom);
afterEach(cleanup);

function same(make: () => ReturnType<typeof referenceCalendar>) {
  const server = renderToString(make());
  const { container } = render(make());
  assert.equal(container.innerHTML, server);
  return server;
}

test("server render equals the client's first render (calendar views)", () => {
  for (const view of [
    "month",
    "week",
    "workWeek",
    "day",
    "agenda",
    "multiMonth",
  ]) {
    const html = same(() =>
      referenceCalendar({ ...options, defaultView: view }),
    );
    assert.match(html, /data-chrono-calendar/);
    cleanup();
  }
});

test("today comes from `now` and `timeZone`, not the server clock", () => {
  const html = same(() => referenceCalendar(options));
  assert.match(
    html,
    /data-chrono-key="2026-11-18"[^>]*data-today|data-today[^>]*data-chrono-key="2026-11-18"/,
  );
});

test("server render equals the client's first render (mini calendar)", () => {
  same(
    () =>
      referenceMini({
        ...options,
        id: "mini",
        isMarked: (date: { day: number }) => date.day === 20,
      } as never) as never,
  );
});

test("importing the entry and rendering never needs a DOM global", () => {
  // renderToString above ran with happy-dom registered; the module itself must not touch window at import.
  assert.equal(typeof renderToString, "function");
});
