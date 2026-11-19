#!/usr/bin/env node
/**
 * Example app groups and their builds (plan 13 EC1, EC8, R2).
 *
 *   node scripts/examples.mjs build          core examples; a failure blocks (release gate)
 *   node scripts/examples.mjs integrations   integration apps; report only, exits 0
 *   node scripts/examples.mjs demos          every example to artifacts/demos/<name>/
 *
 * *Core examples* use only Chrono and its framework. *Integration apps* are every other
 * `examples/*-*` folder (they install other libraries themselves, 02 §2.8).
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CORE_EXAMPLES = [
  "vanilla",
  "react",
  "vue",
  "svelte",
  "nextjs",
  "astro",
  "e2e",
];

/** `{ core, integrations }` for the folders under `examples/`. */
export function groupExamples(rootDir = root) {
  const dir = join(rootDir, "examples");
  const names = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() &&
            existsSync(join(dir, entry.name, "package.json")),
        )
        .map((entry) => entry.name)
        .sort()
    : [];
  return {
    core: names.filter((name) => CORE_EXAMPLES.includes(name)),
    integrations: names.filter((name) => !CORE_EXAMPLES.includes(name)),
  };
}

const manifestName = (name) =>
  JSON.parse(readFileSync(join(root, "examples", name, "package.json"), "utf8"))
    .name;

function build(name) {
  const result = spawnSync(
    "pnpm",
    ["--filter", manifestName(name), "run", "build"],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  return result.status === 0;
}

function main(mode) {
  const { core, integrations } = groupExamples();
  if (mode === "build") {
    const failed = core.filter((name) => hasBuild(name) && !build(name));
    if (failed.length > 0) {
      console.error(`Core examples failed to build: ${failed.join(", ")}`);
      process.exit(1);
    }
    return;
  }
  if (mode === "integrations") {
    const rows = integrations.map((name) => ({ name, ok: build(name) }));
    console.log(
      rows.length === 0
        ? "No integration apps."
        : "\nIntegration apps (report only):",
    );
    for (const row of rows)
      console.log(`  ${row.ok ? "ok    " : "FAILED"} ${row.name}`);
    return;
  }
  if (mode === "demos") {
    const out = join(root, "artifacts", "demos");
    rmSync(out, { recursive: true, force: true });
    for (const name of [...core, ...integrations]) {
      if (!hasBuild(name) || !build(name)) continue;
      for (const folder of ["dist", "build", "out"]) {
        const from = join(root, "examples", name, folder);
        if (existsSync(from)) {
          mkdirSync(join(out, name), { recursive: true });
          cpSync(from, join(out, name), { recursive: true });
          console.log(`demo: artifacts/demos/${name}`);
          break;
        }
      }
    }
    return;
  }
  console.error("Usage: node scripts/examples.mjs build|integrations|demos");
  process.exit(1);
}

function hasBuild(name) {
  const manifest = JSON.parse(
    readFileSync(join(root, "examples", name, "package.json"), "utf8"),
  );
  return Boolean(manifest.scripts?.build);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv[2]);
}
