import { readFileSync } from "node:fs";
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
  PageBlockFrame,
  PageDocumentRender,
  PageSectionContent,
  PageSectionRender,
  resolvePageRenderTree,
  toPageBlockRenderProps,
  toPageBlockTypographyStyle,
  toPageSectionRenderProps,
} from "../../../core/services/pages/pageRendererV2";
import {
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
} from "../../../core/services/pages/pageDocumentV2";
import { serializePageBlockPath } from "../../../core/services/pages/pageBlockPaths";
import { buildPageEditorCollectionPreviewBinding } from "../../../core/services/pages/pageEditorCollectionPreview";
import { buildPageEditorFormPreviewBinding } from "../../../core/services/pages/pageEditorFormPreview";

const createDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

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

test("section render props expose shared classes, styles, and data attributes", () => {
  const section = createSection();
  const renderProps = toPageSectionRenderProps(section);
  const canvasProps = toPageSectionRenderProps(section, { layoutMode: "canvas-device" });

  expect(renderProps.contentClassName).toContain("grid w-full");
  expect(renderProps.contentClassName).toContain("md:grid-cols-3");
  expect(renderProps.contentClassName).toContain("items-center");
  expect(renderProps.contentClassName).toContain("justify-between");
  expect(renderProps.contentClassName).toContain("page-section-template-hero-centered");
  expect(renderProps.style).toMatchObject({
    "--coderso-section-accent": "#ff00aa",
    backgroundColor: "#f8fafc",
    borderRadius: "18px",
    boxShadow: "0 14px 40px rgba(15, 23, 42, 0.12)",
    padding: "16px 18px 20px 22px",
    maxWidth: "960px",
    margin: "0 auto",
    gap: "12px",
  });
  expect(renderProps.dataAttributes).toEqual({
    "data-page-section": "hero",
    "data-section-id": "sec-shared-renderer",
    "data-page-variant": "centered",
    "data-page-section-template": "hero",
  });
  expect(canvasProps.contentClassName).toContain("grid-cols-3");
  expect(canvasProps.contentClassName).not.toContain("md:grid-cols-3");
});

test("section templates branch supported variants and fall back without mutating stored data", () => {
  const centered = createPageSectionV2("hero", {
    id: "sec-hero-centered",
    variant: "centered",
    layout: { columns: 1, align: "center", justify: "center", maxWidth: 960 },
  });
  const split = createPageSectionV2("hero", {
    id: "sec-hero-split",
    variant: "split",
    layout: { columns: 1, align: "center", justify: "center", maxWidth: 960 },
  });
  const unsupported = createPageSectionV2("hero", {
    id: "sec-hero-unsupported",
    variant: "cards",
  });

  const centeredProps = toPageSectionRenderProps(centered);
  const splitProps = toPageSectionRenderProps(split);
  const unsupportedProps = toPageSectionRenderProps(unsupported);

  expect(centeredProps.contentClassName).toContain("page-section-template-hero-centered");
  expect(centeredProps.contentClassName).not.toContain("md:grid-cols-2");
  expect(splitProps.contentClassName).toContain("page-section-template-hero-split");
  expect(splitProps.contentClassName).toContain("md:grid-cols-2");
  expect(unsupported.variant).toBe("cards");
  expect(unsupportedProps.dataAttributes["data-page-variant"]).toBe("default");
  expect(unsupportedProps.contentClassName).toContain("page-section-template-hero-default");
  expect(renderToStaticMarkup(<PageSectionRender section={split} />)).toContain(
    'data-page-variant="split"'
  );
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

test("block render props expose shared classes, styles, and data attributes", () => {
  const block = createPageBlockV2("heading", {
    id: "blk-styled-renderer",
    props: { text: "Styled headline", level: "h2", align: "left" },
    style: {
      width: "full",
      align: "center",
      textColor: "#111827",
      background: "#fef3c7",
      backgroundType: "color",
      opacity: 0.5,
      radius: 18,
      shadow: "md",
      borderColor: "#334155",
      padding: { top: 4, right: 8, bottom: 12, left: 16 },
      margin: { top: 1, right: 2, bottom: 3, left: 4 },
    },
  });
  const renderProps = toPageBlockRenderProps(block);

  expect(renderProps.className).toContain("max-w-full");
  expect(renderProps.className).toContain("w-full");
  expect(renderProps.className).toContain("justify-self-center");
  expect(renderProps.style).toMatchObject({
    "--coderso-block-text": "#111827",
    "--coderso-block-surface": "#fef3c7",
    backgroundColor: "#fef3c7",
    color: "#111827",
    opacity: 0.5,
    borderRadius: "18px",
    boxShadow: "0 14px 40px rgba(15, 23, 42, 0.12)",
    borderColor: "#334155",
    borderStyle: "solid",
    borderWidth: "1px",
    padding: "4px 8px 12px 16px",
    margin: "1px 2px 3px 4px",
    textAlign: "center",
  });
  expect(renderProps.dataAttributes).toEqual({
    "data-page-block": "heading",
    "data-block-id": "blk-styled-renderer",
  });

  const html = renderToStaticMarkup(
    <PageBlockFrame block={block}>
      <span>Styled content</span>
    </PageBlockFrame>
  );
  expect(html).toContain('data-page-block="heading"');
  expect(html).toContain('data-block-id="blk-styled-renderer"');
  expect(html).toContain("--coderso-block-text:#111827");
});

test("button visual styles land on the anchor element, never the block frame", () => {
  const section = createPageSectionV2("cta", {
    id: "sec-style-target",
    blocks: [
      createPageBlockV2("button", {
        id: "blk-styled-button",
        props: { label: "Buy now", href: "/buy" },
        style: {
          align: "center",
          textColor: "#111827",
          background: "#fef3c7",
          backgroundType: "color",
          opacity: 0.8,
          radius: 12,
          shadow: "md",
          borderColor: "#334155",
          padding: { top: 4 },
          margin: { bottom: 6 },
        },
      }),
    ],
  });
  const block = section.blocks[0]!;

  // Frame keeps ONLY layout-affecting style (spacing + text alignment).
  expect(toPageBlockRenderProps(block).style).toEqual({
    padding: "4px 0px 0px 0px",
    margin: "0px 0px 6px 0px",
    textAlign: "center",
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);
  const frameTag = html.match(/<div[^>]*data-block-id="blk-styled-button"[^>]*>/)?.[0] ?? "";
  const anchorTag = html.match(/<a[^>]*>/)?.[0] ?? "";

  // The anchor is the visual element: inline values (which beat the variant
  // utility classes) carry the full visual surface plus the stable hook.
  expect(anchorTag).toContain('data-page-block-element="true"');
  expect(anchorTag).toContain("background-color:#fef3c7");
  expect(anchorTag).toContain("color:#111827");
  expect(anchorTag).toContain("opacity:0.8");
  expect(anchorTag).toContain("border-radius:12px");
  expect(anchorTag).toContain("box-shadow:0 14px 40px rgba(15, 23, 42, 0.12)");
  expect(anchorTag).toContain("border-color:#334155");
  expect(anchorTag).toContain("border-style:solid");
  expect(anchorTag).toContain("border-width:1px");
  expect(anchorTag).toContain("--coderso-block-text:#111827");

  // The frame keeps the layout surface and never paints the visual one.
  expect(frameTag).toContain("padding:4px 0px 0px 0px");
  expect(frameTag).toContain("margin:0px 0px 6px 0px");
  expect(frameTag).toContain("text-align:center");
  expect(frameTag).not.toContain("background-color");
  expect(frameTag).not.toContain("border-radius");
  expect(frameTag).not.toContain("box-shadow");
  expect(frameTag).not.toContain("opacity");
  expect(frameTag).not.toContain("color:#111827");
});

test("image visual styles land on the img element (or empty placeholder)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-image-style-target",
    blocks: [
      createPageBlockV2("image", {
        id: "blk-styled-image",
        props: { src: "/pic.jpg", alt: "Pic", caption: "A caption" },
        style: { radius: 18, borderColor: "#0f172a", shadow: "sm" },
      }),
      createPageBlockV2("image", {
        id: "blk-empty-styled-image",
        props: { src: "", alt: "" },
        style: { radius: 18 },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);
  const imgTag = html.match(/<img[^>]*>/)?.[0] ?? "";
  const frameTag = html.match(/<div[^>]*data-block-id="blk-styled-image"[^>]*>/)?.[0] ?? "";

  expect(imgTag).toContain('data-page-block-element="true"');
  expect(imgTag).toContain("border-radius:18px");
  expect(imgTag).toContain("border-color:#0f172a");
  expect(imgTag).toContain("box-shadow:0 6px 20px rgba(15, 23, 42, 0.08)");
  expect(frameTag).not.toContain("border-radius");
  expect(frameTag).not.toContain("box-shadow");

  // The empty-state placeholder stands in for the missing img element.
  const placeholderTag =
    html.match(/<div[^>]*data-page-block-element="true"[^>]*>Image<\/div>/)?.[0] ?? "";
  expect(placeholderTag).toContain("border-radius:18px");
});

test("gradient button backgrounds clear the variant background color inline", () => {
  const section = createPageSectionV2("cta", {
    id: "sec-gradient-button",
    blocks: [
      createPageBlockV2("button", {
        id: "blk-gradient-button",
        props: { label: "Go", href: "/go" },
        style: {
          background: "linear-gradient(90deg, #000000, #ffffff)",
          backgroundType: "gradient",
        },
      }),
    ],
  });
  const anchorTag =
    renderToStaticMarkup(<PageSectionContent section={section} />).match(/<a[^>]*>/)?.[0] ?? "";
  expect(anchorTag).toContain("background-image:linear-gradient(90deg, #000000, #ffffff)");
  // Inline transparent background-color keeps the variant accent class from
  // bleeding through translucent gradient stops.
  expect(anchorTag).toContain("background-color:transparent");
});

test("typography style paints inline on the exact text node, not the block frame", () => {
  const section = createPageSectionV2("content", {
    id: "sec-typography",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-typo-heading",
        props: { text: "Typo headline", level: "h1", align: "left" },
        style: {
          fontFamily: "display",
          fontSize: "2xl",
          fontWeight: "normal",
          lineHeight: 1.2,
          letterSpacing: 0.5,
        },
      }),
    ],
  });
  const block = section.blocks[0]!;

  // Owner mapping: token values resolve through the theme CSS variables.
  expect(toPageBlockTypographyStyle(block)).toEqual({
    fontFamily: pageTypographyFontFamilyCssValues.display,
    fontSize: pageTypographyFontSizeCssValues["2xl"],
    fontWeight: pageTypographyFontWeightCssValues.normal,
    lineHeight: 1.2,
    letterSpacing: "0.5px",
  });
  // The frame keeps zero typography: it would lose to the baked classes on
  // the heading element by CSS specificity/inheritance.
  expect(toPageBlockRenderProps(block).style).not.toMatchObject({
    fontFamily: expect.anything(),
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);
  const headingTag = html.match(/<h1[^>]*>/)?.[0] ?? "";
  const frameTag = html.match(/<div[^>]*data-block-id="blk-typo-heading"[^>]*>/)?.[0] ?? "";

  // Inline values on the same node beat the baked classes (text-5xl,
  // font-semibold, leading-tight) which remain as fallbacks.
  expect(headingTag).toContain('data-page-block-text="true"');
  expect(headingTag).toContain("font-family:var(--font-display");
  expect(headingTag).toContain("font-size:var(--text-2xl");
  expect(headingTag).toContain("font-weight:400");
  expect(headingTag).toContain("line-height:1.2");
  expect(headingTag).toContain("letter-spacing:0.5px");
  expect(headingTag).toContain("text-5xl");
  expect(frameTag).not.toContain("font-family");
  expect(frameTag).not.toContain("font-size");
  expect(frameTag).not.toContain("letter-spacing");
});

test("button typography lands on the anchor element with the visual surface", () => {
  const section = createPageSectionV2("cta", {
    id: "sec-typo-button",
    blocks: [
      createPageBlockV2("button", {
        id: "blk-typo-button",
        props: { label: "Buy", href: "/buy" },
        style: { fontFamily: "sans", fontSize: "lg", fontWeight: "bold", letterSpacing: 1 },
      }),
    ],
  });
  const html = renderToStaticMarkup(<PageSectionContent section={section} />);
  const anchorTag = html.match(/<a[^>]*>/)?.[0] ?? "";
  const frameTag = html.match(/<div[^>]*data-block-id="blk-typo-button"[^>]*>/)?.[0] ?? "";

  expect(anchorTag).toContain('data-page-block-element="true"');
  expect(anchorTag).toContain("font-family:var(--font-sans");
  expect(anchorTag).toContain("font-size:var(--text-lg");
  expect(anchorTag).toContain("font-weight:700");
  expect(anchorTag).toContain("letter-spacing:1px");
  expect(frameTag).not.toContain("font-size");
});

test("multi-text and flow blocks carry typography on every painted text node", () => {
  const section = createPageSectionV2("content", {
    id: "sec-typo-multi",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-typo-copy",
        props: { text: "Copy", format: "plain", align: "left" },
        style: { fontSize: "sm" },
      }),
      createPageBlockV2("quote", {
        id: "blk-typo-quote",
        props: { text: "Quoted", cite: "Cite" },
        style: { fontSize: "sm" },
      }),
      createPageBlockV2("list", {
        id: "blk-typo-list",
        props: { items: ["One"], ordered: false },
        style: { fontSize: "sm" },
      }),
      createPageBlockV2("statistic", {
        id: "blk-typo-stat",
        props: { value: "42", label: "Answers", caption: "All time" },
        style: { fontSize: "sm" },
      }),
      createPageBlockV2("card", {
        id: "blk-typo-card",
        props: { title: "Card", text: "Body" },
        style: { fontSize: "sm" },
      }),
    ],
  });
  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  // p + blockquote + ul + 3 statistic nodes + card title + card body = 8.
  expect(html.match(/data-page-block-text="true"/g)).toHaveLength(8);
  expect(html.match(/font-size:var\(--text-sm/g)).toHaveLength(8);
});

test("unset typography keeps legacy markup free of inline font styles", () => {
  const section = createPageSectionV2("content", {
    id: "sec-typo-legacy",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-legacy-heading",
        props: { text: "Legacy", level: "h2", align: "left" },
      }),
      createPageBlockV2("image", {
        id: "blk-legacy-image",
        props: { src: "/pic.jpg", alt: "Pic" },
        // Typography fields on non-text blocks are storable but never paint.
        style: { fontSize: "2xl" },
      }),
    ],
  });
  expect(toPageBlockTypographyStyle(section.blocks[0]!)).toEqual({});
  expect(toPageBlockTypographyStyle(section.blocks[1]!)).toEqual({});

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(html).not.toContain("font-family:");
  expect(html).not.toContain("font-size:");
  expect(html).not.toContain("letter-spacing:");
  // The responsive-CSS hook stays present so breakpoint-only typography
  // overrides can still target the node.
  expect(html.match(/<h2[^>]*>/)?.[0] ?? "").toContain('data-page-block-text="true"');
});

test("document renderer resolves responsive typography overrides for the public front", () => {
  const section = createPageSectionV2("content", {
    id: "sec-typo-responsive",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-typo-resp",
        props: { text: "Responsive", level: "h2", align: "left" },
        style: { fontSize: "2xl" },
        responsive: { mobile: { style: { fontSize: "sm" } } },
      }),
    ],
  });
  const document = createDocument([section]);

  const desktopHtml = renderToStaticMarkup(
    <PageDocumentRender document={document} breakpoint="desktop" />
  );
  const mobileHtml = renderToStaticMarkup(
    <PageDocumentRender document={document} breakpoint="mobile" />
  );
  expect(desktopHtml).toContain("font-size:var(--text-2xl");
  expect(mobileHtml).toContain("font-size:var(--text-sm");
});

test("shared renderer omits hidden block frames unless admin opts in", () => {
  const section = createPageSectionV2("content", {
    id: "sec-hidden-block-renderer",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-public-heading",
        props: { text: "Public headline", level: "h2", align: "left" },
      }),
      createPageBlockV2("text", {
        id: "blk-hidden-text",
        props: { text: "Hidden body", format: "plain", align: "left" },
        visibility: { visible: false },
      }),
    ],
  });

  const runtimeContent = renderToStaticMarkup(<PageSectionContent section={section} />);
  const adminContent = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      includeHiddenBlocks
      renderBlockFrame={({ block, content, renderProps }) => (
        <div {...renderProps.dataAttributes} data-admin-preview="true">
          {content ?? <span>Hidden ghost</span>}
        </div>
      )}
    />
  );

  expect(runtimeContent).toContain("Public headline");
  expect(runtimeContent).not.toContain("Hidden body");
  expect(runtimeContent).not.toContain('data-block-id="blk-hidden-text"');
  expect(adminContent).toContain('data-block-id="blk-hidden-text"');
  expect(adminContent).toContain("Hidden ghost");

  const documentHtml = renderToStaticMarkup(
    <PageDocumentRender document={createDocument([section])} />
  );
  expect(documentHtml).not.toContain('data-block-id="blk-hidden-text"');
});

test("shared renderer provides safe inert states while rendering active layout slots recursively", () => {
  const section = createPageSectionV2("content", {
    id: "sec-empty-block-placeholders",
    blocks: [
      createPageBlockV2("image", {
        id: "blk-empty-image",
        props: { src: "", alt: "", caption: "", fit: "cover" },
      }),
      createPageBlockV2("video", {
        id: "blk-empty-video",
        props: { src: "", title: "", autoplay: false, muted: true },
      }),
      createPageBlockV2("gallery", {
        id: "blk-static-gallery",
        props: {
          layout: "masonry",
          items: [
            {
              src: "https://cdn.example.test/studio.jpg",
              alt: "Studio",
              caption: "Studio view",
            },
            { title: "Planning board" },
          ],
        },
      }),
      createPageBlockV2("collection", {
        id: "blk-inert-collection",
        props: { contentTypeId: "ct-private", queryId: "query-private", limit: 6 },
      }),
      createPageBlockV2("form", {
        id: "blk-inert-form",
        props: { formId: "form-private", title: "Contact form" },
      }),
      createPageBlockV2("embed", {
        id: "blk-safe-embed",
        props: {
          html: "<script>alert(1)</script>",
          url: "https://example.test/embed",
          provider: "custom",
        },
      }),
      createPageBlockV2("columns", {
        id: "blk-layout-columns",
        props: { count: 2, gap: 24, distribution: "equal" },
        slots: {
          "column:1": [
            createPageBlockV2("heading", {
              id: "blk-nested-active",
              props: { text: "Nested active", level: "h2", align: "left" },
            }),
          ],
          "column:2": [
            createPageBlockV2("text", {
              id: "blk-hidden-nested",
              props: { text: "Hidden nested", format: "plain", align: "left" },
              visibility: { visible: false },
            }),
          ],
          "column:3": [
            createPageBlockV2("heading", {
              id: "blk-dormant-nested",
              props: { text: "Dormant nested", level: "h2", align: "left" },
            }),
          ],
        },
      }),
    ],
  });
  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('data-block-id="blk-empty-image"');
  expect(html).toContain('data-block-id="blk-empty-video"');
  expect(html).toContain('data-block-id="blk-static-gallery"');
  expect(html).toContain('data-block-id="blk-inert-collection"');
  expect(html).toContain('data-block-id="blk-inert-form"');
  expect(html).toContain('data-block-id="blk-safe-embed"');
  expect(html).toContain('data-block-id="blk-layout-columns"');
  expect(html).toContain("Image");
  expect(html).toContain("Video");
  expect(html).toContain('data-page-gallery="true"');
  expect(html).toContain('data-page-gallery-layout="masonry"');
  expect(html).toContain("https://cdn.example.test/studio.jpg");
  expect(html).toContain("Studio view");
  expect(html).toContain("Planning board");
  expect(html).toContain('data-page-block-inert="collection"');
  expect(html).toContain('data-page-block-inert="form"');
  expect(html).toContain('data-page-block-inert="embed"');
  expect(html).toContain("Contact form is not available yet.");
  expect(html).toContain('data-page-layout-block="columns"');
  expect(html).toContain('data-page-block-slot="column:1"');
  expect(html).toContain('data-page-block-slot="column:2"');
  expect(html).not.toContain('data-page-block-slot="column:3"');
  expect(html).toContain("Nested active");
  expect(html).not.toContain("Columns");
  expect(html).not.toContain("Hidden nested");
  expect(html).not.toContain("Dormant nested");
  expect(html).not.toContain("ct-private");
  expect(html).not.toContain("query-private");
  expect(html).not.toContain("form-private");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("alert(1)");
});

test("form block renders a canvas-safe inert preview in canvas layout mode (TASK-456)", () => {
  const detail = {
    form: {
      id: "form-contact",
      name: "Contact",
      status: "published",
      description: "Send us a message.",
      successMessage: "Thanks!",
      successRedirectUrl: null,
      submissionAccess: "public" as const,
      settings: { layoutMode: "single", saveProgress: false, stepTitles: [] },
    },
    fields: [
      {
        id: "fld-email",
        type: "email",
        label: "Email address",
        name: "email",
        required: true,
        settings: {},
        orderIndex: 0,
      },
    ],
  };
  const section = createPageSectionV2("content", {
    id: "sec-form-canvas",
    blocks: [
      createPageBlockV2("form", { id: "blk-form-unpicked", props: { formId: null, title: "" } }),
      createPageBlockV2("form", {
        id: "blk-form-loading",
        props: { formId: "form-pending", title: "" },
      }),
      createPageBlockV2("form", {
        id: "blk-form-ready",
        props: { formId: "form-contact", title: "Contact us" },
      }),
      createPageBlockV2("form", {
        id: "blk-form-missing",
        props: { formId: "form-deleted", title: "" },
      }),
    ],
  });
  const runtimeDataByBlockId = {
    "blk-form-ready": buildPageEditorFormPreviewBinding("form-contact", "Contact us", detail),
    "blk-form-missing": buildPageEditorFormPreviewBinding("form-deleted", null, null),
  };
  const canvasHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      layoutMode="canvas-device"
      runtimeDataByBlockId={runtimeDataByBlockId}
    />
  );

  // Unpicked form -> explicit empty state; set-but-unresolved -> loading state.
  expect(canvasHtml).toContain("Pick a form in the Content panel to preview it here.");
  expect(canvasHtml).toContain("Loading form preview...");
  // Resolved preview: the SHARED form markup, fully inert (disabled fieldset,
  // pointer events off) and without any submission nonce.
  expect(canvasHtml).toContain('data-page-editor-form-preview="inert"');
  expect(canvasHtml).toContain("pointer-events-none");
  expect(canvasHtml).toContain("<fieldset disabled");
  expect(canvasHtml).toContain("Contact us");
  expect(canvasHtml).toContain("Email address");
  // No nonce hidden input is ever emitted (the runtime client script string
  // mentions the field name, but scripts injected via innerHTML never run in
  // the admin SPA and the disabled fieldset blocks submission regardless).
  expect(canvasHtml).not.toContain('type="hidden" name="__nl_form_nonce"');
  // Dangling reference: the runtime's fail-closed boundary, not a fake form.
  expect(canvasHtml).toContain('data-form-embed-runtime-boundary="error"');
  expect(canvasHtml).toContain("This form is not available right now.");

  // Runtime parity: the default layout mode keeps the existing inert
  // fallback (no canvas copy, no fieldset wrapper) for unbound form blocks.
  const runtimeHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(runtimeHtml).not.toContain("Pick a form in the Content panel to preview it here.");
  expect(runtimeHtml).not.toContain("Loading form preview...");
  expect(runtimeHtml).not.toContain('data-page-editor-form-preview="inert"');
  expect(runtimeHtml).toContain("Form is not available yet.");
});

test("collection block renders a canvas-safe inert preview in canvas layout mode (TASK-457)", () => {
  const source = {
    contentType: { id: "ct-services", name: "Services", slug: "services" },
    entries: [
      {
        id: "entry-audit",
        title: "Site audit",
        slug: "site-audit",
        status: "published",
        data: { summary: "We review your whole site." },
        updatedAt: "2026-05-01T09:00:00.000Z",
        publishedAt: "2026-05-01T09:00:00.000Z",
      },
      {
        id: "entry-care",
        title: "Care plan",
        slug: "care-plan",
        status: "published",
        data: {},
        updatedAt: "2026-04-01T09:00:00.000Z",
        publishedAt: "2026-04-01T09:00:00.000Z",
      },
      {
        id: "entry-draft",
        title: "Unpublished service",
        slug: "unpublished-service",
        status: "draft",
        data: {},
        updatedAt: "2026-05-20T09:00:00.000Z",
      },
    ],
  };
  const readyBlock = createPageBlockV2("collection", {
    id: "blk-collection-ready",
    props: { contentTypeId: "ct-services", queryId: null, limit: 2, templateId: null },
  });
  const danglingBlock = createPageBlockV2("collection", {
    id: "blk-collection-dangling",
    props: { contentTypeId: "ct-deleted", queryId: null, limit: 6, templateId: null },
  });
  const section = createPageSectionV2("content", {
    id: "sec-collection-canvas",
    blocks: [
      createPageBlockV2("collection", {
        id: "blk-collection-unpicked",
        props: { contentTypeId: null, queryId: null, limit: 6, templateId: null },
      }),
      createPageBlockV2("collection", {
        id: "blk-collection-loading",
        props: { contentTypeId: "ct-pending", queryId: null, limit: 6, templateId: null },
      }),
      readyBlock,
      danglingBlock,
    ],
  });
  const runtimeDataByBlockId = {
    "blk-collection-ready": buildPageEditorCollectionPreviewBinding(readyBlock, source),
    "blk-collection-dangling": buildPageEditorCollectionPreviewBinding(danglingBlock, null),
  };
  const canvasHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      layoutMode="canvas-device"
      runtimeDataByBlockId={runtimeDataByBlockId}
    />
  );

  // Unpicked type -> explicit empty state; set-but-unresolved -> loading.
  expect(canvasHtml).toContain("Pick a content type in the Content panel to preview entries here.");
  expect(canvasHtml).toContain("Loading collection preview...");
  // Resolved preview: the SHARED content-list markup, pointer events off so
  // entry links never navigate inside the canvas; published entries only,
  // limit respected (the draft entry and the third slot never render).
  expect(canvasHtml).toContain('data-page-editor-collection-preview="inert"');
  expect(canvasHtml).toContain("pointer-events-none");
  expect(canvasHtml).toContain("Site audit");
  expect(canvasHtml).toContain("Care plan");
  expect(canvasHtml).toContain("We review your whole site.");
  expect(canvasHtml).not.toContain("Unpublished service");
  // Dangling content type: the runtime's fail-closed boundary, no fake list.
  expect(canvasHtml).toContain('data-page-block-inert="collection"');
  expect(canvasHtml).toContain("Collection content is not available yet.");

  // Runtime parity: the default layout mode keeps the existing inert
  // fallback (no canvas copy, no inert preview wrapper) for unbound blocks.
  const runtimeHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(runtimeHtml).not.toContain(
    "Pick a content type in the Content panel to preview entries here."
  );
  expect(runtimeHtml).not.toContain("Loading collection preview...");
  expect(runtimeHtml).not.toContain('data-page-editor-collection-preview="inert"');
  expect(runtimeHtml).toContain("Collection content is not available yet.");
});

test("gallery renderer exposes a bounded empty state for empty item arrays", () => {
  const section = createPageSectionV2("content", {
    id: "sec-empty-gallery",
    blocks: [
      createPageBlockV2("gallery", {
        id: "blk-empty-gallery",
        props: { items: [], layout: "grid" },
      }),
    ],
  });
  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('data-block-id="blk-empty-gallery"');
  expect(html).toContain('data-page-gallery-empty="true"');
  expect(html).toContain("Empty gallery");
});

test("admin preview frame callback receives recursive block path metadata", () => {
  const section = createPageSectionV2("content", {
    id: "sec-frame-paths",
    blocks: [
      createPageBlockV2("container", {
        id: "blk-container",
        slots: {
          children: [
            createPageBlockV2("group", {
              id: "blk-group",
              slots: {
                children: [
                  createPageBlockV2("heading", {
                    id: "blk-nested-heading",
                    props: { text: "Nested frame", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
          ],
        },
      }),
    ],
  });
  const frames: Array<{
    id: string;
    path: string;
    depth: number;
    slotKey?: string;
    parentId?: string;
  }> = [];

  renderToStaticMarkup(
    <PageSectionContent
      section={section}
      renderBlockFrame={({ block, content, blockPath, depth, slotKey, parentBlock }) => {
        frames.push({
          id: block.id,
          path: serializePageBlockPath(blockPath),
          depth,
          slotKey,
          parentId: parentBlock?.id,
        });
        return <div data-frame-id={block.id}>{content}</div>;
      }}
    />
  );

  expect(frames).toContainEqual({
    id: "blk-container",
    path: "root:0",
    depth: 1,
    slotKey: undefined,
    parentId: undefined,
  });
  expect(frames).toContainEqual({
    id: "blk-group",
    path: "root:0/children:0",
    depth: 2,
    slotKey: "children",
    parentId: "blk-container",
  });
  expect(frames).toContainEqual({
    id: "blk-nested-heading",
    path: "root:0/children:0/children:0",
    depth: 3,
    slotKey: "children",
    parentId: "blk-group",
  });
});

test("document renderer resolves responsive block overrides before rendering", () => {
  const section = createPageSectionV2("hero", {
    id: "sec-responsive-renderer",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-responsive-heading",
        props: { text: "Desktop headline", level: "h1", align: "center" },
        responsive: {
          mobile: { props: { text: "Mobile headline" } },
        },
      }),
      createPageBlockV2("container", {
        id: "blk-responsive-container",
        slots: {
          children: [
            createPageBlockV2("heading", {
              id: "blk-responsive-nested-heading",
              props: { text: "Desktop nested headline", level: "h2", align: "left" },
              responsive: {
                mobile: { props: { text: "Mobile nested headline" } },
              },
            }),
          ],
        },
      }),
    ],
  });
  const document = createDocument([section]);

  expect(resolvePageRenderTree(document, "mobile").sections[0]?.blocks[0]?.props.text).toBe(
    "Mobile headline"
  );
  expect(
    resolvePageRenderTree(document, "mobile").sections[0]?.blocks[1]?.slots?.children?.[0]?.props
      .text
  ).toBe("Mobile nested headline");
  const html = renderToStaticMarkup(<PageDocumentRender document={document} breakpoint="mobile" />);
  expect(html).toContain('data-page-v2="true"');
  expect(html).toContain("Mobile headline");
  expect(html).toContain("Mobile nested headline");
  expect(html).not.toContain("Desktop headline");
  expect(html).not.toContain("Desktop nested headline");
});

test("document renderer omits hidden sections outside admin chrome", () => {
  const visibleSection = createPageSectionV2("content", {
    id: "sec-visible-renderer",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-visible-heading",
        props: { text: "Visible headline", level: "h2", align: "left" },
      }),
    ],
  });
  const hiddenSection = createPageSectionV2("content", {
    id: "sec-hidden-renderer",
    visibility: {
      visible: false,
      authOnly: false,
      anchor: "hidden",
      startsAt: null,
      endsAt: null,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-hidden-heading",
        props: { text: "Hidden headline", level: "h2", align: "left" },
      }),
    ],
  });
  const html = renderToStaticMarkup(
    <PageDocumentRender document={createDocument([visibleSection, hiddenSection])} />
  );

  expect(html).toContain("Visible headline");
  expect(html).not.toContain("Hidden headline");
  expect(html).not.toContain('data-section-id="sec-hidden-renderer"');
});

test("shared renderer remains inside the Bun-free Pages service boundary", () => {
  const source = readFileSync("core/services/pages/pageRendererV2.tsx", "utf8");

  expect(source).toContain('from "./pageDocumentV2"');
  expect(source).not.toMatch(/@\/|db\/client|settingsService|pagesClient|server\/|core\/site/);
});

test("front render of multi-column grids keeps editor ghost affordances out of the markup", () => {
  const emptyGridSection = createPageSectionV2("content", {
    id: "sec-empty-grid",
    layout: { columns: 3, align: "start", justify: "start", maxWidth: 1100 },
    blocks: [],
  });
  const gridSection = createPageSectionV2("content", {
    id: "sec-grid",
    layout: { columns: 2, align: "start", justify: "start", maxWidth: 1100 },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-grid-heading",
        props: { text: "Grid heading", level: "h2", align: "left" },
      }),
      createPageBlockV2("columns", {
        id: "blk-grid-columns",
        props: { count: 2, gap: 24, distribution: "equal" },
        slots: {
          "column:1": [
            createPageBlockV2("text", {
              id: "blk-grid-copy",
              props: { text: "Column copy", format: "plain", align: "left" },
            }),
          ],
        },
      }),
    ],
  });
  const html = renderToStaticMarkup(
    <PageDocumentRender document={createDocument([emptyGridSection, gridSection])} />
  );

  expect(html).toContain('data-section-id="sec-grid"');
  expect(html).toContain('data-page-block-slot="column:1"');
  expect(html).toContain('data-page-block-slot="column:2"');
  // Front parity guard: ghost add tiles are editor-only chrome and must never
  // serialize into public markup, even for empty grids and empty column slots.
  expect(html).not.toContain("data-page-editor");
  expect(html).not.toContain("Add block");
  expect(html).not.toContain("Add the first block");
});

test("row-direction group renders two buttons side by side on front and canvas (owner finding #7)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-row-group",
    blocks: [
      createPageBlockV2("group", {
        id: "blk-row-group",
        props: { direction: "row", wrap: false, gap: 16 },
        slots: {
          children: [
            createPageBlockV2("button", {
              id: "blk-cta-first",
              props: {
                label: "First action",
                href: "/a",
                target: "self",
                variant: "primary",
                size: "md",
              },
            }),
            createPageBlockV2("button", {
              id: "blk-cta-second",
              props: {
                label: "Second action",
                href: "/b",
                target: "self",
                variant: "primary",
                size: "md",
              },
            }),
          ],
        },
      }),
    ],
  });

  const front = renderToStaticMarkup(<PageSectionRender section={section} />);
  expect(front).toContain('data-page-block-slot="children"');
  expect(front).toContain("flex flex-row");
  expect(front.match(/<a\s/g) ?? []).toHaveLength(2);
  expect(front.indexOf("First action")).toBeLessThan(front.indexOf("Second action"));

  const canvas = renderToStaticMarkup(
    <PageSectionContent section={section} layoutMode="canvas-device" />
  );
  expect(canvas).toContain("flex flex-row");
  expect(canvas.match(/<a\s/g) ?? []).toHaveLength(2);
});

test("admin columns-slot trailing hook renders per active slot and never on runtime paths", () => {
  const section = createPageSectionV2("content", {
    id: "sec-slot-hook",
    blocks: [
      createPageBlockV2("columns", {
        id: "blk-hook-columns",
        props: { count: 2, gap: 24, distribution: "equal" },
        slots: {
          "column:1": [
            createPageBlockV2("heading", {
              id: "blk-hook-heading",
              props: { text: "Slot child", level: "h2", align: "left" },
            }),
          ],
        },
      }),
    ],
  });

  const calls: Array<{ slotKey: string; childCount: number; ownerPath: string }> = [];
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      layoutMode="canvas-device"
      renderColumnsSlotTrailing={({ slotKey, ownerPath, childCount }) => {
        calls.push({ slotKey, childCount, ownerPath: serializePageBlockPath(ownerPath) });
        return (
          <button type="button" data-page-editor-ghost="columns-slot">
            Add block
          </button>
        );
      }}
      trailingContent={
        <button type="button" data-page-editor-ghost="section-append">
          Add block
        </button>
      }
    />
  );

  expect(calls).toEqual([
    { slotKey: "column:1", childCount: 1, ownerPath: "root:0" },
    { slotKey: "column:2", childCount: 0, ownerPath: "root:0" },
  ]);
  expect(html.match(/data-page-editor-ghost="columns-slot"/g)).toHaveLength(2);
  expect(html).toContain('data-page-editor-ghost="section-append"');

  const runtime = renderToStaticMarkup(<PageSectionRender section={section} />);
  expect(runtime).not.toContain("data-page-editor-ghost");
});

// --- Section per-column composition (owner finding #5, round 3) ---

const createTwoColumnSection = (blocks: PageSectionV2["blocks"]) =>
  createPageSectionV2("content", {
    id: "sec-column-composition",
    name: "Column composition",
    layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
    blocks,
  });

const compositionBlocks = (columns: Array<number | null>) =>
  columns.map((column, index) =>
    createPageBlockV2("text", {
      id: `blk-col-${index + 1}`,
      props: { text: `Copy ${index + 1}`, format: "plain", align: "left" },
      ...(column === null ? {} : { style: { column } }),
    })
  );

test("section without column assignments keeps the auto-flow markup byte-identical (legacy pin)", () => {
  // Documents authored before `style.column` existed never carry the field;
  // an explicit `column: null` is the normalized "legacy auto-flow" value.
  // Both must produce the exact same wrapper-free auto-flow markup.
  const unset = createTwoColumnSection(compositionBlocks([null, null, null]));
  const explicitNull = createTwoColumnSection(
    compositionBlocks([null, null, null]).map((block) => ({
      ...block,
      style: { ...(block.style ?? {}), column: null },
    }))
  );

  const unsetMarkup = renderToStaticMarkup(<PageSectionContent section={unset} />);
  const explicitNullMarkup = renderToStaticMarkup(<PageSectionContent section={explicitNull} />);
  expect(explicitNullMarkup).toBe(unsetMarkup);
  // No per-column wrappers: blocks stay direct auto-flow grid children, in
  // stored order, immediately inside the section content element.
  expect(unsetMarkup).not.toContain("data-page-section-column");
  expect(unsetMarkup.indexOf("blk-col-1")).toBeLessThan(unsetMarkup.indexOf("blk-col-2"));
  expect(unsetMarkup.indexOf("blk-col-2")).toBeLessThan(unsetMarkup.indexOf("blk-col-3"));
  expect(/data-page-section-layout-mode="runtime"><div class="max-w-full/.test(unsetMarkup)).toBe(
    true
  );
});

test("section column assignments render per-column wrapper stacks with legacy cells for unassigned blocks", () => {
  // Hero starter shape: three blocks pinned to column 1, plus one unassigned
  // block at index 3 (legacy auto-flow cell 3 % 2 -> column 2) and one
  // out-of-range assignment that clamps into the last painted column.
  const section = createTwoColumnSection(compositionBlocks([1, 1, 1, null, 4]));
  const markup = renderToStaticMarkup(<PageSectionContent section={section} />);

  const wrappers = markup.split('data-page-section-column="').slice(1);
  expect(wrappers).toHaveLength(2);
  const [columnOne, columnTwo] = wrappers as [string, string];
  expect(columnOne.startsWith("1")).toBe(true);
  expect(columnTwo.startsWith("2")).toBe(true);
  for (const id of ["blk-col-1", "blk-col-2", "blk-col-3"]) {
    expect(columnOne).toContain(id);
    expect(columnTwo.includes(id)).toBe(false);
  }
  // Unassigned block keeps its legacy visual cell; column 4 clamps to 2.
  expect(columnTwo).toContain("blk-col-4");
  expect(columnTwo).toContain("blk-col-5");
  expect(columnTwo.indexOf("blk-col-4")).toBeLessThan(columnTwo.indexOf("blk-col-5"));
  // Wrappers inherit the section gap so vertical rhythm matches auto-flow.
  expect(markup).toContain("gap:inherit");
  expect(markup).toContain('data-page-section-column-owner="sec-column-composition"');
});

test("section column composition keeps canvas/front parity and runtime renders no ghost affordances", () => {
  const section = createTwoColumnSection(compositionBlocks([1, null, 2]));
  const runtime = renderToStaticMarkup(<PageSectionContent section={section} />);
  const admin = renderToStaticMarkup(
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
  expect(admin.replaceAll(' data-editor-chrome="true"', "")).toBe(runtime);
  expect(runtime).not.toContain("data-page-editor-ghost");

  // The per-column trailing hook is admin-only chrome: it fires once per
  // composition column AFTER that column's blocks, and runtime paths that
  // never pass it stay unchanged.
  const calls: Array<{ column: number; childCount: number }> = [];
  const canvas = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      layoutMode="canvas-device"
      renderSectionColumnTrailing={({ column, childCount }) => {
        calls.push({ column, childCount });
        return (
          <button type="button" data-page-editor-ghost="section-column-append">
            Add block
          </button>
        );
      }}
    />
  );
  expect(calls).toEqual([
    { column: 1, childCount: 1 },
    { column: 2, childCount: 2 },
  ]);
  expect(canvas.match(/data-page-editor-ghost="section-column-append"/g)).toHaveLength(2);
});

test("stackVertical collapses column wrappers into one stacked column without losing composition", () => {
  const base = createTwoColumnSection(compositionBlocks([1, 1, null]));
  const stacked: PageSectionV2 = { ...base, layout: { ...base.layout, stackVertical: true } };
  const markup = renderToStaticMarkup(
    <PageSectionContent section={stacked} layoutMode="canvas-device" />
  );
  // The grid collapses to a single column while the wrapper DOM (derived from
  // the composition count, not the collapsed count) keeps the column groups —
  // mirroring the front's grid-cols-1 media collapse over base markup.
  expect(markup).toContain("grid-cols-1");
  expect(markup.match(/data-page-section-column="/g)).toHaveLength(2);
});
