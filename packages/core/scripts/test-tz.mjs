/**
 * Run the whole core suite once per time zone (plan 03 §5). Plain-date results
 * must be identical in every zone; any difference means local time leaked in.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zones = [
  "UTC",
  "America/New_York",
  "Asia/Ho_Chi_Minh",
  "Australia/Lord_Howe",
];

// Tests need full ICU (Node's default build).
const probe = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  timeZone: "UTC",
}).format(0);
if (probe !== "Januar") {
  console.error(
    `Core tests need full ICU data (got "${probe}" for de-DE). Use a Node build with full-icu.`,
  );
  process.exit(1);
}

const extra = process.argv.slice(2);
let failed = false;
for (const zone of zones) {
  console.log(`\n=== TZ=${zone} ===`);
  const result = spawnSync(
    process.execPath,
    ["--import", "./tests/setup.ts", "--test", ...extra, "tests/*.test.ts"],
    { cwd: root, stdio: "inherit", env: { ...process.env, TZ: zone } },
  );
  if (result.status !== 0) {
    console.error(`Tests failed under TZ=${zone}.`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
