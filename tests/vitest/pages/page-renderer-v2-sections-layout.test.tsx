import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  resolvePageSectionForBreakpoint,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  PageDocumentRender,
  PageSectionContent,
  PageSectionRender,
  toPageSectionBleedStyle,
  toPageSectionRenderProps,
  toPageSectionStyle,
} from "../../../core/services/pages/pageRendererV2";

const createSection = () =>
  createPageSectionV2("hero", {
    id: "sec-shared-renderer",
    name: "Shared Renderer",
    variant: "centered",
    layout: { columns: 3, align: "center", justify: "between", maxWidth: 960 },
    style: {
      background: "#f8fafc",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#ff00aa",
      radius: 18,
      shadow: "md",
    },
    spacing: {
      paddingTop: 16,
      paddingRight: 18,
      paddingBottom: 20,
      paddingLeft: 22,
      gap: 12,
    },
    visibility: {
      visible: true,
      authOnly: false,
      anchor: "shared-renderer",
      startsAt: null,
      endsAt: null,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-heading",
        props: { text: "Shared headline", level: "h1", align: "center" },
      }),
      createPageBlockV2("button", {
        id: "blk-button",
        props: { label: "Open", href: "/open", target: "blank" },
      }),
      createPageBlockV2("list", {
        id: "blk-list",
        props: {
          ordered: true,
          items: ["Plain item", { label: "Linked item", href: "/linked" }],
        },
      }),
    ],
  });

const createEffectsDocument = (
  sections: PageSectionV2[],
  effects?: PageDocumentV2["settings"]["effects"]
): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true, ...(effects ? { effects } : {}) },
  sections,
});

test("TASK-535: the fullBleed FLAG (default variant) drops the px-4 py-6 gutter, matching the style path", () => {
  // Regression: `toPageSectionStyle` / `toPageSectionBleedStyle` key the bleed box
  // + content cap off `isPageSectionFullBleed` (variant full-width OR
  // `style.fullBleed`), but the section CLASSNAME only checked the variant, so a
  // `style.fullBleed`-only section got the 100vw bleed box yet KEPT the utility
  // gutter. The className must route off the SAME predicate: drop the gutter here
  // too, consistent with the style path.
  const flagBleed = createPageSectionV2("hero", {
    id: "sec-flag-bleed",
    variant: "default", // NOT the full-width template variant — the FLAG alone.
    style: {
      background: "#dcfce7",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
      fullBleed: true,
    },
  });
  const flagProps = toPageSectionRenderProps(flagBleed);
  const flagHtml = renderToStaticMarkup(<PageSectionRender section={flagBleed} />);
  // Gutter dropped (matches the style path), NOT `w-full px-4 py-6`.
  expect(flagProps.sectionClassName).toBe("w-full");
  expect(flagProps.sectionClassName).not.toContain("px-4");
  expect(flagProps.sectionClassName).not.toContain("py-6");
  // The style path already treats it as full-bleed: 100vw bleed box + capped content.
  const bleed = toPageSectionBleedStyle(flagBleed);
  expect(bleed?.width).toBe("100vw");
  expect(flagHtml).toContain("width:100vw");
  // A NON-full-bleed (default variant, no flag) sibling still keeps the gutter.
  const bounded = createPageSectionV2("hero", {
    id: "sec-bounded",
    variant: "default",
    style: {
      background: "#eef2ff",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
    },
  });
  expect(toPageSectionRenderProps(bounded).sectionClassName).toBe("w-full px-4 py-6");
});

test("TASK-535: a page with a full-bleed section guards the root with overflow-x:clip (no h-scroll from 100vw)", () => {
  // The 100vw bleed box counts the vertical-scrollbar gutter, so it is wider than
  // the content area and pushes a spurious horizontal scrollbar. The page root
  // gets `overflow-x:clip` (present-only) to clip it WITHOUT creating a scroll
  // container (which `overflow:hidden` would, breaking the sticky nav).
  const bleedDoc = createEffectsDocument([
    createPageSectionV2("hero", {
      id: "sec-bleed",
      variant: "full-width",
      style: {
        background: "#dcfce7",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
    }),
  ]);
  const html = renderToStaticMarkup(<PageDocumentRender document={bleedDoc} />);
  expect(html).toContain("overflow-x:clip");
  // The FLAG path guards too (default variant + style.fullBleed).
  const flagDoc = createEffectsDocument([
    createPageSectionV2("hero", {
      id: "sec-flag",
      variant: "default",
      style: {
        background: "#dcfce7",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        fullBleed: true,
      },
    }),
  ]);
  expect(renderToStaticMarkup(<PageDocumentRender document={flagDoc} />)).toContain(
    "overflow-x:clip"
  );
});

test("TASK-535: a page with NO full-bleed section adds NO root overflow guard (present-only, byte-identical)", () => {
  // present-only invariant: `createSection()` is a `centered` variant with no
  // fullBleed flag, so the root style stays byte-identical (no overflow-x).
  const doc = createEffectsDocument([createSection()]);
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).not.toContain("overflow-x");
});

test("TASK-525-01: full-width section caps content at layout.maxWidth (bg full-bleed)", () => {
  const section = createPageSectionV2("hero", {
    id: "sec-fb-cap",
    variant: "full-width",
    layout: { columns: 1, align: "center", justify: "center", maxWidth: 1120 },
    style: {
      background: "#101828",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
    },
  });
  const style = toPageSectionStyle(section);
  // content is capped/centered — no longer maxWidth:"none".
  expect(style.maxWidth).toBe("1120px");
  expect(style.margin).toBe("0 auto");
  // reference `.container` gutter: content stays inside a min side gutter.
  expect(style.width).toBe("min(1120px, calc(100% - 2 * 20px))");
  // bg does NOT ride on the content div anymore.
  expect(style.backgroundColor).toBeUndefined();
  // the full-bleed lives on the outer section box.
  const bleed = toPageSectionBleedStyle(section);
  expect(bleed?.width).toBe("100vw");
  expect(bleed?.marginLeft).toBe("calc(50% - 50vw)");
  expect(bleed?.backgroundColor).toBe("#101828");
});

test("TASK-525-01: full-width renders a centered capped content wrapper inside a full-bleed section box", () => {
  const section = createPageSectionV2("hero", {
    id: "sec-fb-structure",
    variant: "full-width",
    layout: { columns: 1, align: "center", justify: "center", maxWidth: 1120 },
    style: {
      background: "#dcfce7",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
    },
  });
  const html = renderToStaticMarkup(<PageSectionRender section={section} />);
  // full-bleed marker/utility on the outer section box.
  expect(html).toContain("width:100vw");
  expect(html).toContain("margin-left:calc(50% - 50vw)");
  expect(html).toContain("background-color:#dcfce7");
  // content node capped at maxWidth + centered, independent of the bleed box.
  expect(html).toContain('data-page-section-content="true"');
  expect(html).toContain("max-width:1120px");
  expect(html).toContain("min(1120px, calc(100% - 2 * 20px))");
});

test("TASK-525-01: non-full-width section content is byte-identical (bg + cap on one content div)", () => {
  const section = createPageSectionV2("hero", {
    id: "sec-fb-default",
    variant: "default",
    layout: { columns: 1, align: "start", justify: "start", maxWidth: 960 },
    style: {
      background: "#eef2ff",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 12,
      shadow: "sm",
    },
  });
  const style = toPageSectionStyle(section);
  // cap unchanged; background/radius/shadow still on the SAME content div.
  expect(style.maxWidth).toBe("960px");
  expect(style.margin).toBe("0 auto");
  expect(style.backgroundColor).toBe("#eef2ff");
  expect(style.borderRadius).toBe("12px");
  expect(style.boxShadow).toBeDefined();
  // no full-bleed gutter width literal on the non-bleed path.
  expect(style.width).toBeUndefined();
  // no bleed box for a non-full-bleed section.
  expect(toPageSectionBleedStyle(section)).toBeUndefined();
  // and the rendered <section> has NO 100vw bleed.
  const html = renderToStaticMarkup(<PageSectionRender section={section} />);
  expect(html).not.toContain("width:100vw");
});

test("TASK-525-01: changing layout.maxWidth moves the content cap while bg stays full-bleed", () => {
  for (const mw of [640, 960, 1440]) {
    const section = createPageSectionV2("hero", {
      id: `sec-fb-mw-${mw}`,
      variant: "full-width",
      layout: { columns: 1, align: "center", justify: "center", maxWidth: mw },
      style: {
        background: "#101828",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
    });
    expect(toPageSectionStyle(section).maxWidth).toBe(`${mw}px`);
    // bleed is invariant to the cap.
    expect(toPageSectionBleedStyle(section)?.width).toBe("100vw");
  }
});

test("TASK-525-01-L02: style.fullBleed bleeds a NON-full-width section, caps content", () => {
  const section = createPageSectionV2("content", {
    id: "sec-fb-flag",
    variant: "default",
    layout: { columns: 1, align: "start", justify: "start", maxWidth: 880 },
    style: {
      background: "#0b1020",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
      fullBleed: true,
    },
  });
  expect(section.style.fullBleed).toBe(true);
  const style = toPageSectionStyle(section);
  // content capped/centered even though the template variant is NOT full-width.
  expect(style.maxWidth).toBe("880px");
  expect(style.margin).toBe("0 auto");
  expect(style.width).toBe("min(880px, calc(100% - 2 * 20px))");
  expect(style.backgroundColor).toBeUndefined();
  // and the bg bleeds on the section box.
  const bleed = toPageSectionBleedStyle(section);
  expect(bleed?.width).toBe("100vw");
  expect(bleed?.backgroundColor).toBe("#0b1020");
});

test("stackVertical forces a single-column section grid on canvas and front (TASK-425)", () => {
  const base = createSection();
  const stacked: PageSectionV2 = { ...base, layout: { ...base.layout, stackVertical: true } };

  const runtimeProps = toPageSectionRenderProps(stacked);
  const canvasProps = toPageSectionRenderProps(stacked, { layoutMode: "canvas-device" });
  expect(runtimeProps.contentClassName).toContain("grid-cols-1");
  expect(runtimeProps.contentClassName).not.toContain("md:grid-cols-3");
  expect(canvasProps.contentClassName).toContain("grid-cols-1");
  expect(canvasProps.contentClassName).not.toContain("grid-cols-3");

  // Non-destructive legacy adapter: unset and explicit false keep the exact
  // pre-TASK-425 class output (template-floored multi-column grid).
  const unsetProps = toPageSectionRenderProps(base);
  const explicitFalseProps = toPageSectionRenderProps({
    ...base,
    layout: { ...base.layout, stackVertical: false },
  });
  expect(explicitFalseProps.contentClassName).toBe(unsetProps.contentClassName);
  expect(unsetProps.contentClassName).toContain("md:grid-cols-3");

  // Per-breakpoint override resolves through the standard cascade first.
  const withMobileOverride: PageSectionV2 = {
    ...base,
    responsive: { mobile: { layout: { stackVertical: true } } },
  };
  const resolvedMobile = resolvePageSectionForBreakpoint(withMobileOverride, "mobile");
  expect(
    toPageSectionRenderProps(resolvedMobile, { layoutMode: "canvas-device" }).contentClassName
  ).toContain("grid-cols-1");
  const resolvedDesktop = resolvePageSectionForBreakpoint(withMobileOverride, "desktop");
  expect(toPageSectionRenderProps(resolvedDesktop).contentClassName).toContain("md:grid-cols-3");
});

test("admin preview wrappers preserve the same shared section and block content", () => {
  const section = createSection();
  const runtimeContent = renderToStaticMarkup(<PageSectionContent section={section} />);
  const adminContent = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      renderBlockFrame={({ content, renderProps }) => (
        <div
          className={renderProps.className}
          style={renderProps.style}
          {...renderProps.dataAttributes}
          data-editor-chrome="true"
        >
          {content}
        </div>
      )}
    />
  );

  expect(adminContent.replaceAll(' data-editor-chrome="true"', "")).toBe(runtimeContent);
  expect(renderToStaticMarkup(<PageSectionRender section={section} />)).toContain(
    'data-page-variant="centered"'
  );
  expect(
    renderToStaticMarkup(<PageSectionContent section={section} layoutMode="canvas-device" />)
  ).toContain('data-page-section-layout-mode="canvas-device"');
});

test("list link items render anchors while plain items stay inline-editable text", () => {
  const html = renderToStaticMarkup(<PageSectionContent section={createSection()} />);

  // Link item ({ label, href }) renders a real anchor with the stored target.
  expect(html).toContain('href="/linked"');
  expect(html).toMatch(/<a[^>]*href="\/linked"[^>]*>Linked item<\/a>/);
  // Plain string items render as text (no anchor) and keep the inline-edit hook.
  expect(html).toContain("Plain item");
  expect(html).not.toMatch(/<a[^>]*>Plain item<\/a>/);
});
