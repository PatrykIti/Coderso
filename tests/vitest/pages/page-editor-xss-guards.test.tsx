import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PageDocumentRender,
  PageSectionContent,
  toPageBlockStyle,
  toPageSectionRenderProps,
} from "../../../core/services/pages/pageRendererV2";
import type { PageRuntimeDataByBlockId } from "../../../core/services/pages/pageRuntimeBindingContract";

const unsafeSection: PageSectionV2 = {
  id: "sec-unsafe",
  type: "hero",
  name: "Unsafe",
  variant: "centered",
  layout: { columns: 1, align: "center", justify: "center", maxWidth: 960, stackVertical: false },
  style: {
    background: "url(javascript:alert(1))",
    backgroundType: "image",
    backgroundImage: "javascript:alert(1)",
    accent: "red;}body{display:none",
    radius: 0,
    shadow: "none",
  },
  spacing: { paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16, gap: 12 },
  visibility: { visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null },
  responsive: {},
  blocks: [
    {
      id: "blk-button",
      type: "button",
      props: { label: "Open", href: "javascript:alert(1)", target: "self" },
      style: {
        textColor: "red;}body{display:none",
        backgroundType: "gradient",
        background: "url(javascript:alert(1))",
        borderColor: "red;}body{display:none",
      },
      visibility: { visible: true },
    },
    {
      id: "blk-list",
      type: "list",
      props: { items: [{ label: "Bad link", href: "javascript:alert(1)" }] },
      visibility: { visible: true },
    },
    {
      id: "blk-image",
      type: "image",
      props: { src: "data:text/html,<svg onload=alert(1)>", alt: "Unsafe" },
      visibility: { visible: true },
    },
    {
      id: "blk-video",
      type: "video",
      props: { src: "vbscript:msgbox(1)", muted: true },
      visibility: { visible: true },
    },
    {
      id: "blk-gallery",
      type: "gallery",
      props: {
        items: [{ src: "javascript:alert(1)", caption: "Caption fallback" }],
        layout: "grid",
      },
      visibility: { visible: true },
    },
    {
      id: "blk-embed",
      type: "embed",
      props: { provider: "youtube", url: "javascript:alert(1)", html: "" },
      visibility: { visible: true },
    },
  ],
};

const assertNoExecutablePayload = (html: string) => {
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("data:text/html");
  expect(html).not.toContain("vbscript:");
  expect(html).not.toContain("url(javascript:");
  expect(html).not.toContain("<script");
  expect(html).not.toContain("onload=");
  expect(html).not.toContain("body{display:none");
};

test("Page v2 renderer fails closed for unsafe legacy href, src, and style values", () => {
  const runtimeDataByBlockId: PageRuntimeDataByBlockId = {
    "blk-embed": {
      kind: "embed",
      iframeSrc: "javascript:alert(1)",
      iframeTitle: "Unsafe iframe",
      sanitizedHtml: "",
    },
  };

  const html = renderToStaticMarkup(
    <PageSectionContent section={unsafeSection} runtimeDataByBlockId={runtimeDataByBlockId} />
  );

  assertNoExecutablePayload(html);
  expect(html).toContain('href="#"');
  expect(html).toContain("Bad link");
  expect(html).toContain("Image");
  expect(html).toContain("Video");
  expect(html).toContain("Caption fallback");
  expect(html).toContain("Embed content is not available yet.");

  expect(toPageSectionRenderProps(unsafeSection).style.backgroundImage).toBeUndefined();
  expect(toPageSectionRenderProps(unsafeSection).style["--coderso-section-accent"]).toBeUndefined();
  expect(toPageBlockStyle(unsafeSection.blocks[0]!).backgroundImage).toBeUndefined();
  expect(toPageBlockStyle(unsafeSection.blocks[0]!).color).toBeUndefined();
});

test("Page v2 renderer preserves safe contact links while sanitizing href sinks", () => {
  const section: PageSectionV2 = {
    ...unsafeSection,
    style: {
      background: "#ffffff",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
    },
    blocks: [
      {
        id: "blk-mail-button",
        type: "button",
        props: { label: "Email", href: "mailto:hello@example.com", target: "self" },
        visibility: { visible: true },
      },
      {
        id: "blk-tel-list",
        type: "list",
        props: { items: [{ label: "Call", href: "tel:+15550100" }] },
        visibility: { visible: true },
      },
    ],
  };

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('href="mailto:hello@example.com"');
  expect(html).toContain('href="tel:+15550100"');
  assertNoExecutablePayload(html);
});

test("Page document renderer does not surface unsafe payloads from section trees", () => {
  const document: PageDocumentV2 = {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: { template: "page-v2", showInNav: true },
    sections: [unsafeSection],
  };

  const html = renderToStaticMarkup(<PageDocumentRender document={document} />);
  assertNoExecutablePayload(html);
});
