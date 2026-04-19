import assert from "node:assert/strict";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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

test("syncVersions reports zero updates and skips writes when all locations already agree", () => {
  const { root, rootUrl } = seedFixture("1.5.0");
  const pluginPath = path.join(
    root,
    "plugins/gemini/.claude-plugin/plugin.json",
  );
  const beforeContent = readFileSync(pluginPath, "utf8");
  const beforeMtime = statSync(pluginPath).mtimeMs;

  const result = syncVersions(rootUrl);

  assert.equal(result.updated, 0);
  assert.equal(readFileSync(pluginPath, "utf8"), beforeContent);
  assert.equal(statSync(pluginPath).mtimeMs, beforeMtime);
});

test("syncVersions throws a descriptive error when a target path is missing", () => {
  const { root, rootUrl } = seedFixture("1.0.0");
  const marketplacePath = path.join(root, ".claude-plugin/marketplace.json");
  const broken = JSON.parse(readFileSync(marketplacePath, "utf8"));
  delete broken.metadata;
  writeFileSync(marketplacePath, `${JSON.stringify(broken, null, 2)}\n`);

  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "fixture", version: "2.0.0" }, null, 2)}\n`,
  );

  assert.throws(() => syncVersions(rootUrl), /marketplace\.json.*metadata/);
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

test("checkVersions reports undefined for a location whose path is missing", () => {
  const { root, rootUrl } = seedFixture("1.0.0");
  const marketplacePath = path.join(root, ".claude-plugin/marketplace.json");
  const broken = JSON.parse(readFileSync(marketplacePath, "utf8"));
  delete broken.metadata;
  writeFileSync(marketplacePath, `${JSON.stringify(broken, null, 2)}\n`);

  const result = checkVersions(rootUrl);

  assert.equal(result.ok, false);
  const missing = result.drift.find(
    (v) =>
      v.file === ".claude-plugin/marketplace.json" && v.path[0] === "metadata",
  );
  assert.ok(missing, "expected drift entry for missing metadata path");
  assert.equal(missing.version, undefined);
});
