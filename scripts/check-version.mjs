#!/usr/bin/env node
import { checkVersions } from "./lib/versions.mjs";

const { ok, canonical, drift, found } = checkVersions(
  new URL("..", import.meta.url),
);

if (!ok) {
  console.error(
    `Version drift detected. Canonical (${canonical.file}): ${canonical.version}`,
  );
  for (const v of drift) {
    const shown = v.version === undefined ? "(missing)" : v.version;
    console.error(`  ${v.file} @ ${v.path.join(".")}: ${shown}`);
  }
  console.error(`Run 'pnpm run version:sync' to fix.`);
  process.exit(1);
}

console.log(
  `All ${found.length} version locations agree: ${canonical.version}`,
);
