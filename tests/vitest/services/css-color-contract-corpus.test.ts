import { describe, expect, test } from "vitest";

import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
  cssColorProfiles,
  normalizeCssColorValue,
  parseCssColorValue,
} from "../../../core/services/theme/cssColorContract";
import {
  CSS_COLOR_CORPUS_CASES,
  CSS_COLOR_CORPUS_PROFILES,
  CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS,
  type CssColorCorpusCase,
  type CssColorCorpusExpectation,
  type CssColorCorpusProfile,
} from "./cssColorCorpus";

const structuralPatterns: Readonly<Record<CssColorCorpusProfile, RegExp>> = Object.freeze({
  authoring: new RegExp(CSS_COLOR_SCHEMA_PATTERNS.authoring),
  "inherited-render": new RegExp(CSS_COLOR_SCHEMA_PATTERNS["inherited-render"]),
});

const expectedStructuralFalsePositiveIds = Object.freeze([
  "rgb-number-over-maximum",
  "rgb-number-precision-over-maximum",
  "rgb-percent-over-maximum",
  "rgb-percent-precision-over-maximum",
  "rgba-alpha-number-over-maximum",
  "rgba-alpha-number-precision-over-maximum",
  "rgba-alpha-percent-over-maximum",
  "rgba-alpha-percent-precision-over-maximum",
  "hsl-hue-over-maximum",
  "hsl-hue-precision-over-maximum",
  "hsl-saturation-over-maximum",
  "hsl-lightness-over-maximum",
  "hsla-alpha-over-maximum",
  "raw-padding-over-cap",
  "canonical-output-over-cap",
] as const);

const getCorpusCase = (id: string): CssColorCorpusCase => {
  const corpusCase = CSS_COLOR_CORPUS_CASES.find((candidate) => candidate.id === id);
  if (!corpusCase) throw new Error(`Missing CSS color corpus case: ${id}`);
  return corpusCase;
};

const isLiteralExpectation = (
  expectation: CssColorCorpusExpectation
): expectation is Extract<CssColorCorpusExpectation, { kind: "hex" | "rgb" | "hsl" }> =>
  expectation.kind === "hex" || expectation.kind === "rgb" || expectation.kind === "hsl";

describe("CSS color contract corpus", () => {
  test("pins the exact owner profiles and explicit structural false-positive set", () => {
    expect(cssColorProfiles).toEqual(CSS_COLOR_CORPUS_PROFILES);
    expect(CSS_COLOR_CORPUS_PROFILES).toEqual(["authoring", "inherited-render"]);
    expect(Object.keys(CSS_COLOR_SCHEMA_PATTERNS)).toEqual(CSS_COLOR_CORPUS_PROFILES);
    expect(CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS).toEqual(expectedStructuralFalsePositiveIds);
  });

  test("keeps every fixture layer frozen, uniquely identified, and shape-exact", () => {
    expect(Object.isFrozen(CSS_COLOR_CORPUS_PROFILES)).toBe(true);
    expect(Object.isFrozen(CSS_COLOR_CORPUS_CASES)).toBe(true);
    expect(Object.isFrozen(CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS)).toBe(true);

    const ids = CSS_COLOR_CORPUS_CASES.map((corpusCase) => corpusCase.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS).size).toBe(
      CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS.length
    );
    for (const id of CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS) {
      expect(ids, id).toContain(id);
    }

    for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
      expect(Object.isFrozen(corpusCase), corpusCase.id).toBe(true);
      expect(Object.keys(corpusCase), corpusCase.id).toEqual([
        "id",
        "input",
        "parser",
        "structural",
      ]);
      expect(Object.isFrozen(corpusCase.parser), `${corpusCase.id}:parser`).toBe(true);
      expect(Object.isFrozen(corpusCase.structural), `${corpusCase.id}:structural`).toBe(true);
      expect(Object.keys(corpusCase.parser), `${corpusCase.id}:parser`).toEqual(
        CSS_COLOR_CORPUS_PROFILES
      );
      expect(Object.keys(corpusCase.structural), `${corpusCase.id}:structural`).toEqual(
        CSS_COLOR_CORPUS_PROFILES
      );

      if (typeof corpusCase.input === "object" && corpusCase.input !== null) {
        expect(Object.isFrozen(corpusCase.input), `${corpusCase.id}:input`).toBe(true);
      }

      for (const profile of CSS_COLOR_CORPUS_PROFILES) {
        expect(typeof corpusCase.structural[profile], `${corpusCase.id}:${profile}`).toBe(
          "boolean"
        );
        const expectation = corpusCase.parser[profile];
        if (!expectation) continue;

        expect(Object.isFrozen(expectation), `${corpusCase.id}:${profile}:expectation`).toBe(true);
        expect(
          expectation.normalized.length,
          `${corpusCase.id}:${profile}:normalized-nonempty`
        ).toBeGreaterThan(0);
        expect(
          expectation.normalized.length,
          `${corpusCase.id}:${profile}:normalized-cap`
        ).toBeLessThanOrEqual(CSS_COLOR_VALUE_MAX_LENGTH);

        if (!isLiteralExpectation(expectation)) {
          expect(Object.keys(expectation), `${corpusCase.id}:${profile}:keys`).toEqual([
            "kind",
            "normalized",
          ]);
          continue;
        }

        expect(Object.keys(expectation), `${corpusCase.id}:${profile}:keys`).toEqual([
          "kind",
          "normalized",
          "baseHex",
          "alpha",
          "rgb",
        ]);
        expect(expectation.baseHex, `${corpusCase.id}:${profile}:baseHex`).toMatch(
          /^#[0-9a-f]{6}$/
        );
        expect(Number.isFinite(expectation.alpha), `${corpusCase.id}:${profile}:alpha`).toBe(true);
        expect(expectation.alpha, `${corpusCase.id}:${profile}:alpha-min`).toBeGreaterThanOrEqual(
          0
        );
        expect(expectation.alpha, `${corpusCase.id}:${profile}:alpha-max`).toBeLessThanOrEqual(1);
        expect(Object.isFrozen(expectation.rgb), `${corpusCase.id}:${profile}:rgb`).toBe(true);
        expect(Object.keys(expectation.rgb), `${corpusCase.id}:${profile}:rgb-keys`).toEqual([
          "red",
          "green",
          "blue",
        ]);
        for (const channel of Object.values(expectation.rgb)) {
          expect(Number.isInteger(channel), `${corpusCase.id}:${profile}:rgb-integer`).toBe(true);
          expect(channel, `${corpusCase.id}:${profile}:rgb-min`).toBeGreaterThanOrEqual(0);
          expect(channel, `${corpusCase.id}:${profile}:rgb-max`).toBeLessThanOrEqual(0xff);
        }
      }
    }
  });

  test("deep-compares every parser result and every anchored structural decision", () => {
    const actualStructuralFalsePositiveIds: string[] = [];

    for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
      let isStructuralFalsePositive = false;

      for (const profile of CSS_COLOR_CORPUS_PROFILES) {
        const expected = corpusCase.parser[profile];
        const parsed = parseCssColorValue(corpusCase.input, profile);
        const structural =
          typeof corpusCase.input === "string" &&
          structuralPatterns[profile].test(corpusCase.input);

        expect(parsed, `${corpusCase.id}:${profile}:parser`).toEqual(expected);
        expect(structural, `${corpusCase.id}:${profile}:structural`).toBe(
          corpusCase.structural[profile]
        );
        if (parsed !== undefined) {
          expect(structural, `${corpusCase.id}:${profile}:accepted-structure`).toBe(true);
        }
        if (structural && parsed === undefined) isStructuralFalsePositive = true;
      }

      if (isStructuralFalsePositive) actualStructuralFalsePositiveIds.push(corpusCase.id);
    }

    expect(actualStructuralFalsePositiveIds).toEqual(CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS);
  });

  test("normalizes every accepted fixture to stable complete parser output", () => {
    for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
      for (const profile of CSS_COLOR_CORPUS_PROFILES) {
        const expected = corpusCase.parser[profile];
        if (!expected) {
          expect(
            normalizeCssColorValue(corpusCase.input, profile),
            `${corpusCase.id}:${profile}:rejected-normalization`
          ).toBeUndefined();
          continue;
        }

        expect(
          normalizeCssColorValue(corpusCase.input, profile),
          `${corpusCase.id}:${profile}:normalization`
        ).toBe(expected.normalized);
        expect(
          parseCssColorValue(expected.normalized, profile),
          `${corpusCase.id}:${profile}:normalized-parser`
        ).toEqual(expected);
        expect(
          normalizeCssColorValue(expected.normalized, profile),
          `${corpusCase.id}:${profile}:idempotence`
        ).toBe(expected.normalized);
        expect(
          structuralPatterns[profile].test(expected.normalized),
          `${corpusCase.id}:${profile}:normalized-structure`
        ).toBe(true);
      }
    }
  });

  test("keeps padded raw length and canonical expansion boundaries independent", () => {
    const atCap = getCorpusCase("raw-padding-at-cap");
    const overCap = getCorpusCase("raw-padding-over-cap");
    const canonicalOverflow = getCorpusCase("canonical-output-over-cap");
    if (
      typeof atCap.input !== "string" ||
      typeof overCap.input !== "string" ||
      typeof canonicalOverflow.input !== "string"
    ) {
      throw new Error("CSS color boundary fixtures must be strings");
    }

    expect(atCap.input).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(atCap.input.trim()).toBe("transparent");
    expect(overCap.input).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);
    expect(overCap.input.trim()).toBe("transparent");

    const compactPrefix = "rgb(0,0,0,.";
    expect(canonicalOverflow.input).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(canonicalOverflow.input.startsWith(compactPrefix)).toBe(true);
    expect(canonicalOverflow.input.endsWith(")")).toBe(true);
    const alphaDigits = canonicalOverflow.input.slice(compactPrefix.length, -1);
    expect(alphaDigits).toMatch(/^1+$/);
    const expandedCanonical = `rgba(0, 0, 0, 0.${alphaDigits})`;
    expect(expandedCanonical.length).toBeGreaterThan(CSS_COLOR_VALUE_MAX_LENGTH);
  });
});
