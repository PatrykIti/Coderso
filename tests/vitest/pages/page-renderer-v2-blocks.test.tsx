import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  PageBlockFrame,
  PageDocumentRender,
  PageSectionContent,
  PageSectionRender,
  toPageBlockRenderProps,
  toPageBlockTypographyStyle,
} from "../../../core/services/pages/pageRendererV2";

import {
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
} from "../../../core/services/pages/pageDocumentV2";

const createDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
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
      borderWidth: 2,
      borderStyle: "dotted",
      padding: { top: 4, right: 8, bottom: 12, left: 16 },
      margin: { top: 1, right: 2, bottom: 3, left: 4 },
    },
  });
  const renderProps = toPageBlockRenderProps(block);

  expect(renderProps.className).toContain("max-w-full");
  expect(renderProps.className).toContain("w-fit");
  expect(renderProps.className.split(/\s+/)).not.toContain("w-full");
  expect(renderProps.className).toContain("justify-self-center");
  expect(renderProps.className).toContain("mx-auto");
  expect(renderProps.style).toMatchObject({
    "--coderso-block-text": "#111827",
    "--coderso-block-surface": "#fef3c7",
    backgroundColor: "#fef3c7",
    color: "#111827",
    opacity: 0.5,
    borderRadius: "18px",
    boxShadow: "0 14px 40px rgba(15, 23, 42, 0.12)",
    borderColor: "#334155",
    borderStyle: "dotted",
    borderWidth: "2px",
    padding: "4px 8px 12px 16px",
    marginTop: "1px",
    marginLeft: "auto",
    marginBottom: "3px",
    marginRight: "auto",
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

test("right-aligned media block boxes keep fit width and end alignment", () => {
  const block = createPageBlockV2("image", {
    id: "blk-right-image",
    style: { width: "full", align: "right" },
  });
  const renderProps = toPageBlockRenderProps(block);

  expect(renderProps.className).toContain("w-fit");
  expect(renderProps.className.split(/\s+/)).not.toContain("w-full");
  expect(renderProps.className).toContain("justify-self-end");
  expect(renderProps.className).toContain("ml-auto");
  expect(renderProps.style).toMatchObject({
    marginLeft: "auto",
    textAlign: "right",
  });
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
    marginTop: "0px",
    marginLeft: "auto",
    marginBottom: "6px",
    marginRight: "auto",
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
  expect(frameTag).toContain("margin-top:0px");
  expect(frameTag).toContain("margin-left:auto");
  expect(frameTag).toContain("margin-bottom:6px");
  expect(frameTag).toContain("margin-right:auto");
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
  // Inline transparent background-color keeps the variant accent fallback
  // from bleeding through translucent gradient stops.
  expect(anchorTag).toContain("background-color:transparent");
});

test("block image backgrounds render as escaped cover media and reject unsafe urls", () => {
  const safeBlock = createPageBlockV2("heading", {
    id: "blk-image-background",
    props: { text: "Image background", level: "h2", align: "left" },
    style: {
      backgroundType: "image",
      backgroundImage: '/uploads/hero "wide".jpg',
      background: "#f8fafc",
    },
  });
  expect(toPageBlockRenderProps(safeBlock).style).toMatchObject({
    backgroundImage: 'url("/uploads/hero \\"wide\\".jpg")',
    backgroundSize: "cover",
    backgroundPosition: "center",
  });

  const unsafeBlock = createPageBlockV2("heading", {
    id: "blk-unsafe-background",
    props: { text: "Unsafe background", level: "h2", align: "left" },
    style: {
      backgroundType: "image",
      backgroundImage: "javascript:alert(1)",
    },
  });
  expect(toPageBlockRenderProps(unsafeBlock).style.backgroundImage).toBeUndefined();
});

test("primary button section accent lands inline instead of relying on generated CSS", () => {
  const section = createPageSectionV2("cta", {
    id: "sec-button-accent",
    style: {
      background: "#ffffff",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#00ff00",
      radius: 0,
      shadow: "none",
    },
    blocks: [
      createPageBlockV2("button", {
        id: "blk-primary-accent",
        props: { label: "Accent", href: "/accent", target: "self", variant: "primary" },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionRender section={section} />);
  const contentTag =
    html.match(/<div[^>]*data-page-section-layout-mode="runtime"[^>]*>/)?.[0] ?? "";
  const anchorTag = html.match(/<a[^>]*>/)?.[0] ?? "";

  expect(contentTag).toContain("--coderso-section-accent:#00ff00");
  expect(anchorTag).toContain("background-color:var(--coderso-section-accent,#0d9488)");
  expect(anchorTag).toContain("color:var(--coderso-block-text,#ffffff)");
  expect(anchorTag).not.toContain("bg-[var(--coderso-section-accent");
});

test("button variant and size props change the rendered anchor surface", () => {
  const section = createPageSectionV2("cta", {
    id: "sec-button-variants",
    blocks: [
      createPageBlockV2("button", {
        id: "blk-secondary-small",
        props: {
          label: "Secondary",
          href: "/secondary",
          target: "self",
          variant: "secondary",
          size: "sm",
        },
      }),
      createPageBlockV2("button", {
        id: "blk-link-large",
        props: { label: "Link", href: "/link", target: "self", variant: "link", size: "lg" },
      }),
    ],
  });

  const anchorTags = Array.from(
    renderToStaticMarkup(<PageSectionContent section={section} />).matchAll(/<a[^>]*>/g),
    (match) => match[0]
  );

  expect(anchorTags[0]).toContain('href="/secondary"');
  expect(anchorTags[0]).toContain("border-color:var(--coderso-section-accent,#0d9488)");
  expect(anchorTags[0]).toContain("color:var(--coderso-section-accent,#0d9488)");
  expect(anchorTags[0]).toContain("border");
  expect(anchorTags[0]).toContain("px-3");
  expect(anchorTags[0]).toContain("py-2");
  expect(anchorTags[1]).toContain('href="/link"');
  expect(anchorTags[1]).toContain("underline");
  expect(anchorTags[1]).toContain("color:var(--coderso-section-accent,#0d9488)");
  expect(anchorTags[1]).toContain("text-lg");
  expect(anchorTags[1]).not.toContain("px-5");
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
          fontSize: "xs",
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
    fontSize: pageTypographyFontSizeCssValues.xs,
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
  expect(headingTag).toContain("font-size:var(--text-xs");
  expect(headingTag).toContain("font-weight:400");
  expect(headingTag).toContain("line-height:1.2");
  expect(headingTag).toContain("letter-spacing:0.5px");
  expect(headingTag).toContain("text-5xl");
  expect(frameTag).not.toContain("font-family");
  expect(frameTag).not.toContain("font-size");
  expect(frameTag).not.toContain("letter-spacing");
});

test("text marks render safe inline elements and drop unsafe values", () => {
  const section = createPageSectionV2("content", {
    id: "sec-text-marks",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-marked-heading",
        props: {
          text: "Hello world",
          level: "h2",
          align: "left",
          marks: [
            { type: "color", from: 0, to: 5, color: "#ef4444" },
            { type: "highlight", from: 0, to: 5, color: "var(--color-accent)" },
            { type: "bold", from: 0, to: 5 },
            { type: "italic", from: 6, to: 11 },
            { type: "link", from: 6, to: 11, href: "/world" },
          ],
        },
      }),
    ],
  });
  (section.blocks[0]!.props.marks as unknown[]).push(
    { type: "color", from: 6, to: 11, color: "url(javascript:alert(1))" },
    { type: "link", from: 0, to: 5, href: "javascript:alert(1)" }
  );

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('data-page-text-mark="color highlight"');
  expect(html).toContain('style="color:#ef4444;background-color:var(--color-accent)"');
  expect(html).toContain("<strong");
  expect(html).toContain("<em");
  // The link mark renders a styled anchor (underline + link color token) while
  // still carrying rel + the sanitized href.
  expect(html).toMatch(
    /<a href="\/world" class="[^"]*underline[^"]*" data-page-text-mark="link" rel="nofollow noreferrer">/
  );
  expect(html).toContain("<span");
  expect(html).toContain(">Hello</span>");
  expect(html).not.toContain("javascript");
  expect(html).not.toContain("url(");
});

test("link mark renders a token-styled anchor with rel and sanitized href", () => {
  const section = createPageSectionV2("content", {
    id: "sec-link-mark",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-link-mark",
        props: {
          text: "Visit page now",
          format: "plain",
          align: "left",
          marks: [{ type: "link", from: 6, to: 10, href: "/page" }],
        },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);
  const anchor = /<a [^>]*href="\/page"[^>]*>/.exec(html)?.[0] ?? "";

  // Visual affordance: a deterministic link class with an underline + link color
  // token, applied on both front and canvas (renderer-applied, not stored).
  expect(anchor).toContain("underline");
  expect(anchor).toContain("var(--coderso-link,#2563eb)");
  // Editor-only marker so linked runs can be outlined distinctly.
  expect(anchor).toContain('data-page-text-mark="link"');
  // Security contract is preserved: rel + the sanitized href.
  expect(anchor).toContain('rel="nofollow noreferrer"');
  expect(anchor).toContain('href="/page"');
  expect(html).toContain(">page</a>");
});

test("link mark drops an unsafe href and renders no anchor", () => {
  const section = createPageSectionV2("content", {
    id: "sec-link-mark-unsafe",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-link-mark-unsafe",
        props: {
          text: "Click here",
          format: "plain",
          align: "left",
          marks: [{ type: "link", from: 0, to: 5, href: "javascript:alert(1)" }],
        },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).not.toContain("<a");
  expect(html).not.toContain("javascript");
  expect(html).toContain("Click here");
});

test("link mark paints a non-navigating span in the canvas but a real anchor on the front (TASK-478-02)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-link-canvas",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-link-canvas",
        props: {
          text: "Visit page now",
          format: "plain",
          align: "left",
          marks: [{ type: "link", from: 6, to: 10, href: "/page" }],
        },
      }),
    ],
  });

  // Front / preview (runtime layout): a real, navigable anchor with the security rel.
  const frontHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(frontHtml).toMatch(/<a [^>]*href="\/page"[^>]*rel="nofollow noreferrer"[^>]*>/);

  // Editor canvas: the linked run is a NON-navigating span (no <a>, no href) so a
  // click selects the fragment instead of opening the URL / firing beforeunload.
  // The link affordance (underline + link-color token + the mark marker) is kept.
  const canvasHtml = renderToStaticMarkup(
    <PageSectionContent section={section} layoutMode="canvas-device" />
  );
  expect(canvasHtml).not.toContain("<a");
  expect(canvasHtml).not.toContain('href="/page"');
  expect(canvasHtml).toContain('data-page-editor-link-noop="true"');
  const noopSpan = /<span [^>]*data-page-editor-link-noop="true"[^>]*>/.exec(canvasHtml)?.[0] ?? "";
  expect(noopSpan).toContain('data-page-text-mark="link"');
  expect(noopSpan).toContain("underline");
  expect(noopSpan).toContain("var(--coderso-link,#2563eb)");
  expect(canvasHtml).toContain(">page</span>");
});

test("badge blocks render native safe pills with token-backed sizing", () => {
  const section = createPageSectionV2("content", {
    id: "sec-badge",
    blocks: [
      createPageBlockV2("badge", {
        id: "blk-badge",
        props: {
          text: "Beta",
          variant: "outline",
          size: "2xs",
          shape: "rounded",
          weight: "bold",
          background: "#ef4444",
          textColor: "#111827",
          icon: "not-in-allowlist",
          iconPosition: "start",
        },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('data-page-badge="true"');
  expect(html).toContain('data-page-badge-variant="outline"');
  expect(html).toContain('data-page-badge-size="2xs"');
  expect(html).toContain('data-page-badge-shape="rounded"');
  expect(html).toContain("font-size:var(--text-2xs");
  expect(html).toContain("font-weight:700");
  expect(html).toContain("background-color:#ef4444");
  expect(html).toContain("color:#111827");
  expect(html).toContain(">Beta</span>");
  expect(html).not.toContain("not-in-allowlist");
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

test("rich text blocks render sanitized rich output instead of plain source", () => {
  const section = createPageSectionV2("content", {
    id: "sec-rich-text",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-rich-text",
        props: {
          text: '<p>Hello <strong>rich</strong> <code>mono</code> <script>alert(1)</script><a href="javascript:alert(1)">bad</a> <a href="/safe">safe</a><br />Tail</p>',
          format: "rich",
          align: "center",
        },
        style: { fontFamily: "display", fontSize: "lg", fontWeight: "normal", lineHeight: 1.6 },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);
  const paragraphTag = html.match(/<p[^>]*>/)?.[0] ?? "";
  const strongTag = html.match(/<strong[^>]*>/)?.[0] ?? "";
  const codeTag = html.match(/<code[^>]*>/)?.[0] ?? "";

  expect(html).toContain("<strong");
  expect(html).toContain(">rich</strong>");
  expect(html).toContain("<code>mono</code>");
  expect(html).toContain('href="/safe"');
  expect(html).toContain('rel="nofollow noreferrer"');
  expect(html).toContain("<br/>Tail");
  expect(html).toContain("text-center");
  expect(paragraphTag).toContain('data-page-block-text="true"');
  expect(paragraphTag).toContain("font-family:var(--font-display");
  expect(paragraphTag).toContain("font-size:var(--text-lg");
  expect(paragraphTag).toContain("font-weight:400");
  expect(paragraphTag).toContain("line-height:1.6");
  expect(strongTag).not.toContain("style=");
  expect(strongTag).not.toContain('data-page-block-text="true"');
  expect(codeTag).not.toContain("style=");
  expect(codeTag).not.toContain('data-page-block-text="true"');
  expect(html.match(/<div[^>]*class="prose[^>]*>/)?.[0] ?? "").not.toContain(
    'data-page-block-text="true"'
  );
  expect(html).not.toContain("<script");
  expect(html).not.toContain("alert(1)");
  expect(html).not.toContain("javascript:");
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

test("card image and href props render on the public card output", () => {
  const section = createPageSectionV2("content", {
    id: "sec-card-runtime",
    blocks: [
      createPageBlockV2("card", {
        id: "blk-card-linked",
        props: {
          title: "Case study",
          text: "Detailed outcome.",
          image: "https://cdn.example.test/card.jpg",
          href: "/case-study",
        },
      }),
      createPageBlockV2("card", {
        id: "blk-card-unsafe",
        props: {
          title: "Unsafe",
          text: "Sanitized.",
          image: "javascript:alert(1)",
          href: "javascript:alert(1)",
        },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('src="https://cdn.example.test/card.jpg"');
  expect(html).toContain('href="/case-study"');
  expect(html).toContain(">Case study</a>");
  expect(html).not.toContain("javascript:");
});

test("image fit prop changes the rendered image object-fit class", () => {
  const section = createPageSectionV2("content", {
    id: "sec-image-fit",
    blocks: [
      createPageBlockV2("image", {
        id: "blk-image-contain",
        props: {
          src: "https://cdn.example.test/contain.jpg",
          alt: "Contain image",
          fit: "contain",
        },
      }),
      createPageBlockV2("image", {
        id: "blk-image-cover",
        props: {
          src: "https://cdn.example.test/cover.jpg",
          alt: "Cover image",
          fit: "cover",
        },
      }),
    ],
  });

  const imgTags = Array.from(
    renderToStaticMarkup(<PageSectionContent section={section} />).matchAll(/<img[^>]*>/g),
    (match) => match[0]
  );

  expect(imgTags[0]).toContain('src="https://cdn.example.test/contain.jpg"');
  expect(imgTags[0]).toContain("object-contain");
  expect(imgTags[0]).not.toContain("object-cover");
  expect(imgTags[1]).toContain('src="https://cdn.example.test/cover.jpg"');
  expect(imgTags[1]).toContain("object-cover");
  expect(imgTags[1]).not.toContain("object-contain");
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
