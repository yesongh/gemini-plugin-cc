import assert from "node:assert/strict";
import test from "node:test";

import {
  renderCancelReport,
  renderReviewResult,
  renderStoredJobResult,
} from "../plugins/gemini/scripts/lib/render.mjs";

test("renderReviewResult formats a no-issues verdict", () => {
  const result = renderReviewResult(
    {
      parsed: {
        verdict: "no-issues",
        summary: "Code looks clean.",
        findings: [],
        next_steps: [],
      },
      parseError: null,
    },
    {
      reviewLabel: "Review",
      targetLabel: "working tree diff",
    },
  );
  assert.equal(typeof result, "string");
  assert.ok(result.length > 0);
  assert.match(result, /no-issues/);
  assert.match(result, /Code looks clean\./);
});

test("renderReviewResult includes finding severity", () => {
  const result = renderReviewResult(
    {
      parsed: {
        verdict: "needs-attention",
        summary: "Found issue.",
        findings: [
          {
            severity: "high",
            title: "SQL injection",
            body: "Unparameterized query.",
            file: "src/db.js",
            line_start: 42,
            line_end: 42,
            recommendation: "Use parameterized queries.",
          },
        ],
        next_steps: ["Fix the SQL injection"],
      },
      parseError: null,
    },
    {
      reviewLabel: "Review",
      targetLabel: "src/db.js",
    },
  );
  assert.ok(result.includes("SQL injection") || result.includes("high"));
});

test("renderReviewResult degrades gracefully when JSON is missing required review fields", () => {
  const output = renderReviewResult(
    {
      parsed: {
        verdict: "approve",
        summary: "Looks fine.",
      },
      rawOutput: JSON.stringify({
        verdict: "approve",
        summary: "Looks fine.",
      }),
      parseError: null,
    },
    {
      reviewLabel: "Adversarial Review",
      targetLabel: "working tree diff",
    },
  );

  assert.match(
    output,
    /Gemini returned JSON with an unexpected review shape\./,
  );
  assert.match(output, /Missing array `findings`\./);
  assert.match(output, /Raw final message:/);
});

test("renderStoredJobResult handles a completed job", () => {
  const job = {
    id: "job-123",
    jobClass: "task",
    status: "completed",
    title: "Test task",
  };
  const storedJob = {
    rendered: "# Test task\n\nDone.\n",
  };
  const result = renderStoredJobResult(job, storedJob);
  assert.equal(typeof result, "string");
  assert.ok(result.length > 0);
});

test("renderStoredJobResult prefers rendered output for structured review jobs", () => {
  const output = renderStoredJobResult(
    {
      id: "review-123",
      status: "completed",
      title: "Gemini Adversarial Review",
      jobClass: "review",
      threadId: "thr_123",
    },
    {
      threadId: "thr_123",
      rendered:
        "# Gemini Adversarial Review\n\nTarget: working tree diff\nVerdict: needs-attention\n",
      result: {
        result: {
          verdict: "needs-attention",
          summary: "One issue.",
          findings: [],
          next_steps: [],
        },
        rawOutput:
          '{"verdict":"needs-attention","summary":"One issue.","findings":[],"next_steps":[]}',
      },
    },
  );

  assert.match(output, /^# Gemini Adversarial Review/);
  assert.doesNotMatch(output, /^\{/);
  assert.match(output, /Gemini session ID: thr_123/);
  assert.match(output, /Resume in Gemini: gemini resume thr_123/);
});

test("renderCancelReport formats cancel output", () => {
  const output = renderCancelReport({
    id: "job-456",
    title: "My task",
    summary: "Doing stuff",
  });
  assert.match(output, /Cancelled job-456/);
  assert.match(output, /My task/);
  assert.match(output, /gemini:status/);
});
