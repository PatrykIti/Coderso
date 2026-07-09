import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  PAGE_LAYER_Z_CLAMP,
  resolvePageSectionForBreakpoint,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PAGE_REVEAL_MOTION_CSS,
  PAGE_SPOTLIGHT_CSS,
  PageBlockFrame,
  PageDocumentRender,
  PageSectionContent,
  PageSectionRender,
  resolvePageRenderTree,
  toPageBlockRenderProps,
  toPageBlockTypographyStyle,
  toPageSectionBleedStyle,
  toPageSectionRenderProps,
  toPageSectionStyle,
} from "../../../core/services/pages/pageRendererV2";
import {
  PAGE_EFFECTS_RUNTIME_ID,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";
// TASK-531-01-L02/L04 — shared pure glow-compose helpers under test.
import {
  clampGlowNum,
  composeGlowBoxShadow,
  mergeShadows,
} from "../../../core/services/pages/pageGlow";
import {
  PAGE_GLOW_BLUR_CLAMP,
  PAGE_GLOW_OFFSET_CLAMP,
  PAGE_GLOW_SPREAD_CLAMP,
} from "../../../core/services/pages/pageDocumentV2";
import {
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
} from "../../../core/services/pages/pageDocumentV2";
import {
  animatedIconGlyphs,
  AnimatedIcon,
  ANIMATED_ICON_KEYFRAMES_CSS,
} from "../../../core/services/pages/animatedIconGlyphs";
import { animatedIconNames } from "../../../core/services/pages/pageDocumentV2";
import { serializePageBlockPath } from "../../../core/services/pages/pageBlockPaths";
import { buildPageEditorCollectionPreviewBinding } from "../../../core/services/pages/pageEditorCollectionPreview";
import { buildPageEditorFormPreviewBinding } from "../../../core/services/pages/pageEditorFormPreview";
import {
  mapPageFiltersBlockToListingFiltersData,
  type PageRuntimeCollectionBinding,
  type PageRuntimeDataByBlockId,
} from "../../../core/services/pages/pageRuntimeBindingContract";
import { normalizeListingFiltersData } from "../../../core/widgets/core/listingFilters";
import { normalizeContentListData } from "../../../core/widgets/core/contentList";

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

const stripSectionTemplateMarker = (className: string) =>
  className
    .replace(/page-section-template-\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const countMarkup = (markup: string, needle: string) => markup.split(needle).length - 1;

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

test("phase 3b section variants change published surfaces beyond marker classes", () => {
  const contentDefault = createPageSectionV2("content", {
    id: "sec-content-default",
    variant: "default",
    spacing: { paddingTop: 80, paddingRight: 40, paddingBottom: 80, paddingLeft: 40, gap: 30 },
  });
  const contentCompact = createPageSectionV2("content", {
    id: "sec-content-compact",
    variant: "compact",
    spacing: contentDefault.spacing,
  });
  expect(toPageSectionRenderProps(contentCompact).style.padding).toBe("44px 30px 44px 30px");
  expect(toPageSectionRenderProps(contentCompact).style.padding).not.toBe(
    toPageSectionRenderProps(contentDefault).style.padding
  );
  expect(toPageSectionRenderProps(contentCompact).style.gap).toBe("18px");

  const timelineDefault = createPageSectionV2("timeline", {
    id: "sec-timeline-default",
    variant: "default",
    layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
  });
  const timelineHorizontal = createPageSectionV2("timeline", {
    id: "sec-timeline-horizontal",
    variant: "horizontal",
    layout: timelineDefault.layout,
  });
  expect(
    stripSectionTemplateMarker(toPageSectionRenderProps(timelineHorizontal).contentClassName)
  ).toContain("md:grid-cols-3");
  expect(
    stripSectionTemplateMarker(toPageSectionRenderProps(timelineHorizontal).contentClassName)
  ).not.toBe(
    stripSectionTemplateMarker(toPageSectionRenderProps(timelineDefault).contentClassName)
  );

  const faqDefault = createPageSectionV2("faq", {
    id: "sec-faq-default",
    variant: "default",
    spacing: { paddingTop: 64, paddingRight: 40, paddingBottom: 64, paddingLeft: 40, gap: 24 },
  });
  const faqCompact = createPageSectionV2("faq", {
    id: "sec-faq-compact",
    variant: "compact",
    spacing: faqDefault.spacing,
  });
  expect(toPageSectionRenderProps(faqCompact).style.gap).toBe("14px");
  expect(toPageSectionRenderProps(faqCompact).style.padding).not.toBe(
    toPageSectionRenderProps(faqDefault).style.padding
  );

  const ctaDefault = createPageSectionV2("cta", {
    id: "sec-cta-default",
    variant: "default",
  });
  const ctaCentered = createPageSectionV2("cta", {
    id: "sec-cta-centered",
    variant: "centered",
  });
  const ctaFullWidth = createPageSectionV2("cta", {
    id: "sec-cta-full",
    variant: "full-width",
  });
  const ctaDefaultClass = stripSectionTemplateMarker(
    toPageSectionRenderProps(ctaDefault).contentClassName
  );
  const ctaCenteredClass = stripSectionTemplateMarker(
    toPageSectionRenderProps(ctaCentered).contentClassName
  );
  // The CTA variants must stay VISUALLY distinct, not merely string-different:
  // `default` is left-aligned while `centered` centers its content. A prior
  // working-tree regression collapsed `default` onto the centered classes (only
  // an inert `content-center` token differed), which a `.not.toBe` string check
  // failed to catch — so assert the actual alignment tokens on each.
  expect(ctaDefaultClass).toContain("text-left");
  expect(ctaDefaultClass).not.toContain("text-center");
  expect(ctaCenteredClass).toContain("text-center");
  expect(ctaCenteredClass).not.toContain("text-left");
  expect(ctaCenteredClass).not.toBe(ctaDefaultClass);
  // TASK-525-01-L01 REBASELINE (owned): a full-width section's CONTENT is now
  // capped/centered at layout.maxWidth (was maxWidth:"none"); the 100vw
  // background bleed lives on the outer <section> box, not the content div.
  const ctaFullWidthStyle = toPageSectionRenderProps(ctaFullWidth).style;
  expect(ctaFullWidthStyle.maxWidth).toBe(`${ctaFullWidth.layout.maxWidth}px`);
  expect(ctaFullWidthStyle.maxWidth).not.toBe("none");
  expect(ctaFullWidthStyle.margin).toBe("0 auto");
  // bleed is expressed on the section box, not by dropping the content cap:
  expect(toPageSectionBleedStyle(ctaFullWidth)?.width).toBe("100vw");
  expect(
    stripSectionTemplateMarker(toPageSectionRenderProps(ctaFullWidth).contentClassName)
  ).toContain("min-h-[320px]");

  const testimonialsCards = createPageSectionV2("testimonials", {
    id: "sec-testimonials-cards",
    variant: "cards",
  });
  const testimonialsGrid = createPageSectionV2("testimonials", {
    id: "sec-testimonials-grid",
    variant: "grid",
  });
  expect(
    stripSectionTemplateMarker(toPageSectionRenderProps(testimonialsCards).contentClassName)
  ).not.toBe(
    stripSectionTemplateMarker(toPageSectionRenderProps(testimonialsGrid).contentClassName)
  );
  const testimonialsDefault = createPageSectionV2("testimonials", {
    id: "sec-testimonials-default",
    variant: "default",
    layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
  });
  const testimonialsDefaultClass = stripSectionTemplateMarker(
    toPageSectionRenderProps(testimonialsDefault).contentClassName
  );
  const testimonialsGridClass = stripSectionTemplateMarker(
    toPageSectionRenderProps({
      ...testimonialsGrid,
      layout: testimonialsDefault.layout,
    }).contentClassName
  );
  expect(testimonialsDefaultClass).not.toBe(testimonialsGridClass);
  expect(testimonialsDefaultClass).not.toContain("md:grid-cols-3");
  expect(testimonialsGridClass).toContain("md:grid-cols-3");
});

test("phase 3b guard sections keep real grid geometry beyond marker classes", () => {
  const featureDefault = createPageSectionV2("feature-grid", {
    id: "sec-feature-default",
    variant: "default",
    layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
  });
  const featureCards = createPageSectionV2("feature-grid", {
    id: "sec-feature-cards",
    variant: "cards",
    layout: featureDefault.layout,
  });
  expect(
    stripSectionTemplateMarker(toPageSectionRenderProps(featureCards).contentClassName)
  ).not.toBe(stripSectionTemplateMarker(toPageSectionRenderProps(featureDefault).contentClassName));
  expect(toPageSectionRenderProps(featureCards).contentClassName).toContain("md:grid-cols-3");

  const comparisonDefault = createPageSectionV2("comparison", {
    id: "sec-comparison-default",
    variant: "default",
    layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
  });
  const comparisonGrid = createPageSectionV2("comparison", {
    id: "sec-comparison-grid",
    variant: "grid",
    layout: comparisonDefault.layout,
  });
  expect(
    stripSectionTemplateMarker(toPageSectionRenderProps(comparisonGrid).contentClassName)
  ).not.toBe(
    stripSectionTemplateMarker(toPageSectionRenderProps(comparisonDefault).contentClassName)
  );
  expect(toPageSectionRenderProps(comparisonGrid).contentClassName).toContain("md:grid-cols-2");

  const customDefault = createPageSectionV2("custom", {
    id: "sec-custom-default",
    variant: "default",
    layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
  });
  const customGrid = createPageSectionV2("custom", {
    id: "sec-custom-grid",
    variant: "grid",
    layout: customDefault.layout,
  });
  expect(
    stripSectionTemplateMarker(toPageSectionRenderProps(customGrid).contentClassName)
  ).not.toBe(stripSectionTemplateMarker(toPageSectionRenderProps(customDefault).contentClassName));
  expect(toPageSectionRenderProps(customGrid).contentClassName).toContain("md:grid-cols-2");
});

test("phase 3b section templates add truthful structure around existing blocks", () => {
  const mediaSplit = createPageSectionV2("media-split", {
    id: "sec-media-split",
    variant: "split",
    blocks: [
      createPageBlockV2("image", {
        id: "blk-media",
        props: { src: "/studio.jpg", alt: "Studio" },
      }),
      createPageBlockV2("heading", {
        id: "blk-copy",
        props: { text: "Story", level: "h2", align: "left" },
      }),
    ],
  });
  const mediaHorizontal = createPageSectionV2("media-split", {
    id: "sec-media-horizontal",
    variant: "horizontal",
    blocks: mediaSplit.blocks,
  });
  const splitHtml = renderToStaticMarkup(<PageSectionContent section={mediaSplit} />);
  const horizontalHtml = renderToStaticMarkup(<PageSectionContent section={mediaHorizontal} />);
  expect(splitHtml).toContain('data-page-media-split="split"');
  expect(splitHtml.indexOf('data-page-media-split-zone="media"')).toBeLessThan(
    splitHtml.indexOf('data-page-media-split-zone="content"')
  );
  expect(horizontalHtml).toContain('data-page-media-split="horizontal"');
  expect(horizontalHtml.indexOf('data-page-media-split-zone="content"')).toBeLessThan(
    horizontalHtml.indexOf('data-page-media-split-zone="media"')
  );

  const timelineHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("timeline", {
        id: "sec-timeline-structure",
        variant: "horizontal",
        blocks: [
          createPageBlockV2("heading", {
            id: "blk-milestone-1",
            props: { text: "Launch", level: "h3", align: "left" },
          }),
          createPageBlockV2("text", {
            id: "blk-milestone-2",
            props: { text: "Second milestone", format: "plain", align: "left" },
          }),
        ],
      })}
    />
  );
  expect(timelineHtml.match(/data-page-timeline-item=/g)).toHaveLength(2);
  expect(timelineHtml.match(/data-page-timeline-marker="true"/g)).toHaveLength(2);

  const galleryHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("gallery", {
        id: "sec-gallery-structure",
        variant: "cards",
        blocks: [
          createPageBlockV2("image", {
            id: "blk-gallery-image",
            props: { src: "/gallery.jpg", alt: "Gallery" },
          }),
        ],
      })}
    />
  );
  expect(galleryHtml).toContain('data-page-gallery-section-item="1"');
  expect(galleryHtml).toContain('data-page-gallery-section-variant="cards"');

  const faqHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("faq", {
        id: "sec-faq-structure",
        variant: "compact",
        blocks: [
          createPageBlockV2("text", {
            id: "blk-faq-answer",
            props: { text: "Answer", format: "plain", align: "left" },
          }),
        ],
      })}
    />
  );
  expect(faqHtml).toContain('data-page-faq-item="1"');
  expect(faqHtml).toContain('data-page-faq-variant="compact"');

  const testimonialsHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("testimonials", {
        id: "sec-testimonials-structure",
        variant: "cards",
        blocks: [
          createPageBlockV2("quote", {
            id: "blk-testimonial",
            props: { text: "Reliable product", cite: "Customer" },
          }),
        ],
      })}
    />
  );
  expect(testimonialsHtml).toContain('data-page-testimonial-card="true"');
  expect(testimonialsHtml).toContain('data-page-testimonial-variant="cards"');
});

test("phase 3b media-split variants classify media, preserve default identity, and inherit media sanitizers", () => {
  const mixedMedia = createPageSectionV2("media-split", {
    id: "sec-media-split-mixed",
    variant: "split",
    blocks: [
      createPageBlockV2("text", {
        id: "blk-copy",
        props: { text: "Copy", format: "plain", align: "left" },
      }),
      createPageBlockV2("video", {
        id: "blk-video",
        props: { src: "/tour.mp4", title: "Tour", autoplay: false },
      }),
      createPageBlockV2("gallery", {
        id: "blk-gallery",
        props: {
          items: [{ src: "/one.jpg", alt: "One" }],
          layout: "grid",
          columns: 1,
          gap: 8,
        },
      }),
    ],
  });
  const mixedHtml = renderToStaticMarkup(<PageSectionContent section={mixedMedia} />);
  const mediaZoneStart = mixedHtml.indexOf('data-page-media-split-zone="media"');
  const contentZoneStart = mixedHtml.indexOf('data-page-media-split-zone="content"');
  expect(mediaZoneStart).toBeGreaterThan(-1);
  expect(contentZoneStart).toBeGreaterThan(-1);
  expect(mediaZoneStart).toBeLessThan(contentZoneStart);
  const mediaZoneHtml = mixedHtml.slice(mediaZoneStart, contentZoneStart);
  const contentZoneHtml = mixedHtml.slice(contentZoneStart);
  expect(mediaZoneHtml).toContain('data-block-id="blk-video"');
  expect(mediaZoneHtml).toContain('data-block-id="blk-gallery"');
  expect(mediaZoneHtml).not.toContain('data-block-id="blk-copy"');
  expect(contentZoneHtml).toContain('data-block-id="blk-copy"');

  const noMedia = createPageSectionV2("media-split", {
    id: "sec-media-split-empty-media",
    variant: "split",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-only-copy",
        props: { text: "Only copy", level: "h2", align: "left" },
      }),
    ],
  });
  const noMediaHtml = renderToStaticMarkup(<PageSectionContent section={noMedia} />);
  expect(noMediaHtml).toContain('data-page-media-split-empty="true"');

  const defaultMediaSplit = createPageSectionV2("media-split", {
    id: "sec-media-split-default",
    variant: "default",
    blocks: mixedMedia.blocks,
  });
  const defaultHtml = renderToStaticMarkup(<PageSectionContent section={defaultMediaSplit} />);
  expect(defaultHtml).not.toContain("data-page-media-split-zone");
  expect(defaultHtml).not.toContain("data-page-media-split-empty");

  const unsafeMedia = createPageSectionV2("media-split", {
    id: "sec-media-split-unsafe",
    variant: "split",
    blocks: [
      createPageBlockV2("image", {
        id: "blk-unsafe-media",
        props: { src: "javascript:alert(1)", alt: "Unsafe" },
      }),
      createPageBlockV2("text", {
        id: "blk-safe-copy",
        props: { text: "Safe copy", format: "plain", align: "left" },
      }),
    ],
  });
  const unsafeHtml = renderToStaticMarkup(<PageSectionContent section={unsafeMedia} />);
  expect(unsafeHtml).toContain('data-page-media-split-zone="media"');
  expect(unsafeHtml).not.toContain("javascript:alert");
});

test("phase 3b wrapper variants expose default, grid, card, and index semantics", () => {
  const galleryBlocks = [
    createPageBlockV2("image", {
      id: "blk-gallery-one",
      props: { src: "/gallery-one.jpg", alt: "One" },
    }),
    createPageBlockV2("image", {
      id: "blk-gallery-two",
      props: { src: "/gallery-two.jpg", alt: "Two" },
    }),
  ];
  const galleryCardsHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("gallery", {
        id: "sec-gallery-cards-coverage",
        variant: "cards",
        blocks: galleryBlocks,
      })}
    />
  );
  expect(galleryCardsHtml).toContain('data-page-gallery-section-item="1"');
  expect(galleryCardsHtml).toContain('data-page-gallery-section-item="2"');
  expect(galleryCardsHtml).toContain("shadow-sm");
  const galleryGridHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("gallery", {
        id: "sec-gallery-grid-coverage",
        variant: "grid",
        blocks: galleryBlocks,
      })}
    />
  );
  const galleryDefaultHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("gallery", {
        id: "sec-gallery-default-coverage",
        variant: "default",
        blocks: galleryBlocks,
      })}
    />
  );
  expect(galleryGridHtml).toContain('data-page-gallery-section-variant="grid"');
  expect(galleryDefaultHtml).toContain('data-page-gallery-section-variant="default"');
  expect(galleryGridHtml).not.toContain("shadow-sm");
  expect(galleryDefaultHtml).not.toContain("shadow-sm");

  const faqBlocks = [
    createPageBlockV2("text", {
      id: "blk-faq-one",
      props: { text: "Answer one", format: "plain", align: "left" },
    }),
    createPageBlockV2("text", {
      id: "blk-faq-two",
      props: { text: "Answer two", format: "plain", align: "left" },
    }),
  ];
  const faqDefaultHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("faq", {
        id: "sec-faq-default-coverage",
        variant: "default",
        blocks: faqBlocks,
      })}
    />
  );
  const faqCompactHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("faq", {
        id: "sec-faq-compact-coverage",
        variant: "compact",
        blocks: faqBlocks,
      })}
    />
  );
  expect(faqDefaultHtml).toContain('data-page-faq-item="1"');
  expect(faqDefaultHtml).toContain('data-page-faq-item="2"');
  expect(faqDefaultHtml).toContain("p-5 shadow-sm");
  expect(faqCompactHtml).toContain("px-4 py-3 shadow-none");

  const testimonialBlocks = [
    createPageBlockV2("quote", {
      id: "blk-testimonial-one",
      props: { text: "First", cite: "A" },
    }),
    createPageBlockV2("quote", {
      id: "blk-testimonial-two",
      props: { text: "Second", cite: "B" },
    }),
  ];
  const testimonialCardsHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("testimonials", {
        id: "sec-testimonials-cards-coverage",
        variant: "cards",
        blocks: testimonialBlocks,
      })}
    />
  );
  const testimonialGridHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("testimonials", {
        id: "sec-testimonials-grid-coverage",
        variant: "grid",
        blocks: testimonialBlocks,
      })}
    />
  );
  const testimonialDefaultHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("testimonials", {
        id: "sec-testimonials-default-coverage",
        variant: "default",
        blocks: testimonialBlocks,
      })}
    />
  );
  expect(countMarkup(testimonialCardsHtml, 'data-page-testimonial-card="true"')).toBe(2);
  expect(testimonialGridHtml).not.toContain('data-page-testimonial-card="true"');
  expect(testimonialDefaultHtml).not.toContain('data-page-testimonial-card="true"');
  expect(testimonialGridHtml).toContain('data-page-testimonial-variant="grid"');
  expect(testimonialDefaultHtml).toContain('data-page-testimonial-variant="default"');
});

test("phase 3b wrapped template sections keep exactly one wrapper per block in column composition", () => {
  const assignedBlocks = [
    createPageBlockV2("text", {
      id: "blk-assigned-one",
      props: { text: "Assigned one", format: "plain", align: "left" },
      style: { column: 1 },
    }),
    createPageBlockV2("text", {
      id: "blk-assigned-two",
      props: { text: "Assigned two", format: "plain", align: "left" },
      style: { column: 2 },
    }),
  ];
  const assertWrappedComposition = (
    section: PageSectionV2,
    itemAttribute: string,
    expectedColumns: number
  ) => {
    const html = renderToStaticMarkup(<PageSectionContent section={section} />);
    expect(countMarkup(html, 'data-page-section-column="')).toBe(expectedColumns);
    expect(countMarkup(html, `${itemAttribute}=`)).toBe(section.blocks.length);
    expect(countMarkup(html, 'data-block-id="blk-assigned-one"')).toBe(1);
    expect(countMarkup(html, 'data-block-id="blk-assigned-two"')).toBe(1);
    return html;
  };

  const timelineHtml = assertWrappedComposition(
    createPageSectionV2("timeline", {
      id: "sec-timeline-composition-coverage",
      variant: "horizontal",
      layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
      blocks: assignedBlocks,
    }),
    "data-page-timeline-item",
    3
  );
  expect(countMarkup(timelineHtml, 'data-page-timeline-marker="true"')).toBe(2);

  assertWrappedComposition(
    createPageSectionV2("gallery", {
      id: "sec-gallery-composition-coverage",
      variant: "cards",
      layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
      blocks: assignedBlocks,
    }),
    "data-page-gallery-section-item",
    3
  );

  const faqHtml = assertWrappedComposition(
    createPageSectionV2("faq", {
      id: "sec-faq-composition-coverage",
      variant: "compact",
      layout: { columns: 2, align: "stretch", justify: "start", maxWidth: 1080 },
      blocks: assignedBlocks,
    }),
    "data-page-faq-item",
    2
  );
  expect(faqHtml).toContain("px-4 py-3 shadow-none");

  const testimonialsHtml = assertWrappedComposition(
    createPageSectionV2("testimonials", {
      id: "sec-testimonials-composition-coverage",
      variant: "cards",
      layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
      blocks: assignedBlocks,
    }),
    "data-page-testimonial-item",
    3
  );
  expect(countMarkup(testimonialsHtml, 'data-page-testimonial-card="true"')).toBe(2);
});

test("phase 3b leaves non-wrapped section families wrapper-free", () => {
  const block = createPageBlockV2("text", {
    id: "blk-identity",
    props: { text: "Identity", format: "plain", align: "left" },
  });
  const sections = [
    createPageSectionV2("hero", { id: "sec-hero-identity", variant: "centered", blocks: [block] }),
    createPageSectionV2("content", {
      id: "sec-content-identity",
      variant: "compact",
      blocks: [block],
    }),
    createPageSectionV2("feature-grid", {
      id: "sec-feature-identity",
      variant: "cards",
      blocks: [block],
    }),
    createPageSectionV2("comparison", {
      id: "sec-comparison-identity",
      variant: "grid",
      blocks: [block],
    }),
    createPageSectionV2("cta", { id: "sec-cta-identity", variant: "default", blocks: [block] }),
    createPageSectionV2("custom", {
      id: "sec-custom-identity",
      variant: "grid",
      blocks: [block],
    }),
  ];
  for (const section of sections) {
    const html = renderToStaticMarkup(<PageSectionContent section={section} />);
    expect(html).not.toContain("data-page-media-split-zone");
    expect(html).not.toContain("data-page-timeline-item");
    expect(html).not.toContain("data-page-gallery-section-item");
    expect(html).not.toContain("data-page-faq-item");
    expect(html).not.toContain("data-page-testimonial-item");
    expect(countMarkup(html, 'data-block-id="blk-identity"')).toBe(1);
  }
});

test("full-width section variants remove the outer section gutter so backgrounds fill the band", () => {
  const bounded = createPageSectionV2("hero", {
    id: "sec-bounded-hero",
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
  const fullWidth = createPageSectionV2("hero", {
    id: "sec-full-width-hero",
    variant: "full-width",
    style: {
      background: "#dcfce7",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
    },
  });

  const boundedProps = toPageSectionRenderProps(bounded);
  const fullWidthProps = toPageSectionRenderProps(fullWidth);
  const fullWidthHtml = renderToStaticMarkup(<PageSectionRender section={fullWidth} />);

  // PRESERVED w-full siblings (option A: the bleed lives on the OUTER <section>).
  expect(boundedProps.sectionClassName).toBe("w-full px-4 py-6");
  expect(fullWidthProps.sectionClassName).toBe("w-full");
  expect(fullWidthHtml).toContain('<section class="w-full"');
  expect(fullWidthHtml).not.toContain('class="w-full px-4 py-6"');
  // TASK-525-01-L01 REBASELINE (owned): the full-width content is now
  // capped/centered at layout.maxWidth (was maxWidth:"none") and the background
  // NO LONGER lives on the content div — the 100vw bleed + background paint on
  // the OUTER <section> box so the bg fills the band edge-to-edge while content
  // stays contained. STRONGER: pins the content cap AND the bg bleed on separate
  // elements.
  expect(fullWidthProps.style.maxWidth).toBe(`${fullWidth.layout.maxWidth}px`);
  expect(fullWidthProps.style.maxWidth).not.toBe("none");
  expect(fullWidthProps.style.margin).toBe("0 auto");
  expect(fullWidthProps.style.backgroundColor).toBeUndefined();
  // The full-bleed background box (100vw) + its background live on <section>:
  const fullWidthBleed = toPageSectionBleedStyle(fullWidth);
  expect(fullWidthBleed?.width).toBe("100vw");
  expect(fullWidthBleed?.marginLeft).toBe("calc(50% - 50vw)");
  expect(fullWidthBleed?.backgroundColor).toBe("#dcfce7");
  // Rendered <section> carries the bleed width + the background color.
  expect(fullWidthHtml).toContain("width:100vw");
  expect(fullWidthHtml).toContain("background-color:#dcfce7");
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

test("video autoplay prop reaches the rendered video with policy companions", () => {
  const section = createPageSectionV2("content", {
    id: "sec-video-autoplay",
    blocks: [
      createPageBlockV2("video", {
        id: "blk-video-autoplay",
        props: {
          src: "https://cdn.example.test/intro.mp4",
          title: "Intro",
          autoplay: true,
          muted: false,
        },
      }),
      createPageBlockV2("video", {
        id: "blk-video-manual",
        props: {
          src: "https://cdn.example.test/manual.mp4",
          title: "Manual",
          autoplay: false,
          muted: false,
        },
      }),
    ],
  });

  const videoTags = Array.from(
    renderToStaticMarkup(<PageSectionContent section={section} />).matchAll(/<video[^>]*>/g),
    (match) => match[0]
  );

  expect(videoTags[0]).toContain("autoPlay");
  expect(videoTags[0]).toContain("muted");
  expect(videoTags[0]).toContain("playsInline");
  expect(videoTags[0]).toContain('title="Intro"');
  expect(videoTags[0]).toContain('aria-label="Intro"');
  expect(videoTags[1]).not.toContain("autoPlay");
  expect(videoTags[1]).not.toContain("playsInline");
  expect(videoTags[1]).not.toContain("muted");
  expect(videoTags[1]).toContain('title="Manual"');
  expect(videoTags[1]).toContain('aria-label="Manual"');
});

test("video title stays off the inert placeholder when no safe source renders", () => {
  const section = createPageSectionV2("content", {
    id: "sec-video-placeholder-title",
    blocks: [
      createPageBlockV2("video", {
        id: "blk-video-empty-src",
        props: {
          src: "",
          title: "No source",
          autoplay: false,
          muted: true,
        },
      }),
      createPageBlockV2("video", {
        id: "blk-video-unsafe-src",
        props: {
          src: "javascript:alert(1)",
          title: "Unsafe source",
          autoplay: true,
          muted: false,
        },
      }),
    ],
  });

  const html = renderToStaticMarkup(<PageSectionContent section={section} />);

  expect(html).toContain('data-block-id="blk-video-empty-src"');
  expect(html).toContain('data-block-id="blk-video-unsafe-src"');
  expect(html).toContain("Video");
  expect(html).not.toContain("<video");
  expect(html).not.toContain("No source");
  expect(html).not.toContain("Unsafe source");
  expect(html).not.toContain("title=");
  expect(html).not.toContain("aria-label=");
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("alert(1)");
});

test("divider tone prop changes the rendered divider border style", () => {
  const section = createPageSectionV2("content", {
    id: "sec-divider-tone",
    blocks: [
      createPageBlockV2("divider", {
        id: "blk-divider-accent",
        props: { tone: "accent", thickness: 3 },
      }),
      createPageBlockV2("divider", {
        id: "blk-divider-muted",
        props: { tone: "muted", thickness: 2 },
      }),
      createPageBlockV2("divider", {
        id: "blk-divider-neutral",
        props: { tone: "neutral", thickness: 1 },
      }),
    ],
  });

  const hrTags = Array.from(
    renderToStaticMarkup(<PageSectionContent section={section} />).matchAll(/<hr[^>]*>/g),
    (match) => match[0]
  );

  expect(hrTags[0]).toContain("border-color:var(--coderso-section-accent,#0d9488)");
  expect(hrTags[0]).toContain("border-width:3px");
  expect(hrTags[0]).not.toContain("border-[var(--coderso-section-accent");
  expect(hrTags[1]).toContain("border-color:#cbd5e1");
  expect(hrTags[2]).toContain("border-color:#e2e8f0");
});

test("spacer size prop reaches the rendered inert spacer height", () => {
  const section = createPageSectionV2("content", {
    id: "sec-spacer-size",
    blocks: [
      createPageBlockV2("spacer", {
        id: "blk-spacer-default",
        props: {},
      }),
      createPageBlockV2("spacer", {
        id: "blk-spacer-large",
        props: { size: 72 },
      }),
    ],
  });

  const spacerTags = Array.from(
    renderToStaticMarkup(<PageSectionContent section={section} />).matchAll(
      /<div[^>]*aria-hidden="true"[^>]*>/g
    ),
    (match) => match[0]
  );

  expect(spacerTags[0]).toContain("height:32px");
  expect(spacerTags[1]).toContain("height:72px");
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

test("embed block renders sanitized inline HTML as React nodes", () => {
  const section = createPageSectionV2("embed", {
    id: "sec-inline-embed",
    blocks: [
      createPageBlockV2("embed", {
        id: "blk-inline-embed",
        props: { provider: "custom", url: "", html: "" },
      }),
    ],
  });
  const runtimeDataByBlockId: PageRuntimeDataByBlockId = {
    "blk-inline-embed": {
      kind: "embed",
      iframeSrc: null,
      iframeTitle: "Custom embed",
      sanitizedHtml:
        '<p>Fish &amp; chips <strong>menu</strong><br><a href="/menu" rel="nofollow noreferrer" target="_blank">Open</a></p>',
    },
  };

  const html = renderToStaticMarkup(
    <PageSectionContent section={section} runtimeDataByBlockId={runtimeDataByBlockId} />
  );

  expect(html).toContain('data-page-embed-html="sanitized"');
  expect(html).toContain("Fish &amp; chips");
  expect(html).toContain("<strong>menu</strong>");
  expect(html).toContain("<br/>");
  expect(html).toContain('<a href="/menu" rel="nofollow noreferrer" target="_blank">Open</a>');
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

test("filters block renders the shared facet form with count, sort, and swap hooks (TASK-459-02)", () => {
  const filtersBlock = createPageBlockV2("filters", {
    id: "blk-filters",
    props: {
      queryId: "query-homes",
      autoApply: false,
      showSearch: true,
      showCount: true,
      applyLabel: "Apply filters",
      facets: [
        {
          id: "rooms",
          kind: "checkbox",
          label: "Rooms",
          field: "data.rooms",
          op: "in",
          options: [{ value: "3", label: "Three rooms" }],
        },
        {
          id: "sort",
          kind: "sort",
          label: "Sort",
          sortOptions: [
            { value: "data.price:asc", label: "Cheapest first", field: "data.price", dir: "asc" },
          ],
        },
      ],
    },
  });
  const section = createPageSectionV2("content", {
    id: "sec-filters-runtime",
    blocks: [filtersBlock],
  });
  const binding = {
    kind: "filters" as const,
    data: normalizeListingFiltersData({
      ...mapPageFiltersBlockToListingFiltersData(filtersBlock),
      resolved: {
        listingQueryId: "query-homes",
        metrics: [],
        searchQuery: "loft",
        rejectedTokens: [],
      },
    }),
    total: 7,
  };

  const runtimeHtml = renderToStaticMarkup(
    <PageSectionContent section={section} runtimeDataByBlockId={{ "blk-filters": binding }} />
  );

  // Fetch-swap hooks: the wrapper carries the SAME data attributes the
  // collection listing markup ships, so count + form swap together.
  expect(runtimeHtml).toContain('data-page-filters-block="true"');
  expect(runtimeHtml).toContain('data-listing-block-id="blk-filters"');
  expect(runtimeHtml).toContain('data-listing-query-id="query-homes"');
  // Result-count display (TASK-459-01 counts contract field).
  expect(runtimeHtml).toContain('data-page-filters-count="7"');
  expect(runtimeHtml).toContain("7 results");
  // The facet form is a plain GET form with canonical lq.* input names: the
  // no-JS fallback submits straight into the existing server pipeline.
  expect(runtimeHtml).toContain('method="get"');
  expect(runtimeHtml).toContain("data-listing-runtime-form");
  expect(runtimeHtml).toContain('name="lq.query-homes.data.rooms.in"');
  expect(runtimeHtml).toContain("Three rooms");
  // Visitor sort control emitting lq.<id>.__sort.
  expect(runtimeHtml).toContain('name="lq.query-homes.__sort"');
  expect(runtimeHtml).toContain("Cheapest first");
  // Search row with the applied state from the URL.
  expect(runtimeHtml).toContain('name="lq.query-homes.__q"');
  expect(runtimeHtml).toContain('value="loft"');
  // Non-auto-apply forms keep the explicit submit button (no-JS path).
  expect(runtimeHtml).toContain("Apply filters");
  // The script ships through the v2 body-script seam, never inline here.
  expect(runtimeHtml).not.toContain("__nextlessListingRuntimeClient");

  // showCount=false drops the count line, nothing else.
  const noCountBlock = createPageBlockV2("filters", {
    id: "blk-filters",
    props: { ...filtersBlock.props, showCount: false },
  });
  const noCountHtml = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", {
        id: "sec-filters-nocount",
        blocks: [noCountBlock],
      })}
      runtimeDataByBlockId={{ "blk-filters": binding }}
    />
  );
  expect(noCountHtml).not.toContain("data-page-filters-count");
  expect(noCountHtml).toContain("data-listing-runtime-form");

  // Unbound (no binding) and dangling (resolver error) fail closed to the
  // same inert placeholder the other data-bound blocks use.
  const unboundHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(unboundHtml).toContain('data-page-block-inert="filters"');
  expect(unboundHtml).toContain("Filters are not available yet.");
  const danglingBinding = {
    kind: "filters" as const,
    data: normalizeListingFiltersData({
      ...mapPageFiltersBlockToListingFiltersData(filtersBlock),
      resolved: {
        listingQueryId: "query-homes",
        metrics: [],
        rejectedTokens: [],
        error: "Selected listing query no longer exists.",
      },
    }),
    total: 0,
  };
  const danglingHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      runtimeDataByBlockId={{ "blk-filters": danglingBinding }}
    />
  );
  expect(danglingHtml).toContain("Filters are not available yet.");
  expect(danglingHtml).not.toContain("data-listing-runtime-form");
});

test("filters block renders a canvas-safe inert preview in canvas layout mode (TASK-459-02)", () => {
  const section = createPageSectionV2("content", {
    id: "sec-filters-canvas",
    blocks: [
      createPageBlockV2("filters", {
        id: "blk-filters-unpicked",
        props: { queryId: null, facets: [] },
      }),
      createPageBlockV2("filters", {
        id: "blk-filters-bound",
        props: {
          queryId: "query-homes",
          facets: [
            {
              id: "rooms",
              kind: "checkbox",
              label: "Rooms",
              field: "data.rooms",
              op: "in",
              options: [{ value: "3", label: "Three rooms" }],
            },
          ],
        },
      }),
    ],
  });

  const canvasHtml = renderToStaticMarkup(
    <PageSectionContent section={section} layoutMode="canvas-device" />
  );

  // Unpicked query -> explicit empty state pointing at the Content panel.
  expect(canvasHtml).toContain("Pick a saved query in the Content panel to preview filters here.");
  // Bound query -> the configured facet form, inert: pointer events off, no
  // live filtering, no inline runtime script.
  expect(canvasHtml).toContain('data-page-editor-filters-preview="inert"');
  expect(canvasHtml).toContain("pointer-events-none");
  expect(canvasHtml).toContain('name="lq.query-homes.data.rooms.in"');
  expect(canvasHtml).toContain("Three rooms");
  expect(canvasHtml).not.toContain("__nextlessListingRuntimeClient");

  // Runtime parity: the default layout mode keeps the inert fallback.
  const runtimeHtml = renderToStaticMarkup(<PageSectionContent section={section} />);
  expect(runtimeHtml).not.toContain('data-page-editor-filters-preview="inert"');
  expect(runtimeHtml).toContain("Filters are not available yet.");
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

test("admin and site Tailwind entrypoints scan Pages service renderer classes", () => {
  const adminCss = readFileSync("core/admin/styles/globals.css", "utf8");
  const siteCss = readFileSync("core/site/styles/site.css", "utf8");

  expect(adminCss).toContain('@source "../../services/pages/**/*.{ts,tsx}"');
  expect(siteCss).toContain('@source "../../services/pages/**/*.{ts,tsx}"');
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

test("paged collection binding renders the numbered pager, totals, and template variant (TASK-459-03)", () => {
  const buildBinding = (
    overrides: Partial<PageRuntimeCollectionBinding> = {}
  ): PageRuntimeCollectionBinding => ({
    kind: "collection",
    data: normalizeContentListData({
      source: {
        mode: "listing",
        listingQueryId: "query-homes",
        contentTypeId: "ct-homes",
        statusScope: "published",
        limit: 6,
      },
      pagination: { mode: "paged", pageSize: 6 },
      resolved: {
        items: [
          {
            id: "entry-1",
            title: "Lakeside home",
            slug: "lakeside-home",
            href: "/homes/lakeside-home",
            status: "published",
          },
        ],
        total: 42,
        sourceTypeId: "ct-homes",
        sourceTypeSlug: "homes",
        listingQueryId: "query-homes",
        resolvedAt: "2026-06-12T00:00:00.000Z",
        runtime: {
          page: 5,
          pageSize: 6,
          totalPages: 7,
          pageParamKey: "lq.query-homes.__page",
          search: "lq.query-homes.__page=5",
          previousPageHref: "?lq.query-homes.__page=4",
          nextPageHref: "?lq.query-homes.__page=6",
        },
      },
    }),
    ...overrides,
  });

  const section = createPageSectionV2("content", {
    id: "sec-paged-collection",
    blocks: [
      createPageBlockV2("collection", {
        id: "blk-paged-collection",
        props: {
          contentTypeId: "ct-homes",
          queryId: "query-homes",
          limit: 6,
          paginationMode: "paged",
          pageSize: 6,
        },
      }),
    ],
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      runtimeDataByBlockId={{ "blk-paged-collection": buildBinding() }}
    />
  );

  // Totals on the pager line + windowed numbers (1 … 3 4 5 6 7) with the
  // current page marked; prev/next anchors carry the script pickup flag.
  expect(html).toContain('data-content-list-pagination="paged"');
  expect(html).toContain('data-content-list-total="42"');
  expect(html).toContain("42 results");
  expect(html).toContain('aria-current="page"');
  expect(html).toContain('href="?lq.query-homes.__page=4"');
  expect(html).toContain('href="?lq.query-homes.__page=6"');
  expect(html).toContain('aria-label="Page 7"');
  expect(html).toContain('data-listing-page-link="1"');
  // The lq page-token grammar drives every pager href.
  expect(html).toContain("lq.query-homes.__page=7");

  // Template-driven variant: the binding's resolved variant replaces the
  // hardcoded grid default.
  const compactHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      runtimeDataByBlockId={{ "blk-paged-collection": buildBinding({ variant: "compact" }) }}
    />
  );
  expect(compactHtml).toContain('data-content-list-variant="compact"');

  // Dangling-route guard: suppressed links render the explicit note instead
  // of unmatched hrefs.
  const missingRouteBinding = buildBinding();
  missingRouteBinding.data = normalizeContentListData({
    ...missingRouteBinding.data,
    resolved: {
      ...missingRouteBinding.data.resolved,
      items: [{ id: "entry-1", title: "Lakeside home", slug: "lakeside-home" }],
      cardLinkMode: "missing-route",
    },
  });
  const guardedHtml = renderToStaticMarkup(
    <PageSectionContent
      section={section}
      runtimeDataByBlockId={{ "blk-paged-collection": missingRouteBinding }}
    />
  );
  expect(guardedHtml).toContain('data-content-list-link-unavailable="1"');
  expect(guardedHtml).not.toContain('href="/homes/lakeside-home"');
});

// TASK-521-02-L02/L03 — section scroll/parallax/reveal front render.
const createEffectSection = (style: Partial<PageSectionV2["style"]>) =>
  createPageSectionV2("content", {
    id: "sec-effect",
    name: "Effect section",
    style: {
      background: "#ffffff",
      backgroundType: "none",
      backgroundImage: null,
      accent: "#111111",
      radius: 0,
      shadow: "none",
      ...style,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-effect-heading",
        props: { text: "Effect headline", level: "h2", align: "left" },
      }),
    ],
  });

test("reveal-up stamps data-page-effect + motion-safe reveal class", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={createEffectSection({ scrollEffect: "reveal-up" })} />
  );
  expect(html).toContain('data-page-effect="reveal-up"');
  expect(html).toContain("motion-safe:data-[revealed=true]:translate-y-0");
  expect(html).toContain("motion-safe:transition-[opacity,transform]");
  expect(html).not.toContain("data-parallax");
  expect(html).not.toContain("data-parallax-inner");
});

test("reveal-fade stamps fade class, no translate", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={createEffectSection({ scrollEffect: "reveal-fade" })} />
  );
  expect(html).toContain('data-page-effect="reveal-fade"');
  expect(html).toContain("motion-safe:data-[revealed=true]:opacity-100");
  expect(html).not.toContain("data-parallax");
});

test("parallax stamps data-parallax + [data-parallax-inner] wrapper", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender
      section={createEffectSection({ scrollEffect: "parallax", parallaxIntensity: 24 })}
    />
  );
  expect(html).toContain('data-page-effect="parallax"');
  expect(html).toContain('data-parallax="24"');
  expect(html).toContain("data-parallax-inner");
  expect(html).toContain("will-change-transform");
  // reveal utilities only ship for reveal-* effects, not parallax.
  expect(html).not.toContain("motion-safe:data-[revealed=true]");
});

test("clamps parallax intensity in render (>40 → 40)", () => {
  const section = createEffectSection({ scrollEffect: "parallax" });
  // Force an out-of-range value past the model normalize (defence in depth).
  const overSection: PageSectionV2 = {
    ...section,
    style: { ...section.style, parallaxIntensity: 9999 },
  };
  const html = renderToStaticMarkup(<PageSectionRender section={overSection} />);
  expect(html).toContain('data-parallax="40"');
});

test("no scrollEffect ⇒ byte-identical <section> (no attr, no wrapper)", () => {
  const html = renderToStaticMarkup(<PageSectionRender section={createEffectSection({})} />);
  expect(html).not.toContain("data-page-effect");
  expect(html).not.toContain("data-parallax");
  expect(html).not.toContain("data-parallax-inner");
  expect(html).not.toContain("motion-safe:transition-[opacity,transform]");
});

test("PAGE_REVEAL_MOTION_CSS is reduced-motion-safe + reveal-armed scoped", () => {
  expect(PAGE_REVEAL_MOTION_CSS).toContain("@media (prefers-reduced-motion: no-preference)");
  expect(PAGE_REVEAL_MOTION_CSS).toContain("[data-reveal-armed]");
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    '[data-page-effect^="reveal"]:not([data-revealed]){opacity:0}'
  );
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    '[data-page-effect="reveal-up"]:not([data-revealed]){transform:translateY(1rem)}'
  );
});

// ---------------------------------------------------------------------------
// TASK-525-02 — per-block staggered reveal (--reveal-delay + child cascade).
// ---------------------------------------------------------------------------

test("TASK-525-02: emits --reveal-delay on the block frame when authored", () => {
  const block = createPageBlockV2("text", {
    id: "blk-reveal-delay",
    style: { revealDelay: 240 } as PageBlockV2["style"],
  });
  const props = toPageBlockRenderProps(block);
  expect((props.style as Record<string, string>)["--reveal-delay"]).toBe("240ms");
});

test("TASK-525-02: omits --reveal-delay when unset (byte-identical frame style)", () => {
  const block = createPageBlockV2("text", { id: "blk-reveal-none" });
  const props = toPageBlockRenderProps(block);
  expect("--reveal-delay" in props.style).toBe(false);
});

test("TASK-525-02: revealing CHILDREN carry their own hide-state + transition (cascade is NOT inert)", () => {
  // Guard against the inert path: a bare transition-delay on [data-page-block]
  // with no LIVE child transition produces zero visible stagger. Assert the child
  // reveal transition + hide-state actually exist, keyed off the section's
  // data-revealed, so --reveal-delay has a transition to delay.
  expect(PAGE_REVEAL_MOTION_CSS).toContain("prefers-reduced-motion: no-preference");
  expect(PAGE_REVEAL_MOTION_CSS).toContain("[data-reveal-armed]");
  // child hide-state while the section is not yet revealed:
  expect(PAGE_REVEAL_MOTION_CSS).toContain(":not([data-revealed]) [data-page-block]");

  // REGRESSION GUARD (post-audit HIGH): the child reveal transition + transition-delay
  // MUST live on a STATE-INDEPENDENT rule — one NOT gated by :not([data-revealed]).
  // Per CSS Transitions, the transition is governed by the AFTER-CHANGE (revealed)
  // computed style; if the transition only appeared on the :not([data-revealed]) rule
  // it would reset to `all 0s` once the section is revealed and the blocks would JUMP
  // (no fade, no per-block delay, no cascade). We therefore isolate every declaration
  // block that carries the child transition-delay and require at least one of them to
  // target [data-page-block] WITHOUT a preceding :not([data-revealed]) on that same
  // compound selector.
  const declRe =
    /([^{}]*\[data-page-block\])\{([^}]*transition-delay:var\(--reveal-delay,0ms\)[^}]*)\}/g;
  const transitionDeclarations = [...PAGE_REVEAL_MOTION_CSS.matchAll(declRe)];
  // the transition rule exists at all:
  expect(transitionDeclarations.length).toBeGreaterThan(0);
  // and it also carries the actual opacity/transform transition:
  expect(transitionDeclarations.some(([, , body]) => /transition:opacity[^;]*/.test(body))).toBe(
    true
  );
  // at least one transition-carrying rule is STATE-INDEPENDENT (survives into revealed):
  const hasStateIndependentTransition = transitionDeclarations.some(
    ([, selector]) => !/:not\(\[data-revealed\]\)/.test(selector)
  );
  expect(hasStateIndependentTransition).toBe(true);
  // and the hide-state rule (opacity:0) is still gated on :not([data-revealed]):
  expect(PAGE_REVEAL_MOTION_CSS).toMatch(
    /:not\(\[data-revealed\]\) \[data-page-block\]\{opacity:0\}/
  );

  // revealed target keyed on the SECTION's data-revealed (runtime toggles section only):
  expect(PAGE_REVEAL_MOTION_CSS).toContain("[data-revealed] [data-page-block]");
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    "[data-revealed] [data-page-block]{opacity:1;transform:none}"
  );
});

test("TASK-525-02: staggers a revealing section's children with distinct per-block --reveal-delay", () => {
  // Three blocks with revealDelay 0/120/240 in a reveal-up section → three frames
  // each carrying its own --reveal-delay. Combined with the child transition rule
  // asserted above, this is a real cascade (not distinct vars alone).
  const delays = [0, 120, 240];
  const emitted = delays.map(
    (d) =>
      (
        toPageBlockRenderProps(
          createPageBlockV2("text", {
            id: `blk-stagger-${d}`,
            style: { revealDelay: d } as PageBlockV2["style"],
          })
        ).style as Record<string, string>
      )["--reveal-delay"]
  );
  expect(emitted).toEqual(["0ms", "120ms", "240ms"]);
  expect(new Set(emitted).size).toBe(3);
});

test("TASK-535 — revealDelay does NOT inherit: the reveal CSS resets --reveal-delay per [data-page-block] frame", () => {
  // `--reveal-delay` is a CSS CUSTOM PROPERTY (inherits by default). A block stamps
  // it INLINE on its OWN frame, so a container that authors revealDelay would leak
  // its value onto every un-delayed nested child (they'd cascade at the ancestor's
  // delay instead of 0). The reveal CSS rule that reads it must ALSO reset it to 0ms
  // on the same [data-page-block] selector, so an un-delayed descendant uses 0ms
  // (author-stylesheet reset), while an authored frame's INLINE value still wins the
  // cascade (inline beats an author-stylesheet declaration).
  const declRe =
    /([^{}]*\[data-page-block\])\{([^}]*transition-delay:var\(--reveal-delay,0ms\)[^}]*)\}/g;
  const transitionDeclarations = [...PAGE_REVEAL_MOTION_CSS.matchAll(declRe)];
  expect(transitionDeclarations.length).toBeGreaterThan(0);
  // At least one transition-carrying rule ALSO resets the custom property to 0ms so
  // the value cannot inherit from an ancestor frame onto an un-delayed descendant.
  expect(transitionDeclarations.some(([, , body]) => body.includes("--reveal-delay:0ms"))).toBe(
    true
  );
  // The reset lives on the SAME state-independent rule that carries the transition
  // (so it survives into the revealed state), and precedes the `var()` read.
  const resetRule = transitionDeclarations.find(([, , body]) =>
    body.includes("--reveal-delay:0ms")
  );
  expect(resetRule).toBeDefined();
  const body = resetRule?.[2] ?? "";
  expect(body.indexOf("--reveal-delay:0ms")).toBeLessThan(
    body.indexOf("transition-delay:var(--reveal-delay,0ms)")
  );
  // The reset rule stays state-independent (not gated by :not([data-revealed])).
  expect(/:not\(\[data-revealed\]\)/.test(resetRule?.[1] ?? "")).toBe(false);
});

test("TASK-535 — a container's revealDelay is NOT stamped inline onto an un-delayed nested child (no inline leak)", () => {
  // DOM-structure proof of the inheritance fix's premise: the un-authored child frame
  // carries NO inline --reveal-delay (so the CSS per-frame 0ms reset governs it and it
  // does not inherit the ancestor's 500ms), while BOTH the container that authored the
  // delay AND a sibling that authored its OWN delay keep their inline values.
  const container = createPageBlockV2("container", {
    id: "blk-parent-delay",
    style: { revealDelay: 500 } as PageBlockV2["style"],
    slots: {
      children: [
        createPageBlockV2("heading", {
          id: "blk-child-nodelay",
          props: { text: "child", level: "h2", align: "left" },
        }),
        createPageBlockV2("text", {
          id: "blk-child-owndelay",
          style: { revealDelay: 120 } as PageBlockV2["style"],
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-reveal-nest", blocks: [container] })}
    />
  );
  // The container frame carries its own inline delay…
  const parentTag = html.match(/<div[^>]*data-block-id="blk-parent-delay"[^>]*>/)?.[0] ?? "";
  expect(parentTag).toContain("--reveal-delay:500ms");
  // …the self-delayed sibling keeps its OWN inline delay…
  const ownTag = html.match(/<div[^>]*data-block-id="blk-child-owndelay"[^>]*>/)?.[0] ?? "";
  expect(ownTag).toContain("--reveal-delay:120ms");
  // …but the un-delayed child frame has NO inline --reveal-delay (would otherwise
  // pin the author's 0 to the ancestor's 500ms via inheritance — the CSS reset owns
  // it instead). Its frame `style` should not mention the var at all.
  const childTag = html.match(/<div[^>]*data-block-id="blk-child-nodelay"[^>]*>/)?.[0] ?? "";
  expect(childTag).not.toContain("--reveal-delay");
});

test("TASK-535 — revealDelay-only (no section scrollEffect) is INERT by design: no motion CSS / marker / script", () => {
  // Documented scope: revealDelay is a STAGGER within a revealing section, not a
  // standalone reveal trigger. A page whose ONLY authored motion is a block
  // revealDelay — inside a section with NO scrollEffect — emits NO reveal
  // stylesheet, NO data-page-motion marker and NO runtime <script>: nothing hides
  // or observes the block, so the (still-stamped) --reveal-delay var is inert. The
  // fix for a visible reveal is to author the SECTION's reveal scrollEffect.
  const delayOnlySection = createPageSectionV2("content", {
    id: "sec-delay-only",
    style: {
      background: "#ffffff",
      backgroundType: "none",
      backgroundImage: null,
      accent: "#111111",
      radius: 0,
      shadow: "none",
      // NOTE: no scrollEffect authored.
    },
    blocks: [
      createPageBlockV2("text", {
        id: "blk-delay-only",
        style: { revealDelay: 300 } as PageBlockV2["style"],
      }),
    ],
  });
  const doc = createEffectsDocument([delayOnlySection]);
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  // The block still carries its inline var (present-only, harmless)…
  expect(html).toContain("--reveal-delay:300ms");
  // …but NONE of the section-reveal machinery is emitted (inert by design).
  expect(html).not.toContain("data-page-motion-css");
  expect(html).not.toContain("data-page-motion=");
  expect(html).not.toContain("data-page-effect");
  expect(html).not.toContain(`data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`);
});

// ---------------------------------------------------------------------------
// TASK-521-05-L03 — page-shell effects (PageDocumentRender): cursor spotlight,
// data-page-motion marker, reveal-hide + noscript, runtime script, byte-identity.
// ---------------------------------------------------------------------------

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

test("cursorSpotlight ⇒ data-page-spotlight + data-page-motion + overlay + custom props + one script", () => {
  const doc = createEffectsDocument([createSection()], {
    cursorSpotlight: true,
    spotlightColor: "#ff0000",
    spotlightSize: 400,
  });
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).toContain('data-page-spotlight="true"');
  expect(html).toContain('data-page-motion="true"');
  expect(html).toContain("data-page-spotlight-overlay");
  // TASK-523-02 — overlay stays pointer-events-none fixed inset-0; the `z-0`
  // class was DROPPED so it does not fight the CSS-raised z-index.
  expect(html).toContain("pointer-events-none fixed inset-0");
  expect(html).not.toContain("pointer-events-none fixed inset-0 z-0");
  expect(html).toContain("--spotlight-color:#ff0000");
  expect(html).toContain("--spotlight-size:400px");
  // the spotlight <style> ships the static PAGE_SPOTLIGHT_CSS
  expect(html).toContain("data-page-spotlight-css");
  expect(html).toContain("radial-gradient");
  expect(html).toContain("@media (prefers-reduced-motion: no-preference)");
  // exactly one effects runtime <script>
  expect(countMarkup(html, `data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`)).toBe(1);
  // no section effect authored ⇒ no reveal-hide style/noscript
  expect(html).not.toContain("data-page-motion-css");
});

test("PAGE_SPOTLIGHT_CSS is reduced-motion-gated radial-gradient reading --spotlight-*", () => {
  expect(PAGE_SPOTLIGHT_CSS).toContain("@media (prefers-reduced-motion: no-preference)");
  expect(PAGE_SPOTLIGHT_CSS).toContain("[data-page-spotlight] [data-page-spotlight-overlay]");
  expect(PAGE_SPOTLIGHT_CSS).toContain("radial-gradient(var(--spotlight-size,400px)");
  expect(PAGE_SPOTLIGHT_CSS).toContain("var(--spotlight-x,50%) var(--spotlight-y,50%)");
  // Default is a TRANSLUCENT tint (subtle glow that does not obscure content),
  // not the opaque brand color; authors override via --spotlight-color.
  expect(PAGE_SPOTLIGHT_CSS).toContain(
    "var(--spotlight-color,color-mix(in srgb,var(--primary) 14%,transparent))"
  );
  expect(PAGE_SPOTLIGHT_CSS).not.toContain("var(--spotlight-color,var(--primary))");
});

test("TASK-523-02 — PAGE_SPOTLIGHT_CSS overlay is occlusion-proof: NON-gated base rule adds light above section backgrounds without blocking", () => {
  // A NON-gated base rule (BEFORE the reduced-motion @media) fixes/raises/blends
  // the overlay so it renders ABOVE opaque section backgrounds and ADDS light.
  const baseRule = PAGE_SPOTLIGHT_CSS.slice(
    0,
    PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)")
  );
  expect(baseRule).toContain("[data-page-spotlight] [data-page-spotlight-overlay]");
  expect(baseRule).toContain("position:fixed");
  expect(baseRule).toContain("inset:0");
  // raised z-index — above section content, so opaque backgrounds cannot occlude it
  const zIndexMatch = /z-index:(\d+)/.exec(baseRule);
  expect(zIndexMatch).not.toBeNull();
  const overlayZIndex = Number(zIndexMatch![1]);
  // Hard Invariant #4 / AC #4: the overlay must sit STRICTLY BELOW the front
  // sticky nav (z-40) so screen-blend never tints the menu bar.
  expect(overlayZIndex).toBeLessThan(40);
  expect(overlayZIndex).toBeGreaterThan(0);
  // ADDS light without blocking
  expect(baseRule).toContain("mix-blend-mode:screen");
  expect(baseRule).toContain("pointer-events:none");
  // the moving glow (radial-gradient) STAYS behind the reduced-motion gate; the
  // base rule itself must NOT ship the gradient.
  expect(baseRule).not.toContain("radial-gradient");
  const gatedRule = PAGE_SPOTLIGHT_CSS.slice(
    PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)")
  );
  expect(gatedRule).toContain("radial-gradient");
});

test("TASK-523-02 — nav-safety invariant: overlay z-index stays strictly below the sticky nav (sticky z-40) and <Root> forms no stacking context", () => {
  // The overlay must sit above section content but BELOW the sticky nav so
  // mix-blend-mode:screen never tints the menu bar (Hard Invariant #4 / AC #4).
  const baseRule = PAGE_SPOTLIGHT_CSS.slice(
    0,
    PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)")
  );
  const overlayZIndex = Number(/z-index:(\d+)/.exec(baseRule)![1]);

  // Grep-anchor the nav's `sticky z-40`: if the nav z-index is ever dropped/renamed,
  // these break so the strictly-below relationship is re-checked.
  const navigationSource = readFileSync(
    new URL("../../../core/widgets/core/navigation.tsx", import.meta.url),
    "utf8"
  );
  const widgetRendererSource = readFileSync(
    new URL("../../../core/widgets/renderers/widgetRenderer.tsx", import.meta.url),
    "utf8"
  );
  expect(navigationSource).toContain("sticky z-40");
  expect(widgetRendererSource).toContain("sticky z-40");
  // The nav's z-index is 40; the overlay must be strictly below it.
  expect(overlayZIndex).toBeLessThan(40);

  // <Root> must NOT form a stacking context (isolation:isolate is the deliberate
  // NON-choice) so the overlay and nav share the root stacking context and the
  // z-index comparison is meaningful.
  const doc = createEffectsDocument([createSection()], { cursorSpotlight: true });
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  const rootTagMatch = /<(main|div|section|article)\b[^>]*data-page-v2="true"[^>]*>/.exec(html);
  expect(rootTagMatch).not.toBeNull();
  expect(rootTagMatch![0]).not.toContain("isolation");
  expect(rootTagMatch![0]).not.toContain("isolate");
});

test("TASK-523-02 — occlusion-proof: no authorable layer.z can reach the spotlight overlay (PAGE_LAYER_Z_CLAMP.max < overlay z-index < nav z-40)", () => {
  // The layered-canvas surface maps `layer.z` straight to `z-index` on a
  // [data-layer] child of the SAME root stacking context as the overlay
  // (pageCompositionEffects.tsx). If an author could set layer.z >= the overlay
  // z-index, that layer would paint AT/ABOVE the spotlight and occlude the glow.
  // Cap the bound STRICTLY BELOW the overlay so the glow is always visible.
  const baseRule = PAGE_SPOTLIGHT_CSS.slice(
    0,
    PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)")
  );
  const overlayZIndex = Number(/z-index:(\d+)/.exec(baseRule)![1]);

  // Grep-anchor the composition-effects mapping so this test breaks if the
  // layer.z ⇒ z-index binding is ever dropped/renamed and the invariant needs
  // re-checking against a different surface.
  const compositionEffectsSource = readFileSync(
    new URL("../../../core/services/pages/pageCompositionEffects.tsx", import.meta.url),
    "utf8"
  );
  expect(compositionEffectsSource).toContain("z-index:var(--layer-z,auto)");

  // The bound is the single source of truth for both the JSON schema and the
  // runtime normalizer (pageDocumentV2.ts), so a max below the overlay z-index
  // means NO authored/normalized layer can reach the overlay.
  expect(PAGE_LAYER_Z_CLAMP.max).toBeLessThan(overlayZIndex);
  // And the overlay itself stays strictly below the sticky nav (z-40).
  expect(overlayZIndex).toBeLessThan(40);
});

test("section scrollEffect only ⇒ data-page-motion + <style data-page-motion-css> (PAGE_REVEAL_MOTION_CSS) + <noscript> + script, no spotlight overlay", () => {
  const doc = createEffectsDocument([createEffectSection({ scrollEffect: "reveal-up" })]);
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).toContain('data-page-motion="true"');
  expect(html).toContain("data-page-motion-css");
  expect(html).toContain(PAGE_REVEAL_MOTION_CSS);
  expect(html).toContain("<noscript>");
  expect(html).toContain('[data-page-effect^="reveal"]{opacity:1;transform:none}');
  expect(countMarkup(html, `data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`)).toBe(1);
  // no page spotlight
  expect(html).not.toContain('data-page-spotlight="true"');
  expect(html).not.toContain("data-page-spotlight-overlay");
});

// ---------------------------------------------------------------------------
// TASK-535 — page-global effect-node handling across the TWO documents a page
// renders (the <main> page + the SiteFooter template). Each PageDocumentRender
// decides its own effects. Two classes of node:
//   - IDEMPOTENT stylesheets (reveal/composition/spotlight CSS + reveal noscript):
//     document-agnostic selectors, so a duplicate is HARMLESS. Emitted PER-DOCUMENT /
//     present-only ⇒ a FOOTER-ONLY effect is still styled (the earlier 535 pass that
//     gated these to the primary suppressed them on BOTH docs for footer-only effects).
//   - The viewport-fixed spotlight OVERLAY DIV: the ONE true singleton (two stack ⇒
//     double brightness). De-duplicated across documents via `peerSpotlightOn` so
//     EXACTLY ONE renders, while a footer-only spotlight still emits its overlay.
// ---------------------------------------------------------------------------

test("TASK-535 — secondary spotlight document with a spotlight PEER suppresses its overlay DIV, but still emits the (idempotent) spotlight CSS", () => {
  const doc = createEffectsDocument([createSection()], {
    cursorSpotlight: true,
    spotlightColor: "#ff0000",
    spotlightSize: 400,
  });
  // peerSpotlightOn=true models the primary <main> already owning the overlay.
  const secondary = renderToStaticMarkup(
    <PageDocumentRender document={doc} documentRole="secondary" rootTag="div" peerSpotlightOn />
  );
  // The viewport-fixed overlay DIV is NOT emitted (the primary owns the single one)…
  expect(secondary).not.toContain('data-page-spotlight-overlay="true"');
  // …but the idempotent spotlight CSS + root markers ARE emitted (harmless duplicate;
  // ensures a footer-authored spotlight is styled), and the runtime <script> emits.
  expect(secondary).toContain("data-page-spotlight-css");
  expect(secondary).toContain('data-page-spotlight="true"');
  expect(countMarkup(secondary, `data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`)).toBe(
    1
  );
});

test("TASK-535 — primary + secondary spotlight documents emit EXACTLY ONE overlay DIV across the page (peer-threaded)", () => {
  const doc = createEffectsDocument([createSection()], { cursorSpotlight: true });
  // Both author spotlight: the shell tells the footer the primary already owns the
  // overlay (peerSpotlightOn), so the footer suppresses its copy — the primary owns it.
  const primary = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  const secondary = renderToStaticMarkup(
    <PageDocumentRender document={doc} documentRole="secondary" rootTag="div" peerSpotlightOn />
  );
  const page = primary + secondary; // both documents live in one HTML document
  // Exactly one overlay DIV across the page; it comes from the PRIMARY.
  expect(countMarkup(page, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(primary, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(secondary, 'data-page-spotlight-overlay="true"')).toBe(0);
  // The spotlight CSS is idempotent and emitted per-document (harmless duplicate).
  expect(countMarkup(page, "data-page-spotlight-css")).toBe(2);
});

test("TASK-535 — FOOTER-ONLY spotlight: primary has none, footer authors it ⇒ overlay STILL renders (from the footer)", () => {
  const mainNoSpotlight = createEffectsDocument([createSection()]);
  const footerSpotlight = createEffectsDocument([createSection()], { cursorSpotlight: true });
  // Shell wiring: the primary authors no spotlight (so it owns no overlay), and the
  // footer learns the primary does NOT have one (peerSpotlightOn=false) ⇒ footer owns it.
  const primary = renderToStaticMarkup(<PageDocumentRender document={mainNoSpotlight} />);
  const secondary = renderToStaticMarkup(
    <PageDocumentRender
      document={footerSpotlight}
      documentRole="secondary"
      rootTag="div"
      peerSpotlightOn={false}
    />
  );
  const page = primary + secondary;
  // Regression guard: pre-fix this yielded ZERO overlays (primary-only gate + primary
  // has no spotlight). Now the FOOTER emits exactly one, with its CSS + root marker.
  expect(countMarkup(page, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(secondary, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(primary, 'data-page-spotlight-overlay="true"')).toBe(0);
  expect(secondary).toContain("data-page-spotlight-css");
  expect(secondary).toContain('data-page-spotlight="true"');
});

test("TASK-535 — FOOTER-ONLY reveal: primary has none, footer authors it ⇒ reveal CSS + noscript STILL emitted (from the footer)", () => {
  const mainNoEffect = createEffectsDocument([createSection()]);
  const footerReveal = createEffectsDocument([
    createEffectSection({ scrollEffect: "reveal-up" }),
    createSection(),
  ]);
  const primary = renderToStaticMarkup(<PageDocumentRender document={mainNoEffect} />);
  const secondary = renderToStaticMarkup(
    <PageDocumentRender document={footerReveal} documentRole="secondary" rootTag="div" />
  );
  // Regression guard: pre-fix these were primary-only, so a footer-only reveal was
  // emitted NOWHERE ⇒ unstyled/degraded. Now the footer emits its own idempotent copy.
  expect(primary).not.toContain("data-page-motion-css");
  expect(secondary).toContain("data-page-motion-css");
  expect(secondary).toContain("<noscript>");
  expect(secondary).toContain('data-page-effect="reveal-up"');
  const page = primary + secondary;
  expect(countMarkup(page, "data-page-motion-css")).toBe(1);
  expect(countMarkup(page, "<noscript>")).toBe(1);
});

test("TASK-535 — FOOTER-ONLY composition: primary has none, footer authors a surface ⇒ composition CSS STILL emitted (from the footer)", () => {
  const mainNoEffect = createEffectsDocument([createSection()]);
  const footerComposition = createEffectsDocument([
    createEffectSection({ surfacePreset: "glass" }),
  ]);
  const primary = renderToStaticMarkup(<PageDocumentRender document={mainNoEffect} />);
  const secondary = renderToStaticMarkup(
    <PageDocumentRender document={footerComposition} documentRole="secondary" rootTag="div" />
  );
  // Regression guard: pre-fix a footer-only glass/glow surface emitted its data-attrs
  // but the composition stylesheet was NOWHERE ⇒ unstyled surfaces. Now the footer
  // emits its own idempotent copy.
  expect(primary).not.toContain("data-page-composition-css");
  expect(secondary).toContain("data-page-composition-css");
});

test("TASK-535 — primary render is byte-identical with an explicit documentRole='primary' (default), no peer", () => {
  const doc = createEffectsDocument([createEffectSection({ scrollEffect: "reveal-up" })], {
    cursorSpotlight: true,
  });
  const implicit = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  const explicit = renderToStaticMarkup(
    <PageDocumentRender document={doc} documentRole="primary" />
  );
  expect(explicit).toBe(implicit);
  // The default primary still emits every page-global singleton exactly once
  // (overlay DIV needle, not the CSS selector).
  expect(countMarkup(implicit, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(implicit, "data-page-motion-css")).toBe(1);
});

test("no effects ⇒ byte-identical <Root> (no marker/overlay/script/style)", () => {
  const doc = createEffectsDocument([createSection()]);
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).not.toContain("data-page-motion");
  expect(html).not.toContain("data-page-spotlight");
  expect(html).not.toContain("data-coderso-runtime-script");
  expect(html).not.toContain("data-page-spotlight-css");
  expect(html).not.toContain("data-page-motion-css");
  expect(html).not.toContain("--spotlight-color");
});

test("TASK-523-02 — spotlight OFF ⇒ markup byte-identical to no-effects baseline (no overlay/CSS emitted despite the new base rule)", () => {
  const sections = [createSection()];
  const baseline = renderToStaticMarkup(
    <PageDocumentRender document={createEffectsDocument(sections)} />
  );
  const spotlightOff = renderToStaticMarkup(
    <PageDocumentRender document={createEffectsDocument(sections, { cursorSpotlight: false })} />
  );
  expect(spotlightOff).toBe(baseline);
  expect(spotlightOff).not.toContain("data-page-spotlight-overlay");
  expect(spotlightOff).not.toContain("data-page-spotlight-css");
  expect(spotlightOff).not.toContain("mix-blend-mode:screen");
});

test("spotlight script __html === PAGE_EFFECTS_RUNTIME_SOURCE", () => {
  const doc = createEffectsDocument([createSection()], { cursorSpotlight: true });
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).toContain(PAGE_EFFECTS_RUNTIME_SOURCE);
});

test("spotlightSize clamped in render; spotlightColor re-sanitized (bad color → subtle translucent default)", () => {
  const doc = createEffectsDocument([createSection()], {
    cursorSpotlight: true,
    spotlightColor: "expression(alert(1))",
    spotlightSize: 99999,
  });
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  // Rejected color falls back to the subtle translucent default, never the raw payload.
  expect(html).toContain("--spotlight-color:color-mix(in srgb, var(--primary) 14%, transparent)");
  expect(html).toContain("--spotlight-size:900px");
  expect(html).not.toContain("expression(");
});

// ---------------------------------------------------------------------------
// TASK-523-01-L02 — per-page canvas background on the <Root> (present-only,
// re-sanitized at render, disjoint from the spotlight vars).
// ---------------------------------------------------------------------------

const createBackgroundDocument = (
  background?: string,
  effects?: PageDocumentV2["settings"]["effects"]
): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: {
    template: "page-v2",
    showInNav: true,
    ...(effects ? { effects } : {}),
    ...(background ? { background } : {}),
  },
  sections: [createSection()],
});

test("settings.background color ⇒ <Root> inline style carries background (overriding bg-white)", () => {
  const html = renderToStaticMarkup(
    <PageDocumentRender document={createBackgroundDocument("#0ea5e9")} />
  );
  expect(html).toContain("background:#0ea5e9");
});

test("settings.background gradient ⇒ <Root> style carries the gradient", () => {
  const gradient = "linear-gradient(120deg,#0ea5e9,#a855f7)";
  const html = renderToStaticMarkup(
    <PageDocumentRender document={createBackgroundDocument(gradient)} />
  );
  expect(html).toContain(gradient);
});

test("background + spotlight ON ⇒ style carries BOTH background and --spotlight-* (neither clobbered)", () => {
  const html = renderToStaticMarkup(
    <PageDocumentRender
      document={createBackgroundDocument("#0ea5e9", {
        cursorSpotlight: true,
        spotlightColor: "#ff0000",
        spotlightSize: 400,
      })}
    />
  );
  expect(html).toContain("background:#0ea5e9");
  expect(html).toContain("--spotlight-color:#ff0000");
  expect(html).toContain("--spotlight-size:400px");
});

test("no background + spotlight OFF ⇒ <Root> has NO inline style (byte-identical vs post-522)", () => {
  const html = renderToStaticMarkup(<PageDocumentRender document={createBackgroundDocument()} />);
  // rootStyle stays undefined ⇒ no style attribute on the page root.
  expect(html).not.toContain("--spotlight-color");
  expect(html).not.toMatch(/data-page-v2="true"[^>]*style=/);
});

test("no background + spotlight ON ⇒ style carries ONLY --spotlight-* (no background key)", () => {
  const html = renderToStaticMarkup(
    <PageDocumentRender
      document={createBackgroundDocument(undefined, {
        cursorSpotlight: true,
        spotlightColor: "#ff0000",
      })}
    />
  );
  expect(html).toContain("--spotlight-color:#ff0000");
  // no canvas background emitted on the root style
  expect(html).not.toMatch(/data-page-v2="true"[^>]*style="[^"]*background:/);
});

test("directly-mutated bad background re-sanitized at render ⇒ no background in style", () => {
  const doc = createBackgroundDocument();
  // Bypass normalize: inject an unsafe stored value directly.
  (doc.settings as { background?: string }).background = "red;}body{display:none";
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).not.toContain("display:none");
  expect(html).not.toMatch(/data-page-v2="true"[^>]*style="[^"]*background:/);
});

// ---------------------------------------------------------------------------
// TASK-521-04 — animated-icon block (glyph set + renderer `case "icon"`)
// ---------------------------------------------------------------------------

const renderIconSection = (
  props: Record<string, unknown>,
  mutate?: (block: PageBlockV2) => void
) => {
  const block = createPageBlockV2("icon", { id: "blk-icon", props });
  mutate?.(block);
  return renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-icon",
        variant: "centered",
        blocks: [block],
      })}
    />
  );
};

test("animated-icon glyph map keys === animatedIconNames", () => {
  expect(Object.keys(animatedIconGlyphs).sort()).toEqual([...animatedIconNames].sort());
});

test("ANIMATED_ICON_KEYFRAMES_CSS is guarded by prefers-reduced-motion: no-preference", () => {
  expect(ANIMATED_ICON_KEYFRAMES_CSS).toContain("@media (prefers-reduced-motion: no-preference)");
  for (const keyframe of ["ci-spin", "ci-pulse", "ci-bounce", "ci-draw"]) {
    expect(ANIMATED_ICON_KEYFRAMES_CSS).toContain(`@keyframes ${keyframe}`);
  }
});

test("icon block renders <svg size> in [data-anim-icon=spin] with --anim-speed + color", () => {
  const html = renderIconSection({
    name: "star",
    animation: "spin",
    size: 64,
    color: "#0ea5e9",
    speed: 1200,
  });
  expect(html).toContain('<span data-anim-icon="spin"');
  expect(html).toContain("--anim-speed:1200ms");
  expect(html).toContain("color:#0ea5e9");
  expect(html).toContain('width="64"');
  expect(html).toContain("lucide-star");
});

test("icon block animation:'none' ⇒ no data-anim-icon attr (static)", () => {
  const html = renderIconSection({
    name: "sparkles",
    animation: "none",
    size: 48,
    color: "var(--primary)",
    speed: 1600,
  });
  // The span carries NO data-anim-icon attribute (the CSS <style> body still
  // references [data-anim-icon="…"] selectors, so scope the assertion to the span).
  expect(html).not.toContain("<span data-anim-icon");
  expect(html).toContain("lucide-sparkles");
});

test("icon block invalid name ⇒ sparkles fallback (render-boundary allowlist)", () => {
  // Inject a raw out-of-allowlist name AFTER normalize to prove the render
  // boundary re-resolves it (never trusts stored data).
  const html = renderIconSection(
    { name: "sparkles", animation: "pulse", size: 48, color: "var(--primary)", speed: 1600 },
    (block) => {
      (block.props as Record<string, unknown>).name = "../../etc/passwd";
    }
  );
  expect(html).toContain("lucide-sparkles");
  expect(html).not.toContain("etc/passwd");
});

test("icon block color re-sanitized at render ⇒ bad color → var(--primary)", () => {
  const html = renderIconSection(
    { name: "star", animation: "spin", size: 48, color: "var(--primary)", speed: 1600 },
    (block) => {
      (block.props as Record<string, unknown>).color = "expression(alert(1))";
    }
  );
  expect(html).not.toContain("expression");
  expect(html).toContain("color:var(--primary)");
});

test("each icon block emits a <style data-anim-icon-css> whose body === ANIMATED_ICON_KEYFRAMES_CSS (idempotent dup copies inert)", () => {
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-icon-multi",
        variant: "centered",
        blocks: [
          createPageBlockV2("icon", {
            id: "blk-icon-a",
            props: { name: "star", animation: "spin", size: 48, color: "#111", speed: 1600 },
          }),
          createPageBlockV2("icon", {
            id: "blk-icon-b",
            props: { name: "heart", animation: "pulse", size: 32, color: "#222", speed: 900 },
          }),
        ],
      })}
    />
  );
  // A style tag rides with EVERY icon block (block-scoped so it is present in the
  // builder canvas which bypasses PageDocumentRender). Duplicate emits are inert:
  // the payload is the static constant, identical for every icon block.
  expect(countMarkup(html, "data-anim-icon-css")).toBe(2);
  // dangerouslySetInnerHTML emits the CSS verbatim (no escaping), so the static
  // constant appears identically once per icon block.
  expect(countMarkup(html, ANIMATED_ICON_KEYFRAMES_CSS)).toBe(2);
});

test("AnimatedIcon component falls back to sparkles for an unknown key", () => {
  const html = renderToStaticMarkup(
    <AnimatedIcon
      name={"bogus" as never}
      animation="none"
      size={48}
      color="var(--primary)"
      speed={1600}
    />
  );
  expect(html).toContain("lucide-sparkles");
});

// ---------------------------------------------------------------------------
// TASK-522-02 — custom-SVG block (sanitized render + draw-in, XSS at render)
// ---------------------------------------------------------------------------

const HOUSE_LINE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor"><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>' +
  '<polyline points="9 21 9 12 15 12 15 21"/></svg>';

const renderCustomSvgSection = (
  props: Record<string, unknown>,
  mutate?: (block: PageBlockV2) => void
) => {
  const block = createPageBlockV2("customSvg", { id: "blk-svg", props });
  mutate?.(block);
  return renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-svg",
        variant: "centered",
        blocks: [block],
      })}
    />
  );
};

test("customSvg block renders the sanitized inline <svg> + <path>", () => {
  const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG, label: "House" });
  expect(html).toContain("<svg");
  expect(html).toContain("<path");
  expect(html).toContain('role="img"');
  expect(html).toContain('aria-label="House"');
});

test("customSvg drawIn:true adds data-draw-in + --draw-speed + pathLength=1 (length-independent)", () => {
  const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG, drawIn: true, drawSpeed: 2400 });
  expect(html).toContain("data-draw-in");
  expect(html).toContain("--draw-speed:2400ms");
  // Every stroke shape stamped with pathLength="1" so the fixed-dash CSS completes.
  expect(html).toContain('pathLength="1"');
});

test("customSvg drawIn stamps pathLength=1 even on a SHORT path (length-independent draw)", () => {
  const html = renderCustomSvgSection({
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><path d="M0 0h1"/></svg>',
    drawIn: true,
    drawSpeed: 800,
  });
  expect(html).toContain('pathLength="1"');
  expect(html).toContain("--draw-speed:800ms");
});

test("customSvg empty / whitespace svg ⇒ neutral fallback (no <svg>, no crash)", () => {
  for (const svg of ["", "   ", "\n\t"]) {
    const html = renderCustomSvgSection({ svg });
    expect(html).not.toContain("<svg");
    expect(html).toContain("▢");
  }
});

// XSS corpus asserted at the RENDER boundary — the values are injected AFTER
// write-normalization (via `mutate`) to prove the render-time re-sanitize catches
// a value that somehow bypassed write validation (older row, direct DB edit).
const CUSTOM_SVG_XSS_VECTORS: readonly string[] = [
  "<script>alert(1)</script>",
  '<svg onload="alert(1)"><path d="M0 0h1"/></svg>',
  '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)<\/script></body></foreignObject></svg>',
  '<svg><a href="javascript:alert(1)"><path d="M0 0h1"/></a></svg>',
  '<svg><use href="http://evil#x"/></svg>',
  "<svg><use href=http://evil#x/></svg>",
  "<svg><use href=//evil/x#y/></svg>",
  "<svg><image href=data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=/></svg>",
  "<svg><!--<script>--><script>alert(1)<\/script></svg>",
  "<svg><![CDATA[<script>alert(1)</script>]]></svg>",
  '<svg><path onclick="alert(1)"/></svg>',
];

test("customSvg RE-sanitizes at render ⇒ XSS vectors neutralized (defence in depth)", () => {
  const dangerous = [
    "<script",
    "onload=",
    "onclick=",
    "javascript:",
    "<foreignObject",
    "<image",
    "http://evil",
    "//evil",
    "data:image/svg",
  ];
  for (const svg of CUSTOM_SVG_XSS_VECTORS) {
    const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG }, (block) => {
      (block.props as Record<string, unknown>).svg = svg;
    });
    for (const token of dangerous) {
      expect(html.includes(token), `vector "${svg}" leaked "${token}"`).toBe(false);
    }
  }
});

test("customSvg render is isomorphic — no Node Buffer ReferenceError (browser builder canvas)", () => {
  const original = (globalThis as { Buffer?: unknown }).Buffer;
  delete (globalThis as { Buffer?: unknown }).Buffer;
  try {
    const html = renderCustomSvgSection({ svg: HOUSE_LINE_SVG });
    expect(html).toContain("<svg");
  } finally {
    (globalThis as { Buffer?: unknown }).Buffer = original;
  }
});

// ── TASK-522-03-L02 — floating-drift decoration + block-frame composition seam ──
type CompositionStyle = NonNullable<PageBlockV2["style"]>;

const composedBlock = (style: CompositionStyle, id = "blk-comp"): PageBlockV2 =>
  createPageBlockV2("heading", {
    id,
    props: { text: "Composed", level: "h2", align: "left" },
    style,
  });

// Render a heading block through the FRONT path (PageSectionContent ->
// renderPageBlockWithFrame) so the INNER effect wrapper (if any) is in the HTML.
const renderComposedBlocks = (blocks: PageBlockV2[]): string =>
  renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-comp",
        variant: "centered",
        blocks,
      })}
    />
  );

const frameAttrs = (block: PageBlockV2): Record<string, string | undefined> =>
  toPageBlockRenderProps(block).dataAttributes as Record<string, string | undefined>;
const frameVars = (block: PageBlockV2): Record<string, string | undefined> =>
  toPageBlockRenderProps(block).style as Record<string, string | undefined>;

test("decoration transform motions co-locate with the surface on the FRAME (524-01-L02)", () => {
  for (const motion of ["float", "drift", "pulse", "orbit"] as const) {
    // 524-01-L01 moved the anchor self-offset onto the free `translate:` property,
    // so a transform decoration now rides the SAME node as data-surface (the frame),
    // and its keyframe transform never clobbers the anchor offset — the surface
    // animates WITH the effect.
    const block = composedBlock({ decoration: { motion } });
    expect(frameAttrs(block)["data-deco"]).toBe(motion);
    // A plain decoration + surface card needs no inner effect wrapper anymore.
    expect(renderComposedBlocks([block])).toContain(`data-deco="${motion}"`);
  }
});

test("glass + float move together — data-surface and data-deco on the SAME node (524-01)", () => {
  // The primary owner-intent guarantee: the glass surface and its float decoration
  // are the SAME DOM node, so the surface animates WITH the effect (glass floats
  // with content). No inner effect wrapper is emitted for a plain surface+deco card.
  const block = composedBlock({ surfacePreset: "glass", decoration: { motion: "float" } });
  const attrs = frameAttrs(block);
  // toPageBlockRenderProps is the SINGLE feed for the [data-block-id] frame, so both
  // attrs landing here proves they are on the SAME node (co-located, not split).
  expect(attrs["data-surface"]).toBe("glass");
  expect(attrs["data-deco"]).toBe("float"); // co-located on the frame, not an inner wrapper
  const html = renderComposedBlocks([block]);
  // Both attributes appear inside ONE opening tag → literally the same element, so
  // the surface animates WITH the float effect. (No inner effect wrapper for a plain
  // surface+deco card.) Match a single tag carrying data-surface AND data-deco in
  // either order, with no intervening `<` (i.e. same element).
  const bothInOneTag =
    /<[^<>]*\bdata-surface="glass"[^<>]*\bdata-deco="float"[^<>]*>/.test(html) ||
    /<[^<>]*\bdata-deco="float"[^<>]*\bdata-surface="glass"[^<>]*>/.test(html);
  expect(bothInOneTag).toBe(true);
  // Timing vars ride that same frame node.
  const timed = composedBlock({
    surfacePreset: "glass",
    decoration: { motion: "float", delay: 1500, duration: 8000 },
  });
  const timedVars = frameVars(timed);
  expect(timedVars["--deco-delay"]).toBe("1500ms");
  expect(timedVars["--deco-duration"]).toBe("8000ms");
});

test('decoration "radiate" stays on the FRAME (box-shadow — no inner wrapper)', () => {
  const block = composedBlock({ decoration: { motion: "radiate" } });
  expect(frameAttrs(block)["data-deco"]).toBe("radiate");
});

test('decoration "none" resets — present-only, no data-deco anywhere', () => {
  const block = composedBlock({ decoration: { motion: "none" } });
  expect(frameAttrs(block)["data-deco"]).toBeUndefined();
  expect(renderComposedBlocks([block])).not.toContain("data-deco");
});

test("decoration delay/duration emit --deco-* on the FRAME node (524-01-L02)", () => {
  // 524-01-L02 empties INNER_VAR_KEYS, so the decoration timing vars seed the frame
  // element that now carries data-deco (the keyframe binding reads them there).
  const block = composedBlock({ decoration: { motion: "float", delay: 900, duration: 8000 } });
  expect(frameVars(block)["--deco-delay"]).toBe("900ms");
  expect(frameVars(block)["--deco-duration"]).toBe("8000ms");
  const html = renderComposedBlocks([block]);
  expect(html).toContain("--deco-delay:900ms");
  expect(html).toContain("--deco-duration:8000ms");
});

test("two decorated siblings with different delay stagger (distinct --deco-delay)", () => {
  const html = renderComposedBlocks([
    composedBlock({ decoration: { motion: "float", delay: 900 } }, "blk-a"),
    composedBlock({ decoration: { motion: "float", delay: 1500 } }, "blk-b"),
  ]);
  expect(html).toContain("--deco-delay:900ms");
  expect(html).toContain("--deco-delay:1500ms");
});

test("unstyled block → toPageBlockRenderProps byte-identical, no inner wrapper", () => {
  const block = createPageBlockV2("heading", {
    id: "blk-plain",
    props: { text: "Plain", level: "h2", align: "left" },
  });
  const rp = toPageBlockRenderProps(block);
  // Exactly the two pre-522 data attributes — no composition attrs leaked.
  expect(Object.keys(rp.dataAttributes).sort()).toEqual(["data-block-id", "data-page-block"]);
  const styleKeys = Object.keys(rp.style as Record<string, unknown>);
  expect(
    styleKeys.some(
      (k) => k.startsWith("--layer") || k.startsWith("--deco") || k.startsWith("--surface")
    )
  ).toBe(false);
  const html = renderComposedBlocks([block]);
  expect(html).not.toContain("data-deco");
  expect(html).not.toContain("data-surface");
  expect(html).not.toContain("data-tilt-parent");
  expect(html).not.toContain("cx-glare");
});

test("surface preset rides the FRAME on the shared feed (both render paths)", () => {
  // toPageBlockRenderProps is the SINGLE feed for the front PageBlockFrame AND
  // the canvas renderBlockFrame callback, so asserting it covers both paths.
  const glass = composedBlock({ surfacePreset: "glass" });
  expect(frameAttrs(glass)["data-surface"]).toBe("glass");
  const html = renderComposedBlocks([glass]);
  expect(html).toContain('data-surface="glass"');
});

test("TASK-528 tilt on any block → frame data-block-tilt + ancestor data-tilt-parent + glare child", () => {
  const block = composedBlock({ tilt: "subtle", tiltGlare: true });
  // TASK-528 whole-card tilt: the tilt transform rides the FRAME (co-located with
  // data-surface); the CSS perspective moves to an ANCESTOR wrapper (not the frame).
  expect(frameAttrs(block)["data-block-tilt"]).toBe("subtle");
  expect(frameAttrs(block)["data-tilt-parent"]).toBeUndefined();
  const html = renderComposedBlocks([block]);
  expect(html).toContain('data-block-tilt="subtle"');
  expect(html).toContain("data-tilt-parent");
  expect(html).toContain("cx-glare");
});

test("TASK-528 whole card tilts — glass + tilt land on the SAME node (data-block-tilt === data-surface node)", () => {
  // The owner bug: glass CARD stayed flat while only inner content tilted, because
  // data-surface was on the frame but data-block-tilt sat on an inner child. FIX:
  // both must be co-located on the FRAME so the entire glass card tilts on hover.
  const block = composedBlock({ surfacePreset: "glass", tilt: "strong" });
  const attrs = frameAttrs(block);
  expect(attrs["data-surface"]).toBe("glass");
  expect(attrs["data-block-tilt"]).toBe("strong");
  // Perspective on an ancestor wrapper, NOT the transformed frame node.
  expect(attrs["data-tilt-parent"]).toBeUndefined();
  // HTML sanity: the SAME element carries both attrs (the frame element opens with
  // data-surface="glass" ... data-block-tilt="strong" before the next `>`).
  const html = renderComposedBlocks([block]);
  expect(html).toMatch(/data-surface="glass"[^>]*data-block-tilt="strong"/);
  expect(html).toContain("data-tilt-parent");
});

test("surfacePreset ambient-orbs emits two aria-hidden .cx-orb spans in the inner wrapper", () => {
  const block = composedBlock({ surfacePreset: "ambient-orbs" });
  expect(frameAttrs(block)["data-surface"]).toBe("ambient-orbs");
  const html = renderComposedBlocks([block]);
  expect(html).toContain("cx-orb-a");
  expect(html).toContain("cx-orb-b");
  // Orbs drift; both are aria-hidden decorative spans.
  expect(html.match(/data-deco="drift"/g)?.length).toBe(2);
});

test("glass/radial-glow surfaces self-paint on the frame — NO orb spans", () => {
  for (const surfacePreset of ["glass", "radial-glow"] as const) {
    const html = renderComposedBlocks([composedBlock({ surfacePreset })]);
    expect(html).not.toContain("cx-orb");
  }
});

test("finding 4 — anchored layered child co-locates layer + deco on the FRAME (524-01)", () => {
  const block = composedBlock({
    decoration: { motion: "float" },
    layer: { x: 10, y: 20, anchor: "top-right" },
  });
  const attrs = frameAttrs(block);
  const vars = frameVars(block);
  // Layer positioning + anchor ride the real [data-block-id] frame so the
  // 522-05-L02 per-device --layer-* override reaches them. The anchor self-offset
  // rides the free `translate:` property (524-01-L01), so the float decoration
  // co-locates on the SAME frame node — its transform never clobbers the offset.
  expect(attrs["data-layer"]).toBe("");
  expect(attrs["data-layer-anchor"]).toBe("top-right");
  expect(vars["--layer-x"]).toBe("10%");
  expect(vars["--layer-y"]).toBe("20%");
  // The float decoration is now on the frame (same node as layer); no tilt perspective.
  expect(attrs["data-deco"]).toBe("float");
  expect(attrs["data-tilt-parent"]).toBeUndefined();
  expect(renderComposedBlocks([block])).toContain(`data-deco="float"`);
});

test("finding 4 — anchor + hover lift co-locate layer + hover on the FRAME (524-01)", () => {
  const block = composedBlock({
    hoverEffect: "lift",
    layer: { x: 5, y: 5, anchor: "bottom-right" },
  });
  const attrs = frameAttrs(block);
  expect(attrs["data-layer-anchor"]).toBe("bottom-right");
  expect(frameVars(block)["--layer-x"]).toBe("5%");
  // Transform hover now rides the frame (same node as the anchor `translate:` offset).
  expect(attrs["data-hover"]).toBe("lift");
  expect(renderComposedBlocks([block])).toContain('data-hover="lift"');
});

test("TASK-535 finding — tilt + layer: layer PLACEMENT hoists to the perspective WRAPPER, tilt stays on the frame", () => {
  // Regression for the tilt+layer containing-block bug: a non-`none` `perspective`
  // on the [data-tilt-parent] wrapper establishes a CONTAINING BLOCK for absolute
  // descendants. With the layer placement on the FRAME (pre-535), the frame went
  // `position:absolute` but resolved its --layer-x/y offsets against the WRAPPER
  // instead of the `.cx-layered-canvas`, and the wrapper stayed at its in-flow
  // origin → the layered chip landed at the wrong place. FIX: the LAYER PLACEMENT
  // (data-layer + data-layer-anchor + --layer-x/y/z) rides the WRAPPER so the
  // WRAPPER is the absolutely positioned layered child (offsets resolve against the
  // canvas); the tilt transform stays on the inner frame.
  const block = composedBlock({
    tilt: "subtle",
    layer: { x: 8, y: 12, z: 3, anchor: "bottom-right" },
  });
  // The FRAME (the real [data-block-id] node) no longer carries the layer placement —
  // it must NOT go `position:absolute` and escape the wrapper.
  const attrs = frameAttrs(block);
  const vars = frameVars(block);
  expect(attrs["data-layer"]).toBeUndefined();
  expect(attrs["data-layer-anchor"]).toBeUndefined();
  expect(vars["--layer-x"]).toBeUndefined();
  expect(vars["--layer-y"]).toBeUndefined();
  expect(vars["--layer-z"]).toBeUndefined();
  // Tilt rides the frame (whole-card tilt, TASK-528); perspective on the ancestor.
  expect(attrs["data-block-tilt"]).toBe("subtle");
  expect(attrs["data-tilt-parent"]).toBeUndefined();

  // Structural: the [data-tilt-parent] wrapper IS the absolutely-positioned layered
  // child — it carries data-layer + data-layer-anchor + the base --layer-* the
  // `[data-composition="layered"] [data-layer]{position:absolute;left:var(--layer-x)…}`
  // CSS consumes, and it WRAPS the tilt frame (wrapper open tag precedes the frame's
  // data-block-tilt, with no other block frame between them).
  const html = renderComposedBlocks([block]);
  const wrapperMatch = html.match(/<div data-tilt-parent[^>]*>/);
  expect(wrapperMatch).not.toBeNull();
  const wrapperTag = wrapperMatch?.[0] ?? "";
  expect(wrapperTag).toContain('data-layer=""');
  expect(wrapperTag).toContain('data-layer-anchor="bottom-right"');
  expect(wrapperTag).toContain("--layer-x:8%");
  expect(wrapperTag).toContain("--layer-y:12%");
  expect(wrapperTag).toContain("--layer-z:3");
  expect(wrapperTag).toContain("perspective:1200px");
  // TASK-535 per-device layer: the wrapper carries the block id as
  // `data-tilt-parent-for` (present ONLY for this hoisted tilt+layer case) so
  // pageResponsiveCss can retarget the per-device --layer-* override at the wrapper
  // (custom props inherit downward; a frame-scoped override can never reach it).
  expect(wrapperTag).toContain('data-tilt-parent-for="blk-comp"');
  // The wrapper is an ANCESTOR of the tilt frame (wrapper `>` comes before the
  // frame's data-block-tilt in document order).
  const wrapperOpenIdx = html.indexOf(wrapperTag);
  const tiltIdx = html.indexOf('data-block-tilt="subtle"');
  expect(wrapperOpenIdx).toBeGreaterThanOrEqual(0);
  expect(tiltIdx).toBeGreaterThan(wrapperOpenIdx);
  // The layer placement is NOT duplicated onto the frame node itself.
  expect(html).not.toMatch(/data-block-tilt="subtle"[^>]*data-layer=/);
});

test("finding 4 — radiate + anchor stays wholly on the frame (no inner wrapper)", () => {
  const block = composedBlock({
    decoration: { motion: "radiate" },
    layer: { x: 3, y: 4, anchor: "top-right" },
  });
  const attrs = frameAttrs(block);
  expect(attrs["data-deco"]).toBe("radiate");
  expect(attrs["data-layer-anchor"]).toBe("top-right");
});

test("finding 4 — layer-only block (no transform effect) keeps everything on the frame", () => {
  const block = composedBlock({ layer: { x: 1, y: 2, anchor: "center" } });
  const attrs = frameAttrs(block);
  expect(attrs["data-layer"]).toBe("");
  expect(attrs["data-layer-anchor"]).toBe("center");
  // No effect → no inner wrapper markers.
  const html = renderComposedBlocks([block]);
  expect(html).not.toContain("data-deco");
  expect(html).not.toContain("data-block-tilt");
  // TASK-535: no tilt ⇒ no perspective wrapper, so no per-device layer hook either
  // (layer-only stays byte-identical to pre-535 — the responsive override rides the
  // frame [data-block-id], not a wrapper).
  expect(html).not.toContain("data-tilt-parent-for");
});

// ── TASK-522-04-L02 — block tilt render-shape (controls in 522-04-L01) ──
test('tilt "strong" → data-block-tilt="strong" on the FRAME, perspective on ancestor (528)', () => {
  const block = composedBlock({ tilt: "strong" });
  // TASK-528 whole-card tilt: the runtime-rotated node is the FRAME; perspective on ancestor.
  expect(frameAttrs(block)["data-block-tilt"]).toBe("strong");
  expect(frameAttrs(block)["data-tilt-parent"]).toBeUndefined();
  const html = renderComposedBlocks([block]);
  expect(html).toContain('data-block-tilt="strong"');
  expect(html).toContain("data-tilt-parent");
  // No glare requested → no sheen child.
  expect(html).not.toContain("cx-glare");
});

test('tilt "none" resets — present-only, byte-identical (no perspective/inner wrapper)', () => {
  const none = composedBlock({ tilt: "none" });
  expect(frameAttrs(none)["data-tilt-parent"]).toBeUndefined();
  expect(renderComposedBlocks([none])).not.toContain("data-block-tilt");

  // Unset tilt is byte-identical to a plain block: no tilt attrs at all.
  const plain = createPageBlockV2("heading", {
    id: "blk-comp",
    props: { text: "Composed", level: "h2", align: "left" },
  });
  const html = renderComposedBlocks([plain]);
  expect(html).not.toContain("data-tilt-parent");
  expect(html).not.toContain("data-block-tilt");
  expect(html).not.toContain("cx-glare");
});

// ── TASK-522-05-L05 — section surface, page-root emit, layered canvas, ──────────
// ── glass/hover, marquee ───────────────────────────────────────────────────────

const surfaceSection = (style: Partial<PageSectionV2["style"]>) =>
  createPageSectionV2("hero", {
    id: "sec-surface",
    variant: "centered",
    style: {
      background: "#ffffff",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
      ...style,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-surf-h",
        props: { text: "Surface", level: "h1", align: "center" },
      }),
    ],
  });

test("section surface preset stamps data-surface (522-05-L01)", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={surfaceSection({ surfacePreset: "glass" })} />
  );
  expect(html).toContain('data-surface="glass"');
});

test("section ambient-orbs preset emits two decorative orb spans", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={surfaceSection({ surfacePreset: "ambient-orbs" })} />
  );
  expect(html).toContain('data-surface="ambient-orbs"');
  expect(html).toContain("cx-orb-a");
  expect(html).toContain("cx-orb-b");
  expect(countMarkup(html, 'aria-hidden="true" data-deco="drift"')).toBe(2);
});

test("section composition:layered stamps data-composition", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={surfaceSection({ composition: "layered" })} />
  );
  expect(html).toContain('data-composition="layered"');
});

test("page-root composition emit is present-only + single runtime script (522-05-L01)", () => {
  // A doc that authors a mouse-tilt → ONE composition <style> + ONE runtime
  // <script> (the 522 tilt binding reuses 521-05's single emit, not a 2nd tag).
  const tiltDoc = createDocument([
    createPageSectionV2("hero", {
      id: "sec-tilt-doc",
      variant: "centered",
      blocks: [composedBlock({ tilt: "strong" }, "blk-tilt-doc")],
    }),
  ]);
  const tiltHtml = renderToStaticMarkup(<PageDocumentRender document={tiltDoc} />);
  expect(countMarkup(tiltHtml, "data-page-composition-css")).toBe(1);
  expect(countMarkup(tiltHtml, "data-coderso-runtime-script=")).toBe(1);

  // A doc that authors a NON-tilt composition effect (surface) → composition
  // <style> but NO runtime <script> (surfaces are static CSS).
  const surfaceDoc = createDocument([surfaceSection({ surfacePreset: "glass" })]);
  const surfaceHtml = renderToStaticMarkup(<PageDocumentRender document={surfaceDoc} />);
  expect(countMarkup(surfaceHtml, "data-page-composition-css")).toBe(1);
  expect(surfaceHtml).not.toContain("data-coderso-runtime-script");

  // A NO-effect doc → neither the composition <style> nor a runtime <script>
  // (present-only / byte-identical to post-521).
  const plainDoc = createDocument([
    createPageSectionV2("hero", {
      id: "sec-plain-doc",
      variant: "centered",
      blocks: [
        createPageBlockV2("heading", {
          id: "blk-plain-doc",
          props: { text: "Plain", level: "h1", align: "center" },
        }),
      ],
    }),
  ]);
  const plainHtml = renderToStaticMarkup(<PageDocumentRender document={plainDoc} />);
  expect(plainHtml).not.toContain("data-page-composition-css");
  expect(plainHtml).not.toContain("data-coderso-runtime-script");
});

test("layered layout block places children absolutely via data-layer + --layer-* (522-05-L02)", () => {
  const container = createPageBlockV2("container", {
    id: "blk-layered",
    style: { composition: "layered" },
    slots: {
      children: [
        createPageBlockV2("heading", {
          id: "blk-l1",
          props: { text: "A", level: "h2", align: "left" },
          style: { layer: { x: 10, y: 20, z: 3, anchor: "top-left" } },
        }),
        createPageBlockV2("text", {
          id: "blk-l2",
          props: { text: "B", format: "plain", align: "left" },
          style: { layer: { x: 40, y: 60, z: 5 } },
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-l", blocks: [container] })}
    />
  );
  // Parent frame is the positioning context; content is the pass-through canvas.
  expect(html).toContain('data-composition="layered"');
  expect(html).toContain("cx-layered-canvas");
  expect(html).toContain("cx-layered-slot");
  // Each child frame carries data-layer + the --layer-* custom props.
  expect(html).toContain('data-block-id="blk-l1"');
  expect(html).toContain("--layer-x:10%");
  expect(html).toContain("--layer-y:20%");
  expect(html).toContain("--layer-z:3");
  expect(html).toContain('data-layer-anchor="top-left"');
  expect(html).toContain("--layer-x:40%");
});

test("TASK-535 — a tilt+layer child inside a layered canvas positions the WRAPPER, not the tilt frame", () => {
  // End-to-end: a layered-canvas child that authors BOTH layer AND tilt. The
  // `[data-composition="layered"] [data-layer]{position:absolute;left:var(--layer-x)…}`
  // rule must land on the [data-tilt-parent] WRAPPER (so it positions against the
  // .cx-layered-canvas), NOT on the inner tilt frame (whose `perspective` ancestor
  // would otherwise steal its containing block and pin it to the wrapper's in-flow
  // origin). The tilt transform + data-block-id stay on the inner frame.
  const container = createPageBlockV2("container", {
    id: "blk-layered-tilt",
    style: { composition: "layered" },
    slots: {
      children: [
        createPageBlockV2("heading", {
          id: "blk-lt1",
          props: { text: "Tilted chip", level: "h2", align: "left" },
          style: { layer: { x: 25, y: 35, z: 4, anchor: "center" }, tilt: "strong" },
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-lt", blocks: [container] })}
    />
  );
  expect(html).toContain("cx-layered-canvas");
  // The tilt wrapper is the layered positioned child: it carries data-layer +
  // anchor + --layer-* + perspective, and it opens BEFORE the tilt frame it wraps.
  const wrapperTag = html.match(/<div data-tilt-parent[^>]*>/)?.[0] ?? "";
  expect(wrapperTag).toContain('data-layer=""');
  expect(wrapperTag).toContain('data-layer-anchor="center"');
  expect(wrapperTag).toContain("--layer-x:25%");
  expect(wrapperTag).toContain("--layer-y:35%");
  expect(wrapperTag).toContain("--layer-z:4");
  // The real block frame carries the tilt + its id — but NOT the layer placement,
  // so it never goes absolute and escapes the wrapper.
  expect(html).toMatch(
    /data-block-id="blk-lt1"[^>]*data-block-tilt="strong"|data-block-tilt="strong"[^>]*data-block-id="blk-lt1"/
  );
  expect(html).not.toMatch(/data-block-id="blk-lt1"[^>]*data-layer=/);
  // Wrapper wraps the frame (document order: wrapper `>` precedes the frame id).
  expect(html.indexOf(wrapperTag)).toBeLessThan(html.indexOf('data-block-id="blk-lt1"'));
});

test("flow (unset composition) layout block stays byte-identical (no layered canvas)", () => {
  const flow = createPageBlockV2("container", {
    id: "blk-flow",
    slots: {
      children: [
        createPageBlockV2("heading", {
          id: "blk-fc",
          props: { text: "X", level: "h2", align: "left" },
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent section={createPageSectionV2("content", { id: "sec-f", blocks: [flow] })} />
  );
  expect(html).not.toContain("cx-layered-canvas");
  expect(html).not.toContain('data-composition="layered"');
});

test("block glass/hover presets stamp data-surface / data-hover (522-05-L03)", () => {
  // Surface preset stays on the FRAME (static, non-transform).
  expect(frameAttrs(composedBlock({ surfacePreset: "glass" }))["data-surface"]).toBe("glass");
  expect(renderComposedBlocks([composedBlock({ surfacePreset: "glass" })])).toContain(
    'data-surface="glass"'
  );
  // lift-glow is a transform hover → after 524-01 co-location it rides the SAME
  // node as the surface (the frame), so the front render carries data-hover on the
  // frame (its transform composes with the anchor `translate:` offset).
  expect(frameAttrs(composedBlock({ hoverEffect: "lift-glow" }))["data-hover"]).toBe("lift-glow");
  expect(renderComposedBlocks([composedBlock({ hoverEffect: "lift-glow" })])).toContain(
    'data-hover="lift-glow"'
  );
});

const marqueeGroup = (marquee: NonNullable<NonNullable<PageBlockV2["style"]>["marquee"]>) =>
  createPageBlockV2("group", {
    id: "blk-marquee",
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee },
    slots: {
      children: [
        createPageBlockV2("text", {
          id: "blk-m1",
          props: { text: "One", format: "plain", align: "left" },
        }),
        createPageBlockV2("text", {
          id: "blk-m2",
          props: { text: "Two", format: "plain", align: "left" },
        }),
      ],
    },
  });

test("marquee group renders a viewport + two tracks with frame data-marquee (522-05-L04)", () => {
  const group = marqueeGroup({ speed: 18, direction: "right", seamless: true });
  // The FRAME carries the marquee attrs/vars (via the 522-03 resolver).
  expect(frameAttrs(group)["data-marquee"]).toBe("");
  expect(frameAttrs(group)["data-marquee-dir"]).toBe("right");
  expect(frameVars(group)["--marquee-speed"]).toBe("18s");
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-mq", blocks: [group] })}
    />
  );
  expect(html).toContain("cx-marquee-viewport");
  // seamless → two tracks (one aria-hidden).
  expect(countMarkup(html, "cx-marquee-track")).toBe(2);
  expect(countMarkup(html, 'aria-hidden="true"')).toBeGreaterThanOrEqual(1);
});

test("no marquee → byte-identical group flow (no viewport)", () => {
  const group = createPageBlockV2("group", {
    id: "blk-plain-group",
    props: { direction: "row", wrap: false, gap: 16 },
    slots: {
      children: [
        createPageBlockV2("text", {
          id: "blk-pg1",
          props: { text: "Flow", format: "plain", align: "left" },
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-pg", blocks: [group] })}
    />
  );
  expect(html).not.toContain("cx-marquee-viewport");
  expect(html).not.toContain("data-marquee");
});

test("seamless marquee copy carries NO data-block-id in canvas mode (finding 3)", () => {
  const group = marqueeGroup({ speed: 18, direction: "left", seamless: true });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-mc", blocks: [group] })}
      // Mimic the builder canvas: the selection frame emits data-block-id.
      renderBlockFrame={({ content, renderProps }) => (
        <div {...renderProps.dataAttributes}>{content}</div>
      )}
    />
  );
  // Each item's data-block-id matches EXACTLY one DOM node — the primary track's
  // framed item — never the aria-hidden decorative copy (no duplicate targets).
  expect(countMarkup(html, 'data-block-id="blk-m1"')).toBe(1);
  expect(countMarkup(html, 'data-block-id="blk-m2"')).toBe(1);
  // Two tracks still render (the copy is present, just frame-less).
  expect(countMarkup(html, "cx-marquee-track")).toBe(2);
});

// ── TASK-531-01-L02/L04 — glow render + section-gradient (single + multi-layer) ──
// The SSR inline-style boundary (React-escaped CSSProperties). Covers the pure
// glow composer, block/section glow merge, section gradient parity with the
// already-wired block gradient, multi-layer paint on BOTH targets, and byte-identity.
describe("glow + multi-layer/section gradient render (TASK-531-01-L02)", () => {
  const CTA_CARD =
    "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)";

  test("composeGlowBoxShadow emits a fixed four-part template from sanitized inputs", () => {
    // The reference glow: 0 18px 45px rgba(142,232,255,.22) — matches criterion #4.
    expect(composeGlowBoxShadow({ color: "#8ee8ff", blur: 45, y: 18 })).toBe(
      "0px 18px 45px 0px #8ee8ff"
    );
    expect(composeGlowBoxShadow({ color: "rgba(142,232,255,.22)", blur: 45, y: 18 })).toBe(
      "0px 18px 45px 0px rgba(142,232,255,.22)"
    );
    // Defaults: blur ⇒ 24, spread/x/y ⇒ 0 when unset.
    expect(composeGlowBoxShadow({ color: "#0d9488" })).toBe("0px 0px 24px 0px #0d9488");
    // Negative offsets/spread survive (clamped, not stripped).
    expect(composeGlowBoxShadow({ color: "#0d9488", x: -12, y: -8, spread: -10 })).toBe(
      "-12px -8px 24px -10px #0d9488"
    );
  });

  test("composeGlowBoxShadow re-sanitizes the color at render (fail-soft to undefined)", () => {
    // Defence in depth: a bad color composes to NOTHING (no glow), never a raw string.
    expect(composeGlowBoxShadow({ color: "expression(alert(1))" })).toBeUndefined();
    expect(composeGlowBoxShadow({ color: "url(//evil/x)" })).toBeUndefined();
    expect(composeGlowBoxShadow(undefined)).toBeUndefined();
  });

  test("composeGlowBoxShadow clamps out-of-range numbers into the 531 bounds", () => {
    expect(
      composeGlowBoxShadow({ color: "#000", blur: 9999, spread: 9999, x: 9999, y: -9999 })
    ).toBe(`80px -80px 120px 80px #000`);
    // clampGlowNum truncates + clamps a possibly-undefined value (default 0).
    expect(clampGlowNum(undefined, PAGE_GLOW_BLUR_CLAMP)).toBe(0);
    expect(clampGlowNum(45.9, PAGE_GLOW_BLUR_CLAMP)).toBe(45);
    expect(clampGlowNum(9999, PAGE_GLOW_BLUR_CLAMP)).toBe(120);
    expect(clampGlowNum(-9999, PAGE_GLOW_OFFSET_CLAMP)).toBe(-80);
    expect(clampGlowNum(-9999, PAGE_GLOW_SPREAD_CLAMP)).toBe(-40);
  });

  test("mergeShadows comma-joins the enum shadow and the glow (glow AUGMENTS, does not replace)", () => {
    expect(mergeShadows("0 14px 40px rgba(15, 23, 42, 0.12)", "0px 18px 45px 0px #8ee8ff")).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12), 0px 18px 45px 0px #8ee8ff"
    );
    expect(mergeShadows(undefined, "0px 0px 24px 0px #8ee8ff")).toBe("0px 0px 24px 0px #8ee8ff");
    expect(mergeShadows("0 14px 40px rgba(15, 23, 42, 0.12)", undefined)).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12)"
    );
    expect(mergeShadows(undefined, undefined)).toBeUndefined();
  });

  test("a block with glow ONLY emits the composed box-shadow on its render props", () => {
    const block = createPageBlockV2("heading", {
      id: "blk-glow-only",
      props: { text: "Glow", level: "h2", align: "left" },
      style: { glow: { color: "rgba(142,232,255,.22)", blur: 45, y: 18 } } as never,
    });
    expect(toPageBlockRenderProps(block).style.boxShadow).toBe(
      "0px 18px 45px 0px rgba(142,232,255,.22)"
    );
  });

  test("a block with BOTH enum shadow AND glow emits a TWO-shadow box-shadow (enum first)", () => {
    const block = createPageBlockV2("heading", {
      id: "blk-glow-shadow",
      props: { text: "Glow", level: "h2", align: "left" },
      style: { shadow: "md", glow: { color: "#8ee8ff", blur: 28 } } as never,
    });
    expect(toPageBlockRenderProps(block).style.boxShadow).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12), 0px 0px 28px 0px #8ee8ff"
    );
  });

  test("a section with glow merges it into the section box AND the bleed box", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-glow",
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "md",
        glow: { color: "#8ee8ff", blur: 28 },
      } as never,
    });
    expect(toPageSectionStyle(section).boxShadow).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12), 0px 0px 28px 0px #8ee8ff"
    );
    // Full-bleed section: the glow bleeds edge-to-edge on the bleed box too.
    const fullBleed = createPageSectionV2("hero", {
      id: "sec-glow-bleed",
      variant: "full-width",
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        glow: { color: "#8ee8ff", blur: 28 },
      } as never,
    });
    expect(toPageSectionBleedStyle(fullBleed)?.boxShadow).toBe("0px 0px 28px 0px #8ee8ff");
  });

  test("SECTION backgroundType:gradient paints a single-layer gradient via backgroundImage", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-gradient-single",
      style: {
        background: "linear-gradient(145deg,#0f1720,#1b2733)",
        backgroundType: "gradient",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionStyle(section).backgroundImage).toBe(
      "linear-gradient(145deg,#0f1720,#1b2733)"
    );
    // No flat background-color when the type is gradient.
    expect(toPageSectionStyle(section).backgroundColor).toBeUndefined();
  });

  test("SECTION backgroundType:gradient paints the reference .cta-card MULTI-LAYER value (relaxed re-gate)", () => {
    // This is the render-side gate for the fix: a PRE-relax toGradientBackground
    // would return undefined here (single-layer re-check drops the comma-joined value).
    // Non-full-bleed: the gradient paints on the content box (toPageSectionStyle).
    const section = createPageSectionV2("hero", {
      id: "sec-gradient-multi",
      variant: "default",
      style: {
        background: CTA_CARD,
        backgroundType: "gradient",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionStyle(section).backgroundImage).toBe(CTA_CARD);
    // No bleed box for a non-full-bleed section.
    expect(toPageSectionBleedStyle(section)).toBeUndefined();

    // Full-bleed: the paint moves to the bleed box (525 model — content stays capped),
    // so the multi-layer gradient bleeds edge-to-edge there.
    const fullBleed = createPageSectionV2("hero", {
      id: "sec-gradient-multi-bleed",
      variant: "full-width",
      style: {
        background: CTA_CARD,
        backgroundType: "gradient",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionBleedStyle(fullBleed)?.backgroundImage).toBe(CTA_CARD);
  });

  test("SECTION gradient with an invalid value falls back cleanly (no paint, no throw)", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-gradient-bad",
      style: {
        background: "linear-gradient(#fff,#000), url(//evil/beacon)",
        backgroundType: "gradient",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionStyle(section).backgroundImage).toBeUndefined();
  });

  test("switching a SECTION back to color/image restores flat/image paint (no gradient)", () => {
    const color = createPageSectionV2("hero", {
      id: "sec-flat",
      style: {
        background: "#101828",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionStyle(color).backgroundColor).toBe("#101828");
    expect(toPageSectionStyle(color).backgroundImage).toBeUndefined();
  });

  test("BLOCK gradient path still emits single-layer AND now paints the MULTI-LAYER value", () => {
    // The block :738 call site is UNCHANGED; the shared toGradientBackground relax
    // reaches the block target too. Single-layer regression guard first:
    const single = createPageBlockV2("button", {
      id: "blk-grad-single",
      props: { label: "Go", href: "/go" },
      style: { background: "linear-gradient(90deg,#000,#fff)", backgroundType: "gradient" },
    });
    const singleSection = createPageSectionV2("cta", { id: "sec-blk-single", blocks: [single] });
    const singleHtml = renderToStaticMarkup(<PageSectionContent section={singleSection} />);
    expect(singleHtml).toContain("background-image:linear-gradient(90deg,#000,#fff)");

    // Multi-layer on a card block (heading frame carries the visual style):
    const multi = createPageBlockV2("heading", {
      id: "blk-grad-multi",
      props: { text: "Card", level: "h2", align: "left" },
      style: { background: CTA_CARD, backgroundType: "gradient" } as never,
    });
    expect(toPageBlockRenderProps(multi).style.backgroundImage).toBe(CTA_CARD);
    // And it survives to the SSR markup (React-escaped into the style attribute).
    const multiSection = createPageSectionV2("content", { id: "sec-blk-multi", blocks: [multi] });
    const multiHtml = renderToStaticMarkup(<PageSectionContent section={multiSection} />);
    expect(multiHtml).toContain("background-image:radial-gradient(circle at 82% 10%");
  });

  test("no-glow / no-gradient section + block render byte-identical to the pre-531 style shape", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-noeffect",
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
    // The enum shadow alone (no glow) is UNCHANGED — no trailing comma-joined glow.
    expect(style.boxShadow).toBe("0 6px 20px rgba(15, 23, 42, 0.08)");
    expect(style.backgroundColor).toBe("#eef2ff");
    const block = createPageBlockV2("heading", {
      id: "blk-noeffect",
      props: { text: "Plain", level: "h2", align: "left" },
      style: { shadow: "md" },
    });
    expect(toPageBlockRenderProps(block).style.boxShadow).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12)"
    );
  });
});
