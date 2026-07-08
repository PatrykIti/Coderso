import { Window } from "happy-dom";
import { describe, expect, test } from "vitest";

import {
  PAGE_EFFECTS_REDUCED_MOTION_QUERY,
  PAGE_EFFECTS_RUNTIME_ID,
  PAGE_EFFECTS_RUNTIME_SOURCE,
  prefersReducedMotion,
} from "../../../core/services/pages/pageEffectsRuntime";

// TASK-521-01-L04 — pure string assertions on the STATIC runtime source. No DOM
// kernel is executed here (per _docs/TESTING_STRATEGY.md this belongs in the
// Vitest pure-TS lane), so these assertions guard the security + accessibility
// invariants purely by inspecting the emitted literal.

describe("pageEffectsRuntime static source (TASK-521-01-L04)", () => {
  const source = PAGE_EFFECTS_RUNTIME_SOURCE;

  test("id is a stable non-empty string", () => {
    expect(typeof PAGE_EFFECTS_RUNTIME_ID).toBe("string");
    expect(PAGE_EFFECTS_RUNTIME_ID).toBe("page-motion-effects");
  });

  test("source is a non-empty IIFE string", () => {
    expect(typeof source).toBe("string");
    expect(source.length).toBeGreaterThan(0);
    expect(source.startsWith("(function(){")).toBe(true);
    expect(source.endsWith("})();")).toBe(true);
  });

  test("reduced-motion guard early-returns FIRST, before any observer/listener", () => {
    expect(source).toContain(`matchMedia("${PAGE_EFFECTS_REDUCED_MOTION_QUERY}")`);
    const guardReturn = source.indexOf("if(RM&&RM.matches)return;");
    const observer = source.indexOf("IntersectionObserver");
    const listener = source.indexOf("addEventListener");
    expect(guardReturn).toBeGreaterThan(-1);
    expect(observer).toBeGreaterThan(guardReturn);
    expect(listener).toBeGreaterThan(guardReturn);
  });

  test("arms data-reveal-armed AFTER the reduced-motion return but BEFORE the observe loop (JS-required-to-HIDE)", () => {
    const guardReturn = source.indexOf("if(RM&&RM.matches)return;");
    const arm = source.indexOf('setAttribute("data-reveal-armed","true")');
    const observe = source.indexOf("io.observe(");
    expect(arm).toBeGreaterThan(guardReturn);
    expect(observe).toBeGreaterThan(arm);
    // The marker is read off the page-motion root the render stamps.
    expect(source).toContain('document.querySelector("[data-page-motion]")');
  });

  test("uses IntersectionObserver reveal with a no-IO visible fallback", () => {
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain('setAttribute("data-revealed","true")');
  });

  test("clamps parallax travel to 40px", () => {
    expect(source).toContain("Math.min(40,");
  });

  test("cursor spotlight only arms on pointer:fine and writes CSS vars", () => {
    expect(source).toContain('matchMedia("(pointer:fine)")');
    expect(source).toContain('setProperty("--spotlight-x"');
    expect(source).toContain('setProperty("--spotlight-y"');
  });

  test("is a static literal — no template interpolation of any caller value", () => {
    expect(source.includes("${")).toBe(false);
  });

  test("contains no eval / Function / innerHTML injection sink", () => {
    expect(/\beval\s*\(/.test(source)).toBe(false);
    expect(/\bFunction\s*\(/.test(source)).toBe(false);
    expect(/innerHTML/.test(source)).toBe(false);
    expect(/document\.write/.test(source)).toBe(false);
  });

  test("uses passive listeners + rAF + a try/catch page guard", () => {
    expect(source).toContain("{passive:true}");
    expect(source).toContain("requestAnimationFrame");
    expect(source).toContain("try{");
    expect(source).toContain("}catch(e){}");
  });

  test("prefersReducedMotion helper is a SSR-safe boolean function", () => {
    expect(typeof prefersReducedMotion).toBe("function");
    expect(typeof prefersReducedMotion()).toBe("boolean");
  });
});

// TASK-522-01-L05 — generalized block tilt ([data-block-tilt]) appended to the
// 521 runtime. String assertions guard the seam invariants; a happy-dom exercise
// (test-only `new Function`, never shipped) proves the binding sets/clears the
// transform + glare props, self-gates on pointer:fine, and is NOT nested inside
// the spotlight `sp` block (dead-without-spotlight regression).
describe("pageEffectsRuntime block tilt (TASK-522-01-L05)", () => {
  const source = PAGE_EFFECTS_RUNTIME_SOURCE;

  test("source binds [data-block-tilt] with its OWN pointer:fine gate", () => {
    expect(source).toContain('querySelectorAll("[data-block-tilt]")');
    // two distinct pointer:fine gates (spotlight + block tilt)
    const gates = source.match(/matchMedia\("\(pointer:fine\)"\)/g) ?? [];
    expect(gates.length).toBeGreaterThanOrEqual(2);
    // the block-tilt binding lives AFTER the spotlight block, at IIFE top level
    const spotlight = source.indexOf('querySelector("[data-page-spotlight]")');
    const blockTilt = source.indexOf('querySelectorAll("[data-block-tilt]")');
    expect(blockTilt).toBeGreaterThan(spotlight);
  });

  test("the global reduced-motion early-return is still present and not bypassed", () => {
    expect(source).toContain("if(RM&&RM.matches)return;");
    const guard = source.indexOf("if(RM&&RM.matches)return;");
    expect(source.indexOf('querySelectorAll("[data-block-tilt]")')).toBeGreaterThan(guard);
  });

  test("appends no eval / Function / innerHTML sink", () => {
    expect(/\beval\s*\(/.test(source)).toBe(false);
    expect(/\bFunction\s*\(/.test(source)).toBe(false);
    expect(/innerHTML/.test(source)).toBe(false);
    expect(source.includes("${")).toBe(false);
  });

  const runRuntime = (opts: { pointerFine: boolean; hasSpotlight?: boolean }) => {
    const win = new Window();
    const doc = win.document;
    doc.body.innerHTML = `${opts.hasSpotlight ? "" : ""}<div id="card" data-block-tilt="subtle"><div class="cx-glare"></div></div>`;
    const card = doc.querySelector("#card") as unknown as {
      getBoundingClientRect: () => Record<string, number>;
      style: CSSStyleDeclaration;
      dispatchEvent: (e: unknown) => boolean;
    };
    card.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
    });
    (win as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (q: string) => ({
      matches: q.includes("pointer:fine") ? opts.pointerFine : false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    });
    const raf = (cb: () => void) => {
      cb();
      return 0;
    };
    // Params shadow the free `window`/`document`/`requestAnimationFrame` globals
    // the ES5 source references — inject the happy-dom instances.
    // eslint-disable-next-line no-new-func
    const fn = new Function("window", "document", "requestAnimationFrame", source);
    fn(win, doc, raf);
    return { win, doc, card };
  };

  test("pointer:fine → pointermove sets rotateX/rotateY + glare vars; pointerleave clears", () => {
    const { win, doc, card } = runRuntime({ pointerFine: true });
    const move = new win.MouseEvent("pointermove", { clientX: 75, clientY: 20 });
    (card as unknown as { dispatchEvent: (e: unknown) => boolean }).dispatchEvent(move);
    const transform = (card as unknown as { style: { transform: string } }).style.transform;
    expect(transform).toContain("rotateX");
    expect(transform).toContain("rotateY");
    const glare = doc.querySelector(".cx-glare") as unknown as {
      style: { getPropertyValue: (p: string) => string };
    };
    expect(glare.style.getPropertyValue("--glare-x")).not.toBe("");
    expect(glare.style.getPropertyValue("--glare-y")).not.toBe("");

    const leave = new win.MouseEvent("pointerleave", {});
    (card as unknown as { dispatchEvent: (e: unknown) => boolean }).dispatchEvent(leave);
    expect((card as unknown as { style: { transform: string } }).style.transform).toBe("");
  });

  test("coarse pointer (pointer:fine=false) → no listener/transform attached", () => {
    const { win, card } = runRuntime({ pointerFine: false });
    const move = new win.MouseEvent("pointermove", { clientX: 75, clientY: 20 });
    (card as unknown as { dispatchEvent: (e: unknown) => boolean }).dispatchEvent(move);
    expect((card as unknown as { style: { transform: string } }).style.transform).toBe("");
  });

  test("tilts even on a page WITHOUT a spotlight element (not dead-without-spotlight)", () => {
    const { win, card } = runRuntime({ pointerFine: true, hasSpotlight: false });
    const move = new win.MouseEvent("pointermove", { clientX: 60, clientY: 40 });
    (card as unknown as { dispatchEvent: (e: unknown) => boolean }).dispatchEvent(move);
    expect((card as unknown as { style: { transform: string } }).style.transform).toContain(
      "rotateX"
    );
  });
});
