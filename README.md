# Gemini plugin for Claude Code

Use Gemini from inside Claude Code for code reviews or to delegate tasks to Gemini.

Based on [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc), adapted for the Gemini CLI. Adds `/gemini:task` for direct task delegation and uses Gemini's ACP protocol instead of Codex's app-server.

## What You Get

- `/gemini:review` for a normal read-only Gemini review
- `/gemini:adversarial-review` for a steerable challenge review
- `/gemini:rescue`, `/gemini:status`, `/gemini:result`, and `/gemini:cancel` to delegate work and manage background jobs
- `/gemini:setup` to verify Gemini CLI is ready and manage the review gate
- `/gemini:task` for quick one-off task delegation

## Requirements

- **Google API key or Application Default Credentials configured.**
  - [Create an API key](https://aistudio.google.com/app/apikey) or set up Application Default Credentials.
- **Gemini CLI** installed and authenticated.
  - [Install the Gemini CLI](https://developers.google.com/gemini-cli).
- **Node.js 18.18 or later**

## Install

### Local development

Load the plugin for a single session without installing:

```bash
claude --plugin-dir ./plugins/gemini
```

To install it permanently for this project, run the setup script once:

```bash
node scripts/add-local-plugin.mjs
```

Then reload plugins in Claude Code:

```bash
/reload-plugins
```

### From a marketplace

Once published to a GitHub marketplace, install with:

```bash
/plugin marketplace add your-org/gemini-plugin-cc
/plugin install gemini@your-org-gemini
/reload-plugins
```

Then run:

```bash
/gemini:setup
```

`/gemini:setup` will tell you whether Gemini is ready. If Gemini is missing, refer to the [Gemini CLI installation guide](https://developers.google.com/gemini-cli).

If Gemini is installed but not authenticated, set up your `GOOGLE_API_KEY` environment variable or configure Application Default Credentials:

```bash
gcloud auth application-default login
```

After install, you should see:

- the slash commands listed below
- the `gemini:gemini-rescue` subagent in `/agents`

One simple first run is:

```bash
/gemini:review --background
/gemini:status
/gemini:result
```

## Commands

| Command | Description |
|---------|-------------|
| `/gemini:review` | Run a normal Gemini code review on your current work or branch. Review-only, non-destructive. Supports `--wait`, `--background`, and `--base <ref>` for branch review. |
| `/gemini:adversarial-review` | Run a **steerable** review that challenges implementation and design choices. Questions tradeoffs, failure modes, and alternative approaches. Supports all `/gemini:review` flags plus custom focus text after flags. |
| `/gemini:rescue` | Delegate a task to Gemini through the `gemini:gemini-rescue` subagent. Use for investigation, fixes, or continued work. Supports `--background`, `--wait`, `--resume`, `--fresh`, and `--model <pro\|flash\|flash-lite>`. |
| `/gemini:status` | Show running and recent Gemini jobs for the current repository. Check progress on background work or confirm task status. |
| `/gemini:result` | Show the final output for a finished job, including session ID to reopen in Gemini CLI with `gemini resume <session-id>`. |
| `/gemini:cancel` | Cancel an active background Gemini job. |
| `/gemini:setup` | Check whether Gemini CLI is installed and authenticated. Optionally toggle the stop-time review gate with `--enable-review-gate` or `--disable-review-gate`. |
| `/gemini:task` | Quick delegation of one-off tasks to Gemini. |

## Usage

### `/gemini:review`

Runs a normal Gemini review on your current work. It gives you the same quality of code review as running `/review` inside Gemini directly.

> [!NOTE]
> Code review especially for multi-file changes might take a while. It's generally recommended to run it in the background.

Use it when you want:

- a review of your current uncommitted changes
- a review of your branch compared to a base branch like `main`

Use `--base <ref>` for branch review. It also supports `--wait` and `--background`. It is not steerable and does not take custom focus text. Use [`/gemini:adversarial-review`](#geminiadversarial-review) when you want to challenge a specific decision or risk area.

Examples:

```bash
/gemini:review
/gemini:review --base main
/gemini:review --background
```

This command is read-only and will not perform any changes. When run in the background you can use [`/gemini:status`](#geministatus) to check on the progress and [`/gemini:cancel`](#geminicancel) to cancel the ongoing task.

### `/gemini:adversarial-review`

Runs a **steerable** review that questions the chosen implementation and design.

It can be used to pressure-test assumptions, tradeoffs, failure modes, and whether a different approach would have been safer or simpler.

It uses the same review target selection as `/gemini:review`, including `--base <ref>` for branch review.
It also supports `--wait` and `--background`. Unlike `/gemini:review`, it can take extra focus text after the flags.

Use it when you want:

- a review before shipping that challenges the direction, not just the code details
- review focused on design choices, tradeoffs, hidden assumptions, and alternative approaches
- pressure-testing around specific risk areas like auth, data loss, rollback, race conditions, or reliability

Examples:

```bash
/gemini:adversarial-review
/gemini:adversarial-review --base main challenge whether this was the right caching and retry design
/gemini:adversarial-review --background look for race conditions and question the chosen approach
```

This command is read-only. It does not fix code.

### `/gemini:rescue`

Hands a task to Gemini through the `gemini:gemini-rescue` subagent.

Use it when you want Gemini to:

- investigate a bug
- try a fix
- continue a previous Gemini task
- take a faster or cheaper pass with a smaller model

> [!NOTE]
> Depending on the task and the model you choose these tasks might take a long time and it's generally recommended to force the task to be in the background or move the agent to the background.

It supports `--background`, `--wait`, `--resume`, and `--fresh`. If you omit `--resume` and `--fresh`, the plugin can offer to continue the latest rescue thread for this repo.

Examples:

```bash
/gemini:rescue investigate why the tests started failing
/gemini:rescue fix the failing test with the smallest safe patch
/gemini:rescue --resume apply the top fix from the last run
/gemini:rescue --model flash --background investigate the regression
/gemini:rescue --model flash-lite fix the issue quickly
```

You can also just ask for a task to be delegated to Gemini:

```text
Ask Gemini to redesign the database connection to be more resilient.
```

**Notes:**

- if you do not pass `--model`, Gemini chooses its own defaults.
- model options: `pro`, `flash`, or `flash-lite`
- follow-up rescue requests can continue the latest Gemini task in the repo

### `/gemini:status`

Shows running and recent Gemini jobs for the current repository.

Examples:

```bash
/gemini:status
/gemini:status task-abc123
```

Use it to:

- check progress on background work
- see the latest completed job
- confirm whether a task is still running

### `/gemini:result`

Shows the final stored Gemini output for a finished job.
When available, it also includes the Gemini session ID so you can reopen that run directly in Gemini with `gemini resume <session-id>`.

Examples:

```bash
/gemini:result
/gemini:result task-abc123
```

### `/gemini:cancel`

Cancels an active background Gemini job.

Examples:

```bash
/gemini:cancel
/gemini:cancel task-abc123
```

### `/gemini:setup`

Checks whether Gemini CLI is installed and authenticated.
If Gemini is missing, refer you to the [installation guide](https://developers.google.com/gemini-cli).

You can also use `/gemini:setup` to manage the optional review gate.

#### Enabling review gate

```bash
/gemini:setup --enable-review-gate
/gemini:setup --disable-review-gate
```

When the review gate is enabled, the plugin uses a `Stop` hook to run a targeted Gemini review based on Claude's response. If that review finds issues, the stop is blocked so Claude can address them first.

> [!WARNING]
> The review gate can create a long-running Claude/Gemini loop and may drain API quota quickly. Only enable it when you plan to actively monitor the session.

## Typical Flows

### Review Before Shipping

```bash
/gemini:review
```

### Hand A Problem To Gemini

```bash
/gemini:rescue investigate why the build is failing in CI
```

### Start Something Long-Running

```bash
/gemini:adversarial-review --background
/gemini:rescue --background investigate the flaky test
```

Then check in with:

```bash
/gemini:status
/gemini:result
```

## Gemini Integration

The Gemini plugin wraps the [Gemini CLI](https://developers.google.com/gemini-cli). It uses the global `gemini` binary installed in your environment and applies the same configuration as the standalone Gemini CLI.

### Model Selection

The `/gemini:rescue` command supports the `--model` flag to choose which Gemini model to use:

- `pro` → `gemini-2.5-pro` (full-capability reasoning model)
- `flash` → `gemini-2.5-flash` (fast, cost-effective model)
- `flash-lite` → `gemini-2.5-flash-lite` (lightest model, fastest responses)

If you don't specify a model, Gemini chooses based on task complexity.

### Common Configurations

If you want to change the default model or other settings that get used by the plugin, configure them in your Gemini CLI config. Your configuration will be picked up based on:

- user-level config in `~/.config/google-ai-cli/config.json` (on Linux/Mac)
- project-level overrides in `.gemini/config.json` (when trusted)

Check out the [Gemini CLI documentation](https://developers.google.com/gemini-cli) for configuration options.

### Moving The Work Over To Gemini

Delegated tasks and any [stop gate](#enabling-review-gate) run can also be directly resumed inside Gemini by running `gemini resume` either with the specific session ID you received from running `/gemini:result` or `/gemini:status` or by selecting it from the list.

This way you can review the Gemini work or continue the work there.

## Development

### Running Tests

```bash
pnpm test
```

This runs all test files in the `tests/` directory using Node's built-in test runner.

### All checks

```bash
pnpm run ci
```

Runs type checking, linting, and tests.

### Project Structure

```
plugins/gemini/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata
├── agents/                       # Gemini rescue subagent
├── commands/                     # Slash command definitions (.md)
├── hooks/                        # Stop and lifecycle hooks
├── prompts/                      # Prompts for subagents
├── schemas/                      # JSON schemas for review output
├── scripts/
│   ├── gemini-companion.mjs      # Main CLI wrapper
│   ├── session-lifecycle-hook.mjs # Session start/end handling
│   ├── stop-review-gate-hook.mjs  # Stop-time review enforcement
│   └── lib/                      # Shared runtime modules
└── skills/                       # Claude Code skills

tests/
├── commands.test.mjs            # Command registration tests
├── integration.test.mjs         # Full workflow tests
├── acp-*.test.mjs              # ACP protocol and lifecycle tests
├── git.test.mjs                # Git operations
├── job-control.test.mjs        # Job state management
└── ...
```

## Architecture

The plugin follows a per-job architecture:

1. **Per-Job ACP Subprocess**: Each background task spawns its own ACP subprocess via `acp-client.mjs`. The subprocess runs `gemini-companion.mjs` with isolated state.

2. **No Broker**: Jobs don't coordinate through a central broker. Each task manages its own `state.json` file in the job directory.

3. **3-Phase Shutdown**: When a session ends:
   - Phase 1: Mark all running jobs as pending cleanup
   - Phase 2: Send SIGTERM to subprocess
   - Phase 3: Wait for graceful shutdown; force SIGKILL if needed

4. **State Management**: Job state (status, output, session ID) persists in `~/.claude-code/jobs/{plugin-id}/job-{id}/state.json`.

5. **Review Output Schema**: Structured review results are validated against `schemas/review-output.schema.json` to ensure consistent parsing.

## FAQ

### Do I need a separate Gemini account for this plugin?

If you are already authenticated with Gemini on this machine, that setup should work immediately here too. This plugin uses your local Gemini CLI authentication.

If you only use Claude Code today and have not used Gemini CLI yet, you will need to set up authentication. You can:

- [Create a free API key](https://aistudio.google.com/app/apikey) and set `GOOGLE_API_KEY` environment variable
- Use Application Default Credentials: `gcloud auth application-default login`
- Run `/gemini:setup` to check status and get help

### Does the plugin use a separate Gemini runtime?

No. This plugin delegates through your local [Gemini CLI](https://developers.google.com/gemini-cli) on the same machine.

That means:

- it uses the same Gemini CLI you would use directly
- it uses the same local authentication state
- it uses the same repository checkout and machine-local environment

### Will it use the same Gemini config I already have?

Yes. If you already use Gemini CLI, the plugin picks up the same configuration from your machine.

### Why not use `gemini -p` (Gemini in prompt mode)?

The `-p` flag runs Gemini in an interactive prompt, which is designed for direct user interaction. This plugin needs:

- Non-interactive background execution for long tasks
- Job tracking and cancellation (`/gemini:status`, `/gemini:cancel`)
- Result persistence across sessions
- Integration with Claude's subagent system for `/gemini:rescue`

The ACP subprocess model gives you all of this while still using the same Gemini CLI you know.

### What happens to my state if the session crashes?

All job state is persisted to disk in `~/.claude-code/jobs/`. When you restart:

- `/gemini:status` shows the same jobs you had before
- `/gemini:result` can fetch output from crashed jobs
- `/gemini:cancel` can clean up orphaned processes

This is why long-running tasks are safer in the background — you can close Claude Code and come back to results later.

### Can I keep using my current API key or authentication setup?

Yes. Because the plugin uses your local Gemini CLI, your existing authentication method (API key, Application Default Credentials, or gcloud login) continues to work as-is.

If you need to point Gemini at a different endpoint, configure that in the Gemini CLI config files.
