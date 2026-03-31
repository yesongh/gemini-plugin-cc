import test from "node:test";
import assert from "node:assert/strict";
import { parseReviewOutput } from "../plugins/gemini/scripts/lib/gemini.mjs";

test("parseReviewOutput parses valid review JSON", () => {
  const raw = JSON.stringify({
    verdict: "no-issues",
    summary: "All good.",
    findings: [],
    next_steps: []
  });
  const result = parseReviewOutput(raw);
  assert.equal(result.verdict, "no-issues");
  assert.equal(result.summary, "All good.");
  assert.deepEqual(result.findings, []);
});

test("parseReviewOutput strips markdown fences", () => {
  const raw = '```json\n{"verdict":"no-issues","summary":"ok","findings":[],"next_steps":[]}\n```';
  const result = parseReviewOutput(raw);
  assert.equal(result.verdict, "no-issues");
});

test("parseReviewOutput throws on invalid JSON", () => {
  assert.throws(() => parseReviewOutput("not json"), (e) => e.code === "REVIEW_PARSE_ERROR");
});

test("parseReviewOutput throws on invalid verdict", () => {
  const raw = JSON.stringify({ verdict: "bad", summary: "x", findings: [], next_steps: [] });
  assert.throws(() => parseReviewOutput(raw), (e) => e.code === "REVIEW_VALIDATION_ERROR");
});

test("parseReviewOutput throws on missing required field", () => {
  const raw = JSON.stringify({ verdict: "no-issues", summary: "x", findings: [] }); // missing next_steps
  assert.throws(() => parseReviewOutput(raw), (e) => e.code === "REVIEW_VALIDATION_ERROR");
});
