#!/usr/bin/env node
import { syncVersions } from "./lib/versions.mjs";

const { version, updated } = syncVersions(new URL("..", import.meta.url));
console.log(`Synced version ${version} to ${updated} locations.`);
