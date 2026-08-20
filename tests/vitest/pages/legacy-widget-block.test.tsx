import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import Ajv from "ajv";

import {
  createPageBlockV2,
  isPageDocumentError,
  legacyWidgetBlockPropKeys,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageBlockDefaultProps,
  pageBlockPropKeys,
  pageBlockTypes,
  pageDocumentV2JsonSchema,
  type LegacyWidgetBlockProps,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PageDocumentRender,
  renderPageBlockContent,
} from "../../../core/services/pages/pageRendererV2";
import { buildDocument, safeNormalizeError } from "./page-document-v2-test-helpers";

// TASK-580-03-L01 — migration-only `legacy-widget` block contract tests:
// normalizer (write strict / stored-read fail-closed / round-trip / data
// byte-identity + deep-freeze + prototype-pollution rejection), capabilities
// (non-insertable, non-emittable, real runtime renderer), JSON schema,
// renderer placeholder output (visible note with the type label, data NEVER
// rendered, no dangerouslySet*), and the placeholder-free byte-identity pin.

const docWithBlocks = (blocks: PageBlockV2[]): PageDocumentV2 => {
  const document = buildDocument();
  document.sections[0]!.blocks = blocks;
  return document;
};

const legacyBlock = (props: Record<string, unknown>, id = "blk_lw"): PageBlockV2 => ({
  id,
  type: "legacy-widget",
  props,
  visibility: { visible: true },
});

describe("legacy-widget block contract (TASK-580-03-L01)", () => {
  test("contract: known block type with the enumerated prop keys and fail-closed defaults", () => {
    expect(pageBlockTypes).toContain("legacy-widget");
    expect(pageBlockPropKeys["legacy-widget"]).toEqual(["legacyWidgetType", "data"]);
    expect([...legacyWidgetBlockPropKeys]).toEqual(pageBlockPropKeys["legacy-widget"]);
    expect(pageBlockDefaultProps["legacy-widget"]).toEqual({
      legacyWidgetType: "unknown",
      data: {},
    });
    // The facade re-exports the props type (compile-time contract).
    const props: LegacyWidgetBlockProps = { legacyWidgetType: "booking-calendar", data: { a: 1 } };
    expect(props.legacyWidgetType).toBe("booking-calendar");
  });

  test("capabilities: migration-only (never insertable/emittable) but with a real runtime renderer", () => {
    expect(pageBlockCapabilities["legacy-widget"]).toMatchObject({
      editorInsertable: false,
      insertable: false,
      assistantEmittable: false,
      runtimeRenderer: "real",
      slots: [],
      publicDataBinding: "none",
    });
  });

  test("write: round-trips with both keys present and deep-frozen byte-identical data", () => {
    const doc = docWithBlocks([
      legacyBlock({
        legacyWidgetType: "booking-calendar",
        data: { slots: { a: 1 }, nested: { x: "y" }, list: [1, 2, 3] },
      }),
    ]);
    const normalized = normalizePageDocumentV2ForWrite(doc);
    const props = normalized.sections[0]!.blocks[0]!.props;
    expect(props.legacyWidgetType).toBe("booking-calendar");
    expect(props.data).toEqual({ slots: { a: 1 }, nested: { x: "y" }, list: [1, 2, 3] });
    // Deep-frozen copy: mutating the stored shape must be impossible.
    const data = props.data as Record<string, unknown>;
    expect(Object.isFrozen(data)).toBe(true);
    expect(Object.isFrozen(data.slots)).toBe(true);
    expect(Object.isFrozen(data.nested)).toBe(true);
    expect(Object.isFrozen(data.list)).toBe(true);
    // Re-write is byte-identical (idempotent round-trip).
    expect(JSON.stringify(normalizePageDocumentV2ForWrite(normalized))).toBe(
      JSON.stringify(normalized)
    );
  });

  test("write: rejects unknown top-level props (strict reject-unknown)", () => {
    const doc = docWithBlocks([
      legacyBlock({ legacyWidgetType: "booking-calendar", data: {}, extra: 1 }),
    ]);
    const error = safeNormalizeError(doc);
    expect(isPageDocumentError(error)).toBe(true);
    expect(String((error as Error).message)).toMatch(/unknown/i);
  });

  test("write: legacyWidgetType is required and bounded 1..64 non-empty", () => {
    const cases: Record<string, unknown>[] = [
      { data: {} }, // missing entirely
      { legacyWidgetType: "   ", data: {} }, // whitespace-only
      { legacyWidgetType: "x".repeat(65), data: {} }, // over the bound
    ];
    for (const props of cases) {
      const doc = docWithBlocks([legacyBlock(props)]);
      const error = safeNormalizeError(doc);
      expect(error).not.toBeNull();
      expect(String((error as Error).message)).toMatch(/legacyWidgetType/i);
    }
  });

  test("write: prototype-pollution keys are rejected from the data copy", () => {
    const data = JSON.parse(
      '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"x": 1}}, "prototype": {"y": 2}, "safe": {"ok": true}}'
    ) as Record<string, unknown>;
    const doc = docWithBlocks([legacyBlock({ legacyWidgetType: "booking-calendar", data })]);
    const stored = normalizePageDocumentV2ForWrite(doc).sections[0]!.blocks[0]!.props
      .data as Record<string, unknown>;
    expect(Object.keys(stored)).toEqual(["safe"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined(); // no prototype mutation
  });

  test("stored-read: the type is KNOWN (never coerced to text) and malformed props fail closed", () => {
    const doc = docWithBlocks([legacyBlock({ legacyWidgetType: "   ", data: "not-an-object" })]);
    expect(() => normalizeStoredPageDocumentV2ForRead(doc)).not.toThrow();
    const block = normalizeStoredPageDocumentV2ForRead(doc).sections[0]!.blocks[0]!;
    expect(block.type).toBe("legacy-widget");
    expect(block.props).toEqual({ legacyWidgetType: "unknown", data: {} });
  });

  test("stored-read: props-less legacy-widget fails closed to unknown/{}", () => {
    const doc = docWithBlocks([
      {
        id: "blk_lw",
        type: "legacy-widget",
        visibility: { visible: true },
      } as unknown as PageBlockV2,
    ]);
    expect(() => normalizeStoredPageDocumentV2ForRead(doc)).not.toThrow();
    const block = normalizeStoredPageDocumentV2ForRead(doc).sections[0]!.blocks[0]!;
    expect(block.type).toBe("legacy-widget");
    expect(block.props).toEqual({ legacyWidgetType: "unknown", data: {} });
  });

  test("json schema: validates a normalized legacy-widget document; rejects unknown props and over-length types", () => {
    const validate = new Ajv().compile(pageDocumentV2JsonSchema);
    const doc = normalizePageDocumentV2ForWrite(
      docWithBlocks([
        legacyBlock({
          legacyWidgetType: "booking-calendar",
          data: { slots: { a: 1 }, nested: { x: "y" } },
        }),
      ])
    );
    expect(validate(doc)).toBe(true);
    // Unknown top-level prop is rejected by the strict props schema.
    expect(
      validate(
        docWithBlocks([legacyBlock({ legacyWidgetType: "booking-calendar", data: {}, extra: 1 })])
      )
    ).toBe(false);
    // Over-length type label is rejected by the bounded schema.
    expect(
      validate(docWithBlocks([legacyBlock({ legacyWidgetType: "x".repeat(65), data: {} })]))
    ).toBe(false);
  });

  test("render: visible read-only note with the type label, data NEVER in the output", () => {
    const block = createPageBlockV2("legacy-widget", {
      id: "blk_lw",
      props: {
        legacyWidgetType: "booking-calendar",
        data: {
          nested: { secret: "must-not-leak" },
          xss: "<img src=x onerror=alert(1)>",
          html: "<script>alert(2)</script>",
        },
      },
    });
    const html = renderToStaticMarkup(<>{renderPageBlockContent(block)}</>);
    expect(html).toContain('role="note"');
    expect(html).toContain('data-legacy-widget="booking-calendar"');
    expect(html).toContain("Legacy widget: booking-calendar");
    expect(html).toContain("border-dashed"); // visible dashed-border box
    expect(html).toContain("Read-only placeholder"); // sr-only hint
    expect(html).not.toContain("must-not-leak");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<script>");
  });

  test("render: full document path renders the placeholder without leaking data", () => {
    const block = createPageBlockV2("legacy-widget", {
      id: "blk_lw",
      props: {
        legacyWidgetType: "product-compare",
        data: { items: [{ a: 1 }], label: "PRIVATE-LABEL" },
      },
    });
    const html = renderToStaticMarkup(<PageDocumentRender document={docWithBlocks([block])} />);
    expect(html).toContain('data-legacy-widget="product-compare"');
    expect(html).toContain("Legacy widget: product-compare");
    expect(html).not.toContain("PRIVATE-LABEL");
  });

  test("render: type label is sliced to 64 chars and non-strings default to unknown", () => {
    const longType = "y".repeat(80);
    const rawLong: PageBlockV2 = legacyBlock({ legacyWidgetType: longType, data: {} });
    const htmlLong = renderToStaticMarkup(<>{renderPageBlockContent(rawLong)}</>);
    expect(htmlLong).toContain(`data-legacy-widget="${"y".repeat(64)}"`);
    expect(htmlLong).not.toContain(`data-legacy-widget="${"y".repeat(65)}"`);
    const rawUnknown: PageBlockV2 = legacyBlock({ legacyWidgetType: 42, data: {} });
    const htmlUnknown = renderToStaticMarkup(<>{renderPageBlockContent(rawUnknown)}</>);
    expect(htmlUnknown).toContain('data-legacy-widget="unknown"');
    expect(htmlUnknown).toContain("Legacy widget: unknown");
  });

  test("byte-identity: a placeholder-free V2 page renders byte-identically to the pinned pre-migration snapshot", () => {
    const doc = buildDocument();
    const first = renderToStaticMarkup(<PageDocumentRender document={doc} />);
    const second = renderToStaticMarkup(<PageDocumentRender document={doc} />);
    expect(first).toBe(PRE_MIGRATION_SNAPSHOT);
    expect(second).toBe(PRE_MIGRATION_SNAPSHOT);
    // Sanity: the pinned page really is placeholder-free.
    expect(PRE_MIGRATION_SNAPSHOT).not.toContain("legacy-widget");
  });
});

/**
 * Pinned pre-migration snapshot: the FULL static markup of `buildDocument()`
 * (hero section + heading + button blocks, NO legacy-widget block), frozen
 * from the pre-TASK-580-03-L01 render path. Guards that the new import +
 * switch case emit zero bytes for placeholder-free pages.
 */
const PRE_MIGRATION_SNAPSHOT = `<main class="min-h-screen bg-white text-slate-950" data-page-v2="true"><section id="hero" class="w-full px-4 py-6" data-page-section="hero" data-section-id="sec_hero" data-page-variant="split" data-page-section-template="hero"><div class="grid w-full grid-cols-1 md:grid-cols-2 items-center justify-between page-section-template-hero-split text-left" style="--coderso-section-accent:#0d9488;background-color:#ffffff;border-radius:12px;box-shadow:0 6px 20px rgba(15, 23, 42, 0.08);padding:72px 40px 72px 40px;max-width:1080px;margin:0 auto;gap:32px" data-page-section-content="true" data-page-section-layout-mode="runtime"><div class="max-w-full" data-page-block="heading" data-block-id="blk_heading"><h1 class="font-semibold leading-tight text-[var(--coderso-block-text,#020617)] text-5xl text-left" data-page-block-text="true">Build with Coderso</h1></div><div class="max-w-full" data-page-block="button" data-block-id="blk_cta"><a class="inline-flex w-fit items-center justify-center rounded font-semibold px-5 py-3 text-sm shadow-sm transition hover:opacity-90" style="background-color:var(--coderso-section-accent,#0d9488);color:var(--coderso-block-text,#ffffff)" data-page-block-element="true" href="/projects">See projects</a></div></div></section></main>`;
