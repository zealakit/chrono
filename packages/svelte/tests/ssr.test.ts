import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, afterEach, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  calendarSource,
  cleanupFixtures,
  entryUrl,
  miniSource,
  mountSource,
  type Mounted,
} from "./support/reference.ts";
import { resetDom } from "./support/dom.ts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const loader = pathToFileURL(
  join(packageRoot, "tests", "svelte-ssr-loader.ts"),
).href;
const options = {
  id: "cal",
  locale: "en-US",
  timeZone: "Asia/Ho_Chi_Minh",
  now: Date.UTC(2026, 10, 17, 23, 30),
  weekStartsOn: 1,
};
const live: Mounted[] = [];

afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

/** Render a fixture on the server in a plain Node process (no DOM), with `.svelte` compiled for the server. */
function renderOnServer(source: string, props: object): string {
  const directory = mkdtempSync(join(packageRoot, "tests", "ssr-"));
  try {
    const runner = join(directory, "run.mjs");
    writeFileSync(
      runner,
      `
      import { writeFileSync } from "node:fs";
      import { pathToFileURL } from "node:url";
      import { join } from "node:path";
      import { compile } from "svelte/compiler";
      import { render } from "svelte/server";
      const compiled = compile(${JSON.stringify(source)}, { generate: "server", filename: "fixture.svelte" });
      const file = join(${JSON.stringify(directory)}, "fixture.mjs");
      writeFileSync(file, compiled.js.code);
      const module = await import(pathToFileURL(file).href);
      console.log(JSON.stringify(render(module.default, { props: { initial: ${JSON.stringify(props)} } }).body));
    `,
    );
    const result = spawnSync(process.execPath, ["--import", loader, runner], {
      encoding: "utf8",
      cwd: packageRoot,
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(
      result.stdout.trim().split("\n").pop() as string,
    ) as string;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const clean = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/=""/g, "")
    .replace(/>\s+</g, "><")
    .trim();

async function same(source: string, props: object) {
  const server = renderOnServer(source, props);
  const mounted = await mountSource(source, props);
  live.push(mounted);
  assert.equal(clean(mounted.target.innerHTML), clean(server));
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
    const html = await same(calendarSource(entryUrl), {
      ...options,
      defaultView: view,
    });
    assert.match(html, /data-chrono-calendar/);
  }
});

test("today comes from `now` and `timeZone`, not the server clock", async () => {
  const html = await same(calendarSource(entryUrl), options);
  assert.match(
    html,
    /data-chrono-key="2026-11-18"[^>]*data-today|data-today[^>]*data-chrono-key="2026-11-18"/,
  );
});

test("server render equals the client's first render (mini calendar)", async () => {
  await same(miniSource(entryUrl), { ...options, id: "mini" });
});
