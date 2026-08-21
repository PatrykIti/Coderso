// TASK-539-05-L02 — marquee-replica identity proof: safe seamless replica,
// deterministic namespaces, end-to-end identity rewriting, style-scope aliases,
// unsafe fail-closed types, and nested/sibling owners (additive Vitest suite;
// L01 source and all landed split suites are read-only here). Effects and
// timeline-geometry proof lives in task-539-renderer-effects-and-geometry.test.tsx.
// Contract: _docs/_TASKS/TASK-539-05-L02-Prove-Renderer-Effects-And-Geometry.md
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE,
  collectPageReplicaIdentitySets,
  createPageMarqueeReplicaNamespace,
  encodePageReplicaNamespacePart,
  namespacePageReplicaDomId,
  namespacePageReplicaHookIdentifier,
  namespacePageReplicaIdRef,
  transformPageReplicaIdentityAttribute,
  type PageReplicaIdentityAttributeName,
  type PageReplicaIdentityContext,
} from "../../../core/services/pages/pageRendererReplicaIdentity";
import { PAGE_MARQUEE_REPLICA_ATTRIBUTE } from "../../../core/services/pages/pageCompositionEffects";
import { PAGE_BLOCK_GRID_ITEM_ATTRIBUTE } from "../../../core/services/pages/pageBlockGridPlacement";
import {
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_TILT_PARENT_LAYER_ATTRIBUTE,
} from "../../../core/services/pages/pageResponsiveCss";
import { PageSectionRender } from "../../../core/services/pages/pageRendererV2";
import { countMarkup } from "./pageRendererV2TestFixtures";

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
const switcherBlock = (
  id: string,
  tabs: string[],
  panels: Record<string, PageBlockV2[]>
): PageBlockV2 =>
  createPageBlockV2("switcher", {
    id,
    props: { tabs: tabs.map((label) => ({ label })), activeIndex: 0, variant: "pill" },
    slots: panels,
  });
const splitMarqueeRegions = (html: string): { primary: string; replica: string } => {
  const index = html.indexOf(`${PAGE_MARQUEE_REPLICA_ATTRIBUTE}=""`);
  return index === -1
    ? { primary: html, replica: "" }
    : { primary: html.slice(0, index), replica: html.slice(index) };
};
const domIdsIn = (markup: string): Set<string> =>
  new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!));
const tokenizedRefs = (markup: string, attribute: string): string[] =>
  [...markup.matchAll(new RegExp(`\\s${attribute}="([^"]+)"`, "g"))].flatMap((m) =>
    m[1]!.split(/\s+/)
  );
const noReplicaSurface = (html: string): void => {
  expect(html).not.toContain(PAGE_MARQUEE_REPLICA_ATTRIBUTE);
  expect(html).not.toContain(PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE);
  expect(html).not.toContain(PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE);
  expect(html).not.toContain("cx-mrq-");
};

describe("safe seamless:true replica: one rail, two equal segments", () => {
  test("owner marker + aria-hidden + native inert markup, no blanket tabIndex/disabled", () => {
    const html = renderSection(
      contentSection("sec-s", [marqueeOwner("blk-mq", [textBlock("blk-m1"), textBlock("blk-m2")])])
    );
    expect(countMarkup(html, "cx-marquee-viewport")).toBe(1);
    expect(countMarkup(html, "cx-marquee-rail")).toBe(1);
    expect(countMarkup(html, "cx-marquee-segment")).toBe(2);
    expect(countMarkup(html, `${PAGE_MARQUEE_REPLICA_ATTRIBUTE}=""`)).toBe(1);
    expect(countMarkup(html, 'aria-hidden="true"')).toBe(1);
    // Native inert is emitted on the replica segment; real focus/activation
    // suppression is proved by TASK-539-08 Playwright.
    expect(countMarkup(html, 'inert=""')).toBe(1);
    expect(html).not.toContain("tabindex=");
    expect(html).not.toContain("disabled=");
  });

  test("primary keeps canonical identifiers; replica namespaces switcher DOM ids", () => {
    const html = renderSection(
      contentSection("sec-sw", [
        marqueeOwner("blk-mq-sw", [switcherBlock("sw", ["One"], { "panel:1": [textBlock("p1")] })]),
      ])
    );
    const { primary, replica } = splitMarqueeRegions(html);
    for (const byte of [
      'data-block-id="sw"',
      'data-marquee=""',
      'id="sw-tab-0"',
      'id="sw-panel-0"',
      'aria-controls="sw-panel-0"',
      'aria-labelledby="sw-tab-0"',
      'aria-selected="true"',
      'tabindex="0"',
    ]) {
      expect(primary, byte).toContain(byte);
    }
    expect(primary).not.toContain("cx-mrq-");
    // The replica carries the same content with namespaced ids and the scope
    // alias; per-element tabindex is preserved, blanket suppression is not added.
    expect(replica).toContain(">One</button>");
    expect(replica).toMatch(/id="cx-mrq-[^"]*-sw-tab-0"/);
    expect(replica).toMatch(/id="cx-mrq-[^"]*-sw-panel-0"/);
    expect(replica).toMatch(/aria-controls="cx-mrq-[^"]*-sw-panel-0"/);
    expect(replica).toMatch(/aria-labelledby="cx-mrq-[^"]*-sw-tab-0"/);
    expect(replica).toContain(`${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="sw"`);
    expect(replica).toContain('tabindex="0"');
    expect(replica).not.toContain('id="sw-tab-0"');
    expect(replica).not.toContain("data-block-id=");
  });

  test("container/columns/group slots and a button survive the replica intact", () => {
    const html = renderSection(
      contentSection("sec-full", [
        marqueeOwner("blk-mq-full", [
          createPageBlockV2("container", {
            id: "blk-box",
            slots: { children: [textBlock("blk-box-t")] },
          }),
          createPageBlockV2("columns", {
            id: "blk-cols",
            props: { count: 2, gap: 12 },
            slots: {
              "column:1": [textBlock("blk-c1", "A")],
              "column:2": [textBlock("blk-c2", "B")],
            },
          }),
          createPageBlockV2("group", {
            id: "blk-ig",
            props: { direction: "column", wrap: false, gap: 8 },
            slots: {
              children: [createPageBlockV2("list", { id: "blk-li", props: { items: ["a", "b"] } })],
            },
          }),
          createPageBlockV2("button", { id: "blk-btn", props: { label: "Go", href: "/go" } }),
        ]),
      ])
    );
    const { replica } = splitMarqueeRegions(html);
    expect(countMarkup(html, "cx-marquee-segment")).toBe(2);
    expect(countMarkup(replica, `${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}=`)).toBe(8);
    expect(replica).not.toContain("data-block-id=");
    expect(countMarkup(replica, 'href="/go"')).toBe(1);
    expect(countMarkup(replica, "data-page-block-slot-owner")).toBe(4);
    expect(countMarkup(replica, 'data-page-block-slot-owner="blk-box"')).toBe(1);
  });

  test("normalization-collision candidate: a hook id equal to a switcher DOM id", () => {
    const section = contentSection("sec-c1", [
      marqueeOwner("blk-mq-c1", [
        switcherBlock("sw", ["One"], { "panel:1": [textBlock("sw-tab-0")] }),
      ]),
    ]);
    const sets = collectPageReplicaIdentitySets(section.blocks[0]!.slots!.children!, {
      includeHiddenBlocks: false,
    });
    expect(sets.domIds.has("sw-tab-0")).toBe(true);
    expect(sets.hookIdentifiers.has("sw-tab-0")).toBe(true);
    const html = renderSection(section);
    const { primary, replica } = splitMarqueeRegions(html);
    expect(primary).toContain('id="sw-tab-0"');
    // The DOM-id-backed tab id namespaces; the hook-only block id stays a
    // canonical style-scope value and never claims a DOM id.
    expect(replica).toMatch(/id="cx-mrq-[^"]*-sw-tab-0"/);
    expect(replica).toContain(`${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="sw-tab-0"`);
    expect(replica).not.toMatch(/\sid="sw-tab-0"/);
  });
});

describe("deterministic replica namespaces", () => {
  const ctx = (namespace: string): PageReplicaIdentityContext => ({
    namespace,
    domIds: new Set(["sw-tab-0", "sw-panel-0", "svg-grad"]),
    hookIdentifiers: new Set(["blk-1", "blk-2"]),
    inert: true,
  });

  test("encodePageReplicaNamespacePart is fixed-width base-36, delimiter-safe, reversible", () => {
    for (const [input, expected] of [
      ["", ""],
      ["a", "002p"],
      ["ab", "002p002q"],
      ["blk-1", "002q0030002z0019001d"],
      ["ż", "00ak"],
      ["😀", "2r5s"],
      ["1:0", "001d001m001c"],
    ] as const) {
      expect(encodePageReplicaNamespacePart(input), input).toBe(expected);
      expect(/^[a-z0-9]*$/.test(encodePageReplicaNamespacePart(input))).toBe(true);
      expect(encodePageReplicaNamespacePart(input)).toHaveLength(4 * [...input].length);
    }
    const decode = (encoded: string): string =>
      (encoded.match(/.{4}/g) ?? [])
        .map((part) => String.fromCodePoint(Number.parseInt(part, 36)))
        .join("");
    for (const value of ["blk-marquee", "root:0", "1:0", "żółć", "😀🎉", "a-b_c.d/e"])
      expect(decode(encodePageReplicaNamespacePart(value))).toBe(value);
  });

  test("owner-id + path namespaces are deterministic, distinct, and delimiter-safe", () => {
    const a = createPageMarqueeReplicaNamespace("blk-marquee", "1:0");
    expect(a).toBe(createPageMarqueeReplicaNamespace("blk-marquee", "1:0"));
    expect(a).toBe(
      `cx-mrq-${encodePageReplicaNamespacePart("blk-marquee")}-${encodePageReplicaNamespacePart("1:0")}`
    );
    expect(a).toMatch(/^cx-mrq-[a-z0-9]+-[a-z0-9]+$/);
    expect(a).not.toBe(createPageMarqueeReplicaNamespace("blk-marquee", "1:1"));
    expect(a).not.toBe(createPageMarqueeReplicaNamespace("blk-marqueeX", "1:0"));
    expect(a).toContain(`-${encodePageReplicaNamespacePart("1:0")}`);
  });

  test("htmlFor/rendered for unit table; domIds vs hookIdentifiers stay separate", () => {
    const c = ctx("cx-mrq-ns");
    expect(transformPageReplicaIdentityAttribute(c, "htmlFor", "sw-panel-0 ghost")).toBe(
      "cx-mrq-ns-sw-panel-0 ghost"
    );
    expect(transformPageReplicaIdentityAttribute(c, "htmlFor", "missing")).toBe("missing");
    expect(renderToStaticMarkup(<label htmlFor="sw-panel-0">x</label>)).toContain(
      'for="sw-panel-0"'
    );
    expect(namespacePageReplicaDomId(c, "sw-tab-0")).toBe("cx-mrq-ns-sw-tab-0");
    expect(namespacePageReplicaHookIdentifier(c, "blk-1")).toBe("cx-mrq-ns-blk-1");
    expect(namespacePageReplicaIdRef(c, "sw-panel-0")).toBe("cx-mrq-ns-sw-panel-0");
    expect(namespacePageReplicaIdRef(c, "blk-1")).toBe("blk-1");
    const both: PageReplicaIdentityContext = {
      ...c,
      domIds: new Set(["blk-1"]),
      hookIdentifiers: new Set(["blk-1"]),
    };
    expect(namespacePageReplicaIdRef(both, "blk-1")).toBe("cx-mrq-ns-blk-1");
    expect(namespacePageReplicaHookIdentifier(both, "blk-1")).toBe("cx-mrq-ns-blk-1");
  });
});

describe("end-to-end identity rewriting (real switcher + Safe SVG)", () => {
  const SVG_DOC = [
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">',
    "<defs>",
    '<linearGradient id="grad1"><stop offset="0" stop-color="#f00"/></linearGradient>',
    '<clipPath id="clip1"><rect x="0" y="0" width="50" height="50"/></clipPath>',
    '<mask id="mask1"><rect x="0" y="0" width="100" height="100" fill="#fff"/></mask>',
    '<filter id="filter1"><feGaussianBlur stdDeviation="2"/></filter>',
    '<marker id="marker1" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><circle cx="3" cy="3" r="2" fill="url(#grad1)"/></marker>',
    '<symbol id="sym1"><circle cx="50" cy="50" r="10" fill="url(#grad1)"/></symbol>',
    "</defs>",
    '<rect x="0" y="0" width="100" height="100" fill="url(#grad1)" stroke="url(#grad1)" clip-path="url(#clip1)" mask="url(#mask1)" filter="url(#filter1)"/>',
    '<path d="M0 0 L100 100" stroke="url(#grad1)"/>',
    '<path d="M0 0 L100 100" fill="url(#missing)"/>',
    '<use href="#sym1" xlink:href="#sym1"/>',
    "</svg>",
  ].join("");
  const buildSection = (): PageSectionV2 =>
    contentSection("sec-e2e", [
      marqueeOwner("blk-mq-e2e", [
        switcherBlock("sw", ["One", "Two"], {
          "panel:1": [textBlock("p1")],
          "panel:2": [textBlock("p2")],
        }),
        createPageBlockV2("customSvg", { id: "blk-svg", props: { svg: SVG_DOC, label: "Art" } }),
      ]),
    ]);

  test("every id, ARIA token, hash and url(#...) reference rewrites only backed targets", () => {
    const html = renderSection(buildSection());
    const { primary, replica } = splitMarqueeRegions(html);
    expect(primary).toContain('id="sw-tab-0"');
    expect(primary).toContain('id="grad1"');
    expect(primary).toContain('fill="url(#grad1)"');
    expect(primary).not.toContain("cx-mrq-");
    const replicaIds = domIdsIn(replica);
    for (const value of [
      "sw-tab-0",
      "sw-tab-1",
      "sw-panel-0",
      "sw-panel-1",
      "grad1",
      "clip1",
      "mask1",
      "filter1",
      "marker1",
      "sym1",
    ]) {
      expect(
        [...replicaIds].some((id) => id.endsWith(`-${value}`)),
        value
      ).toBe(true);
    }
    for (const attr of ["aria-controls", "aria-labelledby"] as const) {
      for (const token of tokenizedRefs(replica, attr))
        expect(replicaIds.has(token), token).toBe(true);
    }
    expect(replica).toMatch(/href="#cx-mrq-[^"]*-sym1"/);
    expect(replica).toMatch(/xlink:href="#cx-mrq-[^"]*-sym1"/);
    expect(replica).not.toMatch(/href="#sym1"/);
    expect(replica).not.toMatch(/xlink:href="#sym1"/);
    for (const attribute of ["fill", "stroke", "clip-path", "mask", "filter"]) {
      expect(replica, attribute).toMatch(
        new RegExp(
          `${attribute}="url\\(#cx-mrq-[^"]*-(?:grad1|clip1|mask1|filter1|marker1|sym1)\\)"`
        )
      );
    }
    expect(countMarkup(replica, 'fill="url(#missing)"')).toBe(1);
    expect(replica).toContain('aria-selected="true"');
    expect(replica).toContain('data-active="true"');
  });

  test("every rewritten reference resolves inside the replica, never the primary", () => {
    const html = renderSection(buildSection());
    const { primary, replica } = splitMarqueeRegions(html);
    const replicaIds = domIdsIn(replica);
    const rewritten = [...replicaIds].filter((id) => id.startsWith("cx-mrq-"));
    expect(rewritten.length).toBeGreaterThan(0);
    for (const id of rewritten) expect(replica, id).toContain(`id="${id}"`);
    for (const token of [
      ...tokenizedRefs(replica, "aria-controls"),
      ...tokenizedRefs(replica, "aria-labelledby"),
    ]) {
      if (token.startsWith("cx-mrq-")) expect(replicaIds.has(token), token).toBe(true);
    }
    for (const match of replica.matchAll(/url\(#(cx-mrq-[^)]+)\)/g))
      expect(replicaIds.has(match[1]!), match[1]!).toBe(true);
    for (const match of replica.matchAll(/(?:href|xlink:href)="#(cx-mrq-[^"]+)"/g))
      expect(replicaIds.has(match[1]!), match[1]!).toBe(true);
    expect(primary).not.toContain("cx-mrq-");
  });

  test("hook-only fragments, external URLs, and unbacked values stay byte-identical", () => {
    const c: PageReplicaIdentityContext = {
      namespace: "cx-mrq-e2e",
      domIds: new Set(["sw-panel-0", "sw-tab-0"]),
      hookIdentifiers: new Set(["blk-m1", "sw"]),
      inert: true,
    };
    expect(transformPageReplicaIdentityAttribute(c, "aria-labelledby", "blk-m1")).toBe("blk-m1");
    expect(namespacePageReplicaIdRef(c, "blk-m1")).toBe("blk-m1");
    expect(transformPageReplicaIdentityAttribute(c, "href", "https://external.example/x")).toBe(
      "https://external.example/x"
    );
    expect(transformPageReplicaIdentityAttribute(c, "fill", "url(#ghost)")).toBe("url(#ghost)");
    expect(transformPageReplicaIdentityAttribute(c, "id", "sw-tab-0")).toBe("cx-mrq-e2e-sw-tab-0");
  });

  test("the identity transformer routes exactly the documented attribute set", () => {
    const memberStrings: readonly PageReplicaIdentityAttributeName[] = [
      "id",
      "htmlFor",
      "aria-labelledby",
      "aria-describedby",
      "aria-controls",
      "href",
      "xlinkHref",
      "fill",
      "stroke",
      "clipPath",
      "mask",
      "filter",
      "data-page-block-slot-owner",
      PAGE_BLOCK_ID_ATTRIBUTE,
      PAGE_TILT_PARENT_LAYER_ATTRIBUTE,
    ];
    const routable: readonly PageReplicaIdentityAttributeName[] = memberStrings;
    expect(routable).toHaveLength(15);
    // @ts-expect-error — style-scope aliases are never transformer-routable
    const neverBlockScope: PageReplicaIdentityAttributeName =
      PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE;
    expect(neverBlockScope).toBe(PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE);
    // @ts-expect-error — style-scope aliases are never transformer-routable
    const neverTiltScope: PageReplicaIdentityAttributeName =
      PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE;
    expect(neverTiltScope).toBe(PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE);
  });
});

describe("style-scope aliases", () => {
  test("block alias lands on the replica frame with the canonical id value", () => {
    const html = renderSection(
      contentSection("sec-scope", [
        marqueeOwner("blk-mq-scope", [textBlock("blk-m1"), textBlock("blk-m2")]),
      ])
    );
    const { primary, replica } = splitMarqueeRegions(html);
    expect(countMarkup(primary, 'data-block-id="blk-m1"')).toBe(1);
    expect(
      countMarkup(replica, `${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="blk-m1"`)
    ).toBe(1);
    expect(
      countMarkup(replica, `${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="blk-m2"`)
    ).toBe(1);
    expect(replica).not.toContain(`${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="cx-mrq-`);
    expect(replica).not.toContain("data-block-id=");
  });

  test("tilt/layer alias lands only on the hoisted wrapper, only in the replica", () => {
    const html = renderSection(
      contentSection("sec-tl", [
        marqueeOwner("blk-mq-tl", [
          createPageBlockV2("heading", {
            id: "blk-tl",
            props: { text: "TL", level: "h2", align: "left" },
            style: { tilt: "subtle", layer: { x: 8, y: 12, z: 3, anchor: "bottom-right" } },
          }),
        ]),
      ])
    );
    const { primary, replica } = splitMarqueeRegions(html);
    expect(countMarkup(primary, `${PAGE_TILT_PARENT_LAYER_ATTRIBUTE}="blk-tl"`)).toBe(1);
    expect(
      countMarkup(replica, `${PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE}="blk-tl"`)
    ).toBe(1);
    expect(countMarkup(html, 'data-tilt-parent=""')).toBe(2);
    expect(countMarkup(html, "data-block-tilt")).toBe(2);
    expect(primary).not.toContain(PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE);
    expect(replica).not.toContain(PAGE_TILT_PARENT_LAYER_ATTRIBUTE);
    expect(replica).toMatch(
      new RegExp(
        `data-tilt-parent=""[^>]*${PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE}="blk-tl"[^>]*data-layer=""`
      )
    );
  });

  test("aliases are absent from primary, non-seamless, unsafe fallback, and non-owning nodes", () => {
    noReplicaSurface(
      renderSection(
        contentSection("sec-canon", [
          createPageBlockV2("group", {
            id: "blk-plain",
            props: { direction: "row", wrap: false, gap: 16 },
            slots: { children: [textBlock("blk-p1")] },
          }),
        ])
      )
    );
    const nonSeamless = renderSection(
      contentSection("sec-ns", [
        createPageBlockV2("group", {
          id: "blk-ns",
          props: { direction: "row", wrap: false, gap: 16 },
          style: { marquee: { speed: 18, direction: "right", seamless: false } },
          slots: { children: [textBlock("blk-n1")] },
        }),
      ])
    );
    noReplicaSurface(nonSeamless);
    expect(countMarkup(nonSeamless, "cx-marquee-segment")).toBe(1);
    const unsafe = renderSection(
      contentSection("sec-unsafe", [
        marqueeOwner("blk-mq-u", [
          createPageBlockV2("form", { id: "blk-form", props: { formId: null, title: "" } }),
        ]),
      ])
    );
    noReplicaSurface(unsafe);
    expect(countMarkup(unsafe, "cx-marquee-segment")).toBe(1);
    const safe = renderSection(
      contentSection("sec-safe", [
        marqueeOwner("blk-mq-s", [textBlock("blk-s1"), textBlock("blk-s2")]),
      ])
    );
    const { replica } = splitMarqueeRegions(safe);
    expect(countMarkup(replica, `${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}=`)).toBe(2);
    expect(countMarkup(replica, "data-page-block-slot-owner")).toBe(0);
  });

  test("outer root grid target stays one canonical frame; replica descendants are placement none", () => {
    const html = renderSection(
      contentSection("sec-span", [
        createPageBlockV2("group", {
          id: "blk-mq-span",
          props: { direction: "row", wrap: false, gap: 16 },
          style: { marquee: { speed: 18, direction: "left", seamless: true }, colSpan: 2 },
          slots: { children: [textBlock("blk-a"), textBlock("blk-b")] },
        }),
      ])
    );
    expect(countMarkup(html, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}=`)).toBe(1);
    expect(countMarkup(html, `${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="blk-mq-span"`)).toBe(1);
    expect(countMarkup(html, "grid-column:span 2")).toBe(1);
    expect(html.slice(0, html.indexOf("cx-marquee-viewport"))).toContain(
      'data-block-id="blk-mq-span"'
    );
    const { replica } = splitMarqueeRegions(html);
    expect(replica).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);
    expect(replica).not.toContain("grid-column");
    expect(replica).not.toContain("grid-row");
    expect(countMarkup(replica, `${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}=`)).toBe(2);
  });
});

describe("unsafe types fail closed (direct and deep)", () => {
  const unsafeBlock = (type: PageBlockV2["type"]): PageBlockV2 => {
    switch (type) {
      case "video":
        return createPageBlockV2("video", {
          id: "blk-vid",
          props: { src: "https://media.example/clip.mp4", title: "V", autoplay: false },
        });
      case "form":
        return createPageBlockV2("form", { id: "blk-form", props: { formId: null, title: "" } });
      case "collection":
        return createPageBlockV2("collection", { id: "blk-col", props: { contentTypeId: "ct-1" } });
      case "filters":
        return createPageBlockV2("filters", { id: "blk-fil", props: { queryId: "q-1" } });
      default:
        return createPageBlockV2("embed", { id: "blk-emb" });
    }
  };
  const surfaceMarkers: Record<string, [string, string]> = {
    video: ["<video", "video"],
    form: ['data-page-block-inert="form"', "form"],
    collection: ['data-page-block-inert="collection"', "collection"],
    filters: ['data-page-block-inert="filters"', "filters"],
    embed: ['data-page-block-inert="embed"', "embed"],
  };
  for (const type of ["video", "form", "collection", "filters", "embed"] as const) {
    test(`${type}: direct + deep nesting is one canonical segment with one surface`, () => {
      const direct = renderSection(
        contentSection(`sec-d-${type}`, [marqueeOwner(`blk-mq-d-${type}`, [unsafeBlock(type)])])
      );
      const deep = renderSection(
        contentSection(`sec-deep-${type}`, [
          marqueeOwner(`blk-mq-deep-${type}`, [
            createPageBlockV2("container", {
              id: "blk-box",
              slots: {
                children: [
                  createPageBlockV2("columns", {
                    id: "blk-cols",
                    props: { count: 1, gap: 8 },
                    slots: { "column:1": [unsafeBlock(type)] },
                  }),
                ],
              },
            }),
          ]),
        ])
      );
      for (const html of [direct, deep]) {
        expect(html).toContain("cx-marquee-viewport");
        expect(countMarkup(html, "cx-marquee-rail")).toBe(1);
        expect(countMarkup(html, "cx-marquee-segment")).toBe(1);
        noReplicaSurface(html);
        expect(html).not.toContain("<script");
        expect(html).not.toContain("<iframe");
        expect(html).not.toContain("<source");
        const [marker, surface] = surfaceMarkers[type]!;
        expect(countMarkup(html, marker), type).toBe(1);
        if (surface === "form") expect(html).not.toContain("<form");
      }
    });
  }
});

describe("nested and sibling marquee owners", () => {
  test("outer owner falls back to one segment; the nested owner emits its own two", () => {
    const inner = marqueeOwner("blk-inner", [
      switcherBlock("sw-shared", ["A"], { "panel:1": [textBlock("leaf")] }),
    ]);
    const html = renderSection(
      contentSection("sec-nested", [marqueeOwner("blk-outer", [textBlock("blk-ot"), inner])])
    );
    expect(countMarkup(html, "cx-marquee-segment")).toBe(3);
    expect(countMarkup(html, `${PAGE_MARQUEE_REPLICA_ATTRIBUTE}=""`)).toBe(1);
    expect(countMarkup(html, 'inert=""')).toBe(1);
    expect(html).not.toContain(`${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="blk-ot"`);
    expect(html).toContain(`${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="leaf"`);
    expect(html).toContain(`${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="sw-shared"`);
  });

  test("two sibling owners get unique path namespaces and no cross-owner references", () => {
    const mk = (id: string): PageBlockV2 =>
      marqueeOwner(id, [
        switcherBlock("sw-x", ["A", "B"], {
          "panel:1": [textBlock("lx")],
          "panel:2": [textBlock("ly")],
        }),
      ]);
    const html = renderSection(contentSection("sec-sib", [mk("blk-o1"), mk("blk-o2")]));
    expect(countMarkup(html, "cx-marquee-segment")).toBe(4);
    expect(countMarkup(html, `${PAGE_MARQUEE_REPLICA_ATTRIBUTE}=""`)).toBe(2);
    const tabIds = [...html.matchAll(/id="(cx-mrq-[^"]*-tab-0)"/g)].map((m) => m[1]!);
    expect(tabIds).toHaveLength(2);
    expect(new Set(tabIds).size).toBe(2);
    const prefix = (id: string): string => id.slice(0, id.lastIndexOf("-tab-0"));
    expect(prefix(tabIds[0]!)).not.toBe(prefix(tabIds[1]!));
    for (const id of tabIds) {
      expect(countMarkup(html, `id="${id}"`)).toBe(1);
      expect(
        countMarkup(html, `aria-controls="${id.slice(0, id.lastIndexOf("-tab-0"))}-panel-0"`)
      ).toBe(1);
    }
    for (const token of tokenizedRefs(html, "aria-controls")) {
      if (token.startsWith("cx-mrq-")) expect(countMarkup(html, `id="${token}"`)).toBe(1);
    }
  });

  test("seamless:false stays one segment with no marker or namespace", () => {
    const group = createPageBlockV2("group", {
      id: "blk-ns2",
      props: { direction: "row", wrap: false, gap: 16 },
      style: { marquee: { speed: 18, direction: "right", seamless: false } },
      slots: { children: [switcherBlock("sw-ns", ["A"], { "panel:1": [textBlock("pn")] })] },
    });
    const html = renderSection(contentSection("sec-ns2", [group]));
    expect(countMarkup(html, "cx-marquee-segment")).toBe(1);
    noReplicaSurface(html);
    expect(html).toContain('id="sw-ns-tab-0"');
  });
});
