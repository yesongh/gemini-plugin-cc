import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const COMMANDS_DIR = path.join(ROOT, "plugins", "gemini", "commands");

function readCommand(name) {
  return fs.readFileSync(path.join(COMMANDS_DIR, `${name}.md`), "utf8");
}

test("all command files exist", () => {
  const expected = [
    "setup",
    "task",
    "rescue",
    "review",
    "adversarial-review",
    "status",
    "result",
    "cancel",
  ];
  for (const name of expected) {
    assert.ok(
      fs.existsSync(path.join(COMMANDS_DIR, `${name}.md`)),
      `Missing: ${name}.md`,
    );
  }
});

test("setup.md references gemini-companion.mjs", () => {
  assert.ok(readCommand("setup").includes("gemini-companion.mjs"));
});

test("review.md has disable-model-invocation: true", () => {
  assert.ok(readCommand("review").includes("disable-model-invocation: true"));
});

test("adversarial-review.md has disable-model-invocation: true", () => {
  assert.ok(
    readCommand("adversarial-review").includes(
      "disable-model-invocation: true",
    ),
  );
});

test("task.md has disable-model-invocation: true", () => {
  assert.ok(readCommand("task").includes("disable-model-invocation: true"));
});

test("review.md instructs returning output verbatim", () => {
  assert.ok(readCommand("review").toLowerCase().includes("verbatim"));
});

test("adversarial-review.md instructs returning output verbatim", () => {
  assert.ok(
    readCommand("adversarial-review").toLowerCase().includes("verbatim"),
  );
});
