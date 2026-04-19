import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import {
  checkVersions,
  readAllVersions,
  syncVersions,
} from "../scripts/lib/versions.mjs";
import { LOCATIONS } from "../scripts/version-locations.mjs";
import { makeTempDir } from "./helpers.mjs";

function seedFixture(canonicalVersion, mirrorVersion = canonicalVersion) {
  const root = makeTempDir("version-sync-");
  const rootUrl = pathToFileURL(`${root}/`);

  const files = {
    "package.json": { name: "fixture", version: canonicalVersion },
    "plugins/gemini/.claude-plugin/plugin.json": {
      name: "gemini",
      version: mirrorVersion,
    },
    ".claude-plugin/marketplace.json": {
      name: "fixture-mp",
      metadata: { version: mirrorVersion },
      plugins: [{ name: "gemini", version: mirrorVersion }],
    },
  };

  for (const [file, data] of Object.entries(files)) {
    const absolute = path.join(root, file);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`);
  }

  return { root, rootUrl };
}

test("syncVersions writes canonical version into all mirror locations", () => {
  const { root, rootUrl } = seedFixture("2.0.0", "1.0.0");

  const result = syncVersions(rootUrl);

  assert.equal(result.version, "2.0.0");
  assert.equal(result.updated, LOCATIONS.length - 1);

  const pluginJson = JSON.parse(
    readFileSync(
      path.join(root, "plugins/gemini/.claude-plugin/plugin.json"),
      "utf8",
    ),
  );
  const marketplace = JSON.parse(
    readFileSync(path.join(root, ".claude-plugin/marketplace.json"), "utf8"),
  );

  assert.equal(pluginJson.version, "2.0.0");
  assert.equal(marketplace.metadata.version, "2.0.0");
  assert.equal(marketplace.plugins[0].version, "2.0.0");
});

test("syncVersions is idempotent when all locations already agree", () => {
  const { root, rootUrl } = seedFixture("1.5.0");
  const before = readFileSync(
    path.join(root, "plugins/gemini/.claude-plugin/plugin.json"),
    "utf8",
  );

  syncVersions(rootUrl);
  const after = readFileSync(
    path.join(root, "plugins/gemini/.claude-plugin/plugin.json"),
    "utf8",
  );

  assert.equal(before, after);
});

test("checkVersions returns ok when all versions agree", () => {
  const { rootUrl } = seedFixture("1.0.0");
  const result = checkVersions(rootUrl);
  assert.equal(result.ok, true);
  assert.equal(result.drift.length, 0);
  assert.equal(result.canonical.version, "1.0.0");
});

test("checkVersions detects drift and lists every drifted location", () => {
  const { rootUrl } = seedFixture("2.0.0", "1.0.0");
  const result = checkVersions(rootUrl);

  assert.equal(result.ok, false);
  assert.equal(result.drift.length, LOCATIONS.length - 1);
  assert.equal(result.canonical.version, "2.0.0");
  for (const drifted of result.drift) {
    assert.equal(drifted.version, "1.0.0");
  }
});

test("readAllVersions returns an entry for every configured location", () => {
  const { rootUrl } = seedFixture("1.2.3");
  const found = readAllVersions(rootUrl);

  assert.equal(found.length, LOCATIONS.length);
  for (const entry of found) {
    assert.equal(entry.version, "1.2.3");
  }
});
