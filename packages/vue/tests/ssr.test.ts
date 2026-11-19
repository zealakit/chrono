import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { resetDom } from "./support/dom.ts";
import { ReferenceCalendar, ReferenceMini } from "./support/reference.ts";

const options = {
  id: "cal",
  locale: "en-US",
  timeZone: "Asia/Ho_Chi_Minh",
  now: Date.UTC(2026, 10, 17, 23, 30),
  weekStartsOn: 1,
};
const mounted: VueWrapper[] = [];

beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function same(
  component: typeof ReferenceCalendar | typeof ReferenceMini,
  opts: Record<string, unknown>,
) {
  const server = await renderToString(
    createSSRApp({ render: () => h(component, { options: opts }) }),
  );
  const wrapper = mount(component, { props: { options: opts } });
  mounted.push(wrapper);
  // The DOM serializes empty attributes as `name=""`; the server writes `name`.
  const clean = (html: string) =>
    html.replace(/<!--.*?-->/g, "").replace(/=""/g, "");
  assert.equal(clean(wrapper.html({ raw: true })), clean(server));
  return server;
}

test("server render equals the client's first render (calendar views)", async () => {
  for (const view of [
    "month",
    "week",
    "workWeek",
    "day",
    "agenda",
    "multiMonth",
  ]) {
    const html = await same(ReferenceCalendar, {
      ...options,
      defaultView: view,
    });
    assert.match(html, /data-chrono-calendar/);
  }
});

test("today comes from `now` and `timeZone`, not the server clock", async () => {
  const html = await same(ReferenceCalendar, options);
  assert.match(
    html,
    /data-chrono-key="2026-11-18"[^>]*data-today|data-today[^>]*data-chrono-key="2026-11-18"/,
  );
});

test("server render equals the client's first render (mini calendar)", async () => {
  await same(ReferenceMini, { ...options, id: "mini" });
});
