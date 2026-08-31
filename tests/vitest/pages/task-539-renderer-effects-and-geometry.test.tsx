// TASK-539-05-L02 — renderer effects, L05 placement, canonical gallery,
// background separation, divider, and timeline-geometry proof (additive Vitest
// suite; L01 source and all landed split suites are read-only here). Replica
// identity proof lives in task-539-renderer-replica-identity.test.tsx. Contract:
// _docs/_TASKS/TASK-539-05-L02-Prove-Renderer-Effects-And-Geometry.md
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageBlockVisibilityV2,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  createPageMarqueeReplicaNamespace,
  isPageMarqueeReplicaSafeSubtree,
  transformPageReplicaIdentityAttribute,
} from "../../../core/services/pages/pageRendererReplicaIdentity";
import {
  resolvePageTimelineItemGeometry,
  type PageTimelineItemGeometry,
} from "../../../core/services/pages/pageRendererTimelineGeometry";
import {
  PAGE_COMPOSITION_EFFECTS_CSS,
  PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_ATTRIBUTE,
} from "../../../core/services/pages/pageCompositionEffects";
import { PAGE_BLOCK_GRID_ITEM_ATTRIBUTE } from "../../../core/services/pages/pageBlockGridPlacement";
import { toPageSectionVariantSpacing } from "../../../core/services/pages/pageSectionRenderStyles";
import { resolvePageSectionTemplate } from "../../../core/services/pages/pageSectionTemplates";
import {
  PageDocumentRender,
  PageSectionContent,
  PageSectionRender,
  renderPageBlockContent,
} from "../../../core/services/pages/pageRendererV2";
import { countMarkup } from "./pageRendererV2TestFixtures";

const sectionStyle = (style: Partial<PageSectionV2["style"]>): PageSectionV2["style"] =>
  style as PageSectionV2["style"];
const sectionLayout = (layout: Partial<PageSectionV2["layout"]>): PageSectionV2["layout"] =>
  layout as PageSectionV2["layout"];
const createDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});
const renderSection = (section: PageSectionV2): string =>
  renderToStaticMarkup(<PageSectionRender section={section} />);
const contentSection = (id: string, blocks: PageBlockV2[]): PageSectionV2 =>
  createPageSectionV2("content", { id, blocks });
const marqueeOwner = (id: string, children: PageBlockV2[]): PageBlockV2 =>
  createPageBlockV2("group", {
    id,
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee: { speed: 18, direction: "left", seamless: true } },
    slots: { children },
  });
const textBlock = (id: string, text = "T"): PageBlockV2 =>
  createPageBlockV2("text", { id, props: { text, format: "plain", align: "left" } });
const hiddenBlock = (block: PageBlockV2): PageBlockV2 =>
  ({ ...block, visibility: { visible: false } }) as PageBlockV2;
const HOST_FORMULA =
  "transform:translateY(var(--cx-reveal-y,0px)) translate(var(--cx-decoration-x,0px),var(--cx-decoration-y,0px)) rotate(var(--cx-decoration-rotate,0deg)) scale(var(--cx-decoration-scale,1)) translateY(var(--cx-hover-y,0px)) scale(var(--cx-hover-scale,1)) rotateX(var(--cx-tilt-x,0deg)) rotateY(var(--cx-tilt-y,0deg)) translate(var(--cx-magnetic-x,0px),var(--cx-magnetic-y,0px))";

describe("one transform host formula + per-document CSS emission", () => {
  test("PAGE_COMPOSITION_EFFECTS_CSS carries exactly the one host formula", () => {
    expect(PAGE_COMPOSITION_EFFECTS_CSS).toContain(
      `[${PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE}]{${HOST_FORMULA}}`
    );
    expect(PAGE_COMPOSITION_EFFECTS_CSS.match(/\[data-page-transform-host\]\{/g)).toHaveLength(1);
  });

  test("magnetic-only and reveal-only documents emit the shared CSS + host", () => {
    const magnetic = renderToStaticMarkup(
      <PageDocumentRender
        document={createDocument([
          contentSection("sec-mag", [
            createPageBlockV2("button", {
              id: "blk-mag",
              props: { label: "M", href: "/m" },
              style: { magnetic: true },
            }),
          ]),
        ])}
      />
    );
    expect(magnetic).toContain("data-page-composition-css");
    expect(magnetic).toContain("data-page-interactivity-css");
    expect(magnetic).toContain("data-coderso-runtime-script");
    expect(magnetic).toContain('data-page-motion="true"');
    expect(countMarkup(magnetic, 'data-page-transform-host=""')).toBe(1);
    expect(countMarkup(magnetic, 'data-magnetic=""')).toBe(1);
    const reveal = renderToStaticMarkup(
      <PageDocumentRender
        document={createDocument([
          createPageSectionV2("content", {
            id: "sec-rev",
            style: sectionStyle({ scrollEffect: "reveal-up" }),
            blocks: [
              createPageBlockV2("heading", {
                id: "blk-rev",
                props: { text: "R", level: "h2", align: "left" },
              }),
            ],
          }),
        ])}
      />
    );
    expect(reveal).toContain("data-page-composition-css");
    expect(reveal).toContain("data-page-motion-css");
    expect(reveal).toContain("<noscript");
    expect(countMarkup(reveal, 'data-page-transform-host=""')).toBe(2);
  });

  test("false/unset/no-effect documents stay byte-exact; footer input repeats the predicate", () => {
    const document = createDocument([
      contentSection("sec-plain", [
        createPageBlockV2("button", { id: "blk-plain", props: { label: "P", href: "/p" } }),
        createPageBlockV2("button", {
          id: "blk-false",
          props: { label: "F", href: "/f" },
          style: { magnetic: false },
        }),
      ]),
    ]);
    const plain = renderToStaticMarkup(<PageDocumentRender document={document} />);
    expect(plain).not.toContain('data-page-motion="true"');
    expect(plain).not.toContain("data-page-composition-css");
    expect(plain).not.toContain("data-page-interactivity-css");
    expect(plain).not.toContain("data-coderso-runtime-script");
    expect(plain).not.toContain("data-page-transform-host");
    expect(plain).not.toContain("data-magnetic");
    expect(plain).not.toContain("data-noise-host");
    expect(plain).not.toContain("data-page-spotlight");
    expect(plain).toContain('<main class="min-h-screen bg-white text-slate-950"');
    expect(
      renderToStaticMarkup(
        <PageDocumentRender document={document} documentRole="secondary" rootTag="div" />
      )
    ).not.toContain("data-page-composition-css");
    const footer = renderToStaticMarkup(
      <PageDocumentRender
        document={createDocument([
          contentSection("sec-foot", [
            createPageBlockV2("button", {
              id: "blk-f",
              props: { label: "F", href: "/f" },
              style: { magnetic: true },
            }),
          ]),
        ])}
        documentRole="secondary"
        rootTag="div"
      />
    );
    expect(footer.startsWith('<div class="min-h-screen bg-white text-slate-950"')).toBe(true);
    expect(footer).toContain("data-page-composition-css");
    expect(footer).toContain('data-page-transform-host=""');
    expect(footer).toContain('data-magnetic=""');
    expect(footer).toContain("data-coderso-runtime-script");
  });
});

describe("combined effects preserve every hook/variable", () => {
  test("reveal + decoration + hover + tilt + magnetic + layer keeps all hooks and variables", () => {
    const html = renderSection(
      createPageSectionV2("content", {
        id: "sec-combo",
        style: sectionStyle({ scrollEffect: "reveal-up" }),
        blocks: [
          createPageBlockV2("heading", {
            id: "blk-combo",
            props: { text: "C", level: "h2", align: "left" },
            style: {
              decoration: { motion: "float", delay: 100, duration: 3000 },
              hoverEffect: "lift",
              tilt: "subtle",
              magnetic: true,
              layer: { x: 10, y: 20, z: 2, anchor: "center" },
              surfacePreset: "glass",
              surfaceTint: "#ff00aa",
            },
          }),
        ],
      })
    );
    expect(html).toContain('data-page-effect="reveal-up"');
    for (const [attr, value] of [
      ["data-deco", "float"],
      ["data-hover", "lift"],
      ["data-block-tilt", "subtle"],
      ["data-magnetic", ""],
      ["data-layer", ""],
      ["data-layer-anchor", "center"],
      ["data-surface", "glass"],
    ] as const) {
      expect(countMarkup(html, `${attr}="${value}"`), `${attr}="${value}"`).toBe(1);
    }
    for (const [name, value] of [
      ["--layer-x", "10%"],
      ["--layer-y", "20%"],
      ["--layer-z", "2"],
      ["--deco-delay", "100ms"],
      ["--deco-duration", "3000ms"],
      ["--surface-glow", "#ff00aa"],
    ] as const) {
      expect(html, name).toContain(`${name}:${value}`);
    }
    expect(countMarkup(html, 'data-page-transform-host=""')).toBe(2);
    expect(countMarkup(html, "data-tilt-parent=")).toBe(1);
  });

  test("float/drift/pulse/orbit hosts, ambient-orb hosts, radiate, and glow-reveal", () => {
    for (const motion of ["float", "drift", "pulse", "orbit"] as const) {
      const html = renderSection(
        contentSection(`sec-${motion}`, [
          createPageBlockV2("heading", {
            id: `blk-${motion}`,
            props: { text: "D", level: "h2", align: "left" },
            style: { decoration: { motion } },
          }),
        ])
      );
      expect(countMarkup(html, `data-deco="${motion}"`)).toBe(1);
      expect(countMarkup(html, 'data-page-transform-host=""')).toBe(1);
    }
    const orbs = renderSection(
      createPageSectionV2("content", {
        id: "sec-orb",
        style: sectionStyle({ surfacePreset: "ambient-orbs" }),
        blocks: [textBlock("blk-orb")],
      })
    );
    expect(countMarkup(orbs, "cx-orb")).toBe(4);
    expect(countMarkup(orbs, 'data-page-transform-host=""')).toBe(2);
    expect(countMarkup(orbs, 'data-deco="drift"')).toBe(2);
    const radiate = renderSection(
      contentSection("sec-rad", [
        createPageBlockV2("heading", {
          id: "blk-rad",
          props: { text: "R", level: "h2", align: "left" },
          style: {
            decoration: { motion: "radiate" },
            layer: { x: 5, y: 5, z: 1, anchor: "bottom-right" },
          },
        }),
      ])
    );
    expect(countMarkup(radiate, 'data-deco="radiate"')).toBe(1);
    expect(countMarkup(radiate, 'data-layer-anchor="bottom-right"')).toBe(1);
    expect(radiate).not.toContain("data-page-transform-host");
    expect(PAGE_COMPOSITION_EFFECTS_CSS).toMatch(/@keyframes cx-radiate\{50%\{box-shadow:/);
    expect(PAGE_COMPOSITION_EFFECTS_CSS).toMatch(
      /\[data-layer-anchor="bottom-right"\]\{translate:-100% -100%\}/
    );
    expect(
      PAGE_COMPOSITION_EFFECTS_CSS.match(/\[data-layer-anchor="[^"]*"\]\{translate:/g) ?? []
    ).toHaveLength(9);
    const glow = renderSection(
      contentSection("sec-glow", [
        createPageBlockV2("heading", {
          id: "blk-glow",
          props: { text: "G", level: "h2", align: "left" },
          style: { hoverEffect: "glow-reveal" },
        }),
      ])
    );
    expect(countMarkup(glow, 'data-hover="glow-reveal"')).toBe(1);
    expect(glow).not.toContain("data-page-transform-host");
  });
});

describe("L05 grid placement: one legal target, no duplicated hooks", () => {
  test("base span, responsive-only span, and no-span frames", () => {
    const base = renderSection(
      contentSection("sec-a", [
        createPageBlockV2("heading", {
          id: "blk-a",
          props: { text: "A", level: "h2", align: "left" },
          style: { colSpan: 2 },
        }),
        createPageBlockV2("heading", {
          id: "blk-b",
          props: { text: "B", level: "h2", align: "left" },
        }),
      ])
    );
    expect(countMarkup(base, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="blk-a"`)).toBe(1);
    expect(countMarkup(base, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="blk-b"`)).toBe(0);
    expect(countMarkup(base, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}=`)).toBe(1);
    expect(countMarkup(base, "grid-column:span 2")).toBe(1);
    const responsive = renderSection(
      contentSection("sec-c", [
        createPageBlockV2("heading", {
          id: "blk-c",
          props: { text: "C", level: "h2", align: "left" },
          responsive: { tablet: { style: { colSpan: 3 } } },
        }),
      ])
    );
    expect(countMarkup(responsive, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="blk-c"`)).toBe(1);
    expect(responsive).not.toContain("grid-column:span 3");
    expect(responsive).not.toContain('style=""');
    expect(
      renderSection(
        contentSection("sec-n", [
          createPageBlockV2("heading", {
            id: "blk-n",
            props: { text: "N", level: "h2", align: "left" },
          }),
        ])
      )
    ).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);
  });

  test("template wrappers are the legal target; nested/per-column/media-split are none", () => {
    const template = renderSection(
      createPageSectionV2("timeline", {
        id: "sec-t",
        blocks: [
          createPageBlockV2("heading", {
            id: "blk-t1",
            props: { text: "T", level: "h2", align: "left" },
            style: { colSpan: 2 },
          }),
        ],
      })
    );
    expect(countMarkup(template, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="blk-t1"`)).toBe(1);
    expect(countMarkup(template, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}=`)).toBe(1);
    const wrapper = template.slice(template.indexOf(`${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="blk-t1"`));
    expect(wrapper).toContain('data-page-timeline-item="1"');
    expect(wrapper).toContain('data-block-id="blk-t1"');
    const perColumn = renderSection(
      createPageSectionV2("content", {
        id: "sec-d",
        layout: sectionLayout({ columns: 2 }),
        blocks: [
          createPageBlockV2("heading", {
            id: "blk-d1",
            props: { text: "D", level: "h2", align: "left" },
            style: { column: 1, colSpan: 2 },
          }),
          createPageBlockV2("heading", {
            id: "blk-d2",
            props: { text: "E", level: "h2", align: "left" },
            style: { column: 2 },
          }),
        ],
      })
    );
    expect(perColumn).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);
    expect(perColumn).not.toContain("grid-column:span 2");
    expect(countMarkup(perColumn, "data-page-section-column=")).toBe(2);
    const mediaSplit = renderSection(
      createPageSectionV2("media-split", {
        id: "sec-e",
        variant: "horizontal",
        blocks: [
          createPageBlockV2("heading", {
            id: "blk-e1",
            props: { text: "E", level: "h2", align: "left" },
            style: { colSpan: 2 },
          }),
          createPageBlockV2("image", {
            id: "blk-e2",
            props: { src: "https://example.com/a.png", alt: "A" },
          }),
        ],
      })
    );
    expect(mediaSplit).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);
    expect(mediaSplit).not.toContain("grid-column:span 2");
    expect(mediaSplit).toContain('data-page-media-split="horizontal"');
  });

  test("hidden assigned sibling: omitted equals false; true flips per-column placement", () => {
    const section = createPageSectionV2("content", {
      id: "sec-x",
      layout: sectionLayout({ columns: 2 }),
      blocks: [
        createPageBlockV2("heading", {
          id: "blk-vis",
          props: { text: "V", level: "h2", align: "left" },
          style: { colSpan: 2 },
        }),
        hiddenBlock(
          createPageBlockV2("heading", {
            id: "blk-hidden",
            props: { text: "H", level: "h2", align: "left" },
            style: { colSpan: 2, column: 1 },
          })
        ),
      ],
    });
    const omitted = renderToStaticMarkup(<PageSectionContent section={section} />);
    expect(omitted).toBe(
      renderToStaticMarkup(<PageSectionContent section={section} includeHiddenBlocks={false} />)
    );
    expect(countMarkup(omitted, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}=`)).toBe(1);
    expect(countMarkup(omitted, "grid-column:span 2")).toBe(1);
    expect(omitted).not.toContain("data-page-section-column=");
    const truthy = renderToStaticMarkup(
      <PageSectionContent section={section} includeHiddenBlocks={true} />
    );
    expect(countMarkup(truthy, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}=`)).toBe(0);
    expect(truthy).not.toContain("grid-column:span 2");
    expect(countMarkup(truthy, "data-page-section-column=")).toBe(2);
    expect(countMarkup(truthy, 'data-block-id="blk-vis"')).toBe(1);
  });

  test("descendants receive the normalized boolean unchanged (replica safety flip)", () => {
    const section = contentSection("sec-hf", [
      marqueeOwner("blk-mq-h", [
        textBlock("blk-ht"),
        hiddenBlock(
          createPageBlockV2("form", { id: "blk-hform", props: { formId: null, title: "" } })
        ),
      ]),
    ]);
    const hidden = renderToStaticMarkup(<PageSectionContent section={section} />);
    const included = renderToStaticMarkup(
      <PageSectionContent section={section} includeHiddenBlocks={true} />
    );
    expect(countMarkup(hidden, "cx-marquee-segment")).toBe(2);
    expect(countMarkup(hidden, `${PAGE_MARQUEE_REPLICA_ATTRIBUTE}=""`)).toBe(1);
    expect(countMarkup(included, "cx-marquee-segment")).toBe(1);
    expect(countMarkup(included, `${PAGE_MARQUEE_REPLICA_ATTRIBUTE}=""`)).toBe(0);
    expect(
      isPageMarqueeReplicaSafeSubtree([hiddenBlock(createPageBlockV2("embed", { id: "e" }))], {
        includeHiddenBlocks: false,
      })
    ).toBe(true);
    expect(
      isPageMarqueeReplicaSafeSubtree([hiddenBlock(createPageBlockV2("embed", { id: "e" }))], {
        includeHiddenBlocks: true,
      })
    ).toBe(false);
  });
});

describe("canonical gallery only", () => {
  const rawGallery = (items: unknown[]): PageBlockV2 => ({
    id: "blk-gal",
    type: "gallery",
    props: { layout: "grid", items },
    visibility: {
      visible: true,
      authOnly: false,
      anchor: null,
      startsAt: null,
      endsAt: null,
    } as PageBlockVisibilityV2,
  });

  test("alias keys are never interpreted; URLs/categories are defence-rechecked", () => {
    const html = renderToStaticMarkup(
      <>
        {renderPageBlockContent(
          rawGallery([
            { url: "https://img.example/alias.jpg", title: "Alias title" },
            { image: "https://img.example/asset.jpg", alt: "Asset alt" },
            { src: "https://img.example/canon.jpg", alt: "Canon", caption: "Canon cap" },
            { src: "javascript:alert(1)", alt: "Bad" },
            { src: "https://img.example/a.jpg", alt: "A", category: "nature bad-token" },
            { caption: "Only caption" },
          ])
        )}
      </>
    );
    expect(html).not.toContain("alias.jpg");
    expect(html).not.toContain("asset.jpg");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("canon.jpg");
    expect(countMarkup(html, "data-page-gallery-item")).toBe(3);
    expect(countMarkup(html, "<img")).toBe(2);
    expect(html).toContain("Only caption");
    expect(countMarkup(html, "<figcaption")).toBe(2);
    // Item figures never re-emit author category tokens; the accessible filter
    // chips are the single defence-checked category surface.
    expect(html).not.toContain("data-category=");
    expect(html).not.toContain("nature");
  });

  test("accessible filter state: toolbar of aria-pressed toggles, single-token categories", () => {
    const html = renderSection(
      contentSection("sec-gal", [
        createPageBlockV2("gallery", {
          id: "blk-gal",
          props: {
            layout: "grid",
            filterable: true,
            filterCategories: ["nature", "urban", "bad token", "nature"],
            items: [
              { src: "https://img.example/a.jpg", alt: "A", category: "nature" },
              { src: "https://img.example/b.jpg", alt: "B", category: "urban" },
            ],
          },
        }),
      ])
    );
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('data-gallery-filter="true"');
    expect(countMarkup(html, 'data-filter="all"')).toBe(1);
    expect(countMarkup(html, 'data-filter="nature"')).toBe(1);
    expect(countMarkup(html, 'data-filter="urban"')).toBe(1);
    expect(html).not.toContain("bad token");
    expect(countMarkup(html, 'aria-pressed="true"')).toBe(1);
    expect(countMarkup(html, 'aria-pressed="false"')).toBe(2);
    expect(countMarkup(html, 'data-filter-item="true"')).toBe(2);
  });
});

describe("background image/color separation", () => {
  test("section and block keep gradient image and final color on separate properties", () => {
    const section = renderSection(
      createPageSectionV2("content", {
        id: "sec-bg",
        style: sectionStyle({
          backgroundType: "gradient",
          background: "linear-gradient(90deg, #f00, #00f), #123456",
        }),
        blocks: [textBlock("blk-bg")],
      })
    );
    expect(section).toContain("background-image:linear-gradient(90deg, #f00, #00f)");
    expect(section).toContain("background-color:#123456");
    expect(section).not.toContain("background-image:linear-gradient(90deg, #f00, #00f), #123456");
    const block = renderSection(
      contentSection("sec-b2", [
        createPageBlockV2("heading", {
          id: "blk-bg",
          props: { text: "T", level: "h2", align: "left" },
          style: {
            backgroundType: "gradient",
            background: "linear-gradient(45deg, rgba(255,0,0,0.5), rgba(0,0,255,0.5)), #0f0f0f",
          },
        }),
      ])
    );
    expect(block).toContain("background-color:#0f0f0f");
    expect(block).toContain(
      "background-image:linear-gradient(45deg, rgba(255,0,0,0.5), rgba(0,0,255,0.5))"
    );
    expect(block).not.toMatch(/background-image:[^";]*#0f0f0f/);
  });

  test("stacked gradients, full bleed, clears, and invalid fail-closed", () => {
    const stacked = renderSection(
      createPageSectionV2("content", {
        id: "sec-b3",
        style: sectionStyle({
          backgroundType: "gradient",
          background:
            "radial-gradient(circle at 10% 20%, #f00, transparent 40%), linear-gradient(90deg, #00f, #0ff), #abc123",
        }),
        blocks: [textBlock("blk-b3")],
      })
    );
    expect(stacked).toContain("background-color:#abc123");
    expect(stacked).toContain(
      "background-image:radial-gradient(circle at 10% 20%, #f00, transparent 40%), linear-gradient(90deg, #00f, #0ff)"
    );
    const bleed = renderSection(
      createPageSectionV2("content", {
        id: "sec-b5",
        variant: "full-width",
        style: sectionStyle({
          backgroundType: "gradient",
          background: "linear-gradient(90deg,#111,#222), #333333",
        }),
        blocks: [],
      })
    );
    expect(countMarkup(bleed, "background-image:linear-gradient(90deg,#111,#222)")).toBe(1);
    expect(bleed).toContain("background-color:#333333");
    expect(bleed).not.toContain("background-image:linear-gradient(90deg,#111,#222), #333333");
    const cleared = renderSection(
      createPageSectionV2("content", {
        id: "sec-b6",
        style: sectionStyle({
          backgroundType: "none",
          background: "linear-gradient(90deg,#111,#222)",
        }),
        blocks: [],
      })
    );
    expect(cleared).not.toContain("background-image");
    expect(cleared).not.toContain("background-color:#");
    const invalid = renderSection(
      createPageSectionV2("content", {
        id: "sec-b4",
        style: sectionStyle({
          backgroundType: "gradient",
          background: "url(https://evil.example/x.png) no-repeat;background-color:red",
        }),
        blocks: [textBlock("blk-b4")],
      })
    );
    expect(invalid).not.toContain("evil.example");
    expect(invalid).not.toContain("background-color:red");
  });
});

describe("divider width/alignment regression stays gradient-only", () => {
  test("gradient divider paints only the whitelisted tone fading to transparent", () => {
    const render = (align: string | undefined): string =>
      renderSection(
        contentSection("sec-div", [
          createPageBlockV2("divider", {
            id: "blk-div",
            props: { gradient: true, width: 34, align },
          }),
        ])
      );
    const left = render("left");
    expect(left).toContain("background:linear-gradient(90deg, #e2e8f0, transparent)");
    expect(left).not.toContain("margin-left:auto");
    expect(render(undefined)).toContain("background:linear-gradient(90deg, #e2e8f0, transparent)");
    expect(render("center")).toContain("margin-left:auto;margin-right:auto");
    expect(render("right")).toContain("margin-left:auto");
    expect(render("right")).not.toContain("margin-right:auto");
    for (const html of [left, render("center"), render("right")]) {
      expect(html).toContain("display:block");
      expect(html).toContain("height:1px");
      expect(html).toContain("width:34px");
    }
    // Tone is the fixed whitelisted literal — no raw author string reaches CSS.
    const accent = renderSection(
      contentSection("sec-div", [
        createPageBlockV2("divider", {
          id: "blk-div",
          props: { gradient: true, width: 34, align: "center", tone: "accent" },
        }),
      ])
    );
    expect(accent).toContain("var(--coderso-section-accent,#0d9488)");
  });
});

describe("timeline item geometry (direct import, never the facade)", () => {
  const timeline = (variant: string, gap = 24): PageSectionV2 =>
    createPageSectionV2("timeline", {
      id: `sec-geo-${variant}`,
      variant: variant as PageSectionV2["variant"],
      spacing: { gap, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
      blocks: [
        createPageBlockV2("heading", {
          id: `geo-${variant}`,
          props: { text: "A", level: "h3", align: "left" },
        }),
      ],
    });
  const geometry = (
    variant: string,
    gap: number,
    index: number,
    total: number
  ): PageTimelineItemGeometry => {
    const section = timeline(variant, gap);
    return resolvePageTimelineItemGeometry(
      section,
      resolvePageSectionTemplate(section),
      index,
      total
    );
  };

  test("rowGapPx equals the normalized helper gap across 0..120; compact scales with 8px floor", () => {
    for (let gap = 0; gap <= 120; gap += 1) {
      const section = timeline("default", gap);
      const template = resolvePageSectionTemplate(section);
      expect(resolvePageTimelineItemGeometry(section, template, 0, 2).rowGapPx).toBe(
        toPageSectionVariantSpacing(section, template).gap
      );
    }
    for (const [gap, expected] of [
      [4, 8],
      [24, 14],
      [60, 36],
      [0, 0],
      [120, 72],
    ] as const) {
      const section = timeline("compact", gap);
      expect(geometry("compact", gap, 0, 2).rowGapPx, `compact gap ${gap}`).toBe(
        toPageSectionVariantSpacing(section, resolvePageSectionTemplate(section)).gap
      );
      expect(geometry("compact", gap, 0, 2).rowGapPx, `compact gap ${gap}`).toBe(expected);
    }
  });

  test("padding/marker pins and axis shapes (singleton/horizontal/multi-item vertical)", () => {
    expect(geometry("default", 24, 0, 3)).toMatchObject({
      paddingClassName: "py-3",
      markerCenterPx: 22,
    });
    expect(geometry("compact", 24, 0, 3)).toMatchObject({
      paddingClassName: "py-2",
      markerCenterPx: 18,
    });
    expect(geometry("default", 24, 0, 1).axis).toBeNull();
    expect(geometry("compact", 24, 0, 1).axis).toBeNull();
    expect(geometry("horizontal", 24, 0, 3).axis).toBeNull();
    expect(geometry("default", 24, 0, 3).axis).toEqual({ top: "22px", bottom: "calc(-1 * 24px)" });
    expect(geometry("default", 24, 1, 3).axis).toEqual({ top: "0", bottom: "calc(-1 * 24px)" });
    expect(geometry("default", 24, 2, 3).axis).toEqual({ top: "0", bottom: "calc(100% - 22px)" });
    expect(geometry("compact", 24, 0, 3).axis).toEqual({ top: "18px", bottom: "calc(-1 * 14px)" });
    expect(geometry("compact", 24, 2, 3).axis).toEqual({ top: "0", bottom: "calc(100% - 18px)" });
  });

  test("rendered vertical timeline markup matches the geometry values", () => {
    const html = renderSection(
      createPageSectionV2("timeline", {
        id: "sec-tl",
        blocks: [
          createPageBlockV2("heading", {
            id: "tl1",
            props: { text: "1", level: "h3", align: "left" },
          }),
          createPageBlockV2("heading", {
            id: "tl2",
            props: { text: "2", level: "h3", align: "left" },
          }),
          createPageBlockV2("heading", {
            id: "tl3",
            props: { text: "3", level: "h3", align: "left" },
          }),
        ],
      })
    );
    expect(countMarkup(html, "py-3")).toBe(3);
    const axisStyles = [
      ...html.matchAll(/style="([^"]+)"[^>]*data-page-timeline-axis-line="true"/g),
    ].map((m) => m[1]!);
    expect(axisStyles).toEqual([
      expect.stringContaining("top:22px"),
      expect.stringContaining("top:0"),
      expect.stringContaining("top:0"),
    ]);
    expect(axisStyles[0]).toContain("bottom:calc(-1 * 24px)");
    expect(axisStyles[1]).toContain("bottom:calc(-1 * 24px)");
    expect(axisStyles[2]).toContain("bottom:calc(100% - 22px)");
    for (const style of axisStyles) expect(style).toContain("left:22px");
  });

  test("rendered horizontal timeline markup stays exact (no axis)", () => {
    const html = renderSection(
      createPageSectionV2("timeline", {
        id: "sec-th",
        variant: "horizontal",
        blocks: [
          createPageBlockV2("heading", {
            id: "th1",
            props: { text: "1", level: "h3", align: "left" },
          }),
        ],
      })
    );
    expect(html).not.toContain("data-page-timeline-axis-line");
    expect(html).toContain("md:grid-rows-[auto_1fr]");
    expect(html).toContain("py-3");
    expect(html).toContain("justify-self-center");
    expect(countMarkup(html, "data-page-timeline-marker")).toBe(1);
    expect(html).toContain("data-page-timeline-content=");
  });
});

describe("stable facade and line receipts", () => {
  test("task-added replica/timeline symbols stay absent from the stable facade", async () => {
    const facade = await import("../../../core/services/pages/pageRendererV2");
    const names = Object.keys(facade);
    for (const symbol of [
      "PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE",
      "PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE",
      "PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE",
      "PageReplicaIdentityAttributeName",
      "PageReplicaIdentityContext",
      "PageReplicaIdentitySets",
      "PageTimelineItemGeometry",
      "collectPageReplicaIdentitySets",
      "createPageMarqueeReplicaNamespace",
      "encodePageReplicaNamespacePart",
      "isPageMarqueeReplicaSafeSubtree",
      "namespacePageReplicaDomId",
      "namespacePageReplicaHookIdentifier",
      "namespacePageReplicaIdRef",
      "resolvePageTimelineItemGeometry",
      "transformPageReplicaIdentityAttribute",
    ]) {
      expect(names, symbol).not.toContain(symbol);
    }
    expect(typeof createPageMarqueeReplicaNamespace).toBe("function");
    expect(typeof resolvePageTimelineItemGeometry).toBe("function");
    expect(typeof transformPageReplicaIdentityAttribute).toBe("function");
  });

  test("pinned split suite/module line receipts", () => {
    const physicalLines = (file: string): number =>
      (readFileSync(file, "utf8").match(/\r?\n/g) ?? []).length;
    const receipts: Array<[string, number]> = [
      ["core/services/pages/pageRendererV2.tsx", 986],
      ["core/services/pages/pageRendererReplicaIdentity.ts", 324],
      ["core/services/pages/pageRendererTimelineGeometry.ts", 61],
      ["core/services/pages/pageSectionRendererV2.tsx", 661],
      ["core/services/pages/pageLayoutBlockRenderer.tsx", 365],
      ["core/services/pages/pageStaticBlockRenderers.tsx", 919],
      ["core/services/pages/pageCompositionEffects.tsx", 420],
      ["core/services/pages/pageDocumentRenderState.ts", 168],
      ["core/services/pages/pageResponsiveCss.ts", 71],
      ["core/services/pages/pageResponsiveCssContracts.ts", 132],
      ["core/services/pages/pageResponsiveCssDeclarations.ts", 347],
      ["core/services/pages/pageResponsiveCssSection.ts", 257],
      ["core/services/pages/pageResponsiveCssBlock.ts", 441],
      ["core/services/pages/pageResponsiveCssOrchestration.ts", 188],
      ["core/services/pages/pageBlockRenderStyles.ts", 516],
      ["tests/vitest/pages/page-renderer-v2-facade.test.tsx", 439],
      ["tests/vitest/pages/page-renderer-v2-replica.test.tsx", 166],
      ["tests/vitest/pages/page-renderer-replica-identity.test.ts", 243],
      ["tests/vitest/pages/page-renderer-timeline-geometry.test.ts", 133],
      ["tests/vitest/pages/page-renderer-v2-module-boundaries.test.ts", 117],
      ["tests/vitest/pages/page-renderer-v2.test.tsx", 971],
      ["tests/vitest/pages/page-renderer-v2-section-layout.test.tsx", 997],
      ["tests/vitest/pages/page-renderer-v2-blocks.test.tsx", 958],
      ["tests/vitest/pages/page-renderer-v2-data-binding.test.tsx", 502],
      ["tests/vitest/pages/page-renderer-v2-effects.test.tsx", 717],
      ["tests/vitest/pages/page-renderer-v2-svg.test.tsx", 603],
      ["tests/vitest/pages/page-renderer-v2-composition.test.tsx", 992],
      ["tests/vitest/pages/task-534-interactivity-render.test.tsx", 282],
      ["tests/vitest/pages/task-539-transform-composition.test.ts", 811],
      ["tests/vitest/pages/task-539-page-editor-controls.test.ts", 946],
      ["tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx", 847],
      ["tests/vitest/pages/task-539-renderer-replica-identity.test.tsx", 626],
      ["tests/vitest/pages/pageRendererV2TestFixtures.tsx", 84],
    ];
    for (const [file, expected] of receipts) {
      expect(physicalLines(file), `${file} receipt`).toBe(expected);
      expect(expected).toBeLessThanOrEqual(1_000);
    }
  });
});
