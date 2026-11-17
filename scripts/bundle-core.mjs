/**
 * Vendor the internal Core build into a packed adapter tarball.
 *
 * Core is never published to npm. In the repository adapters depend on it via
 * `workspace:^`; at release time this step rewrites a `pnpm pack` tarball so it
 * is self-contained:
 *
 *   - copies `packages/core/dist` to `dist/vendor/core/` inside the adapter,
 *   - rewrites every `@zealakit/chrono-core` and `@zealakit/chrono-core/<sub>`
 *     specifier in `dist` (.js, .d.ts, .svelte) to a relative path into that
 *     folder, resolved through Core's `exports` map,
 *   - drops Core from `dependencies` and adds Core's own runtime dependencies
 *     instead (Core has none today, so this is a no-op),
 *   - repacks with `npm pack --ignore-scripts`, replacing the original tarball.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const CORE_NAME = "@zealakit/chrono-core";
export const VENDOR_DIR = "dist/vendor/core";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CORE_DIR = join(ROOT, "packages", "core");
const SPECIFIER_RE = /(["'])@zealakit\/chrono-core((?:\/[\w.-]+)*)\1/g;
const REWRITE_EXTENSIONS = [".js", ".d.ts", ".svelte"];

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${(
        result.stderr || result.stdout || ""
      ).trim()}`,
    );
  }
  return result.stdout.trim();
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function toPosix(path) {
  return path.split(sep).join(posix.sep);
}

/**
 * Map a Core export key (`"."` or `"./<sub>"`) to its file inside Core's
 * `dist`, for example `"./time"` → `"time/index.js"`. Throws when Core does not
 * export that subpath.
 */
export function resolveCoreExport(exportsMap, key) {
  const entry = exportsMap?.[key];
  const target =
    typeof entry === "string" ? entry : (entry?.import ?? entry?.default);
  if (typeof target !== "string" || !target.startsWith("./dist/")) {
    throw new Error(
      `${CORE_NAME} does not export "${key}" as a ./dist/ file; add it to packages/core/package.json "exports".`,
    );
  }
  return target.slice("./dist/".length);
}

/**
 * Rewrite every Core specifier in `source` (a file at `fromFile`) to a relative
 * path into `vendorDir`. Returns the new source, unchanged when it has no Core
 * import. Throws when a Core reference remains that is not a string literal.
 */
export function rewriteCoreSpecifiers(source, fromFile, vendorDir, exportsMap) {
  if (!source.includes(CORE_NAME)) {
    return source;
  }
  const next = source.replace(SPECIFIER_RE, (_match, quote, subpath) => {
    const key = subpath ? `.${subpath}` : ".";
    const file = resolveCoreExport(exportsMap, key);
    let target = toPosix(relative(dirname(fromFile), join(vendorDir, file)));
    if (!target.startsWith(".")) {
      target = `./${target}`;
    }
    return `${quote}${target}${quote}`;
  });
  if (next.includes(CORE_NAME)) {
    throw new Error(
      `${fromFile} references ${CORE_NAME} in a form this step cannot rewrite (non-literal import).`,
    );
  }
  return next;
}

function rewriteSpecifiers(packageRoot, exportsMap) {
  const distDir = join(packageRoot, "dist");
  const vendorDir = join(packageRoot, VENDOR_DIR);
  let rewritten = 0;

  for (const file of walk(distDir)) {
    if (file.startsWith(vendorDir + sep)) {
      continue;
    }
    if (!REWRITE_EXTENSIONS.some((ext) => file.endsWith(ext))) {
      continue;
    }
    const source = readFileSync(file, "utf8");
    const next = rewriteCoreSpecifiers(source, file, vendorDir, exportsMap);
    if (next !== source) {
      writeFileSync(file, next);
      rewritten += 1;
    }
  }
  return rewritten;
}

function rewriteManifest(packageRoot, coreManifest) {
  const manifestPath = join(packageRoot, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const dependencies = { ...(manifest.dependencies ?? {}) };
  delete dependencies[CORE_NAME];

  for (const [name, range] of Object.entries(coreManifest.dependencies ?? {})) {
    if (dependencies[name] && dependencies[name] !== range) {
      throw new Error(
        `${manifest.name} depends on ${name}@${dependencies[name]} but Core needs ${range}; align the ranges.`,
      );
    }
    dependencies[name] = range;
  }

  if (Object.keys(dependencies).length > 0) {
    manifest.dependencies = dependencies;
  } else {
    delete manifest.dependencies;
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/**
 * Replace `tarball` (an adapter tarball produced by `pnpm pack`) with a copy
 * that bundles Core. Returns the path of the rewritten tarball (same path).
 */
export function bundleCoreIntoTarball(tarball) {
  const coreDist = join(CORE_DIR, "dist");
  if (!existsSync(join(coreDist, "index.js"))) {
    throw new Error("Core is not built; run `pnpm build` first.");
  }
  const coreManifest = JSON.parse(
    readFileSync(join(CORE_DIR, "package.json"), "utf8"),
  );

  const outDir = dirname(tarball);
  const staging = mkdtempSync(join(outDir, ".bundle-core-"));
  try {
    run("tar", ["-xzf", tarball, "-C", staging], ROOT);
    const packageRoot = join(staging, "package");

    const vendorDir = join(packageRoot, VENDOR_DIR);
    if (existsSync(vendorDir)) {
      throw new Error(`${basename(tarball)} already contains ${VENDOR_DIR}.`);
    }
    cpSync(coreDist, vendorDir, { recursive: true });

    const rewritten = rewriteSpecifiers(packageRoot, coreManifest.exports);
    if (rewritten === 0) {
      // Expected while the adapters have no public API yet (plan 01). Once an
      // adapter ships a component, its dist imports Core and this stays silent.
      console.warn(
        `note: ${basename(tarball)} does not import ${CORE_NAME} yet; vendored Core is unused.`,
      );
    }
    rewriteManifest(packageRoot, coreManifest);

    rmSync(tarball);
    const packedName = run(
      "npm",
      ["pack", packageRoot, "--ignore-scripts", "--pack-destination", outDir],
      ROOT,
    )
      .split("\n")
      .pop();
    if (packedName !== basename(tarball)) {
      throw new Error(
        `Repacked tarball name changed: expected ${basename(tarball)}, got ${packedName}.`,
      );
    }
    return tarball;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
