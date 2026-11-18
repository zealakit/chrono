import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  Calendar,
  CalendarBackground,
  type CalendarOptions,
  useCalendarState,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};

function Backgrounds() {
  const state = useCalendarState();
  return h(
    "div",
    { "data-count": state.backgrounds.length },
    state.backgrounds.map((piece) =>
      h(CalendarBackground, {
        key: piece.key,
        piece,
        children: ({ rules }: { rules: readonly { reason?: string }[] }) =>
          rules[0]?.reason ?? "",
      }),
    ),
  );
}

beforeEach(resetDom);
afterEach(cleanup);

test("CalendarBackground renders one element per background piece", () => {
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        defaultDate: "2026-11-17",
        defaultView: "week",
        timeGrid: { start: "08:00", end: "18:00", step: 60 },
        availability: {
          open: [{ type: "daily", start: "09:00", end: "17:00" }],
          blocked: [
            { type: "daily", start: "12:00", end: "13:00", reason: "Lunch" },
          ],
        },
      },
      h(Backgrounds),
    ),
  );
  const pieces = container.querySelectorAll("[data-chrono-background]");
  assert.ok(pieces.length > 0);
  const piece = pieces[0] as HTMLElement;
  assert.equal(piece.getAttribute("data-status"), "unavailable");
  assert.equal(piece.getAttribute("aria-hidden"), "true");
  const style = piece.getAttribute("style") ?? "";
  assert.match(style, /--chrono-background-top/);
  assert.match(style, /--chrono-background-height/);
});

test("backgrounds: false renders none", () => {
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        defaultView: "week",
        backgrounds: false,
        availability: {
          blocked: [{ type: "daily", start: "09:00", end: "17:00" }],
        },
      },
      h(Backgrounds),
    ),
  );
  assert.equal(
    container.querySelectorAll("[data-chrono-background]").length,
    0,
  );
});
