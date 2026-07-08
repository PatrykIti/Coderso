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
