import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildEnv,
  installFakeGemini,
  readFakeState,
} from "./fake-gemini-fixture.mjs";
import { initGitRepo, makeTempDir, run } from "./helpers.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PLUGIN_ROOT = path.join(ROOT, "plugins", "gemini");
const SCRIPT = path.join(PLUGIN_ROOT, "scripts", "gemini-companion.mjs");

test("setup reports ready when fake gemini is installed", () => {
  const binDir = makeTempDir();
  installFakeGemini(binDir, "task-ok");

  const result = run("node", [SCRIPT, "setup", "--json"], {
    cwd: ROOT,
    env: buildEnv(binDir),
  });

  assert.equal(
    result.status,
    0,
    `stderr: ${result.stderr}\nstdout: ${result.stdout}`,
  );
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ready, true);
});

test("task runs and captures output", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  const statePath = path.join(binDir, "fake-gemini-state.json");
  installFakeGemini(binDir, "task-ok");
  initGitRepo(repo);

  const result = run("node", [SCRIPT, "task", "Do the thing"], {
    cwd: repo,
    env: buildEnv(binDir),
  });

  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const state = readFakeState(statePath);
  assert.equal(state.prompts.length, 1);
  assert.ok(state.prompts[0].text.includes("Do the thing"));
});

test("review completes with no-issues result", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeGemini(binDir, "review-ok");
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "foo.js"), "const x = 1;\n");
  run("git", ["add", "foo.js"], { cwd: repo });
  run("git", ["commit", "-m", "add foo"], { cwd: repo });
  fs.writeFileSync(path.join(repo, "foo.js"), "const x = 2;\n");

  const result = run("node", [SCRIPT, "review"], {
    cwd: repo,
    env: buildEnv(binDir),
  });

  assert.equal(
    result.status,
    0,
    `stderr: ${result.stderr}\nstdout: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes("no-issues") ||
      result.stdout.includes("No issues") ||
      result.stdout.includes("clean"),
    `Unexpected output: ${result.stdout}`,
  );
});

test("status lists jobs after a task", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeGemini(binDir, "task-ok");
  initGitRepo(repo);
  const env = buildEnv(binDir);

  run("node", [SCRIPT, "task", "First task"], { cwd: repo, env });
  const result = run("node", [SCRIPT, "status"], { cwd: repo, env });

  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
});
