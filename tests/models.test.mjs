import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_MODEL,
  MODEL_ALIASES,
  MODELS,
  resolveModel,
  suggestAlternatives,
} from "../plugins/gemini/scripts/lib/models.mjs";

test("MODELS enum has all expected entries", () => {
  assert.equal(MODELS.FLASH_2_5, "gemini-2.5-flash");
  assert.equal(MODELS.PRO_2_5, "gemini-2.5-pro");
  assert.equal(MODELS.FLASH_3, "gemini-3-flash-preview");
  assert.equal(MODELS.PRO_3, "gemini-3-pro-preview");
});

test("MODELS is frozen", () => {
  assert.ok(Object.isFrozen(MODELS));
});

test("DEFAULT_MODEL is FLASH_2_5", () => {
  assert.equal(DEFAULT_MODEL, MODELS.FLASH_2_5);
});

test("MODEL_ALIASES maps all expected aliases", () => {
  assert.equal(MODEL_ALIASES.get("flash"), MODELS.FLASH_2_5);
  assert.equal(MODEL_ALIASES.get("pro"), MODELS.PRO_2_5);
  assert.equal(MODEL_ALIASES.get("flash-3"), MODELS.FLASH_3);
  assert.equal(MODEL_ALIASES.get("pro-3"), MODELS.PRO_3);
});

test("MODEL_ALIASES does not contain flash-lite", () => {
  assert.equal(MODEL_ALIASES.has("flash-lite"), false);
});

test("resolveModel resolves known alias", () => {
  assert.equal(resolveModel("flash"), MODELS.FLASH_2_5);
  assert.equal(resolveModel("pro-3"), MODELS.PRO_3);
});

test("resolveModel is case-insensitive", () => {
  assert.equal(resolveModel("FLASH"), MODELS.FLASH_2_5);
  assert.equal(resolveModel("Pro-3"), MODELS.PRO_3);
});

test("resolveModel passes through raw model IDs", () => {
  assert.equal(
    resolveModel("gemini-3.1-pro-preview"),
    "gemini-3.1-pro-preview",
  );
});

test("resolveModel returns DEFAULT_MODEL for null/undefined/empty", () => {
  assert.equal(resolveModel(null), DEFAULT_MODEL);
  assert.equal(resolveModel(undefined), DEFAULT_MODEL);
  assert.equal(resolveModel(""), DEFAULT_MODEL);
  assert.equal(resolveModel("  "), DEFAULT_MODEL);
});

test("suggestAlternatives excludes the failed model", () => {
  const suggestions = suggestAlternatives(MODELS.FLASH_3);
  assert.ok(suggestions.length > 0);
  for (const s of suggestions) {
    assert.notEqual(MODEL_ALIASES.get(s), MODELS.FLASH_3);
  }
});

test("suggestAlternatives returns aliases not model IDs", () => {
  const suggestions = suggestAlternatives(MODELS.FLASH_3);
  for (const s of suggestions) {
    assert.ok(MODEL_ALIASES.has(s), `${s} should be a known alias`);
  }
});

test("suggestAlternatives for unknown model returns all aliases", () => {
  const suggestions = suggestAlternatives("gemini-99-turbo");
  assert.equal(suggestions.length, MODEL_ALIASES.size);
});
