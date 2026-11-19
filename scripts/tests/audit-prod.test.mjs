import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyAudit } from "../audit-prod.mjs";

test("classifies audit runs", () => {
  assert.equal(classifyAudit({ status: 0 }), "ok");
  assert.equal(
    classifyAudit({
      status: 1,
      stderr: "getaddrinfo ENOTFOUND registry.npmjs.org",
    }),
    "network",
  );
  assert.equal(
    classifyAudit({ status: 1, stdout: "2 vulnerabilities found" }),
    "vulnerable",
  );
});
