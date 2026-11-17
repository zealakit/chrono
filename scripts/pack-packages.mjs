import { spawnSync } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundleCoreIntoTarball } from "./bundle-core.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "artifacts");
// Core is private: it is never packed on its own, only bundled into each adapter.
const packages = [
  "@zealakit/chrono-vanilla",
  "@zealakit/chrono-react",
  "@zealakit/chrono-vue",
  "@zealakit/chrono-svelte",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of packages) {
  const result = spawnSync(
    "pnpm",
    ["--filter", name, "pack", "--pack-destination", output],
    { cwd: root, stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const tarballs = (await readdir(output)).filter((file) =>
  file.endsWith(".tgz"),
);

for (const file of tarballs) {
  bundleCoreIntoTarball(join(output, file));
  console.log(`bundled Core into ${file}`);
}

// Chrono ships no CSS (plan 02 §2.8): fail if any tarball contains a stylesheet.
const withCss = [];
for (const file of tarballs) {
  const listing = spawnSync("tar", ["-tzf", join(output, file)], {
    encoding: "utf8",
  });
  if (listing.status !== 0) {
    console.error(`could not list ${file}: ${listing.stderr}`);
    process.exit(1);
  }
  for (const entry of listing.stdout.split("\n")) {
    if (entry.endsWith(".css")) {
      withCss.push(`${file}: ${entry}`);
    }
  }
}
if (withCss.length > 0) {
  console.error(`Tarballs must not contain CSS:\n${withCss.join("\n")}`);
  process.exit(1);
}
