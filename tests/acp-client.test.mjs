// tests/acp-client.test.mjs

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AcpClient } from "../plugins/gemini/scripts/lib/acp-client.mjs";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "acp-test-"));
}

function writeScript(dir, name, src) {
  const p = path.join(dir, `${name}.mjs`);
  fs.writeFileSync(p, src, "utf8");
  return p;
}

test("AcpClient resolves requests by id", async () => {
  const dir = makeTempDir();
  const script = writeScript(
    dir,
    "echo-server",
    `
import readline from "node:readline";
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const msg = JSON.parse(line);
  if (msg.method === "initialize") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { serverInfo: { name: "fake" } } }) + "\\n");
  }
});
`,
  );
  const proc = spawn(process.execPath, [script], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const client = new AcpClient(proc);
  const result = await client.initialize();
  assert.ok(result.serverInfo.name === "fake");
  await client.shutdown();
});

test("AcpClient rejects pending requests when process exits", async () => {
  const dir = makeTempDir();
  const script = writeScript(dir, "crash-server", `process.exit(1);`);
  const proc = spawn(process.execPath, [script], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const client = new AcpClient(proc);
  await assert.rejects(
    () => client.initialize(),
    (err) => {
      return err.code === "ACP_PROCESS_EXIT";
    },
  );
});

test("AcpClient dispatches session/update notifications", async () => {
  const dir = makeTempDir();
  const script = writeScript(
    dir,
    "notify-server",
    `
import readline from "node:readline";
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const msg = JSON.parse(line);
  if (msg.method === "initialize") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { sessionId: "s1", type: "agent_message_chunk", data: { text: "hello" } } }) + "\\n");
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }) + "\\n");
  }
});
`,
  );
  const proc = spawn(process.execPath, [script], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const client = new AcpClient(proc);
  const updates = [];
  client.onUpdate((p) => updates.push(p));
  await client.initialize();
  assert.equal(updates.length, 1);
  assert.equal(updates[0].type, "agent_message_chunk");
  await client.shutdown();
});

test("AcpClient handles server-to-client requests", async () => {
  const dir = makeTempDir();
  const script = writeScript(
    dir,
    "permission-server",
    `
import readline from "node:readline";
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on("line", (line) => {
  const msg = JSON.parse(line);
  if (msg.method === "initialize") {
    // Send permission request with id 99
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: 99, method: "session/request_permission", params: { sessionId: "s1", permissionId: "p1", description: "test" } }) + "\\n");
    setTimeout(() => {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }) + "\\n");
    }, 50);
  }
});
`,
  );
  const proc = spawn(process.execPath, [script], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const client = new AcpClient(proc);
  const seen = [];
  client.onServerRequest("session/request_permission", async (params) => {
    seen.push(params.permissionId);
    return { approved: true };
  });
  await client.initialize();
  assert.deepEqual(seen, ["p1"]);
  await client.shutdown();
});
