#!/usr/bin/env node
/**
 * Domain import-graph check (plan 02 §2.6-§2.7, plan 03 §4, decision D15).
 *
 * Dependency-free: a small regex parser walks `src` and `dist` of core and of
 * every adapter, and enforces:
 *
 *   1. Folder rules: a domain folder may import only the folders on its row of
 *      the table below. Adapter domain folders also reach core through the
 *      matching `@zealakit/chrono-core/<domain>` subpath.
 *   2. The root `index` is a pure re-export of the domain entries, and nothing
 *      imports the package's own root `index`.
 *   3. Reachability: walking from each entry (`index.js`, later
 *      `<domain>/index.js`) never reaches a forbidden domain.
 *   4. No import cycles inside a package.
 *   5. Adapters never import another adapter.
 *
 * Output: one line per violation, `file -> specifier (rule)`. Exit code 1.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DOMAINS = ["foundation", "date", "time", "datetime", "calendar"];
const SHARED = "shared";

/** From -> domains it may import directly. */
export const ALLOW = {
  foundation: ["foundation"],
  date: ["foundation", "date"],
  time: ["foundation", "time"],
  datetime: ["foundation", "date", "time", "datetime"],
  calendar: ["foundation", "date", "time", "calendar"],
  [SHARED]: ["foundation", SHARED],
};

const CORE_NAME = "@zealakit/chrono-core";
const ADAPTER_PREFIX = "@zealakit/chrono-";
const SOURCE_EXT = /\.(?:d\.ts|ts|tsx|mts|js|mjs|svelte|vue)$/;

const IMPORT_PATTERNS = [
  /\b(?:import|export)\s+(?:type\s+)?[^"';]*?\sfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

export function parseImports(text) {
  const found = new Set();
  const clean = stripComments(text);
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of clean.matchAll(pattern)) {
      found.add(match[1]);
    }
  }
  return [...found];
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === "node_modules" || name === "vendor") return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Resolve a relative specifier from `fromFile` to an existing file, or `null`. */
export function resolveRelative(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const stem = base.replace(/\.(?:m?js|tsx?)$/, "");
  const candidates = [
    base,
    `${stem}.ts`,
    `${stem}.tsx`,
    `${stem}.d.ts`,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    join(base, "index.js"),
  ];
  return candidates.find(isFile) ?? null;
}

/**
 * Describe the package trees to scan. `dir` is the package folder, `name` its
 * npm name; core is the only `kind: "core"`.
 */
export function discoverPackages(root) {
  const packagesDir = join(root, "packages");
  if (!existsSync(packagesDir)) return [];
  return readdirSync(packagesDir)
    .filter((id) => isFile(join(packagesDir, id, "package.json")))
    .map((id) => ({
      id,
      kind: id === "core" ? "core" : "adapter",
      dir: join(packagesDir, id),
      name: `${ADAPTER_PREFIX}${id}`,
    }));
}

function treeInfo(treeRoot, file) {
  const parts = relative(treeRoot, file).split(sep);
  const first = parts[0];
  if (parts.length > 1 && (DOMAINS.includes(first) || first === SHARED)) {
    return { domain: first, isIndex: false };
  }
  return { domain: "root", isIndex: /^index\./.test(parts[parts.length - 1]) };
}

function isDomainIndex(treeRoot, file) {
  const parts = relative(treeRoot, file).split(sep);
  return (
    parts.length === 2 &&
    DOMAINS.includes(parts[0]) &&
    /^index\./.test(parts[1])
  );
}

/** Adapters also have a `shared/` folder that every domain may use. */
function allowedFor(domain, packageKind) {
  const allowed = new Set(ALLOW[domain]);
  if (packageKind === "adapter") allowed.add(SHARED);
  return allowed;
}

/** Domain of any file in any scanned tree (`trees` maps tree root -> package). */
function domainOf(file, treeRoots) {
  const treeRoot = treeRoots.find((root) => file.startsWith(root + sep));
  return treeRoot ? treeInfo(treeRoot, file).domain : null;
}

/**
 * Check one tree (`src` or `dist`) of one package and return its import graph
 * (file -> resolved imports).
 */
function checkTree(pkg, kind, coreRoot, report) {
  const treeRoot = join(pkg.dir, kind);
  const files = walk(treeRoot).filter((file) => SOURCE_EXT.test(file));
  const graph = new Map();

  for (const file of files) {
    const from = treeInfo(treeRoot, file);
    const edges = [];
    graph.set(file, edges);

    for (const specifier of parseImports(readFileSync(file, "utf8"))) {
      let target;

      if (specifier.startsWith(".")) {
        const resolved = resolveRelative(file, specifier);
        if (!resolved || relative(treeRoot, resolved).startsWith(".."))
          continue;
        const info = treeInfo(treeRoot, resolved);
        target = {
          domain: info.domain,
          file: resolved,
          rootIndex: info.domain === "root" && info.isIndex,
          entry: isDomainIndex(treeRoot, resolved),
        };
      } else if (
        specifier === CORE_NAME ||
        specifier.startsWith(`${CORE_NAME}/`)
      ) {
        const sub =
          specifier === CORE_NAME ? "" : specifier.slice(CORE_NAME.length + 1);
        if (pkg.kind === "core") {
          report(file, specifier, "imports its own root index");
          continue;
        }
        if (sub === "package.json") continue;
        if (sub !== "" && !DOMAINS.includes(sub)) {
          report(file, specifier, `unknown core subpath "${sub}"`);
          continue;
        }
        const entry =
          sub && coreRoot
            ? resolveRelative(join(coreRoot, "x"), `./${sub}/index.js`)
            : null;
        target = {
          domain: sub || "root",
          file: entry ?? undefined,
          coreRoot: sub === "",
          entry: sub !== "",
        };
      } else if (specifier.startsWith(ADAPTER_PREFIX)) {
        const own =
          specifier === pkg.name || specifier.startsWith(`${pkg.name}/`);
        report(
          file,
          specifier,
          own
            ? "imports its own root index"
            : "an adapter imports another adapter",
        );
        continue;
      } else {
        continue;
      }

      // Keep the edge even when it is a violation, so reachability sees it too.
      if (target.file) {
        edges.push({ file: target.file, specifier });
      }
      if (target.rootIndex) {
        report(file, specifier, "imports the package's own root index");
        continue;
      }
      if (from.domain === "root") {
        if (!target.entry) {
          report(
            file,
            specifier,
            "the root index may only re-export domain entries",
          );
        }
      } else if (target.coreRoot) {
        report(
          file,
          specifier,
          `${from.domain}/ must import a core subpath, not the core root`,
        );
      } else if (target.domain === "root") {
        report(file, specifier, `${from.domain}/ may not import root files`);
      } else if (!allowedFor(from.domain, pkg.kind).has(target.domain)) {
        report(
          file,
          specifier,
          `${from.domain}/ may not import ${target.domain}/`,
        );
      }
    }
  }
  return graph;
}

/** From each domain entry, walk the whole graph (across packages) and report forbidden domains. */
function checkReachability(pkg, kind, graph, global, treeRoots, report) {
  const treeRoot = join(pkg.dir, kind);
  for (const entry of graph.keys()) {
    if (!isDomainIndex(treeRoot, entry)) continue;
    const entryDomain = relative(treeRoot, entry).split(sep)[0];
    const allowed = allowedFor(entryDomain, pkg.kind);
    const seen = new Set([entry]);
    const queue = [entry];
    while (queue.length > 0) {
      const current = queue.shift();
      for (const edge of global.get(current) ?? []) {
        if (seen.has(edge.file)) continue;
        seen.add(edge.file);
        const domain = domainOf(edge.file, treeRoots);
        if (domain && domain !== "root" && !allowed.has(domain)) {
          report(
            entry,
            edge.specifier,
            `entry reaches forbidden domain ${domain}/ through ${edge.file.split(sep).slice(-2).join("/")}`,
          );
        }
        queue.push(edge.file);
      }
    }
  }
}

function findCycles(graph, report) {
  const state = new Map(); // 0 = visiting, 1 = done
  const stack = [];
  const reported = new Set();
  const visit = (file) => {
    state.set(file, 0);
    stack.push(file);
    for (const edge of graph.get(file) ?? []) {
      if (!graph.has(edge.file)) continue;
      if (state.get(edge.file) === 0) {
        const cycle = stack.slice(stack.indexOf(edge.file));
        const key = [...cycle].sort().join("|");
        if (!reported.has(key)) {
          reported.add(key);
          report(
            file,
            edge.specifier,
            `import cycle: ${[...cycle, edge.file].map((f) => f.split(sep).slice(-2).join("/")).join(" -> ")}`,
          );
        }
      } else if (!state.has(edge.file)) {
        visit(edge.file);
      }
    }
    stack.pop();
    state.set(file, 1);
  };
  for (const file of graph.keys()) {
    if (!state.has(file)) visit(file);
  }
}

/** Run every rule over `root`. Returns the violation lines. */
export function checkDomains(root) {
  const packages = discoverPackages(root);
  const violations = [];
  const report = (file, specifier, rule) =>
    violations.push(
      `${relative(root, file).split(sep).join("/")} -> ${specifier} (${rule})`,
    );

  for (const kind of ["src", "dist"]) {
    const coreRoot = join(root, "packages", "core", kind);
    const graphs = new Map();
    const global = new Map();
    const treeRoots = [];
    for (const pkg of packages) {
      if (!existsSync(join(pkg.dir, kind))) continue;
      treeRoots.push(join(pkg.dir, kind));
      const graph = checkTree(pkg, kind, coreRoot, report);
      graphs.set(pkg, graph);
      for (const [file, edges] of graph) global.set(file, edges);
    }
    for (const [pkg, graph] of graphs) {
      checkReachability(pkg, kind, graph, global, treeRoots, report);
      findCycles(graph, report);
    }
  }
  return [...new Set(violations)];
}

const invoked =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const violations = checkDomains(root);
  if (violations.length > 0) {
    console.error(violations.join("\n"));
    console.error(`\n${violations.length} domain boundary violation(s).`);
    process.exit(1);
  }
  const built = existsSync(join(root, "packages", "core", "dist"));
  console.log(
    `Domain check passed${built ? "" : " (source only; dist is not built)"}.`,
  );
}
