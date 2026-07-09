// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_EFFECTS_RUNTIME_INIT_FLAG,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";

/**
 * TASK-521-02-L03 — behavioral smoke of the section reveal/parallax runtime
 * (owned/emitted by 521-01/521-05, exercised here against the DOM contract
 * 521-02 stamps: `data-page-effect`, `data-parallax`, `[data-parallax-inner]`,
 * the `[data-page-motion]` root, `data-reveal-armed`, `data-revealed`).
 * The runtime source is a STATIC IIFE string executed via `new Function()` in
 * happy-dom; mocks stand in for IntersectionObserver / matchMedia / rAF.
 */

const runRuntime = () => {
  // eslint-disable-next-line no-new-func
  new Function(PAGE_EFFECTS_RUNTIME_SOURCE)();
};

type IoEntry = { target: Element; isIntersecting: boolean };
let ioInstances: Array<{ observe: (el: Element) => void; fire: (e: IoEntry[]) => void }>;

const mockMatchMedia = (reduce: boolean, fine = true) => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches:
          query === "(prefers-reduced-motion: reduce)"
            ? reduce
            : query === "(pointer:fine)"
              ? fine
              : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList
  );
  // happy-dom's window.matchMedia mirrors the global stub the runtime reads.
  window.matchMedia = globalThis.matchMedia;
};

beforeEach(() => {
  ioInstances = [];
  document.body.innerHTML = "";
  // TASK-535: the runtime's per-window idempotence guard sets
  // `window[PAGE_EFFECTS_RUNTIME_INIT_FLAG]` and early-returns on any 2nd+
  // invocation against the SAME window. happy-dom shares one `window` across
  // every test in this file, and `vi.unstubAllGlobals()` does NOT clear a plain
  // window property — so without this reset the 2nd `runRuntime()` short-circuits
  // before arming reveal / binding the scroll (parallax) handler (making later
  // tests fail or pass vacuously). Clear the flag so each `runRuntime()` re-arms
  // a clean runtime. The production guard is unchanged; this only resets the
  // shared test window.
  delete (window as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG];
  class MockIO {
    private cb: (entries: IoEntry[]) => void;
    constructor(cb: (entries: IoEntry[]) => void) {
      this.cb = cb;
      ioInstances.push({ observe: () => {}, fire: (e) => this.cb(e) });
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", MockIO as unknown as typeof IntersectionObserver);
  // Run rAF callbacks synchronously so `frame()` executes deterministically.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("section scroll-effect runtime (TASK-521-02)", () => {
  it("arms the reveal marker and IntersectionObserver enter toggles data-revealed", () => {
    mockMatchMedia(false);
    document.body.innerHTML =
      "<div data-page-motion>" +
      '<section data-page-effect="reveal-up"><p>content</p></section>' +
      "</div>";
    const root = document.querySelector("[data-page-motion]")!;
    const section = document.querySelector('[data-page-effect="reveal-up"]')!;

    runRuntime();

    // JS-required-to-HIDE marker set (before any observe).
    expect(root.getAttribute("data-reveal-armed")).toBe("true");
    expect(section.hasAttribute("data-revealed")).toBe(false);

    // Fire an intersection → the section reveals.
    ioInstances[0].fire([{ target: section, isIntersecting: true }]);
    expect(section.getAttribute("data-revealed")).toBe("true");
  });

  it("scroll applies a clamped translate3d to [data-parallax-inner]", () => {
    mockMatchMedia(false);
    document.body.innerHTML =
      "<div data-page-motion>" +
      '<section data-page-effect="parallax" data-parallax="24">' +
      "<div data-parallax-inner><p>content</p></div>" +
      "</section></div>";
    const inner = document.querySelector("[data-parallax-inner]") as HTMLElement;
    // Deterministic geometry: place the section well below the fold.
    const section = document.querySelector('[data-page-effect="parallax"]')!;
    section.getBoundingClientRect = () => ({ top: 1200, height: 400 }) as DOMRect;
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    runRuntime();

    // frame() runs synchronously (rAF stub) on init.
    const transform = inner.style.transform;
    expect(transform).toMatch(/^translate3d\(0,-?\d+(\.\d+)?px,0\)$/);
    const px = Number(transform.replace(/^translate3d\(0,(-?\d+(?:\.\d+)?)px,0\)$/, "$1"));
    // Clamped to |amt| = 24.
    expect(Math.abs(px)).toBeLessThanOrEqual(24);
  });

  it("prefers-reduced-motion: reduce ⇒ runtime no-ops (no arm, no transform, content shown)", () => {
    mockMatchMedia(true);
    document.body.innerHTML =
      "<div data-page-motion>" +
      '<section data-page-effect="reveal-up"><p>content</p></section>' +
      '<section data-page-effect="parallax" data-parallax="24">' +
      "<div data-parallax-inner><p>content</p></div>" +
      "</section></div>";
    const root = document.querySelector("[data-page-motion]")!;
    const inner = document.querySelector("[data-parallax-inner]") as HTMLElement;

    runRuntime();

    // Early-return before arming: content is never hidden, no transform applied.
    expect(root.hasAttribute("data-reveal-armed")).toBe(false);
    expect(inner.style.transform).toBe("");
    // No IntersectionObserver was constructed either.
    expect(ioInstances.length).toBe(0);
  });
});
