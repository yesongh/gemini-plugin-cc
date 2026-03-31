import fs from "node:fs";
import path from "node:path";

import { writeExecutable } from "./helpers.mjs";

export function installFakeGemini(binDir, behavior = "task-ok") {
  const statePath = path.join(binDir, "fake-gemini-state.json");
  const scriptPath = path.join(binDir, "gemini");
  const source = `#!/usr/bin/env node
const fs = require("node:fs");
const readline = require("node:readline");

const STATE_PATH = ${JSON.stringify(statePath)};
const BEHAVIOR = ${JSON.stringify(behavior)};

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { starts: 1, sessions: [], prompts: [], cancels: [] };
  }
  const s = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  s.starts = (s.starts || 0) + 1;
  return s;
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\\n");
}

const args = process.argv.slice(2);

if (args.includes("--version")) {
  process.stdout.write("0.33.0\\n");
  process.exit(0);
}

if (!args.includes("--acp") && !args.includes("--experimental-acp")) {
  process.stderr.write("error: --acp or --experimental-acp flag required\\n");
  process.exit(1);
}

const state = loadState();
saveState(state);

let nextSessionNum = 1;

const rl = readline.createInterface({ input: process.stdin });

rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }

  const message = JSON.parse(line);

  // Notifications have no id — handle session/cancel
  if (message.id === undefined || message.id === null) {
    if (message.method === "session/cancel") {
      const sessionId = message.params && message.params.sessionId;
      const st = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
      st.cancels = st.cancels || [];
      st.cancels.push({ sessionId });
      fs.writeFileSync(STATE_PATH, JSON.stringify(st, null, 2));
    }
    return;
  }

  const st = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

  try {
    switch (message.method) {
      case "initialize":
        send({ id: message.id, result: { protocolVersion: "2025-04-15", capabilities: {}, serverInfo: { name: "fake-gemini", version: "0.33.0" } } });
        break;

      case "session/new": {
        const sessionId = "ses_" + nextSessionNum++;
        st.sessions = st.sessions || [];
        st.sessions.push({ sessionId, cwd: (message.params && message.params.cwd) || process.cwd() });
        fs.writeFileSync(STATE_PATH, JSON.stringify(st, null, 2));
        send({ id: message.id, result: { sessionId } });
        break;
      }

      case "session/load": {
        const sessionId = (message.params && message.params.sessionId) || ("ses_" + nextSessionNum++);
        st.sessions = st.sessions || [];
        if (!st.sessions.find((s) => s.sessionId === sessionId)) {
          st.sessions.push({ sessionId, cwd: (message.params && message.params.cwd) || process.cwd() });
        }
        fs.writeFileSync(STATE_PATH, JSON.stringify(st, null, 2));
        send({ id: message.id, result: { sessionId } });
        if (BEHAVIOR === "session-load") {
          send({ method: "session/update", params: { sessionId, type: "agent_message_chunk", text: "Resuming from history." } });
        }
        break;
      }

      case "session/close":
        send({ id: message.id, result: {} });
        break;

      case "session/set_mode":
        send({ id: message.id, result: {} });
        break;

      case "session/set_model":
        send({ id: message.id, result: {} });
        break;

      case "session/list": {
        const sessions = (st.sessions || []).map((s) => ({ sessionId: s.sessionId, cwd: s.cwd }));
        send({ id: message.id, result: { sessions } });
        break;
      }

      case "session/prompt": {
        const sessionId = message.params && message.params.sessionId;
        const text = message.params && message.params.text;
        st.prompts = st.prompts || [];
        st.prompts.push({ sessionId, text });
        fs.writeFileSync(STATE_PATH, JSON.stringify(st, null, 2));

        if (BEHAVIOR === "crash") {
          process.exit(1);
        }

        if (BEHAVIOR === "hang") {
          // Never respond
          break;
        }

        if (BEHAVIOR === "permission") {
          send({
            id: 9999,
            method: "session/request_permission",
            params: { sessionId, description: "Run shell command: ls" }
          });
          // Wait for the client to respond to the permission request, then complete
          const onPermissionResponse = (permLine) => {
            if (!permLine.trim()) {
              return;
            }
            let permMsg;
            try {
              permMsg = JSON.parse(permLine);
            } catch (_) {
              return;
            }
            if (permMsg.id !== 9999) {
              return;
            }
            rl.removeListener("line", onPermissionResponse);
            send({ method: "session/update", params: { sessionId, type: "agent_message_chunk", text: "Task complete." } });
            send({ id: message.id, result: { stopReason: "end_turn" } });
          };
          rl.on("line", onPermissionResponse);
          break;
        }

        if (BEHAVIOR === "review-ok" || BEHAVIOR === "session-load") {
          const reviewJson = JSON.stringify({ verdict: "no-issues", summary: "No issues found.", findings: [], next_steps: [] });
          send({ method: "session/update", params: { sessionId, type: "agent_message_chunk", text: reviewJson } });
          send({ id: message.id, result: { stopReason: "end_turn" } });
          break;
        }

        // Default: task-ok
        send({ method: "session/update", params: { sessionId, type: "agent_message_chunk", text: "Task complete." } });
        send({ id: message.id, result: { stopReason: "end_turn" } });
        break;
      }

      default:
        send({ id: message.id, error: { code: -32601, message: "Unsupported method: " + message.method } });
        break;
    }
  } catch (error) {
    send({ id: message.id, error: { code: -32000, message: error.message } });
  }
});
`;
  writeExecutable(scriptPath, source);
}

export function buildEnv(binDir, extra = {}) {
  return {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
    ...extra
  };
}

export function readFakeState(statePath) {
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}
