// plugins/gemini/scripts/lib/acp-lifecycle.mjs
import { spawn } from "node:child_process";
import { AcpClient, installDefaultHandlers } from "./acp-client.mjs";
import { runCommand } from "./process.mjs";

// Cache detected flag per binary to avoid repeated --version calls
const flagCache = new Map();

/**
 * Detect --acp vs --experimental-acp by reading `gemini --version`.
 * --acp is available from 0.33.0+. Older versions use --experimental-acp.
 * @param {string} [binary="gemini"]
 * @returns {Promise<"--acp" | "--experimental-acp">}
 */
export async function detectAcpFlag(binary = "gemini") {
  if (flagCache.has(binary)) return flagCache.get(binary);

  const result = runCommand(binary, ["--version"], { timeoutMs: 2000 });
  /** @type {"--acp" | "--experimental-acp"} */
  let flag = "--acp";

  if (result.status === 0) {
    const version = result.stdout.trim();
    const match = version.match(/^(\d+)\.(\d+)\./);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major === 0 && minor < 33) {
        flag = "--experimental-acp";
      }
    }
  }

  flagCache.set(binary, flag);
  return flag;
}

/** Clear the flag cache (for testing). */
export function clearFlagCache() {
  flagCache.clear();
}

/**
 * Spawn a new gemini --acp process, complete the initialize handshake, return connected AcpClient.
 * @param {object} [opts]
 * @param {string} [opts.binary="gemini"]
 * @param {string} [opts.cwd]
 * @param {Record<string,string>} [opts.env]
 * @returns {Promise<AcpClient>}
 */
export async function spawnAcpClient(opts = {}) {
  const binary = opts.binary ?? "gemini";
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env ?? process.env;

  const flag = await detectAcpFlag(binary);

  const proc = spawn(binary, [flag], {
    cwd,
    env,
    stdio: ["pipe", "pipe", "inherit"],
  });

  const client = new AcpClient(proc);
  installDefaultHandlers(client);

  const initTimeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("ACP initialize timed out after 10s")),
      10000,
    ),
  );
  await Promise.race([client.initialize(), initTimeout]);

  return client;
}

/**
 * Check whether the ACP process is still alive.
 * @param {AcpClient} client
 * @returns {boolean}
 */
export function isAlive(client) {
  if (client.exited) return false;
  try {
    process.kill(client.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Spawn, initialize, create a new session, set mode (and model if provided).
 * Returns { client, sessionId }.
 * @param {object} [opts]
 * @param {string} [opts.binary]
 * @param {string} [opts.cwd]
 * @param {Record<string,string>} [opts.env]
 * @param {string} [opts.modeId="default"]
 * @param {string} [opts.model]
 */
export async function createSession(opts = {}) {
  const client = await spawnAcpClient(opts);
  const cwd = opts.cwd ?? process.cwd();
  const { sessionId } = await client.newSession(cwd, []);

  const modeId = opts.modeId ?? "default";
  await client.setMode(sessionId, modeId);

  if (opts.model) {
    await client.setModel(sessionId, opts.model);
  }

  return { client, sessionId };
}

/**
 * Load an existing session into a fresh ACP process and apply mode/model overrides.
 * Returns { client, sessionId }.
 * @param {string} sessionId
 * @param {object} [opts]
 * @param {string} [opts.binary]
 * @param {string} [opts.cwd]
 * @param {Record<string,string>} [opts.env]
 * @param {string} [opts.modeId="default"]
 * @param {string} [opts.model]
 */
export async function resumeSession(sessionId, opts = {}) {
  const client = await spawnAcpClient(opts);
  const cwd = opts.cwd ?? process.cwd();

  try {
    await client.loadSession(sessionId, cwd);

    const modeId = opts.modeId ?? "default";
    await client.setMode(sessionId, modeId);

    if (opts.model) {
      await client.setModel(sessionId, opts.model);
    }
  } catch (err) {
    await client.shutdown();
    throw err;
  }

  return { client, sessionId };
}
