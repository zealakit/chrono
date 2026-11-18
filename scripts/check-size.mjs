#!/usr/bin/env node
/**
 * Size gate (plan 04 C14, §6). For each entry of the built packages it bundles
 * the entry with esbuild (minified, ESM, framework peers external), gzips the
 * result with `node:zlib` and compares it with `size-budgets.json`.
 *
 * Entries: `core/<domain>` measures a core domain on its own (other core
 * domains are external); `<adapter>/root` and `<adapter>/<domain>` measure the
 * adapter code plus the vendored core it actually reaches.
 *
 *   node scripts/check-size.mjs           check against the budgets (exit 1 when over)
 *   node scripts/check-size.mjs --report  print sizes and suggested budgets
 *
 * Raising a budget needs a line in the PR description saying why.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOMAINS = ["foundation", "calendar", "date", "time", "datetime"];
const ADAPTERS = ["vanilla", "react", "vue", "svelte"];
const PEERS = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "vue",
  "svelte",
  "svelte/*",
];

/** Compile `.svelte` files (adapter parts) the way a consumer's bundler would. */
function sveltePlugin(rootDir) {
  const require = createRequire(
    join(rootDir, "packages", "svelte", "package.json"),
  );
  return {
    name: "svelte",
    setup(b) {
      b.onLoad({ filter: /\.svelte$/ }, (args) => {
        const { compile } = require("svelte/compiler");
        const { js } = compile(readFileSync(args.path, "utf8"), {
          generate: "client",
          filename: args.path,
          css: "external",
        });
        return { contents: js.code, loader: "js" };
      });
    },
  };
}

/** Entries that exist in the current build. */
export function discoverEntries(rootDir = root) {
  const entries = [];
  const core = join(rootDir, "packages", "core", "dist");
  for (const domain of DOMAINS) {
    const file = join(core, domain, "index.js");
    if (existsSync(file))
      entries.push({ name: `core/${domain}`, file, own: domain });
  }
  // Without the opt-in resource pack (plan 10 R4, IG3): the named import measures what an
  // app that does not import `resourceViews` really ships.
  const coreCalendar = join(core, "calendar", "index.js");
  if (existsSync(coreCalendar)) {
    entries.push({
      name: "core/calendar-base",
      stdin: `export { createCalendarController } from ${JSON.stringify(coreCalendar)};`,
      own: "calendar",
    });
    // Opt-in packs (plans 10 R4, 12 R4): recurrence alone, then both packs.
    entries.push({
      name: "core/calendar-recurrence",
      stdin: `export { createCalendarController, recurrence } from ${JSON.stringify(coreCalendar)};`,
      own: "calendar",
    });
    entries.push({
      name: "core/calendar-packs",
      stdin: `export { createCalendarController, recurrence, resourceViews } from ${JSON.stringify(coreCalendar)};`,
      own: "calendar",
    });
  }
  for (const adapter of ADAPTERS) {
    const dist = join(rootDir, "packages", adapter, "dist");
    const calendar = join(dist, "calendar", "index.js");
    if (existsSync(calendar)) {
      const calendarExport =
        adapter === "vanilla" ? "createCalendar" : "Calendar";
      entries.push({
        name: `${adapter}/calendar-base`,
        stdin: `export { ${calendarExport} } from ${JSON.stringify(calendar)};`,
      });
      entries.push({
        name: `${adapter}/calendar-recurrence`,
        stdin: `export { ${calendarExport}, recurrence } from ${JSON.stringify(calendar)};`,
      });
      entries.push({
        name: `${adapter}/calendar-packs`,
        stdin: `export { ${calendarExport}, recurrence, resourceViews } from ${JSON.stringify(calendar)};`,
      });
    }
    if (existsSync(join(dist, "index.js"))) {
      entries.push({ name: `${adapter}/root`, file: join(dist, "index.js") });
    }
    for (const domain of DOMAINS) {
      const file = join(dist, domain, "index.js");
      if (existsSync(file))
        entries.push({ name: `${adapter}/${domain}`, file });
    }
  }
  return entries;
}

/** Gzipped bytes of one bundled entry. */
export async function measure(entry, rootDir = root) {
  const coreDist = join(rootDir, "packages", "core", "dist");
  const result = await build({
    ...(entry.stdin
      ? { stdin: { contents: entry.stdin, resolveDir: rootDir, loader: "js" } }
      : { entryPoints: [entry.file] }),
    bundle: true,
    minify: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: PEERS,
    logLevel: "silent",
    plugins: [
      sveltePlugin(rootDir),
      ...(entry.own
        ? [
            {
              name: "own-domain-only",
              setup(b) {
                b.onResolve({ filter: /^\./ }, (args) => {
                  const target = resolve(args.resolveDir, args.path);
                  const here = join(coreDist, entry.own);
                  const inCore = target.startsWith(coreDist + sep);
                  if (inCore && !(target + sep).startsWith(here + sep)) {
                    return { path: args.path, external: true };
                  }
                  return undefined;
                });
              },
            },
          ]
        : []),
    ],
  });
  const text = result.outputFiles.map((file) => file.text).join("\n");
  return gzipSync(text).length;
}

export function loadBudgets(rootDir = root) {
  const file = join(rootDir, "size-budgets.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

const kb = (bytes) => (bytes / 1024).toFixed(2);
const roundUpHalf = (value) => Math.ceil(value * 2) / 2;

async function main() {
  const report = process.argv.includes("--report");
  const budgets = loadBudgets();
  const entries = discoverEntries();
  if (entries.length === 0) {
    console.error("No built entries found; run `pnpm build` first.");
    process.exit(1);
  }
  const failures = [];
  const rows = [];
  for (const entry of entries) {
    const size = await measure(entry);
    const budget = budgets[entry.name];
    const suggested = roundUpHalf((size / 1024) * 1.15);
    rows.push({
      entry: entry.name,
      size: `${kb(size)} KB`,
      budget: budget === undefined ? "-" : `${budget} KB`,
      suggested: `${suggested} KB`,
    });
    if (!report) {
      if (budget === undefined)
        failures.push(
          `${entry.name}: no budget in size-budgets.json (measured ${kb(size)} KB, suggested ${suggested} KB)`,
        );
      else if (size / 1024 > budget)
        failures.push(
          `${entry.name}: ${kb(size)} KB gzip is over the ${budget} KB budget`,
        );
    }
  }
  console.table(rows);
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  if (!report) console.log("Size check passed.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
