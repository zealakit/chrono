import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test("importing the foundation creates no global and builds no Intl formatter", () => {
  const entry = new URL("../dist/foundation/index.js", import.meta.url).href;
  const script = `
    const before = new Set([...Object.getOwnPropertyNames(globalThis), ...Object.getOwnPropertySymbols(globalThis).map(String)]);
    let built = 0;
    const Native = Intl.DateTimeFormat;
    Intl.DateTimeFormat = new Proxy(Native, { construct(target, args) { built += 1; return Reflect.construct(target, args); }, apply(target, self, args) { built += 1; return Reflect.apply(target, self, args); } });
    await import(${JSON.stringify(entry)});
    const after = [...Object.getOwnPropertyNames(globalThis), ...Object.getOwnPropertySymbols(globalThis).map(String)];
    console.log(JSON.stringify({ added: after.filter((key) => !before.has(key)), built }));
  `;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), { added: [], built: 0 });
});

test("values/ never reads the host's local time zone", () => {
  const forbidden =
    /\.(getHours|getDate|getMonth|getFullYear|getDay|setHours|getMinutes|getSeconds|getTimezoneOffset)\(/;
  const files = walk(join(dist, "foundation", "values")).filter((file) =>
    file.endsWith(".js"),
  );
  assert.ok(files.length > 5);
  for (const file of files) {
    const match = forbidden.exec(readFileSync(file, "utf8"));
    assert.equal(match, null, `${file} uses ${match?.[0]}`);
  }
});

test("foundation size (reported, not enforced): <= 10 KB gzip target", (t) => {
  const source = walk(join(dist, "foundation"))
    .filter((file) => file.endsWith(".js"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const kb = gzipSync(source).length / 1024;
  t.diagnostic(
    `foundation gzip size: ${kb.toFixed(1)} KB (budget 10 KB, report only)`,
  );
  assert.ok(kb > 0);
});
