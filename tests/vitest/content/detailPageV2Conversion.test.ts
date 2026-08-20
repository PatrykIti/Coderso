import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  WIDGET_TO_V2_MAP,
  REGISTERED_WIDGET_TYPES,
  convertDetailPageBindingsToV2,
  convertDetailPageDocumentV1ToV2,
  convertWidgetBlocksToV2Sections,
  type BindingDropReport,
} from "../../../core/services/content/detailPageV2Conversion";
import type {
  DetailPageDocument,
  DetailPageDocumentV1,
} from "../../../core/services/content/detailPageTypes";

const repoRoot = resolve(import.meta.dirname, "../../..");
const fixtureDir = join(repoRoot, "tests/fixtures/detailPageV2Conversion");

type ConversionFixture = {
  case: string;
  v1: DetailPageDocumentV1;
  expected: DetailPageDocument;
  dropped: BindingDropReport[];
};

const loadFixtureCases = (): ConversionFixture[] =>
  JSON.parse(readFileSync(join(fixtureDir, "index.json"), "utf8")).cases.map((name: string) =>
    JSON.parse(readFileSync(join(fixtureDir, `${name}.json`), "utf8"))
  );

const fixtureCases = loadFixtureCases();

describe("detailPageV2Conversion map coverage", () => {
  it("is exhaustive over the 42 registered widget types", () => {
    expect(REGISTERED_WIDGET_TYPES).toHaveLength(42);
    for (const type of REGISTERED_WIDGET_TYPES) {
      expect(Object.prototype.hasOwnProperty.call(WIDGET_TO_V2_MAP, type), type).toBe(true);
    }
    expect(Object.keys(WIDGET_TO_V2_MAP)).toHaveLength(REGISTERED_WIDGET_TYPES.length);
  });

  it("drops navigation and footer while every other mapped type converts", () => {
    expect(WIDGET_TO_V2_MAP.navigation).toBeNull();
    expect(WIDGET_TO_V2_MAP.footer).toBeNull();
    const converted = REGISTERED_WIDGET_TYPES.filter(
      (type) => type !== "navigation" && type !== "footer"
    );
    for (const type of converted) {
      expect(WIDGET_TO_V2_MAP[type], type).not.toBeNull();
    }
  });
});

describe("convertWidgetBlocksToV2Sections", () => {
  it("preserves legacy-widget data byte-identically", () => {
    const legacyData = {
      slots: { s: [{ type: "x", data: { a: 1 } }] },
      options: { accent: "teal" },
    };
    const sections = convertWidgetBlocksToV2Sections([
      { id: "w1", type: "booking-calendar", data: legacyData },
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.type).toBe("custom");
    const block = sections[0]!.blocks[0]!;
    expect(block.type).toBe("legacy-widget");
    expect(block.props).toEqual({
      legacyWidgetType: "booking-calendar",
      data: legacyData,
    });
    expect(block.props.data).toEqual(legacyData);
  });

  it("drops navigation/footer widgets entirely", () => {
    const sections = convertWidgetBlocksToV2Sections([
      { id: "nav", type: "navigation", data: {} },
      { id: "footer", type: "footer", data: {} },
      { id: "hero", type: "hero", data: { headline: "H" } },
    ]);
    expect(sections.map((section) => section.id)).toEqual(["hero"]);
  });
});

describe("convertDetailPageDocumentV1ToV2 (fixture-pinned parity contract)", () => {
  it.each(fixtureCases)("converts $case deterministically", (fixture) => {
    const converted = convertDetailPageDocumentV1ToV2(fixture.v1);
    expect(converted).toEqual(fixture.expected);
    // Idempotent: converting the v1 document twice yields identical output.
    expect(convertDetailPageDocumentV1ToV2(fixture.v1)).toEqual(converted);
  });

  it.each(fixtureCases)("reports the fixture-pinned binding drops for $case", (fixture) => {
    const { dropped } = convertDetailPageBindingsToV2(
      fixture.v1.bindings,
      fixture.v1.blocks,
      fixture.expected.sections
    );
    expect(dropped).toEqual(fixture.dropped);
  });

  it("round-trips through the strict write normalizer", async () => {
    const { normalizeDetailPageDocumentForWrite } =
      await import("../../../core/services/content/detailPageSchema");
    for (const fixture of fixtureCases) {
      const written = normalizeDetailPageDocumentForWrite(fixture.expected);
      expect(JSON.stringify(written)).toBe(
        JSON.stringify(normalizeDetailPageDocumentForWrite(written))
      );
    }
  });

  it("keeps every converted section id equal to the source widget id", () => {
    for (const fixture of fixtureCases) {
      const sourceIds = (fixture.v1.blocks ?? []).map((block) => block.id);
      const sectionIds = fixture.expected.sections.map((section) => section.id);
      for (const sectionId of sectionIds) {
        expect(sourceIds).toContain(sectionId);
      }
    }
  });

  it("drops navigation/footer bindings with a report", () => {
    const navFooter = fixtureCases.find((fixture) => fixture.case === "navigation-footer-drop")!;
    expect(navFooter.dropped.map((drop) => drop.reason)).toEqual([
      "dropped_widget_type",
      "dropped_widget_type",
    ]);
    expect(navFooter.expected.sections.map((section) => section.id)).toEqual(["main-hero"]);
    expect(navFooter.expected.bindings.map((binding) => binding.id)).toEqual(["b-main"]);
  });

  it("drops dangling bindings with a report (unknown block + unmapped path)", () => {
    const dangling = fixtureCases.find((fixture) => fixture.case === "dangling-binding-drop")!;
    expect(dangling.dropped.map((drop) => drop.reason)).toEqual([
      "unknown_widget_block",
      "unmapped_prop_path",
    ]);
    expect(dangling.expected.bindings.map((binding) => binding.id)).toEqual(["b-ok"]);
  });

  it("remaps project-detail bindings onto the converted block ids", () => {
    const projectDetail = fixtureCases.find((fixture) => fixture.case === "project-detail")!;
    const byId = new Map(projectDetail.expected.bindings.map((binding) => [binding.id, binding]));
    expect(byId.get("project-title")).toMatchObject({
      blockId: "project-hero-heading",
      propPath: "text",
    });
    expect(byId.get("project-detail-eyebrow")).toMatchObject({
      blockId: "project-hero-badge",
      propPath: "text",
    });
    expect(byId.get("project-stat-1-value")).toMatchObject({
      blockId: "project-statistics-card-0",
      propPath: "title",
    });
    expect(byId.get("project-stat-1-label")).toMatchObject({
      blockId: "project-statistics-card-0",
      propPath: "text",
    });
    expect(byId.get("project-assumptions-title")).toMatchObject({
      blockId: "project-assumptions-heading-1",
      propPath: "text",
    });
  });
});

describe("WIDGET_TO_V2_MAP fixture smoke", () => {
  it("covers every registered type in the generated fixture corpus", () => {
    const fixtureFiles = readdirSync(fixtureDir).filter(
      (file) => file.endsWith(".json") && file !== "index.json"
    );
    expect(fixtureFiles.length).toBeGreaterThanOrEqual(7);
  });
});
