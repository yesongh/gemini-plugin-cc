import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  collectReviewContext,
  ensureGitRepository,
  resolveReviewTarget,
} from "../plugins/gemini/scripts/lib/git.mjs";
import { initGitRepo, makeTempDir, run } from "./helpers.mjs";

test("ensureGitRepository returns repo root for a git directory", () => {
  const dir = makeTempDir();
  initGitRepo(dir);
  const root = ensureGitRepository(dir);
  assert.equal(typeof root, "string");
  assert.ok(root.length > 0);
});

test("ensureGitRepository throws outside a git repo", () => {
  const dir = makeTempDir();
  assert.throws(() => ensureGitRepository(dir), /Git repository|git/i);
});

test("resolveReviewTarget returns target for working-tree scope", () => {
  const dir = makeTempDir();
  initGitRepo(dir);
  fs.writeFileSync(path.join(dir, "foo.js"), "const x = 1;\n");
  run("git", ["add", "foo.js"], { cwd: dir });
  run("git", ["commit", "-m", "add foo"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "foo.js"), "const x = 2;\n");
  const target = resolveReviewTarget(dir, { scope: "working-tree" });
  assert.equal(target.mode, "working-tree");
  assert.ok(target.label.includes("working tree"));
});

test("collectReviewContext returns context object with source and diff", () => {
  const dir = makeTempDir();
  initGitRepo(dir);
  fs.writeFileSync(path.join(dir, "bar.js"), "function test() {}\n");
  run("git", ["add", "bar.js"], { cwd: dir });
  run("git", ["commit", "-m", "add bar"], { cwd: dir });
  fs.writeFileSync(
    path.join(dir, "bar.js"),
    "function test() { return 42; }\n",
  );
  const target = resolveReviewTarget(dir, { scope: "working-tree" });
  const context = collectReviewContext(dir, target);
  assert.ok(context);
  assert.ok(typeof context === "object");
});
