import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkDeps } from "../check-deps.mjs";

function run(manifests) {
  const root = mkdtempSync(join(tmpdir(), "chrono-deps-"));
  try {
    for (const [id, manifest] of Object.entries(manifests)) {
      mkdirSync(join(root, "packages", id), { recursive: true });
      writeFileSync(
        join(root, "packages", id, "package.json"),
        JSON.stringify(manifest),
      );
    }
    return checkDeps(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("a picker may list its Chrono adapter and Overlay as peers and devDependencies", () => {
  const manifest = {
    peerDependencies: {
      "@zealakit/chrono-react": "^0.8.0",
      "@zealakit/overlay-react": "^1.0.0",
      react: "^19",
      "react-dom": "^19",
    },
    devDependencies: {
      "@zealakit/chrono-react": "workspace:^",
      "@zealakit/overlay-react": "^1.0.0",
    },
  };
  assert.deepEqual(run({ "picker-react": manifest }), []);
});

test("Overlay under dependencies fails for a picker", () => {
  const errors = run({
    "picker-react": { dependencies: { "@zealakit/overlay-react": "^1.0.0" } },
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /dependencies\.@zealakit\/overlay-react/);
});

test("the wrong framework's Overlay, and any Overlay in core or an adapter, fail", () => {
  assert.equal(
    run({
      "picker-react": {
        peerDependencies: { "@zealakit/overlay-vue": "^1.0.0" },
      },
    }).length,
    1,
  );
  assert.equal(
    run({
      react: { peerDependencies: { "@zealakit/overlay-react": "^1.0.0" } },
    }).length,
    1,
  );
  assert.equal(
    run({ core: { devDependencies: { "@zealakit/overlay-core": "^1.0.0" } } })
      .length,
    1,
  );
});

test("a picker never depends on core", () => {
  assert.equal(
    run({
      "picker-vue": {
        dependencies: { "@zealakit/chrono-core": "workspace:^" },
      },
    }).length,
    1,
  );
});
