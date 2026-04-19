#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { extractLatest } from "./lib/changelog.mjs";

const changelogUrl = new URL("../CHANGELOG.md", import.meta.url);

if (!existsSync(changelogUrl)) {
  console.error("CHANGELOG.md not found");
  process.exit(1);
}

const text = readFileSync(changelogUrl, "utf8");
const entry = extractLatest(text);

if (!entry) {
  console.error("No changelog section found in CHANGELOG.md");
  process.exit(1);
}

process.stdout.write(`${entry}\n`);
