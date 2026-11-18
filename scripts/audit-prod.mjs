#!/usr/bin/env node
/**
 * `pnpm audit --prod` for the four published packages and private core (plan 13 EC10, R3).
 * Examples are not audited here (they pull React, Next and Vite; audit them separately).
 * A registry or network error is a failure with a clear message, never a silent skip;
 * `--allow-network-failure` exists for the maintainer's offline dry runs.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = ["core", "vanilla", "react", "vue", "svelte"];
const NETWORK =
  /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EAI_AGAIN|fetch failed|network|getaddrinfo/i;

/** Classify one `pnpm audit` run: `ok`, `vulnerable` or `network`. */
export function classifyAudit({ status, stdout = "", stderr = "" }) {
  if (status === 0) return "ok";
  return NETWORK.test(`${stdout}\n${stderr}`) ? "network" : "vulnerable";
}

function main() {
  const allowOffline = process.argv.includes("--allow-network-failure");
  let failed = false;
  for (const name of PACKAGES) {
    const result = spawnSync("pnpm", ["audit", "--prod"], {
      cwd: join(root, "packages", name),
      encoding: "utf8",
    });
    const kind = classifyAudit(result);
    if (kind === "ok") {
      console.log(`audit ok: packages/${name}`);
    } else if (kind === "network" && allowOffline) {
      console.warn(`audit NOT RUN (offline): packages/${name}`);
    } else {
      failed = true;
      console.error(
        kind === "network"
          ? `audit could not reach the registry for packages/${name}; fix the network or pass --allow-network-failure for a dry run.`
          : `audit found vulnerabilities in packages/${name}:\n${result.stdout}${result.stderr}`,
      );
    }
  }
  if (failed) process.exit(1);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
