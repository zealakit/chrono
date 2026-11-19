#!/usr/bin/env node
/**
 * Adoption metrics by hand (plan 13 EC11): public npm download counts and public GitHub
 * repository stats. No tokens, no user data. Writes `monitor/reports/metrics-<date>.json`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PACKAGES = [
  "@zealakit/chrono-vanilla",
  "@zealakit/chrono-react",
  "@zealakit/chrono-vue",
  "@zealakit/chrono-svelte",
];
export const REPOSITORY = "zealakit/chrono";

async function getJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { accept: "application/json" },
  });
  if (response.status === 403 || response.status === 429) {
    throw new Error(
      `Rate limited by ${new URL(url).host} (HTTP ${response.status}); try again later.`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `${new URL(url).host} answered HTTP ${response.status} for ${url}.`,
    );
  }
  return response.json();
}

/** Collect the report. `fetchImpl` is injected so tests never touch the network. */
export async function collectMetrics(fetchImpl = fetch, now = new Date()) {
  const downloads = {};
  for (const name of PACKAGES) {
    const body = await getJson(
      fetchImpl,
      `https://api.npmjs.org/downloads/point/last-week/${name}`,
    );
    downloads[name] = body.downloads ?? 0;
  }
  const repo = await getJson(
    fetchImpl,
    `https://api.github.com/repos/${REPOSITORY}`,
  );
  return {
    date: now.toISOString().slice(0, 10),
    downloadsLastWeek: downloads,
    github: {
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      openIssues: repo.open_issues_count ?? 0,
    },
  };
}

export function formatMetrics(report) {
  const lines = [
    `Chrono metrics ${report.date}`,
    "",
    "npm downloads, last week:",
  ];
  for (const [name, count] of Object.entries(report.downloadsLastWeek)) {
    lines.push(`  ${name.padEnd(28)} ${String(count).padStart(8)}`);
  }
  lines.push(
    "",
    `GitHub: ${report.github.stars} stars, ${report.github.forks} forks, ${report.github.openIssues} open issues`,
  );
  return lines.join("\n");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const report = await collectMetrics();
    console.log(formatMetrics(report));
    const dir = join(root, "monitor", "reports");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `metrics-${report.date}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
