// TASK-539-05-L01 — shared renderer test fixtures.
// Split out of `page-renderer-v2.test.tsx` so every cohesive renderer suite is
// independently runnable. Kept <=1000 physical lines by construction.
import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

export const createDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

export const createSection = () =>
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

export const stripSectionTemplateMarker = (className: string) =>
  className
    .replace(/page-section-template-\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const createEffectsDocument = (
  sections: PageSectionV2[],
  effects?: PageDocumentV2["settings"]["effects"]
): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true, ...(effects ? { effects } : {}) },
  sections,
});

export const countMarkup = (markup: string, needle: string) => markup.split(needle).length - 1;
