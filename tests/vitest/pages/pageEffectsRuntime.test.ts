import { Window } from "happy-dom";
import { describe, expect, test } from "vitest";

import {
  PAGE_EFFECTS_REDUCED_MOTION_QUERY,
  PAGE_EFFECTS_RUNTIME_ID,
  PAGE_EFFECTS_RUNTIME_INIT_FLAG,
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

  test("reduced-motion guard early-returns before any MOTION observer/listener", () => {
    expect(source).toContain(`matchMedia("${PAGE_EFFECTS_REDUCED_MOTION_QUERY}")`);
    const guardReturn = source.indexOf("if(RM&&RM.matches)return;");
    const observer = source.indexOf("IntersectionObserver");
    // TASK-534: the FIRST addEventListener is now the switcher/filter INTERACTION
    // TOGGLE, deliberately placed BEFORE the reduced-motion return (it must run for
    // reduce users — accessibility). The MOTION listeners (parallax scroll,
    // spotlight/tilt/magnetic pointermove) still follow the return, so assert the
    // reveal observer + the parallax scroll listener + the LAST addEventListener
    // (magnetic pointerleave) are all after the guard.
    const parallaxScroll = source.indexOf('window.addEventListener("scroll"');
    const lastListener = source.lastIndexOf("addEventListener");
    expect(guardReturn).toBeGreaterThan(-1);
    expect(observer).toBeGreaterThan(guardReturn);
    expect(parallaxScroll).toBeGreaterThan(guardReturn);
    expect(lastListener).toBeGreaterThan(guardReturn);
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

  test("TASK-529 — spotlight uses raw VIEWPORT clientX/clientY (feeds a position:fixed overlay), not root-rect page coords", () => {
    // The vars feed a position:fixed inset:0 overlay's radial-gradient, so they
    // must be viewport-relative. The handler must NOT subtract the root's rect
    // (which added scrollY and pushed the glow below the fold past screen one).
    expect(source).toContain("sx=Math.round(ev.clientX);sy=Math.round(ev.clientY);");
    expect(source).not.toContain("ev.clientX-r.left");
    expect(source).not.toContain("ev.clientY-r.top");
    // No leftover root-rect read inside the pointermove handler.
    const spotlightMove = source.indexOf('sp.addEventListener("pointermove"');
    const nextMove = source.indexOf("addEventListener", spotlightMove + 1);
    const handlerSlice = source.slice(spotlightMove, nextMove === -1 ? undefined : nextMove);
    expect(handlerSlice).not.toContain("sp.getBoundingClientRect()");
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

// TASK-535 — idempotence self-guard. A page renders TWO PageDocumentRender
// documents (the <main> page + the SiteFooter template); when BOTH author motion
// each emits its own copy of this runtime <script>, and both share one `window`.
// The IIFE must NO-OP any copy after the first: no re-arm of [data-reveal-armed],
// no double IntersectionObserver, no double scroll/pointer listeners. String
// assertions guard the seam; a happy-dom double-run proves the runtime behaviour.
describe("pageEffectsRuntime idempotence self-guard (TASK-535)", () => {
  const source = PAGE_EFFECTS_RUNTIME_SOURCE;

  test("init flag is a stable non-empty window-key literal", () => {
    expect(typeof PAGE_EFFECTS_RUNTIME_INIT_FLAG).toBe("string");
    expect(PAGE_EFFECTS_RUNTIME_INIT_FLAG.length).toBeGreaterThan(0);
    // The static source hardcodes the SAME key (no interpolation — invariant #1),
    // so the exported constant and the emitted literal must not drift.
    expect(source).toContain(`window.${PAGE_EFFECTS_RUNTIME_INIT_FLAG}`);
  });

  test("guard is the FIRST executable statement — checks the flag then sets it, before arm/observe/listen", () => {
    const check = source.indexOf(`if(window.${PAGE_EFFECTS_RUNTIME_INIT_FLAG})return;`);
    const set = source.indexOf(`window.${PAGE_EFFECTS_RUNTIME_INIT_FLAG}=true;`);
    const arm = source.indexOf('setAttribute("data-reveal-armed","true")');
    const observe = source.indexOf("io.observe(");
    const listen = source.indexOf("addEventListener");
    // check present, and comes before the flag-set
    expect(check).toBeGreaterThan(-1);
    expect(set).toBeGreaterThan(check);
    // and both precede any arming / observing / listener binding
    expect(arm).toBeGreaterThan(set);
    expect(observe).toBeGreaterThan(set);
    expect(listen).toBeGreaterThan(set);
    // the reduced-motion early-return still lives AFTER the guard (guard is truly first)
    expect(source.indexOf("if(RM&&RM.matches)return;")).toBeGreaterThan(set);
  });

  test("guard adds no eval / Function / interpolation sink", () => {
    expect(/\beval\s*\(/.test(source)).toBe(false);
    expect(/\bFunction\s*\(/.test(source)).toBe(false);
    expect(source.includes("${")).toBe(false);
  });

  // Run the source N times against the SAME window (mirrors a page that emits the
  // script twice). Parallax nodes force window scroll/resize listeners; a motion
  // root proves reveal arming. We count window.addEventListener calls + arm writes.
  const runTwiceInOneWindow = () => {
    const win = new Window();
    const doc = win.document;
    doc.body.innerHTML =
      '<div data-page-motion="true">' +
      '<div data-page-effect="parallax" data-parallax="20"></div>' +
      "</div>";
    (win as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (q: string) => ({
      matches: false, // not reduced-motion, coarse pointer — isolates the parallax/window path
      media: q,
      addEventListener() {},
      removeEventListener() {},
    });
    const raf = (cb: () => void) => {
      cb();
      return 0;
    };
    // Spy on window.addEventListener to count listener bindings across runs.
    const winEvents: string[] = [];
    const realAdd = win.addEventListener.bind(win);
    (
      win as unknown as { addEventListener: (t: string, ...r: unknown[]) => void }
    ).addEventListener = (type: string, ...rest: unknown[]) => {
      winEvents.push(type);
      return (realAdd as (t: string, ...r: unknown[]) => void)(type, ...rest);
    };
    // eslint-disable-next-line no-new-func
    const fn = new Function("window", "document", "requestAnimationFrame", source);
    const armedAfter = () => {
      const root = doc.querySelector("[data-page-motion]") as unknown as {
        getAttribute: (n: string) => string | null;
      };
      return root.getAttribute("data-reveal-armed");
    };
    fn(win, doc, raf);
    const afterFirst = { winEvents: [...winEvents], armed: armedAfter() };
    // Un-arm so a re-arm by the second run would be observable.
    (
      doc.querySelector("[data-page-motion]") as unknown as {
        removeAttribute: (n: string) => void;
      }
    ).removeAttribute("data-reveal-armed");
    fn(win, doc, raf);
    const afterSecond = { winEvents: [...winEvents], armed: armedAfter() };
    return { win, doc, afterFirst, afterSecond };
  };

  test("second script run is a NO-OP: sets the window flag, adds no new listeners, does not re-arm", () => {
    const { win, afterFirst, afterSecond } = runTwiceInOneWindow();
    // First run initialised: flag set, reveal armed, and scroll/resize bound.
    expect((win as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG]).toBe(true);
    expect(afterFirst.armed).toBe("true");
    expect(afterFirst.winEvents).toContain("scroll");
    expect(afterFirst.winEvents).toContain("resize");
    // Second run early-returns: NO additional window listeners were bound…
    expect(afterSecond.winEvents.length).toBe(afterFirst.winEvents.length);
    // …and it did NOT re-arm the reveal root we cleared before the second run.
    expect(afterSecond.armed).toBeNull();
  });
});

// TASK-534 — declarative-interactivity runtime clauses (switcher toggle, gallery
// filter, magnetic pointer-attract) appended to the ONE runtime source. STATIC
// string assertions lock the SPLIT placement: the switcher + filter TOGGLE clauses
// precede the reduced-motion early-return (they must run for reduce users), while
// the magnetic MOTION clause follows it (suppressed for reduce). Behavioral IIFE
// exec lives in the content lane (534-05-L01).
describe("pageEffectsRuntime declarative interactivity (TASK-534)", () => {
  const source = PAGE_EFFECTS_RUNTIME_SOURCE;

  test("source contains the switcher / gallery-filter / magnetic clause markers", () => {
    expect(source).toContain('querySelectorAll("[data-switcher]")');
    expect(source).toContain('querySelectorAll("[data-gallery-filter]")');
    expect(source).toContain('querySelectorAll("[data-magnetic]")');
  });

  test("switcher + gallery-filter TOGGLE clauses precede the reduced-motion early-return", () => {
    const guardReturn = source.indexOf("if(RM&&RM.matches)return;");
    const switcher = source.indexOf('querySelectorAll("[data-switcher]")');
    const filter = source.indexOf('querySelectorAll("[data-gallery-filter]")');
    expect(guardReturn).toBeGreaterThan(-1);
    expect(switcher).toBeGreaterThan(-1);
    expect(filter).toBeGreaterThan(-1);
    // The toggles run for reduce users → they sit BEFORE the whole-IIFE return.
    expect(switcher).toBeLessThan(guardReturn);
    expect(filter).toBeLessThan(guardReturn);
    // …but still AFTER the idempotence flag-set (bound once per page).
    expect(switcher).toBeGreaterThan(
      source.indexOf(`window.${PAGE_EFFECTS_RUNTIME_INIT_FLAG}=true;`)
    );
  });

  test("magnetic MOTION clause follows the reduced-motion early-return (suppressed for reduce)", () => {
    const guardReturn = source.indexOf("if(RM&&RM.matches)return;");
    const magnetic = source.indexOf('querySelectorAll("[data-magnetic]")');
    expect(magnetic).toBeGreaterThan(guardReturn);
    // …and after the 522 block-tilt clause (its documented placement anchor).
    expect(magnetic).toBeGreaterThan(source.indexOf('querySelectorAll("[data-block-tilt]")'));
  });

  test("magnetic opens its OWN pointer:fine gate", () => {
    const magnetic = source.indexOf('querySelectorAll("[data-magnetic]")');
    const gateAfterMagnetic = source.indexOf('matchMedia("(pointer:fine)")', magnetic);
    expect(gateAfterMagnetic).toBeGreaterThan(magnetic);
  });

  test("filter matches data-category by TOKEN split (no substring false-positive, no innerHTML/eval)", () => {
    expect(source).toContain('cat.split(" ").indexOf(f)');
    expect(source.includes("${")).toBe(false);
    expect(/\beval\s*\(/.test(source)).toBe(false);
    expect(/\bFunction\s*\(/.test(source)).toBe(false);
    expect(/innerHTML/.test(source)).toBe(false);
  });
});
