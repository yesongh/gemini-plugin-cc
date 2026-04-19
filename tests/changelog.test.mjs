import assert from "node:assert/strict";
import test from "node:test";
import { extractLatest, prependEntry } from "../scripts/lib/changelog.mjs";

test("extractLatest returns the first version section from a multi-version changelog", () => {
  const text = `# Changelog

## [1.1.0] - 2026-04-19

### Added
- Release pipeline
- CHANGELOG automation

## [1.0.0] - 2026-03-31

### Added
- Initial release
`;

  const result = extractLatest(text);

  assert.ok(result);
  assert.ok(result.startsWith("## [1.1.0]"));
  assert.ok(result.includes("Release pipeline"));
  assert.ok(!result.includes("1.0.0"));
  assert.ok(!result.includes("Initial release"));
});

test("extractLatest returns the only section when there is just one release", () => {
  const text = `# Changelog

## [1.0.0] - 2026-03-31

### Added
- Initial release
`;

  const result = extractLatest(text);
  assert.ok(result);
  assert.ok(result.startsWith("## [1.0.0]"));
  assert.ok(result.includes("Initial release"));
});

test("extractLatest returns null when no version section exists", () => {
  assert.equal(extractLatest("# Changelog\n\n"), null);
  assert.equal(extractLatest(""), null);
});

test("prependEntry adds the new entry above any existing entries", () => {
  const existing = `# Changelog

## [1.0.0] - 2026-03-31

### Added
- Initial release
`;
  const entry = `## [1.1.0] - 2026-04-19

### Added
- New feature`;

  const result = prependEntry(existing, entry);

  assert.ok(result.startsWith("# Changelog\n"));
  const v1_1 = result.indexOf("## [1.1.0]");
  const v1_0 = result.indexOf("## [1.0.0]");
  assert.ok(v1_1 > 0);
  assert.ok(v1_0 > v1_1);
});

test("prependEntry creates a valid changelog when none exists", () => {
  const entry = `## [1.0.0] - 2026-04-19

### Added
- Initial release`;

  const result = prependEntry("", entry);

  assert.ok(result.startsWith("# Changelog\n"));
  assert.ok(result.includes("## [1.0.0]"));
});

test("prependEntry does not collapse into a single # Changelog header twice", () => {
  const existing = "# Changelog\n\n## [1.0.0] - 2026-03-31\n";
  const entry = "## [1.1.0] - 2026-04-19";
  const result = prependEntry(existing, entry);
  assert.equal((result.match(/^# Changelog/gm) || []).length, 1);
});

test("prependEntry collapses excess blank lines", () => {
  const existing = "# Changelog\n\n\n\n## [1.0.0]\n";
  const entry = "## [1.1.0]";
  const result = prependEntry(existing, entry);
  assert.ok(!result.includes("\n\n\n"));
});

test("extractLatest and prependEntry round-trip", () => {
  const entry = `## [2.0.0] - 2026-05-01

### Changed
- Breaking API changes`;
  const text = prependEntry("", entry);
  const extracted = extractLatest(text);
  assert.equal(extracted, entry);
});
