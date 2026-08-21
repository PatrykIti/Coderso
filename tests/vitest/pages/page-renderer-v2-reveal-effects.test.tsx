import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  PAGE_REVEAL_MOTION_CSS,
  PageDocumentRender,
  PageSectionContent,
  PageSectionRender,
  toPageBlockRenderProps,
} from "../../../core/services/pages/pageRendererV2";

import { PAGE_EFFECTS_RUNTIME_ID } from "../../../core/services/pages/pageEffectsRuntime";

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
    '[data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]){--cx-reveal-y:1rem}'
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
  // TASK-539-05-L01: the revealed child reset writes only `--cx-reveal-y:0` (never
  // a raw `transform:none` that would clobber the decoration/hover/tilt/magnetic
  // channels composed by the same host formula).
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    '[data-reveal-armed] [data-page-effect^="reveal"][data-revealed] [data-page-block]{opacity:1;--cx-reveal-y:0}'
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
