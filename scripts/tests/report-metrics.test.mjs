import assert from "node:assert/strict";
import { test } from "node:test";
import { PACKAGES, collectMetrics, formatMetrics } from "../report-metrics.mjs";

const reply = (body, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

test("collects downloads and repository stats from public endpoints only", async () => {
  const urls = [];
  const fetchImpl = async (url, init) => {
    urls.push(url);
    assert.equal(init.headers.authorization, undefined, "no token is sent");
    return url.includes("npmjs")
      ? reply({ downloads: 42 })
      : reply({ stargazers_count: 7, forks_count: 2, open_issues_count: 3 });
  };
  const report = await collectMetrics(
    fetchImpl,
    new Date("2026-11-18T10:00:00Z"),
  );
  assert.equal(report.date, "2026-11-18");
  assert.equal(Object.keys(report.downloadsLastWeek).length, PACKAGES.length);
  assert.deepEqual(report.github, { stars: 7, forks: 2, openIssues: 3 });
  assert.equal(urls.length, PACKAGES.length + 1);
  assert.match(formatMetrics(report), /7 stars, 2 forks, 3 open issues/);
});

test("rate limits and errors say what happened", async () => {
  await assert.rejects(
    collectMetrics(async () => reply({}, 429)),
    /Rate limited/,
  );
  await assert.rejects(
    collectMetrics(async () => reply({}, 500)),
    /HTTP 500/,
  );
});
