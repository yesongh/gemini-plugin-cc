import assert from "node:assert/strict";
import test from "node:test";
import {
  clearFlagCache,
  createSession,
  detectAcpFlag,
  isAlive,
  spawnAcpClient,
} from "../plugins/gemini/scripts/lib/acp-lifecycle.mjs";
import { buildEnv, installFakeGemini } from "./fake-gemini-fixture.mjs";
import { makeTempDir } from "./helpers.mjs";

test("detectAcpFlag returns --acp for gemini >= 0.33.0", async () => {
  const binDir = makeTempDir();
  installFakeGemini(binDir, "task-ok"); // fake reports 0.33.0
  clearFlagCache();
  const origPath = process.env.PATH;
  process.env.PATH = `${binDir}:${origPath}`;
  try {
    const flag = await detectAcpFlag("gemini");
    assert.equal(flag, "--acp");
  } finally {
    process.env.PATH = origPath;
    clearFlagCache();
  }
});

test("spawnAcpClient connects and completes initialize handshake", async () => {
  const binDir = makeTempDir();
  installFakeGemini(binDir, "task-ok");
  clearFlagCache();
  const client = await spawnAcpClient({ env: buildEnv(binDir) });
  assert.ok(client.pid > 0);
  assert.equal(client.exited, false);
  await client.shutdown();
});

test("isAlive returns true for a live client", async () => {
  const binDir = makeTempDir();
  installFakeGemini(binDir, "task-ok");
  clearFlagCache();
  const client = await spawnAcpClient({ env: buildEnv(binDir) });
  assert.equal(isAlive(client), true);
  await client.shutdown();
});

test("createSession returns a non-empty sessionId", async () => {
  const binDir = makeTempDir();
  installFakeGemini(binDir, "task-ok");
  clearFlagCache();
  const { client, sessionId } = await createSession({ env: buildEnv(binDir) });
  assert.equal(typeof sessionId, "string");
  assert.ok(sessionId.length > 0);
  await client.shutdown();
});
