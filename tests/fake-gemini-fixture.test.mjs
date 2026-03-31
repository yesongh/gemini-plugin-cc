// tests/fake-gemini-fixture.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { installFakeGemini } from "./fake-gemini-fixture.mjs";

test("smoke test -- --version flag works", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fg-test-"));
  installFakeGemini(dir, "task-ok");
  const result = spawnSync("node", [path.join(dir, "gemini"), "--version"], {
    encoding: "utf8",
  });

  assert.strictEqual(
    result.status,
    0,
    `process exited with status ${result.status}`,
  );
  assert.strictEqual(result.stdout.trim(), "0.33.0");
  assert.strictEqual(result.stderr, "");
});
