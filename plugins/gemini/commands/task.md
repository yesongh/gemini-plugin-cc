---
description: Delegate a task to Gemini CLI as a background or foreground job
argument-hint: '[--background] [--resume-last|--resume <session-id>|--fresh] [--model <pro|flash|flash-lite>] [prompt]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run a Gemini task through the companion runtime.

Raw slash-command arguments:
`$ARGUMENTS`

Execution mode rules:
- If `--background` is in the arguments, run in a Claude background task.
- Otherwise, run in the foreground and stream output.

Foreground flow:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" task $ARGUMENTS
```
- Return the command stdout verbatim, exactly as-is.

Background flow:
- Launch with `Bash` in the background:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/gemini-companion.mjs" task $ARGUMENTS`,
  description: "Gemini task",
  run_in_background: true
})
```
- Tell the user: "Gemini task started in the background. Check `/gemini:status` for progress."
