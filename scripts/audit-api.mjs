#!/usr/bin/env node
/**
 * Offline API audit (plan 13 §14.2, §5). Guards the contracts a 1.0 promises:
 *
 *  1. vocabulary: every `data-*` attribute and `--chrono-*` property written by the source is in
 *     `scripts/data/vocabulary.json`, and nothing listed there disappeared (a rename is breaking);
 *  2. types: the adapters' `.d.ts` files contain no `any` (a warning list now; `--strict` fails,
 *     and 1.0 needs it clean, plan 13 §3.6);
 *  3. messages: every default message key appears in a package README.
 *
 *   node scripts/audit-api.mjs            check (exit 1 with `file -> problem` lines)
 *   node scripts/audit-api.mjs --strict   also fail on `any` types
 *   node scripts/audit-api.mjs --update   rewrite the vocabulary from the source (a conscious act)
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["core", "vanilla", "react", "vue", "svelte"];
const ADAPTERS = ["vanilla", "react", "vue", "svelte"];
const VOCABULARY = join(root, "scripts", "data", "vocabulary.json");
const ATTRIBUTE = /["'`](data-[a-z][a-z0-9-]*|--chrono-[a-z][a-z0-9-]*)["'`]/g;

function walk(dir, accept) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory())
      return name === "node_modules" ? [] : walk(full, accept);
    return accept(full) ? [full] : [];
  });
}

/** Attribute and custom property names written by the sources. */
export function collectVocabulary(rootDir = root) {
  const names = new Set();
  for (const pkg of SOURCES) {
    for (const file of walk(join(rootDir, "packages", pkg, "src"), (f) =>
      /\.(ts|tsx|svelte)$/.test(f),
    )) {
      for (const match of readFileSync(file, "utf8").matchAll(ATTRIBUTE))
        names.add(match[1]);
    }
  }
  return [...names].sort();
}

/** `{ added, removed }` of the source against the recorded vocabulary. */
export function diffVocabulary(current, recorded) {
  const have = new Set(current);
  const had = new Set(recorded);
  return {
    added: current.filter((name) => !had.has(name)),
    removed: recorded.filter((name) => !have.has(name)),
  };
}

/** `.d.ts` files with an `any` type. */
export function findAnyTypes(rootDir = root) {
  const problems = [];
  for (const pkg of ADAPTERS) {
    const dist = join(rootDir, "packages", pkg, "dist");
    for (const file of walk(
      dist,
      (f) => f.endsWith(".d.ts") && !f.includes(`${"vendor"}`),
    )) {
      const text = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      if (/(?::|<|\||&|,)\s*any\b(?!\w)/.test(text)) {
        problems.push(`${relative(rootDir, file)} -> uses the type "any"`);
      }
    }
  }
  return problems;
}

/** Default message keys missing from every package README. */
export async function findUndocumentedMessages(rootDir = root) {
  const entry = join(
    rootDir,
    "packages",
    "core",
    "dist",
    "foundation",
    "index.js",
  );
  if (!existsSync(entry)) return [];
  const { defaultMessages } = await import(pathToFileURL(entry).href);
  const readmes = [
    "packages/vanilla",
    "packages/react",
    "packages/vue",
    "packages/svelte",
  ]
    .map((dir) => readFileSync(join(rootDir, dir, "README.md"), "utf8"))
    .join("\n");
  return Object.keys(defaultMessages)
    .filter((key) => !new RegExp(`\\b${key}\\b`).test(readmes))
    .map((key) => `packages/*/README.md -> message "${key}" is not documented`);
}

async function main() {
  const current = collectVocabulary();
  if (process.argv.includes("--update")) {
    writeFileSync(VOCABULARY, `${JSON.stringify(current, null, 2)}\n`);
    console.log(`vocabulary.json: ${current.length} names`);
    return;
  }
  const problems = [];
  const recorded = existsSync(VOCABULARY)
    ? JSON.parse(readFileSync(VOCABULARY, "utf8"))
    : [];
  const { added, removed } = diffVocabulary(current, recorded);
  for (const name of added)
    problems.push(
      `scripts/data/vocabulary.json -> new name "${name}" (run with --update if intended)`,
    );
  for (const name of removed)
    problems.push(
      `scripts/data/vocabulary.json -> "${name}" is no longer written (a rename or removal is breaking)`,
    );
  problems.push(...(await findUndocumentedMessages()));
  const anyTypes = findAnyTypes();
  if (process.argv.includes("--strict")) {
    problems.push(...anyTypes);
  } else if (anyTypes.length > 0) {
    console.warn(
      `${anyTypes.length} declaration files use "any" (1.0 blocker; list them with --strict).`,
    );
  }
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`API audit passed (${current.length} names).`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
