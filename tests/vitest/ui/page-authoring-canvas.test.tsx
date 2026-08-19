// @vitest-environment happy-dom

import { flushSync } from "react-dom";
import React from "react";
import { expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import { SectionCanvas } from "../../../core/admin/ui/pages/editor/PageAuthoringCanvas";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { PageDetail } from "../../../core/admin/services/pagesClient";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { PageEditorColorPaletteContext } from "../../../core/services/pages/pageEditorColorPaletteContext";
import { getPageEditorColorPalette } from "../../../core/services/pages/pageEditorControlUiModel";
import {
  baseCanvasProps,
  createPageBlockV2,
  createPageSectionV2,
  mount,
  renderToStaticMarkup,
  sectionWithBrandBlockProps,
} from "./pageAuthoringCanvasHarness";
import { DEFAULT_TOKENS, type DesignTokenOverrides } from "../../../core/services/theme/tokenTypes";
import { mergeTokens } from "../../../core/services/theme/tokenUtils";
import {
  toPageCanvasBrandColorCssVariableMap,
  toPageCanvasColorCssVariableMap,
} from "../../../core/ui/theme/tokenCss";

/**
 * TASK-481-04-L01: live settings-cache boundary for the canvas site-token
 * hooks. The PageEditor tree reads the settings cache through
 * `@/services/settingsClient` (`getCachedSettings`/`getSettingsCached`); the
 * cache-bus repaint test below controls that boundary with a stateful mock
 * exactly like the menu-editor and page-editor-v2-flow suites, while the real
 * `cacheBus` broadcast/subscribe path, the real `useCanvasSiteTokens` hook,
 * the real controller, and the real SectionCanvas render stay un-mocked.
 * With an empty/`null` payload the canvas anchors on DEFAULT_TOKENS, so the
 * existing suites in this file (which pass explicit token props or render
 * statically) keep their exact behavior.
 */
const settingsCacheState = vi.hoisted(() => ({
  payload: null as Record<string, unknown> | null,
  reset() {
    settingsCacheState.payload = null;
  },
}));

vi.mock("@/services/settingsClient", () => ({
  // The REAL settings cache is the REDACTED payload: it never carries
  // `design.tokens` (the redaction contract in settingsCache.ts), so a
  // synchronous cache read must never leak the tokens. The hook therefore
  // revalidates the FULL payload through `getSettingsCached({ force: true })`
  // (same as AdminApp.refreshSettings), which is the only path that carries
  // `design.tokens` — mirroring the real client exactly.
  getCachedSettings: () => {
    const payload = settingsCacheState.payload;
    if (!payload) return null;
    const { ["design.tokens"]: _tokens, ...redacted } = payload;
    return redacted;
  },
  getSettingsCached: async () => settingsCacheState.payload ?? {},
}));

test("SectionCanvas renders existing canvas chrome and ghost add affordances", () => {
  const section = createPageSectionV2("hero", {
    id: "sec-canvas",
    name: "Canvas",
    layout: { columns: 2, align: "start", justify: "start", maxWidth: 960 },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-heading",
        props: { text: "Canvas headline", level: "h2", align: "left" },
      }),
    ],
  });

  const html = renderToStaticMarkup(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-heading"
      inlineEditTarget={null}
      device="desktop"
      canAddBlockBeside
      canvasDataByBlockId={{}}
      onSelect={vi.fn()}
      onSelectBlock={vi.fn()}
      onAddBlock={vi.fn()}
      onAddBlockToTarget={vi.fn()}
      onAddBlockBeside={vi.fn()}
      onStartInlineEdit={vi.fn()}
      onCommitInlineEdit={vi.fn()}
      onApplyTextMark={vi.fn()}
      contentBrandTokenVariables={{}}
    />
  );

  expect(html).toContain('data-page-editor-section="hero"');
  expect(html).toContain('data-page-editor-block="heading"');
  expect(html).toContain('data-page-editor-ghost="add-block-beside"');
  expect(html).toContain('data-page-editor-ghost="section-column-append"');
  expect(html).toContain('data-page-editor-inline-edit="idle"');
});

test("SectionCanvas renders hidden block ghost through the reusable label helper", () => {
  const section = createPageSectionV2("content", {
    id: "sec-hidden-canvas",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-hidden-text",
        props: { text: "Hidden canvas text", format: "plain", align: "left" },
        visibility: { visible: false },
      }),
    ],
  });

  const html = renderToStaticMarkup(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected={false}
      selectedBlockPath={null}
      selectedBlockId={null}
      inlineEditTarget={null}
      device="desktop"
      canAddBlockBeside={false}
      canvasDataByBlockId={{}}
      onSelect={vi.fn()}
      onSelectBlock={vi.fn()}
      onAddBlock={vi.fn()}
      onAddBlockToTarget={vi.fn()}
      onAddBlockBeside={vi.fn()}
      onStartInlineEdit={vi.fn()}
      onCommitInlineEdit={vi.fn()}
      onApplyTextMark={vi.fn()}
      contentBrandTokenVariables={{}}
    />
  );

  expect(html).toContain('data-page-editor-hidden-block-ghost="true"');
  expect(html).toContain("Hidden text");
  expect(html).toContain("Hidden canvas text");
});

test("SectionCanvas exposes sanitized rich text through the inline edit wrapper", () => {
  const section = createPageSectionV2("content", {
    id: "sec-rich-canvas",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-rich-text",
        props: {
          text: '<p>Canvas <strong>rich</strong> <script>alert(1)</script><a href="/safe">safe</a></p>',
          format: "rich",
          align: "left",
        },
      }),
    ],
  });

  const html = renderToStaticMarkup(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-rich-text"
      inlineEditTarget={{ blockId: "blk-rich-text", propPath: "text" }}
      device="desktop"
      canAddBlockBeside={false}
      canvasDataByBlockId={{}}
      onSelect={vi.fn()}
      onSelectBlock={vi.fn()}
      onAddBlock={vi.fn()}
      onAddBlockToTarget={vi.fn()}
      onAddBlockBeside={vi.fn()}
      onStartInlineEdit={vi.fn()}
      onCommitInlineEdit={vi.fn()}
      onApplyTextMark={vi.fn()}
      contentBrandTokenVariables={{}}
    />
  );

  expect(html).toContain('data-page-editor-inline-edit="active"');
  expect(html).toContain('data-page-editor-inline-edit-prop="text"');
  expect(html).toContain("<strong");
  expect(html).toContain(">rich</strong>");
  expect(html).toContain('href="/safe"');
  expect(html).not.toContain("<script");
  expect(html).not.toContain("alert(1)");
});

test("SectionCanvas mounts rich text blocks with a block inline-edit wrapper", () => {
  const section = createPageSectionV2("content", {
    id: "sec-rich-canvas-dom",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-rich-text-dom",
        props: {
          text: "<p>Canvas <strong>rich</strong></p><ul><li>Nested item</li></ul>",
          format: "rich",
          align: "left",
        },
      }),
    ],
  });

  const mounted = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-rich-text-dom"
      inlineEditTarget={null}
      {...baseCanvasProps}
    />
  );

  try {
    const wrapper = mounted.container.querySelector(
      'div[data-page-editor-inline-edit-prop="text"]'
    );
    expect(wrapper).toBeTruthy();
    expect(mounted.container.querySelector(".prose p")).toBeTruthy();
    expect(mounted.container.querySelector(".prose ul")).toBeTruthy();
    expect(wrapper?.querySelector("p")).toBeTruthy();
    expect(wrapper?.querySelector("ul")).toBeTruthy();
    expect(
      mounted.container.querySelector('span[data-page-editor-inline-edit-prop="text"]')
    ).toBeNull();
  } finally {
    mounted.cleanup();
  }
});

test("SectionCanvas rich inline edit commits innerHTML for the sanitizer owner", () => {
  const onCommitInlineEdit = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-rich-canvas-commit",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-rich-text-commit",
        props: {
          text: "<p>Canvas <strong>rich</strong></p>",
          format: "rich",
          align: "left",
        },
      }),
    ],
  });

  const mounted = mount(
    <SectionCanvas
      section={section}
      baseSection={section}
      selected
      selectedBlockPath={[{ index: 0 }]}
      selectedBlockId="blk-rich-text-commit"
      inlineEditTarget={{ blockId: "blk-rich-text-commit", propPath: "text" }}
      {...baseCanvasProps}
      onCommitInlineEdit={onCommitInlineEdit}
    />
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(region).toBeTruthy();
    React.act(() => {
      if (!region) return;
      region.innerHTML =
        '<p>Edited <strong>rich</strong> <a href="/safe" onclick="alert(1)">safe</a></p>';
      region.blur();
    });

    expect(onCommitInlineEdit).toHaveBeenCalledWith({
      blockId: "blk-rich-text-commit",
      propPath: "text",
      text: '<p>Edited <strong>rich</strong> <a href="/safe" onclick="alert(1)">safe</a></p>',
      renderedText: "<p>Canvas <strong>rich</strong></p>",
    });
  } finally {
    mounted.cleanup();
  }
});

test("wraps rendered block content in a single data-page-editor-content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const frame = mounted.container.querySelector("[data-page-editor-block-id]");
  const scope = frame!.querySelector(":scope > [data-page-editor-content]");
  expect(scope).not.toBeNull();
  // Exactly one content scope sits directly under the frame; chrome never nests
  // inside it (TASK-481-01-L01 single-wrapper invariant).
  const directContentScopes = Array.from(frame!.children).filter(
    (child) => child.getAttribute("data-page-editor-content") === "true"
  );
  expect(directContentScopes).toHaveLength(1);
  mounted.cleanup();
});

test("keeps chrome OUTSIDE the content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const scope = mounted.container.querySelector("[data-page-editor-content]");
  // selection ring / outline classes live on the frame, not inside the scope:
  expect(scope!.querySelector("[data-page-editor-ghost='add-block-beside']")).toBeNull();
  expect(scope!.className).not.toMatch(/ring-primary|outline-primary/);
  // override badge + add-beside are siblings under the frame, outside the scope.
  mounted.cleanup();
});

test("co-locates block brand visual style with the content scope", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  // The FIRST `data-page-editor-content` in document order is the section-level
  // scope (no inline style); the block-level scope under the block frame owns
  // the brand visual style.
  const frame = mounted.container.querySelector("[data-page-editor-block-id]");
  const scope = frame!.querySelector(":scope > [data-page-editor-content]");
  // block.style.textColor = "var(--color-accent)" => the CSS `color` declaration
  // co-locates on the content scope.
  expect(scope!.getAttribute("style")).toContain("color: var(--color-accent)");
  // frame keeps layout only — no CSS `color` declaration (the brand visual moved
  // to the scope; the --coderso-block-* custom props stay on the frame per the
  // implemented L01 split, they are not a CSS color declaration).
  expect(frame!.getAttribute("style")).not.toMatch(/(^|;)\s*color:/);
  mounted.cleanup();
});

test("re-asserts admin brand on section + block + nested chrome (TASK-481-01-L02)", () => {
  const mounted = mount(<SectionCanvas {...baseCanvasProps} {...sectionWithBrandBlockProps} />);
  const section = mounted.container.querySelector("[data-page-editor-section]");
  const blockFrame = mounted.container.querySelector("[data-page-editor-block-id]");
  expect(section!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  expect(blockFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  // a child block frame (columns slot) also carries the admin re-assertion
  const nestedFrame = mounted.container.querySelector(
    '[data-page-editor-block-slot-key="column:1"]'
  );
  expect(nestedFrame).toBeTruthy();
  expect(nestedFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  mounted.cleanup();
});

test("does not regress TASK-477-02 neutral emission on the canvas frame", () => {
  // The canvas frame (`data-page-editor-canvas-frame="true"`, PageEditor.tsx)
  // carries `canvasSiteTokenVariables`. renderToStaticMarkup never runs the
  // settings effect, so the frame anchors on the DEFAULT_TOKENS neutral map —
  // the TASK-477-02 contract — unchanged by the L01 content-scope / L02 admin
  // re-assertion edits (which live inside SectionCanvas, not on the frame).
  const html = renderToStaticMarkup(
    <AdminRouterProvider initialPath="/admin">
      <PageEditor />
    </AdminRouterProvider>
  );
  const frameTag = html.match(/<div[^>]*data-page-editor-canvas-frame="true"[^>]*>/)?.[0] ?? "";
  expect(frameTag).toContain('data-page-editor-canvas-frame="true"');
  expect(frameTag).toContain("--color-bg");
  expect(frameTag).toContain("--color-surface");
  expect(frameTag).toContain("--color-text");
  expect(frameTag).toContain("--font-sans");
  // Brand vars stay OUT of the neutral canvas frame (chrome-safe TASK-477-02).
  expect(frameTag).not.toContain("--color-primary");
  expect(frameTag).not.toContain("--color-accent");
});

const SITE_BRAND_VARS = {
  "--color-primary": "oklch(0.42 0.16 260)",
  "--color-secondary": "oklch(0.55 0.14 150)",
  "--color-accent": "oklch(0.63 0.18 45)",
  "--color-border": "oklch(0.88 0.02 250)",
};

test("co-locates SITE brand vars on the section + block content scopes (TASK-481-02-L02)", () => {
  const mounted = mount(
    <SectionCanvas
      {...sectionWithBrandBlockProps}
      contentBrandTokenVariables={SITE_BRAND_VARS as React.CSSProperties}
    />
  );
  const sectionScope = mounted.container.querySelector(
    "section[data-page-editor-section] > [data-page-editor-content]"
  );
  const blockScope = mounted.container.querySelector(
    '[data-page-editor-block-id="blk-brand-heading"] > [data-page-editor-content]'
  );
  expect(sectionScope).toBeTruthy();
  expect(blockScope).toBeTruthy();
  for (const [key, value] of Object.entries(SITE_BRAND_VARS)) {
    expect(sectionScope!.getAttribute("style")).toContain(`${key}: ${value}`);
    expect(blockScope!.getAttribute("style")).toContain(`${key}: ${value}`);
  }
  // The block's own brand visual style is merged AFTER the site brand vars, so
  // the block's `color: var(--color-accent)` resolves against the SITE accent.
  expect(blockScope!.getAttribute("style")).toContain("color: var(--color-accent)");
  // The section content scope carries the brand vars but no block visual style.
  expect(sectionScope!.getAttribute("style")).not.toMatch(/(^|;)\s*color:/);
  mounted.cleanup();
});

test("keeps SITE brand vars off the section + block chrome frames (TASK-481-02-L02)", () => {
  const mounted = mount(
    <SectionCanvas
      {...sectionWithBrandBlockProps}
      contentBrandTokenVariables={SITE_BRAND_VARS as React.CSSProperties}
    />
  );
  const sectionFrame = mounted.container.querySelector("[data-page-editor-section]");
  const blockFrame = mounted.container.querySelector(
    '[data-page-editor-block-id="blk-brand-heading"]'
  );
  expect(sectionFrame!.getAttribute("style")).not.toContain("--color-primary: oklch(0.42");
  expect(sectionFrame!.getAttribute("style")).not.toContain("--color-accent: oklch(0.63");
  expect(blockFrame!.getAttribute("style")).not.toContain("--color-accent: oklch(0.63");
  // Frames still re-assert the ADMIN brand for editor chrome (TASK-481-01-L02).
  expect(sectionFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  expect(blockFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  mounted.cleanup();
});

test("content scope anchors on DEFAULT brand vars when no custom tokens (TASK-481-02-L02)", () => {
  // useCanvasSiteTokens with an empty settings cache merges DEFAULT_TOKENS
  // (offline/not-loaded), so the controller brand memo carries the DEFAULT
  // brand values. Pin that chain, then verify the wiring renders it.
  expect(mergeTokens(DEFAULT_TOKENS, null)).toEqual(DEFAULT_TOKENS);
  const defaultBrand = toPageCanvasBrandColorCssVariableMap(DEFAULT_TOKENS);
  expect(defaultBrand["--color-primary"]).toBe(DEFAULT_TOKENS.colors.primary);
  expect(defaultBrand["--color-secondary"]).toBe(DEFAULT_TOKENS.colors.secondary);
  expect(defaultBrand["--color-accent"]).toBe(DEFAULT_TOKENS.colors.accent);
  expect(defaultBrand["--color-border"]).toBe(DEFAULT_TOKENS.neutrals.border);
  const mounted = mount(
    <SectionCanvas {...sectionWithBrandBlockProps} contentBrandTokenVariables={defaultBrand} />
  );
  const sectionScope = mounted.container.querySelector(
    "section[data-page-editor-section] > [data-page-editor-content]"
  );
  const blockScope = mounted.container.querySelector(
    '[data-page-editor-block-id="blk-brand-heading"] > [data-page-editor-content]'
  );
  expect(sectionScope!.getAttribute("style")).toContain(
    `--color-primary: ${DEFAULT_TOKENS.colors.primary}`
  );
  expect(sectionScope!.getAttribute("style")).toContain(
    `--color-border: ${DEFAULT_TOKENS.neutrals.border}`
  );
  expect(blockScope!.getAttribute("style")).toContain(
    `--color-accent: ${DEFAULT_TOKENS.colors.accent}`
  );
  mounted.cleanup();
});

// TASK-481-03-L01: a NON-default site palette threaded through the editor's
// PageEditorColorPaletteContext. The provider in PageEditorRoot wraps the whole
// editor body, so the inline toolbar reads these site-resolved swatches.
const SITE_PALETTE = getPageEditorColorPalette({
  ...DEFAULT_TOKENS,
  colors: { primary: "#0b3d91", secondary: "#7f1d1d", accent: "#166534" },
  neutrals: { ...DEFAULT_TOKENS.neutrals, border: "#475569" },
});

test("inline text-color swatches preview the LIVE site palette (TASK-481-03-L01)", () => {
  const onApplyTextMark = vi.fn();
  const section = createPageSectionV2("content", {
    id: "sec-live-palette",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-live-palette",
        props: { text: "Canvas headline", level: "h2", align: "left" },
      }),
    ],
  });

  const mounted = mount(
    <PageEditorColorPaletteContext.Provider value={SITE_PALETTE}>
      <SectionCanvas
        section={section}
        baseSection={section}
        selected
        selectedBlockPath={[{ index: 0 }]}
        selectedBlockId="blk-live-palette"
        inlineEditTarget={{ blockId: "blk-live-palette", propPath: "text" }}
        {...baseCanvasProps}
        onApplyTextMark={onApplyTextMark}
      />
    </PageEditorColorPaletteContext.Provider>
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(region).toBeTruthy();

    // Brand-id filter preserved: exactly the four brand swatch ids inline, for
    // both the color and the highlight rows.
    const colorSwatches = Array.from(
      mounted.container.querySelectorAll("[data-page-editor-text-color-swatch]")
    );
    expect(
      colorSwatches.map((node) => node.getAttribute("data-page-editor-text-color-swatch"))
    ).toEqual(["primary", "secondary", "accent", "border"]);
    const highlightSwatches = Array.from(
      mounted.container.querySelectorAll("[data-page-editor-text-highlight-swatch]")
    );
    expect(highlightSwatches).toHaveLength(4);
    expect(
      highlightSwatches.map((node) => node.getAttribute("data-page-editor-text-highlight-swatch"))
    ).toEqual(["primary", "secondary", "accent", "border"]);

    // Swatch backgrounds use the SITE previewValue, never DEFAULT_TOKENS.
    const primarySwatch = mounted.container.querySelector(
      '[data-page-editor-text-color-swatch="primary"]'
    ) as HTMLElement | null;
    expect(primarySwatch?.getAttribute("style") ?? "").toContain("#0b3d91");
    expect(primarySwatch?.getAttribute("style") ?? "").not.toContain(DEFAULT_TOKENS.colors.primary);
    const borderHighlight = mounted.container.querySelector(
      '[data-page-editor-text-highlight-swatch="border"]'
    ) as HTMLElement | null;
    expect(borderHighlight?.getAttribute("style") ?? "").toContain("#475569");

    // The COMMITTED mark color is still the var(--color-*) token, so the
    // sanitizer contract is unchanged.
    const textNode = region?.firstChild;
    flushSync(() => {
      if (!region || !textNode) return;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 6);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      region.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    flushSync(() => {
      (primarySwatch as HTMLButtonElement | null)?.click();
    });
    expect(onApplyTextMark).toHaveBeenCalledWith(
      expect.objectContaining({
        blockId: "blk-live-palette",
        propPath: "text",
        type: "color",
        from: 0,
        to: 6,
        color: "var(--color-primary)",
      })
    );
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

test("inline toolbar keeps URL input + custom picker mousedown unprevented (TASK-481-03-L01)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-live-focus",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-live-focus",
        props: { text: "Canvas headline", level: "h2", align: "left" },
      }),
    ],
  });

  const mounted = mount(
    <PageEditorColorPaletteContext.Provider value={SITE_PALETTE}>
      <SectionCanvas
        section={section}
        baseSection={section}
        selected
        selectedBlockPath={[{ index: 0 }]}
        selectedBlockId="blk-live-focus"
        inlineEditTarget={{ blockId: "blk-live-focus", propPath: "text" }}
        {...baseCanvasProps}
      />
    </PageEditorColorPaletteContext.Provider>
  );

  try {
    const region = mounted.container.querySelector(
      '[data-page-editor-inline-edit="active"][data-page-editor-inline-edit-prop="text"]'
    ) as HTMLElement | null;
    expect(region).toBeTruthy();
    // Select a fragment so the URL input and the picker become enabled (they
    // are disabled without an active selection), then verify focusability.
    const textNode = region?.firstChild;
    flushSync(() => {
      if (!region || !textNode) return;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 6);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      region.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    const input = mounted.container.querySelector(
      'input[aria-label="Inline link URL"]'
    ) as HTMLInputElement | null;
    const picker = mounted.container.querySelector(
      'input[type="color"][data-page-editor-text-color-picker="true"]'
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(picker).toBeTruthy();

    // The mark-toolbar onMouseDown handler must NOT preventDefault for the URL
    // input or the native color picker (bug #2 / TASK-477-01): a cancelled
    // mousedown would steal focus and block the color dialog.
    const inputDown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    flushSync(() => {
      input?.dispatchEvent(inputDown);
    });
    expect(inputDown.defaultPrevented).toBe(false);
    const pickerDown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    flushSync(() => {
      picker?.dispatchEvent(pickerDown);
    });
    expect(pickerDown.defaultPrevented).toBe(false);

    // Both controls stay focusable/enabled — no focus-stealing wrapper.
    expect(input?.disabled).toBe(false);
    expect(picker?.disabled).toBe(false);
    flushSync(() => {
      input?.focus();
    });
    expect(document.activeElement).toBe(input);
  } finally {
    mounted.cleanup();
    window.getSelection()?.removeAllRanges();
  }
});

// TASK-481-04-L01: the SITE accent used to prove the WYSIWYG chain. It MUST
// differ from DEFAULT_TOKENS.colors.accent ("#f59e0b") and from the admin
// chrome re-assertion (`var(--primary)`), otherwise the assertions below could
// not distinguish a real SITE repaint from the DEFAULT/admin fallback.
const SITE_ACCENT = "#16a34a";

test("renders a brand block color as the SITE value on the content scope, admin on chrome (TASK-481-04-L01)", () => {
  const site = mergeTokens(DEFAULT_TOKENS, { colors: { accent: SITE_ACCENT } });
  const siteBrand = toPageCanvasBrandColorCssVariableMap(site);
  const siteFrame = toPageCanvasColorCssVariableMap(site);
  expect(SITE_ACCENT).not.toBe(DEFAULT_TOKENS.colors.accent);
  expect(siteBrand["--color-accent"]).toBe(SITE_ACCENT);

  const mounted = mount(
    <SectionCanvas
      {...sectionWithBrandBlockProps}
      contentBrandTokenVariables={siteBrand as React.CSSProperties}
    />
  );

  try {
    const sectionScope = mounted.container.querySelector(
      "section[data-page-editor-section] > [data-page-editor-content]"
    );
    const blockScope = mounted.container.querySelector(
      '[data-page-editor-block-id="blk-brand-heading"] > [data-page-editor-content]'
    );
    // (1) The SITE brand map is painted on the content scopes, so the block's
    // `var(--color-accent)` resolves against the SITE value, never the admin
    // or DEFAULT fallback.
    expect(sectionScope!.getAttribute("style")).toContain(`--color-accent: ${SITE_ACCENT}`);
    expect(blockScope!.getAttribute("style")).toContain(`--color-accent: ${SITE_ACCENT}`);
    expect(blockScope!.getAttribute("style")).toContain("color: var(--color-accent)");
    expect(blockScope!.getAttribute("style")).not.toContain(
      `--color-accent: ${DEFAULT_TOKENS.colors.accent}`
    );

    // (2) Editor chrome keeps the admin theme (no brand bleed): the section and
    // block frames re-assert the ADMIN brand per TASK-481-01-L02.
    const sectionFrame = mounted.container.querySelector("[data-page-editor-section]");
    const blockFrame = mounted.container.querySelector(
      '[data-page-editor-block-id="blk-brand-heading"]'
    );
    expect(sectionFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
    expect(blockFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");

    // (3) Inline + block-level brand swatch previews agree with the in-canvas
    // render; that invariant is pinned separately in TASK-481-03-L02
    // (`tests/vitest/ui/shared-color-control.test.tsx` "brand swatch preview
    // agreement") and TASK-481-03-L01 above — cross-reference holds, no
    // duplicate assertion here.

    // (4) Neutrals stay intact and brand stays OFF the canvas frame: the frame
    // map (`canvasSiteTokenVariables`) carries the site neutrals + typography
    // only, never the brand vars (TASK-477-02). Verified on the pure frame map
    // for THIS custom site and on the real `data-page-editor-canvas-frame`
    // style string below.
    expect(siteFrame["--color-text"]).toBe(site.neutrals.text);
    expect(siteFrame["--color-bg"]).toBe(site.neutrals.bg);
    expect(siteFrame["--color-surface"]).toBe(site.neutrals.surface);
    expect(Object.hasOwn(siteFrame, "--color-accent")).toBe(false);
    expect(Object.hasOwn(siteFrame, "--color-primary")).toBe(false);
  } finally {
    mounted.cleanup();
  }
});

test("keeps brand off the real canvas frame while neutrals stay intact (TASK-481-04-L01)", () => {
  // The real `data-page-editor-canvas-frame` style string: renderToStaticMarkup
  // never runs the settings effect, so the frame anchors on the DEFAULT_TOKENS
  // neutral map (the SITE neutrals here equal the DEFAULT ones — only the SITE
  // accent differs, which the frame never receives).
  const html = renderToStaticMarkup(
    <AdminRouterProvider initialPath="/admin">
      <PageEditor />
    </AdminRouterProvider>
  );
  const frameTag = html.match(/<div[^>]*data-page-editor-canvas-frame="true"[^>]*>/)?.[0] ?? "";
  expect(frameTag).toContain("--color-text:");
  expect(frameTag).toContain("--color-bg:");
  expect(frameTag).toContain("--color-surface:");
  expect(frameTag).toContain("--font-sans:");
  expect(frameTag).not.toContain("--color-accent:");
  expect(frameTag).not.toContain("--color-primary:");
});

const BRAND_REPAINT_PAGE: PageDetail = {
  id: "page-481-04",
  title: "Brand repaint",
  slug: "/brand-repaint",
  status: "draft",
  currentData: {
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: { template: "page-v2", showInNav: true, revisionRetention: 10 },
    sections: [
      createPageSectionV2("content", {
        id: "sec-481-04",
        name: "Brand repaint section",
        blocks: [
          createPageBlockV2("heading", {
            id: "blk-481-04",
            props: { text: "Brand repaint headline", level: "h2", align: "left" },
          }),
        ],
      }),
    ],
  },
  updatedAt: "2026-08-19T09:00:00.000Z",
};

test("live-repaints brand when the settings cache bus fires (TASK-481-04-L01)", async () => {
  settingsCacheState.payload = null;
  // Mount the real PageEditor tree (real controller + SectionCanvas + real
  // `useCanvasSiteTokens` cache-bus subscription) through the harness
  // flushSync mount. The settings cache is empty, so the content scope
  // anchors on the DEFAULT accent.
  const mounted = mount(
    <AdminRouterProvider initialPath="/admin">
      <PageEditor initialPage={BRAND_REPAINT_PAGE} />
    </AdminRouterProvider>
  );

  try {
    // Let the mocked background settings revalidate settle, then flush its
    // state write so the canvas is deterministically on DEFAULT_TOKENS.
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync(() => {});

    const blockScopeQuery = '[data-page-editor-block-id="blk-481-04"] > [data-page-editor-content]';
    const blockScopeBefore = mounted.container.querySelector(blockScopeQuery) as HTMLElement | null;
    expect(blockScopeBefore).toBeTruthy();
    expect(blockScopeBefore!.getAttribute("style")).toContain(
      `--color-accent: ${DEFAULT_TOKENS.colors.accent}`
    );

    // A settings save elsewhere broadcasts `settingsRedacted`; the REAL
    // cacheBus delivers it to the hook, which re-reads the settings cache and
    // repaints the canvas with the NEW SITE accent.
    settingsCacheState.payload = {
      "design.tokens": {
        colors: { accent: SITE_ACCENT },
      } satisfies DesignTokenOverrides,
    };
    flushSync(() => {
      broadcastCacheEvent({ key: cacheKeys.settingsRedacted, action: "update" });
    });
    // The hook revalidates the FULL payload asynchronously (force), so settle
    // the promise and flush the state write before asserting the repaint.
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync(() => {});

    const blockScopeAfter = mounted.container.querySelector(blockScopeQuery) as HTMLElement | null;
    expect(blockScopeAfter).toBe(blockScopeBefore);
    expect(blockScopeAfter!.getAttribute("style")).toContain(`--color-accent: ${SITE_ACCENT}`);
    expect(blockScopeAfter!.getAttribute("style")).not.toContain(
      `--color-accent: ${DEFAULT_TOKENS.colors.accent}`
    );
    const sectionScope = mounted.container.querySelector(
      "section[data-page-editor-section] > [data-page-editor-content]"
    );
    expect(sectionScope!.getAttribute("style")).toContain(`--color-accent: ${SITE_ACCENT}`);
    // Chrome stays admin after the repaint, and the canvas frame never picks
    // up the SITE brand.
    const frame = mounted.container.querySelector("[data-page-editor-canvas-frame]");
    expect(frame!.getAttribute("style")).toContain("--color-text:");
    expect(frame!.getAttribute("style")).not.toContain("--color-accent:");
    const blockFrame = mounted.container.querySelector('[data-page-editor-block-id="blk-481-04"]');
    expect(blockFrame!.getAttribute("style")).toContain("--color-primary: var(--primary)");
  } finally {
    mounted.cleanup();
    settingsCacheState.reset();
  }
});
