// TASK-539-05-L01 — section layout: section props, templates, variants, full-bleed/full-width caps, stackVertical
// Cohesive suite split out of the former `page-renderer-v2.test.tsx` monolith.
// Each suite is independently runnable in the Vitest lane (Bun-free pages renderer).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  resolvePageSectionForBreakpoint,
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
import {
  countMarkup,
  createEffectsDocument,
  createSection,
  stripSectionTemplateMarker,
} from "./pageRendererV2TestFixtures";
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
