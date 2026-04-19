import { readFileSync, writeFileSync } from "node:fs";
import { LOCATIONS } from "../version-locations.mjs";

const readJson = (rootUrl, file) =>
  JSON.parse(readFileSync(new URL(file, rootUrl), "utf8"));

const writeJson = (rootUrl, file, data) =>
  writeFileSync(new URL(file, rootUrl), `${JSON.stringify(data, null, 2)}\n`);

const getPath = (obj, path) => path.reduce((cursor, key) => cursor[key], obj);

const setPath = (obj, path, value) => {
  let cursor = obj;
  for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]];
  cursor[path[path.length - 1]] = value;
};

export function readAllVersions(rootUrl, locations = LOCATIONS) {
  const cache = new Map();
  return locations.map((loc) => {
    if (!cache.has(loc.file)) cache.set(loc.file, readJson(rootUrl, loc.file));
    return { ...loc, version: getPath(cache.get(loc.file), loc.path) };
  });
}

export function syncVersions(rootUrl, locations = LOCATIONS) {
  const [canonical, ...targets] = locations;
  const version = getPath(readJson(rootUrl, canonical.file), canonical.path);

  const byFile = new Map();
  for (const target of targets) {
    if (!byFile.has(target.file)) {
      byFile.set(target.file, {
        data: readJson(rootUrl, target.file),
        paths: [],
      });
    }
    byFile.get(target.file).paths.push(target.path);
  }

  for (const [file, { data, paths }] of byFile) {
    for (const path of paths) setPath(data, path, version);
    writeJson(rootUrl, file, data);
  }

  return { version, updated: targets.length };
}

export function checkVersions(rootUrl, locations = LOCATIONS) {
  const found = readAllVersions(rootUrl, locations);
  const canonical = found[0];
  const drift = found.filter((v) => v.version !== canonical.version);
  return { ok: drift.length === 0, canonical, drift, found };
}
