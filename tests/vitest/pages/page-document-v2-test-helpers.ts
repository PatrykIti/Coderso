import {
  normalizePageDocumentV2ForWrite,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

export const buildDocument = (): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {
    title: "Homepage",
    description: "Primary landing page",
    image: null,
  },
  settings: {
    template: "page-v2",
    showInNav: true,
    collectionLink: {
      contentTypeId: "projects",
      pageRole: "canonical-list-page",
      listingQueryId: "featured",
      listingTemplateId: null,
    },
  },
  sections: [
    {
      id: "sec_hero",
      type: "hero",
      name: "Hero",
      variant: "split",
      layout: {
        columns: 2,
        align: "center",
        justify: "between",
        maxWidth: 1080,
      },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "sm",
      },
      spacing: {
        paddingTop: 72,
        paddingBottom: 72,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 32,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: "hero",
        startsAt: null,
        endsAt: null,
      },
      responsive: {
        tablet: {
          layout: { columns: 1 },
          spacing: { gap: 20 },
        },
        mobile: {
          layout: { columns: 1 },
          spacing: { paddingLeft: 20, paddingRight: 20 },
          visibility: { visible: false },
        },
      },
      blocks: [
        {
          id: "blk_heading",
          type: "heading",
          props: {
            text: "Build with Coderso",
            level: "h1",
            align: "left",
          },
          visibility: { visible: true },
        },
        {
          id: "blk_cta",
          type: "button",
          props: {
            label: "See projects",
            href: "/projects",
            target: "self",
            variant: "primary",
            size: "md",
          },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

export const cloneDocument = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const safeNormalizeError = (value: unknown): unknown => {
  try {
    normalizePageDocumentV2ForWrite(value);
    return null;
  } catch (error) {
    return error;
  }
};

export const createHeadingBlock = (id: string, text = "Nested heading"): PageBlockV2 => ({
  id,
  type: "heading",
  props: { text, level: "h2", align: "left" },
  visibility: { visible: true },
});

export const withGlobalCrypto = <T>(cryptoValue: Crypto | undefined, run: () => T): T => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    value: cryptoValue,
    configurable: true,
  });
  try {
    return run();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "crypto", descriptor);
    } else {
      Reflect.deleteProperty(globalThis, "crypto");
    }
  }
};
