// TASK-539-05-L01 — `pageRendererReplicaIdentity.ts` direct-owner suite.
// Imports the task-added module directly (never through the stable facade) and
// pins the exact contract from TASK-539-05-L01 section 6: the two styling-only
// replica scope hooks with canonical (never namespaced) values, their
// separate-set non-membership in `PageReplicaIdentityAttributeName`, the
// fail-closed safe-by-block-type map, deterministic namespacing/collection, the
// transformer routing rules, and the facade-not-widened guarantee.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE,
  PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE,
  collectPageReplicaIdentitySets,
  createPageMarqueeReplicaNamespace,
  encodePageReplicaNamespacePart,
  isPageMarqueeReplicaSafeSubtree,
  namespacePageReplicaDomId,
  namespacePageReplicaHookIdentifier,
  namespacePageReplicaIdRef,
  transformPageReplicaIdentityAttribute,
  type PageReplicaIdentityAttributeName,
  type PageReplicaIdentityContext,
} from "../../../core/services/pages/pageRendererReplicaIdentity";
import {
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_TILT_PARENT_LAYER_ATTRIBUTE,
} from "../../../core/services/pages/pageResponsiveCss";
import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";

/** One reusable immutable replica identity context for helper-level pins. */
const context: PageReplicaIdentityContext = {
  namespace: "cx-mrq-626c6c6b2d6d617271756565-6f6e65",
  domIds: new Set(["sw-tab-0", "sw-panel-0", "svg-grad"]),
  hookIdentifiers: new Set(["blk-1", "blk-2"]),
  inert: true,
};

describe("pageRendererReplicaIdentity (TASK-539-05-L01 direct owner)", () => {
  test("the two styling-only replica scope hooks are exactly the two literals", () => {
    expect(PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE).toBe(
      "data-page-marquee-replica-block-style-scope"
    );
    expect(PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE).toBe(
      "data-page-marquee-replica-tilt-layer-style-scope"
    );
  });

  test("the scope hooks are NOT members of the transformer attribute-name set", () => {
    // The finite union the identity transformer routes (contract §110-125).
    const memberStrings: readonly string[] = [
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
    expect(memberStrings).not.toContain(PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE);
    expect(memberStrings).not.toContain(PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE);
    // Compile-time proof: if either scope hook ever joins the union, the
    // directive below becomes unused and the root `tsc` gate fails.
    type RoutableAttribute = PageReplicaIdentityAttributeName;
    // @ts-expect-error — scope aliases are never transformer-routable
    const neverRouted: RoutableAttribute = PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE;
    expect(neverRouted).toBe(PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE);
  });

  test("PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE is exhaustive and fail-closed", () => {
    // Every page block type is triaged; exactly the five live/global-binding
    // types are unsafe (a new type fails `satisfies Record<PageBlockType, ...>`).
    expect(Object.keys(PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE)).toHaveLength(24);
    const unsafe = Object.entries(PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE)
      .filter(([, safe]) => safe === false)
      .map(([type]) => type);
    expect(unsafe).toEqual(["video", "form", "collection", "filters", "embed"]);
    expect(
      Object.entries(PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE).filter(([, safe]) => safe === true)
    ).toHaveLength(19);
  });

  test("isPageMarqueeReplicaSafeSubtree accepts a plain safe subtree and rejects live types", () => {
    const safe = [
      createPageBlockV2("heading", {
        id: "blk-1",
        props: { text: "A", level: "h3", align: "left" },
      }),
      createPageBlockV2("text", { id: "blk-2", props: { text: "B", format: "plain" } }),
    ];
    expect(isPageMarqueeReplicaSafeSubtree(safe, { includeHiddenBlocks: false })).toBe(true);
    expect(
      isPageMarqueeReplicaSafeSubtree([createPageBlockV2("form", { id: "blk-form" })], {
        includeHiddenBlocks: false,
      })
    ).toBe(false);
  });

  test("isPageMarqueeReplicaSafeSubtree rejects a nested authored marquee and hidden-block policy", () => {
    const nestedMarquee = createPageBlockV2("group", {
      id: "blk-nested",
      style: { marquee: { speed: 12, direction: "left", seamless: true } },
      slots: { children: [] },
    });
    expect(isPageMarqueeReplicaSafeSubtree([nestedMarquee], { includeHiddenBlocks: false })).toBe(
      false
    );

    const hiddenUnsafe = createPageBlockV2("embed", { id: "blk-hidden-embed" });
    const visible = [createPageBlockV2("text", { id: "blk-v", props: { text: "V" } })];
    // Hidden live blocks are excluded only when includeHiddenBlocks is false.
    expect(
      isPageMarqueeReplicaSafeSubtree(
        [...visible, { ...hiddenUnsafe, visibility: { visible: false } }],
        { includeHiddenBlocks: false }
      )
    ).toBe(true);
    expect(
      isPageMarqueeReplicaSafeSubtree(
        [...visible, { ...hiddenUnsafe, visibility: { visible: false } }],
        { includeHiddenBlocks: true }
      )
    ).toBe(false);
  });

  test("encodePageReplicaNamespacePart is fixed-width base-36 and delimiter-safe", () => {
    expect(encodePageReplicaNamespacePart("")).toBe("");
    // Lowercase + digits only, four chars per code point, reversible. The code
    // point 97 is `2p` in base-36 (97 = 2*36 + 25), NOT the decimal `0061`.
    expect(encodePageReplicaNamespacePart("a")).toBe("002p");
    expect(encodePageReplicaNamespacePart("ab")).toBe("002p002q");
    expect(/^[a-z0-9]+$/.test(encodePageReplicaNamespacePart("blk-1"))).toBe(true);
    expect(encodePageReplicaNamespacePart("blk-1")).toHaveLength(4 * 5);
  });

  test("createPageMarqueeReplicaNamespace is deterministic `cx-mrq-<id>-<path>`", () => {
    const a = createPageMarqueeReplicaNamespace("blk-marquee", "1:0");
    const b = createPageMarqueeReplicaNamespace("blk-marquee", "1:0");
    expect(a).toBe(b);
    expect(a).toMatch(/^cx-mrq-[a-z0-9]+-[a-z0-9]+$/);
    // A different path produces a different namespace.
    expect(a).not.toBe(createPageMarqueeReplicaNamespace("blk-marquee", "1:1"));
  });

  test("collectPageReplicaIdentitySets gathers DOM ids, hook ids, and hidden policy", () => {
    const switcher = createPageBlockV2("switcher", {
      id: "sw",
      props: {
        tabs: [{ label: "One" }, { label: "Two" }],
        activeIndex: 0,
        variant: "pill",
      },
      slots: {
        "panel:1": [createPageBlockV2("text", { id: "p1", props: { text: "P1" } })],
        "panel:2": [createPageBlockV2("text", { id: "p2", props: { text: "P2" } })],
      },
    });
    const sets = collectPageReplicaIdentitySets([switcher], {
      includeHiddenBlocks: false,
    });
    // Switcher tab/panel ids are DOM `id` definitions; every block id is a hook.
    expect([...sets.domIds].sort()).toEqual(["sw-panel-0", "sw-panel-1", "sw-tab-0", "sw-tab-1"]);
    expect([...sets.hookIdentifiers].sort()).toEqual(["p1", "p2", "sw"]);
    // Hidden blocks are excluded unless includeHiddenBlocks is true.
    const hiddenOnly = collectPageReplicaIdentitySets(
      [{ ...switcher, visibility: { visible: false } }],
      { includeHiddenBlocks: false }
    );
    expect(hiddenOnly.hookIdentifiers.size).toBe(0);
    expect(
      collectPageReplicaIdentitySets([switcher], { includeHiddenBlocks: true }).hookIdentifiers.size
    ).toBeGreaterThan(0);
  });

  test("namespacing helpers prefix deterministically and id-refs only when backed", () => {
    const ns = context.namespace;
    expect(namespacePageReplicaDomId(context, "sw-tab-0")).toBe(`${ns}-sw-tab-0`);
    expect(namespacePageReplicaHookIdentifier(context, "blk-1")).toBe(`${ns}-blk-1`);
    // A backed IDREF target is namespaced; an unbacked target stays byte-for-byte.
    expect(namespacePageReplicaIdRef(context, "sw-panel-0")).toBe(`${ns}-sw-panel-0`);
    expect(namespacePageReplicaIdRef(context, "missing-target")).toBe("missing-target");
  });

  test("transformPageReplicaIdentityAttribute rewrites only owned values", () => {
    // DOM id definitions always namespace.
    expect(transformPageReplicaIdentityAttribute(context, "id", "sw-tab-0")).toBe(
      `${context.namespace}-sw-tab-0`
    );
    // htmlFor/aria whitespace-separated targets: backed tokens namespace, others stay.
    expect(
      transformPageReplicaIdentityAttribute(context, "aria-labelledby", "sw-panel-0 ghost")
    ).toBe(`${context.namespace}-sw-panel-0 ghost`);
    // #hash href targets namespace only when backed.
    expect(transformPageReplicaIdentityAttribute(context, "href", "#sw-panel-0")).toBe(
      `#${context.namespace}-sw-panel-0`
    );
    expect(transformPageReplicaIdentityAttribute(context, "href", "#unbacked")).toBe("#unbacked");
    // url(#...) SVG references namespace only when backed.
    expect(transformPageReplicaIdentityAttribute(context, "fill", "url(#svg-grad)")).toBe(
      `url(#${context.namespace}-svg-grad)`
    );
    expect(transformPageReplicaIdentityAttribute(context, "filter", "url(#missing)")).toBe(
      "url(#missing)"
    );
    // Hook attributes namespace only hook-identifier values.
    expect(transformPageReplicaIdentityAttribute(context, PAGE_BLOCK_ID_ATTRIBUTE, "blk-1")).toBe(
      `${context.namespace}-blk-1`
    );
    expect(
      transformPageReplicaIdentityAttribute(context, PAGE_TILT_PARENT_LAYER_ATTRIBUTE, "not-a-hook")
    ).toBe("not-a-hook");
  });

  test("stable facade does not widen with the task-added replica identity symbols", () => {
    const facade = readFileSync("core/services/pages/pageRendererV2.tsx", "utf8");
    // Names the facade must never even mention (it imports only the stamp-site
    // constants/transformer it actually consumes; these are internal-only).
    expect(facade).not.toContain("PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE");
    expect(facade).not.toContain("PageReplicaIdentitySets");
    expect(facade).not.toContain("PageReplicaIdentityContext");
    expect(facade).not.toContain("PageReplicaIdentityAttributeName");
    expect(facade).not.toContain("collectPageReplicaIdentitySets");
    // The tilt-layer stamp constant and the identity transformer ARE imported
    // (renderer call sites), but must never be re-exported through an explicit
    // `export { ... }` clause; the 41-name AST pin in the facade suite is the
    // exhaustive authority, this guards the spelling at the text level.
    expect(facade).not.toMatch(
      /export\s*\{[^}]*PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE/
    );
    expect(facade).not.toMatch(/export\s*\{[^}]*transformPageReplicaIdentityAttribute/);
  });
});
