import Ajv from "ajv";
import { describe, expect, test } from "vitest";

import {
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  getPageBlockActiveSlotKeys,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageBlockTypes,
  pageDocumentV2JsonSchema,
  PageDocumentError,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

// TASK-534-01-L04 — pure model + JSON-schema round-trip coverage for the
// declarative-interactivity foundation (switcher/scrollHint block types, panel
// slots, gallery filter props, magnetic/noiseOverlay style keys). No DB, no DOM
// kernel (behavioral IIFE exec is 534-05-L01). Each round-trip doubles as the
// fail-closed read trap: a forgotten allowlist entry silently degrades a stored
// doc to empty on read, so a missing-key regression fails HERE.

const SECTION_ID = "sec_534";

const buildDocWithBlock = (block: unknown): Record<string, unknown> => {
  const section = createPageSectionV2("content", { id: SECTION_ID, blocks: [] });
  return {
    ...createDefaultPageDocumentV2(),
    sections: [{ ...section, blocks: [block] }],
  };
};

const write = (doc: unknown): PageDocumentV2 => normalizePageDocumentV2ForWrite(doc);

const firstBlock = (doc: PageDocumentV2): PageBlockV2 => {
  const block = doc.sections[0]?.blocks[0];
  if (!block) throw new Error("expected one block");
  return block;
};

// Ajv compilation of the recursive page-document schema takes several seconds, and
// the two schema tests here share one validator so neither pays it twice. It is
// compiled at module scope rather than lazily on first use: whichever test ran
// first used to absorb the whole compile inside its own deadline, which is how
// this file put a 12595ms test into the slowest three of the entire lane. At
// module scope the cost falls in the file's collection phase, which no per-test
// deadline races, and the explicit per-test timeouts that existed only to pay for
// it are gone. The trade is that the compile now also runs when a non-schema test
// is selected on its own; that is a few seconds in a developer's filtered run,
// against a full-lane failure it kept causing.
const schemaValidator = new Ajv({ allErrors: true, strict: false }).compile(
  pageDocumentV2JsonSchema
);

describe("TASK-534 interactivity model", () => {
  test("switcher round-trips (tabs/activeIndex/variant) with panel slots", () => {
    const doc = buildDocWithBlock({
      id: "blk_sw",
      type: "switcher",
      props: {
        tabs: [{ label: "Barn" }, { label: "Villa" }, { label: "Eco" }],
        activeIndex: 1,
        variant: "underline",
      },
      visibility: { visible: true },
      slots: {
        "panel:1": [createPageBlockV2("text", { id: "p1", props: { text: "A" } })],
        "panel:2": [createPageBlockV2("text", { id: "p2", props: { text: "B" } })],
      },
    });
    const written = write(doc);
    const block = firstBlock(written);
    expect(block.type).toBe("switcher");
    expect(block.props.tabs).toEqual([{ label: "Barn" }, { label: "Villa" }, { label: "Eco" }]);
    expect(block.props.activeIndex).toBe(1);
    expect(block.props.variant).toBe("underline");
    expect(block.slots?.["panel:1"]?.[0]?.props.text).toBe("A");
    expect(block.slots?.["panel:2"]?.[0]?.props.text).toBe("B");
    // Read path preserves it (fail-closed read trap).
    const read = normalizeStoredPageDocumentV2ForRead(written);
    expect(firstBlock(read).props.variant).toBe("underline");
  });

  test("switcher is a SLOT HOST: getPageBlockActiveSlotKeys returns the six panel slots (not [])", () => {
    const block = createPageBlockV2("switcher");
    expect(getPageBlockActiveSlotKeys(block)).toEqual([
      "panel:1",
      "panel:2",
      "panel:3",
      "panel:4",
      "panel:5",
      "panel:6",
    ]);
    expect(pageBlockCapabilities.switcher.slots).toEqual([
      "panel:1",
      "panel:2",
      "panel:3",
      "panel:4",
      "panel:5",
      "panel:6",
    ]);
  });

  test("scrollHint round-trips (label/glyph)", () => {
    const written = write(
      buildDocWithBlock({
        id: "blk_sh",
        type: "scrollHint",
        props: { label: "Scroll down", glyph: "chevron" },
        visibility: { visible: true },
      })
    );
    const block = firstBlock(written);
    expect(block.type).toBe("scrollHint");
    expect(block.props.label).toBe("Scroll down");
    expect(block.props.glyph).toBe("chevron");
  });

  test("gallery filterable + filterCategories + item.category round-trip", () => {
    const written = write(
      buildDocWithBlock({
        id: "blk_g",
        type: "gallery",
        props: {
          layout: "grid",
          filterable: true,
          filterCategories: ["modern", "eco"],
          items: [
            { src: "https://example.com/a.jpg", alt: "a", category: "modern" },
            { src: "https://example.com/b.jpg", alt: "b", category: "modern eco" },
          ],
        },
        visibility: { visible: true },
      })
    );
    const block = firstBlock(written);
    expect(block.props.filterable).toBe(true);
    expect(block.props.filterCategories).toEqual(["modern", "eco"]);
    const items = block.props.items as Array<Record<string, unknown>>;
    expect(items[0]?.category).toBe("modern");
    expect(items[1]?.category).toBe("modern eco"); // multi-category space-joined set.
  });

  test("gallery WITHOUT filterable is byte-identical (no filterable/filterCategories keys)", () => {
    const written = write(
      buildDocWithBlock({
        id: "blk_g2",
        type: "gallery",
        props: {
          layout: "grid",
          items: [{ src: "https://example.com/a.jpg", alt: "a" }],
        },
        visibility: { visible: true },
      })
    );
    const props = firstBlock(written).props;
    expect("filterable" in props).toBe(false);
    expect("filterCategories" in props).toBe(false);
    const items = props.items as Array<Record<string, unknown>>;
    expect("category" in items[0]!).toBe(false); // no category ⇒ legacy byte-identity.
  });

  test("filterable:false is omitted (present-only)", () => {
    const written = write(
      buildDocWithBlock({
        id: "blk_g3",
        type: "gallery",
        props: { layout: "grid", filterable: false, items: [] },
        visibility: { visible: true },
      })
    );
    expect("filterable" in firstBlock(written).props).toBe(false);
  });

  test("block.style.magnetic:true present; false omitted (byte-identity)", () => {
    const on = write(
      buildDocWithBlock({
        id: "blk_b1",
        type: "button",
        props: { label: "Go", href: "/" },
        style: { magnetic: true },
        visibility: { visible: true },
      })
    );
    expect(firstBlock(on).style?.magnetic).toBe(true);

    const off = write(
      buildDocWithBlock({
        id: "blk_b2",
        type: "button",
        props: { label: "Go", href: "/" },
        style: { magnetic: false },
        visibility: { visible: true },
      })
    );
    // magnetic:false ⇒ style has no magnetic key (present-only); with no other
    // style field the whole style object is omitted.
    expect(firstBlock(off).style?.magnetic).toBeUndefined();
  });

  test("section.style.noiseOverlay + settings.effects.noiseOverlay round-trip", () => {
    const base = createDefaultPageDocumentV2();
    const section = createPageSectionV2("content", { id: SECTION_ID, blocks: [] });
    const doc = {
      ...base,
      settings: { ...base.settings, effects: { noiseOverlay: true } },
      sections: [{ ...section, style: { ...section.style, noiseOverlay: true } }],
    };
    const written = write(doc);
    expect(written.sections[0]?.style.noiseOverlay).toBe(true);
    expect(written.settings.effects?.noiseOverlay).toBe(true);
  });

  test("bad enum VALUE throws in write mode (variant / glyph)", () => {
    expect(() =>
      write(
        buildDocWithBlock({
          id: "x",
          type: "switcher",
          props: { tabs: [{ label: "A" }], variant: "drop-table" },
          visibility: { visible: true },
        })
      )
    ).toThrow(PageDocumentError);
    expect(() =>
      write(
        buildDocWithBlock({
          id: "x",
          type: "scrollHint",
          props: { glyph: "explode" },
          visibility: { visible: true },
        })
      )
    ).toThrow(PageDocumentError);
  });

  test("bad filter category 'a\";b{}' is DROPPED (fail-soft, no attribute breakout)", () => {
    const written = write(
      buildDocWithBlock({
        id: "blk_g4",
        type: "gallery",
        props: {
          layout: "grid",
          filterable: true,
          filterCategories: ['a";b{}', "ok"],
          items: [{ src: "https://example.com/a.jpg", alt: "a", category: 'a";b{}' }],
        },
        visibility: { visible: true },
      })
    );
    const props = firstBlock(written).props;
    expect(props.filterCategories).toEqual(["ok"]); // bad token dropped.
    const items = props.items as Array<Record<string, unknown>>;
    expect("category" in items[0]!).toBe(false); // bad item category dropped entirely.
  });

  test("activeIndex clamps to a valid range (fail-soft)", () => {
    const written = write(
      buildDocWithBlock({
        id: "blk_sw2",
        type: "switcher",
        props: { tabs: [{ label: "A" }], activeIndex: 99 },
        visibility: { visible: true },
      })
    );
    expect(firstBlock(written).props.activeIndex).toBe(5); // SWITCHER_MAX_PANELS - 1.
  });

  test("switcher tab count clamps to SWITCHER_MAX_PANELS and drops non-label keys", () => {
    const written = write(
      buildDocWithBlock({
        id: "blk_sw3",
        type: "switcher",
        props: {
          // 7 tabs (over the 6 cap) + an href the listItems editor could commit.
          tabs: Array.from({ length: 7 }, (_, i) => ({ label: `T${i}`, href: "/x" })),
        },
        visibility: { visible: true },
      })
    );
    const tabs = firstBlock(written).props.tabs as Array<Record<string, unknown>>;
    expect(tabs).toHaveLength(6);
    expect(tabs.every((t) => Object.keys(t).length === 1 && "label" in t)).toBe(true);
  });

  test("unknown prop switcher.evil / unknown style.wobble / effects.glow throw", () => {
    expect(() =>
      write(
        buildDocWithBlock({
          id: "x",
          type: "switcher",
          props: { tabs: [{ label: "A" }], evil: true },
          visibility: { visible: true },
        })
      )
    ).toThrow(PageDocumentError);
    expect(() =>
      write(
        buildDocWithBlock({
          id: "x",
          type: "button",
          props: { label: "Go", href: "/" },
          style: { wobble: true },
          visibility: { visible: true },
        })
      )
    ).toThrow(PageDocumentError);
    const base = createDefaultPageDocumentV2();
    expect(() =>
      write({ ...base, settings: { ...base.settings, effects: { glow: true } } })
    ).toThrow(PageDocumentError);
  });

  test("legacy doc (no 534 field) is byte-identical through write+read", () => {
    const legacy = write(
      buildDocWithBlock({
        id: "blk_leg",
        type: "gallery",
        props: { layout: "grid", items: [{ src: "https://example.com/a.jpg", alt: "a" }] },
        visibility: { visible: true },
      })
    );
    const read = normalizeStoredPageDocumentV2ForRead(legacy);
    expect(JSON.stringify(read)).toBe(JSON.stringify(legacy));
  });

  test("adding switcher/scrollHint keeps pageBlockCapabilities exhaustive", () => {
    for (const type of pageBlockTypes) {
      expect(pageBlockCapabilities[type]).toBeDefined();
    }
    expect(pageBlockCapabilities.switcher.runtimeRenderer).toBe("real");
    expect(pageBlockCapabilities.switcher.editorInsertable).toBe(true);
    expect(pageBlockCapabilities.scrollHint.runtimeRenderer).toBe("real");
    expect(pageBlockCapabilities.scrollHint.editorInsertable).toBe(true);
  });

  test("switcher tabs from a {label,href} editor row normalize to {label} and PASS the strict schema", () => {
    // 534-04-L01 reuses the listItems editor for switcher tabs, which can commit
    // {label,href} rows. The 534-01-L01 normalizer must rebuild each tab as {label}
    // BEFORE schema validation so additionalProperties:false + required:["label"]
    // never reject an editor row. This pins that load-bearing guarantee.
    const written = write(
      buildDocWithBlock({
        id: "blk_sw_href",
        type: "switcher",
        props: { tabs: [{ label: "A", href: "/x" }] },
        visibility: { visible: true },
      })
    );
    expect(firstBlock(written).props.tabs).toEqual([{ label: "A" }]);
    const validate = schemaValidator;
    expect(validate(written)).toBe(true);
  });

  test("JSON schema accepts the good shapes and rejects an unknown prop", () => {
    const validate = schemaValidator;

    const good = write(
      buildDocWithBlock({
        id: "blk_ok",
        type: "switcher",
        props: {
          tabs: [{ label: "A" }, { label: "B" }],
          activeIndex: 0,
          variant: "pill",
        },
        visibility: { visible: true },
        slots: { "panel:1": [createPageBlockV2("text", { id: "t", props: { text: "x" } })] },
      })
    );
    expect(validate(good)).toBe(true);

    // A raw doc with an unknown switcher prop must fail additionalProperties:false.
    const bad = buildDocWithBlock({
      id: "blk_bad",
      type: "switcher",
      props: { tabs: [{ label: "A" }], evil: true },
      visibility: { visible: true },
    });
    expect(validate(bad)).toBe(false);
  });
});
