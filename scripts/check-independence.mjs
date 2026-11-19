#!/usr/bin/env node
/**
 * Independence path scan (plan 02 §2.8, guarantee I3): no committed file
 * outside `plans/` may reference a sibling repository by path, for example
 * `../overlay`, `../disclosure` or `../zealakit`. Code reused from a sibling
 * is copied into Chrono, never linked.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SIBLING_PATH = /(?:\.\.\/)+(?:overlay|disclosure|zealakit)\b/;
const SELF = "scripts/check-independence.mjs";

const listing = spawnSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
);
if (listing.status !== 0) {
  console.error(`git ls-files failed: ${listing.stderr}`);
  process.exit(1);
}

const errors = [];
for (const file of listing.stdout.split("\n").filter(Boolean)) {
  if (file.startsWith("plans/") || file === SELF) continue;
  let text;
  try {
    text = readFileSync(join(root, file), "utf8");
  } catch {
    continue; // deleted in the working tree, or a symlink to a directory
  }
  text.split("\n").forEach((line, index) => {
    if (SIBLING_PATH.test(line)) {
      errors.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (errors.length > 0) {
  console.error(
    `Committed files must not reference sibling repositories by path:\n${errors.join("\n")}`,
  );
  process.exit(1);
}
console.log("Independence check passed.");
