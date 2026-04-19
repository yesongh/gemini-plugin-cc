#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { extractLatest } from "./lib/changelog.mjs";

const text = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const entry = extractLatest(text);

if (!entry) {
  console.error("No changelog section found in CHANGELOG.md");
  process.exit(1);
}

process.stdout.write(`${entry}\n`);
