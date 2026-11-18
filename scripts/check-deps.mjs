#!/usr/bin/env node
/**
 * Dependency allowlist for Chrono packages (plan 02 §2.8, guarantees I1–I3).
 *
 *   - Every `packages/*` manifest may only list the dependencies allowed for it
 *     below, in every dependency field. Changing the allowlist needs a plan
 *     change.
 *   - A deny-list gives a clear message for common mistakes (UI libraries,
 *     styling packages, other Zealakit packages).
 *   - Every `package.json` in the repo, examples included, must not use a
 *     `link:`, `file:` or `portal:` specifier that points outside the repo.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
  "peerDependenciesMeta",
  "devDependencies",
];

const CORE = "@zealakit/chrono-core";
const TEST_TOOLING = ["happy-dom"];

/** Picker packages (plan 14 §4): no dependencies; the Chrono adapter and Overlay are peers. */
function picker(framework, peers, devTooling) {
  const pair = [
    `@zealakit/chrono-${framework}`,
    `@zealakit/overlay-${framework}`,
  ];
  return {
    dependencies: [],
    peerDependencies: [...pair, ...peers],
    optionalDependencies: [],
    peerDependenciesMeta: [],
    devDependencies: [...TEST_TOOLING, ...pair, ...devTooling],
  };
}

/** @type {Record<string, Record<string, string[]>>} */
const ALLOW = {
  core: {
    dependencies: [],
    peerDependencies: [],
    optionalDependencies: [],
    peerDependenciesMeta: [],
    devDependencies: TEST_TOOLING,
  },
  vanilla: {
    dependencies: [CORE],
    peerDependencies: [],
    optionalDependencies: [],
    peerDependenciesMeta: [],
    devDependencies: TEST_TOOLING,
  },
  react: {
    dependencies: [CORE],
    peerDependencies: ["react", "react-dom"],
    optionalDependencies: [],
    peerDependenciesMeta: [],
    devDependencies: [
      ...TEST_TOOLING,
      "@testing-library/react",
      "@types/react",
      "@types/react-dom",
      "react",
      "react-dom",
    ],
  },
  vue: {
    dependencies: [CORE],
    peerDependencies: ["vue"],
    optionalDependencies: [],
    peerDependenciesMeta: [],
    devDependencies: [...TEST_TOOLING, "@vue/test-utils", "vue"],
  },
  "picker-vanilla": picker("vanilla", [], []),
  "picker-react": picker(
    "react",
    ["react", "react-dom"],
    [
      "@testing-library/react",
      "@types/react",
      "@types/react-dom",
      "react",
      "react-dom",
    ],
  ),
  "picker-vue": picker("vue", ["vue"], ["@vue/test-utils", "vue"]),
  "picker-svelte": picker(
    "svelte",
    ["svelte"],
    ["@sveltejs/package", "svelte", "svelte-check"],
  ),
  svelte: {
    dependencies: [CORE],
    peerDependencies: ["svelte"],
    optionalDependencies: [],
    peerDependenciesMeta: [],
    devDependencies: [
      ...TEST_TOOLING,
      "@sveltejs/package",
      "svelte",
      "svelte-check",
    ],
  },
};

const DENY = [
  {
    test: (name, id, field) =>
      name.startsWith("@zealakit/overlay") &&
      !(
        id.startsWith("picker-") &&
        (field === "peerDependencies" || field === "devDependencies")
      ),
    reason:
      "core and the four adapters never depend on Overlay; a picker may list it only as a peer or devDependency (plan 14 P5)",
  },
  {
    test: (name, id) =>
      name.startsWith("@zealakit/") &&
      !name.startsWith("@zealakit/chrono-") &&
      !(
        id.startsWith("picker-") && name === `@zealakit/overlay-${id.slice(7)}`
      ),
    reason: "no other Zealakit package may be a dependency",
  },
  { test: (name) => name.startsWith("@radix-ui/"), reason: "UI library" },
  { test: (name) => name.startsWith("@base-ui"), reason: "UI library" },
  {
    test: (name) => /css/i.test(name),
    reason: "Chrono ships no CSS or styling package",
  },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".svelte-kit"]);

function findManifests(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findManifests(full));
    else if (entry.name === "package.json") found.push(full);
  }
  return found;
}

const PATH_PROTOCOL = /^(link|file|portal):(.*)$/;

/** Every dependency problem under `root`, one line each. */
export function checkDeps(root) {
  const errors = [];
  for (const id of readdirSync(join(root, "packages"))) {
    const path = join(root, "packages", id, "package.json");
    if (!existsSync(path)) continue;
    const manifest = readJson(path);
    const allow = ALLOW[id];
    if (!allow) {
      errors.push(
        `packages/${id}: no allowlist entry; add one in scripts/check-deps.mjs (needs a plan change)`,
      );
      continue;
    }
    for (const field of FIELDS) {
      for (const name of Object.keys(manifest[field] ?? {})) {
        const denied = DENY.find((rule) => rule.test(name, id, field));
        if (denied) {
          errors.push(`packages/${id} ${field}.${name}: ${denied.reason}`);
        } else if (!allow[field].includes(name)) {
          errors.push(
            `packages/${id} ${field}.${name}: not on the allowlist (plan 02 §2.8)`,
          );
        }
      }
    }
  }

  for (const path of findManifests(root)) {
    const manifest = readJson(path);
    const where = relative(root, path);
    for (const field of FIELDS) {
      for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
        if (typeof spec !== "string") continue;
        const match = spec.match(PATH_PROTOCOL);
        if (!match) continue;
        const target = resolve(dirname(path), match[2]);
        if (target !== root && !target.startsWith(root + sep)) {
          errors.push(
            `${where} ${field}.${name}: "${spec}" points outside the repository; install it from the npm registry`,
          );
        }
      }
    }
  }
  return errors;
}

const invoked =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const errors = checkDeps(root);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Dependency check passed.");
}
