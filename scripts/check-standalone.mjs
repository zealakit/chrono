#!/usr/bin/env node
/**
 * Standalone smoke test (plan 02 §2.8, guarantees I4 and I8).
 *
 * Packs the four adapters (Core bundled in, via scripts/pack-packages.mjs), then
 * for each one creates an empty temporary project outside the workspace with
 * only the framework peer and Vite, installs the tarball with npm, and:
 *
 *   1. imports every entry point from plain Node (no bundler, no TypeScript; Svelte is skipped
 *      because its parts are `.svelte` files),
 *   2. builds a plain Vite project that imports every entry point.
 *
 * Until components exist there is nothing to render, so step 2 only imports.
 * Needs network access to the npm registry for the framework peer and Vite.
 */
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = join(root, "artifacts");
const VITE = "^7.1.12";

const FRAMEWORKS = {
  vanilla: {},
  react: { react: "^19.2.0", "react-dom": "^19.2.0" },
  vue: { vue: "^3.5.22" },
  svelte: { svelte: "^5.41.0" },
};

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, npm_config_workspaces: "false" },
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd} (${result.status}):\n${(
        result.stderr || result.stdout || String(result.error ?? "")
      ).trim()}`,
    );
  }
  return result.stdout;
}

function entrySpecifiers(name, tarball) {
  const manifest = JSON.parse(
    run("tar", ["-xOzf", tarball, "package/package.json"], root),
  );
  return Object.keys(manifest.exports ?? { ".": {} })
    .filter((key) => key !== "./package.json")
    .map((key) => (key === "." ? name : `${name}/${key.slice(2)}`));
}

function checkFramework(id, peers, tarball, workDir) {
  const name = `@zealakit/chrono-${id}`;
  const project = join(workDir, id);
  mkdirSync(join(project, "src"), { recursive: true });
  writeFileSync(
    join(project, "package.json"),
    `${JSON.stringify(
      {
        name: `chrono-standalone-${id}`,
        private: true,
        type: "module",
        dependencies: { [name]: `file:${tarball}`, ...peers },
        devDependencies: {
          vite: VITE,
          ...(id === "svelte"
            ? { "@sveltejs/vite-plugin-svelte": "^6.2.1" }
            : {}),
        },
      },
      null,
      2,
    )}\n`,
  );
  run("npm", ["install", "--no-audit", "--no-fund"], project);

  const specifiers = entrySpecifiers(name, tarball);
  const imports = specifiers
    .map((specifier, index) => `import * as entry${index} from "${specifier}";`)
    .join("\n");
  const list = specifiers.map((_, index) => `entry${index}`).join(", ");

  // 1. Plain Node ESM import of every entry point.
  writeFileSync(
    join(project, "node-check.mjs"),
    `${imports}\nfor (const entry of [${list}]) {\n  if (typeof entry !== "object") throw new Error("entry did not load");\n}\nconsole.log("node import ok");\n`,
  );
  // Svelte parts are `.svelte` files: Node cannot import them, a Svelte-aware bundler can.
  if (id !== "svelte") run("node", ["node-check.mjs"], project);

  // 2. Plain Vite browser build importing every entry point (Svelte adds its Vite plugin).
  if (id === "svelte") {
    writeFileSync(
      join(project, "vite.config.js"),
      'import { svelte } from "@sveltejs/vite-plugin-svelte";\nexport default { plugins: [svelte()] };\n',
    );
  }
  writeFileSync(
    join(project, "index.html"),
    '<!doctype html>\n<html lang="en">\n  <body>\n    <script type="module" src="/src/main.js"></script>\n  </body>\n</html>\n',
  );
  writeFileSync(
    join(project, "src", "main.js"),
    `${imports}\nconsole.log([${list}].map((entry) => Object.keys(entry)));\n`,
  );
  run("npx", ["--no-install", "vite", "build", "--logLevel", "error"], project);

  console.log(`${name}: ${specifiers.join(", ")} import and build standalone`);
}

const pack = spawnSync("node", [join(root, "scripts", "pack-packages.mjs")], {
  cwd: root,
  stdio: "inherit",
});
if (pack.status !== 0) {
  process.exit(pack.status ?? 1);
}

const tarballs = readdirSync(artifacts).filter((file) => file.endsWith(".tgz"));
const workDir = mkdtempSync(join(tmpdir(), "chrono-standalone-"));
let failed = false;
try {
  for (const [id, peers] of Object.entries(FRAMEWORKS)) {
    const file = tarballs.find((name) =>
      name.startsWith(`zealakit-chrono-${id}-`),
    );
    if (!file) {
      console.error(`missing tarball for @zealakit/chrono-${id} in artifacts/`);
      failed = true;
      continue;
    }
    try {
      checkFramework(id, peers, join(artifacts, file), workDir);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      failed = true;
    }
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

if (failed) {
  process.exit(1);
}
console.log("Standalone check passed.");
