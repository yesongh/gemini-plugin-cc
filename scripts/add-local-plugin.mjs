#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const settingsPath = new URL(
  "../.claude/settings.local.json",
  import.meta.url
).pathname;

const settings = JSON.parse(readFileSync(settingsPath, "utf8"));

settings.extraKnownMarketplaces ??= {};
settings.extraKnownMarketplaces["gemini-plugin-local"] = {
  source: {
    source: "directory",
    path: new URL("../plugins", import.meta.url).pathname,
  },
};

writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
console.log("Done. Run /reload-plugins in Claude Code to load the plugin.");
