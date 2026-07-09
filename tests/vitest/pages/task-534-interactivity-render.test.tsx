import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PageDocumentRender,
  renderPageBlockContent,
} from "../../../core/services/pages/pageRendererV2";
import { PAGE_EFFECTS_RUNTIME_ID } from "../../../core/services/pages/pageEffectsRuntime";

// TASK-534-02-L04 — renderToString render coverage for the declarative
// interactivity render surfaces (switcher tablist/panels, gallery filter bar +
// data-category, scrollHint glyph, page/section noise overlays, and the widened
// anyMotion <script> emit gate). Behavioral IIFE exec (click/scroll/pointer) is
// 534-05-L01.

const renderBlock = (block: PageBlockV2): string =>
  renderToStaticMarkup(<>{renderPageBlockContent(block)}</>);

const docWithBlocks = (blocks: PageBlockV2[]): PageDocumentV2 => {
  const base = createDefaultPageDocumentV2();
  return {
    ...base,
    sections: [createPageSectionV2("content", { id: "sec_r", blocks })],
  };
};

const renderDoc = (doc: PageDocumentV2): string =>
  renderToStaticMarkup(<PageDocumentRender document={doc} />);

describe("TASK-534 switcher render", () => {
  test("renders role=tablist + N tabs (first selected/tabindex0) + N panels (first visible, rest hidden) + data-switcher", () => {
    const block = createPageBlockV2("switcher", {
      id: "sw",
      props: {
        tabs: [{ label: "Barn" }, { label: "Villa" }, { label: "Eco" }],
        activeIndex: 0,
        variant: "pill",
      },
      slots: {
        "panel:1": [createPageBlockV2("text", { id: "p1", props: { text: "Barn copy" } })],
        "panel:2": [createPageBlockV2("text", { id: "p2", props: { text: "Villa copy" } })],
        "panel:3": [createPageBlockV2("text", { id: "p3", props: { text: "Eco copy" } })],
      },
    });
    const html = renderBlock(block);
    expect(html).toContain('data-switcher="true"');
    expect(html).toContain('role="tablist"');
    // 534 a11y remediation: the tablist carries an accessible name (WCAG 1.3.1 / APG),
    // mirroring the filter toolbar's aria-label="Filter gallery".
    expect(html).toContain('aria-label="Content tabs"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
    // 534 a11y remediation (APG Tabs): every panel is keyboard-reachable via tabindex=0
    // so text/image-only panels can receive focus after tab selection.
    expect(html.match(/role="tabpanel"[^>]*tabindex="0"/g)).toHaveLength(3);
    // First tab selected + tabindex 0; the rest -1.
    expect(html).toContain('aria-selected="true"');
    expect(html.match(/aria-selected="false"/g)).toHaveLength(2);
    expect(html).toContain('tabindex="0"');
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
    // First panel visible, the other two hidden (progressive enhancement).
    expect(html.match(/hidden=""/g) ?? []).toHaveLength(2);
    expect(html).toContain("Barn");
    expect(html).toContain("Barn copy");
  });

  test("malicious tab label renders as escaped text (no markup executes)", () => {
    const block = createPageBlockV2("switcher", {
      id: "sw2",
      props: { tabs: [{ label: '<img src=x onerror="alert(1)">' }], variant: "pill" },
    });
    const html = renderBlock(block);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  test("switcher renderer tolerates 0 tabs (defence in depth): inert empty host", () => {
    // The model normalizer fail-softs an empty `tabs` to one default tab, so this
    // exercises the RENDERER directly with a raw 0-tab block (never trust stored).
    const raw: PageBlockV2 = {
      id: "sw3",
      type: "switcher",
      props: { tabs: [], variant: "pill" },
      visibility: { visible: true },
    };
    const html = renderBlock(raw);
    expect(html).toContain('data-switcher="true"');
    expect(html).not.toContain('role="tab"');
  });
});

describe("TASK-534 gallery filter render", () => {
  const filterableGallery = () =>
    createPageBlockV2("gallery", {
      id: "g",
      props: {
        layout: "grid",
        filterable: true,
        filterCategories: ["modern", "eco"],
        items: [
          { src: "https://example.com/a.jpg", alt: "a", category: "modern" },
          { src: "https://example.com/b.jpg", alt: "b", category: "eco" },
          { src: "https://example.com/c.jpg", alt: "c", category: "modern eco" },
        ],
      },
    });

  test("renders [data-gallery] + [data-gallery-filter] chips (All+cats) + data-category on items", () => {
    const html = renderBlock(filterableGallery());
    expect(html).toContain('data-gallery="true"');
    expect(html).toContain('data-gallery-filter="true"');
    expect(html).toContain('data-filter="all"');
    expect(html).toContain('data-filter="modern"');
    expect(html).toContain('data-filter="eco"');
    expect(html.match(/data-filter-item="true"/g)).toHaveLength(3);
    expect(html).toContain('data-category="modern"');
    expect(html).toContain('data-category="eco"');
    // Multi-category item preserves both space-joined tokens.
    expect(html).toContain('data-category="modern eco"');
  });

  test("chip bar is a role=toolbar of aria-pressed toggle buttons (NOT a tablist/tab) with roving tabindex", () => {
    const html = renderBlock(filterableGallery());
    // Semantically-honest toggle-set pattern (534 audit remediation): a toolbar of
    // aria-pressed buttons, not an incomplete role=tab/tablist over a single panel.
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Filter gallery"');
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain("aria-selected");
    // 3 chips (All + modern + eco): first pressed, the rest not.
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
    // Roving tabindex: exactly ONE chip in the tab sequence (active=0, rest=-1).
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
  });

  test("gallery WITHOUT filterable is byte-identical to the un-filtered path (no bar/wrapper/data-filter-item)", () => {
    const html = renderBlock(
      createPageBlockV2("gallery", {
        id: "g2",
        props: { layout: "grid", items: [{ src: "https://example.com/a.jpg", alt: "a" }] },
      })
    );
    expect(html).not.toContain("data-gallery-filter");
    expect(html).not.toContain("data-filter-item");
    expect(html).not.toContain('data-gallery="true"><div data-gallery'); // no double wrapper.
    expect(html).not.toContain("data-category");
  });

  test("a single filterCategory containing a space is rejected (single-token pattern)", () => {
    const html = renderBlock(
      createPageBlockV2("gallery", {
        id: "g3",
        props: {
          layout: "grid",
          filterable: true,
          filterCategories: ["modern eco"], // one chip with a space → dropped.
          items: [{ src: "https://example.com/a.jpg", alt: "a" }],
        },
      })
    );
    // No valid category ⇒ no filter bar emitted (present-only).
    expect(html).not.toContain("data-gallery-filter");
  });
});

describe("TASK-534 scrollHint render", () => {
  test("renders [data-scroll-hint] aria-hidden + glyph svg + bob keyframe CSS + sr-only label", () => {
    const html = renderBlock(
      createPageBlockV2("scrollHint", { id: "sh", props: { glyph: "chevron", label: "Scroll" } })
    );
    expect(html).toContain('data-scroll-hint="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<svg");
    expect(html).toContain("cx-scrollhint-bob");
    expect(html).toContain("Scroll");
  });
});

describe("TASK-534 noise overlay + emit gate", () => {
  test("page effects.noiseOverlay renders [data-noise-overlay] + noise CSS + no <script>", () => {
    const base = createDefaultPageDocumentV2();
    const doc: PageDocumentV2 = {
      ...base,
      settings: { ...base.settings, effects: { noiseOverlay: true } },
      sections: [
        createPageSectionV2("content", {
          id: "s",
          blocks: [createPageBlockV2("text", { id: "t", props: { text: "x" } })],
        }),
      ],
    };
    const html = renderDoc(doc);
    expect(html).toContain('data-noise-overlay="true"');
    expect(html).toContain('data-noise-host="true"');
    expect(html).toContain("data-noise");
    // noise is NOT runtime-bearing ⇒ no effects <script>.
    expect(html).not.toContain(`data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`);
  });

  test("section style.noiseOverlay renders the section overlay", () => {
    const base = createDefaultPageDocumentV2();
    const section = createPageSectionV2("content", {
      id: "s2",
      blocks: [createPageBlockV2("text", { id: "t2", props: { text: "x" } })],
    });
    const doc: PageDocumentV2 = {
      ...base,
      sections: [{ ...section, style: { ...section.style, noiseOverlay: true } }],
    };
    const html = renderDoc(doc);
    expect(html).toContain('data-noise-overlay="true"');
    expect(html).toContain("data-section-noise-css");
  });

  test("switcher / magnetic / filterable-gallery emit the SINGLE effects <script> via widened anyMotion", () => {
    for (const block of [
      createPageBlockV2("switcher", { id: "sw", props: { tabs: [{ label: "A" }] } }),
      createPageBlockV2("button", {
        id: "b",
        props: { label: "Go", href: "/" },
        style: { magnetic: true },
      }),
      createPageBlockV2("gallery", {
        id: "g",
        props: {
          filterable: true,
          filterCategories: ["modern"],
          items: [{ src: "https://example.com/a.jpg", alt: "a", category: "modern" }],
        },
      }),
    ]) {
      const html = renderDoc(docWithBlocks([block]));
      const scriptCount = (
        html.match(new RegExp(`data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`, "g")) ??
        []
      ).length;
      expect(scriptCount).toBe(1); // exactly ONE emit (deduped id).
      expect(html).toContain('data-page-motion="true"');
    }
  });

  test("scrollHint / noise-ONLY page emits NO <script>", () => {
    const html = renderDoc(docWithBlocks([createPageBlockV2("scrollHint", { id: "sh" })]));
    expect(html).not.toContain(`data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`);
    expect(html).not.toContain('data-page-motion="true"');
  });

  test("a page with none of the 534 surfaces = no overlay, no interactivity CSS, no script", () => {
    const html = renderDoc(
      docWithBlocks([createPageBlockV2("text", { id: "t", props: { text: "hi" } })])
    );
    expect(html).not.toContain("data-noise-overlay");
    expect(html).not.toContain("data-page-interactivity-css");
    expect(html).not.toContain(`data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`);
  });

  test("a filterable-gallery page emits the interactivity CSS", () => {
    const html = renderDoc(
      docWithBlocks([
        createPageBlockV2("gallery", {
          id: "g",
          props: {
            filterable: true,
            filterCategories: ["modern"],
            items: [{ src: "https://example.com/a.jpg", alt: "a", category: "modern" }],
          },
        }),
      ])
    );
    expect(html).toContain("data-page-interactivity-css");
  });
});
