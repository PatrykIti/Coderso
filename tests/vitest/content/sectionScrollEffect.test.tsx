// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_EFFECTS_RUNTIME_INIT_FLAG,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";

/**
 * TASK-521-02-L03 / TASK-539-07-L01 — behavioral smoke of the section
 * reveal/parallax runtime (owned/emitted by 521-01/521-05, exercised here
 * against the DOM contract 521-02 stamps: `data-page-effect`, `data-parallax`,
 * `[data-parallax-inner]`, the `[data-page-motion]` root, `data-reveal-armed`,
 * `data-revealed`). The runtime source is a STATIC IIFE string executed via
 * `new Function()` in happy-dom; mocks stand in for IntersectionObserver /
 * matchMedia / rAF. TASK-539-07: the shared controller lives on
 * `window.__codersoPageEffectsV2`, so BOTH the controller and the legacy
 * observation flag are reset between tests.
 */

const runRuntime = () => {
  // eslint-disable-next-line no-new-func
  new Function(PAGE_EFFECTS_RUNTIME_SOURCE)();
};

type IoEntry = { target: Element; isIntersecting: boolean };
type MockIoInstance = {
  observe: (el: Element) => void;
  fire: (e: IoEntry[]) => void;
  observed: Element[];
};
let ioInstances: MockIoInstance[];

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
  // TASK-539-07: the controller is stored on `window.__codersoPageEffectsV2`
  // (its per-binder WeakSets would otherwise survive across tests in the shared
  // happy-dom window), and the legacy observation flag is written by every copy.
  // Reset BOTH so each runRuntime() builds a clean controller and re-evaluates
  // the static source. The production guard is unchanged; this only resets the
  // shared test window.
  delete (window as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG];
  delete (window as unknown as Record<string, unknown>)["__codersoPageEffectsV2"];
  class MockIO {
    private cb: (entries: IoEntry[]) => void;
    observed: Element[] = [];
    constructor(cb: (entries: IoEntry[]) => void) {
      this.cb = cb;
      ioInstances.push({
        observe: (el) => {
          this.observed.push(el);
        },
        fire: (e) => this.cb(e),
        observed: this.observed,
      });
    }
    observe(el: Element) {
      this.observed.push(el);
    }
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
    ioInstances[0]!.fire([{ target: section, isIntersecting: true }]);
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

// TASK-539-07-L01 — replica rejection for the reveal/parallax binders. Reveal and
// parallax belong to SECTION WRAPPERS and cannot be generated inside a real
// marquee segment; the runtime suite proves the replica-self/ancestor rejection
// with minimal fixed DOM owned by this suite (no fake production hooks).
describe("section scroll-effect replica safety (TASK-539-07-L01)", () => {
  it("a reveal section inside a marquee replica is never observed; the primary still reveals", () => {
    mockMatchMedia(false);
    document.body.innerHTML =
      "<div data-page-motion>" +
      '<section data-page-effect="reveal-up" data-primary="true"><p>primary</p></section>' +
      "</div>" +
      '<div class="cx-marquee-viewport"><div class="cx-marquee-rail">' +
      '<div class="cx-marquee-segment">' +
      '<section data-page-effect="reveal-up" data-primary="true"><p>seg</p></section>' +
      "</div>" +
      '<div class="cx-marquee-segment" data-page-marquee-replica aria-hidden="true">' +
      '<section data-page-effect="reveal-up" data-replica="true"><p>clone</p></section>' +
      "</div>" +
      "</div></div>";

    runRuntime();

    const observed = ioInstances.flatMap((inst) => inst.observed);
    const primary = document.querySelector('section[data-primary="true"]')!;
    const replica = document.querySelector('section[data-replica="true"]')!;
    // Only the primary segments are observed; the replica reveal is inert.
    expect(observed).toContain(primary);
    expect(observed).not.toContain(replica);

    // The replica element is not armed/observed and never gets data-revealed.
    ioInstances[0]!.fire([{ target: primary, isIntersecting: true }]);
    expect(primary.getAttribute("data-revealed")).toBe("true");
    expect(replica.hasAttribute("data-revealed")).toBe(false);
  });

  it("a parallax element inside a marquee replica gets no transform; the primary still moves", () => {
    mockMatchMedia(false);
    document.body.innerHTML =
      '<div class="cx-marquee-viewport"><div class="cx-marquee-rail">' +
      '<div class="cx-marquee-segment">' +
      '<section data-page-effect="parallax" data-parallax="24" data-primary="true">' +
      "<div data-parallax-inner><p>seg</p></div></section>" +
      "</div>" +
      '<div class="cx-marquee-segment" data-page-marquee-replica aria-hidden="true">' +
      '<section data-page-effect="parallax" data-parallax="24" data-replica="true">' +
      "<div data-parallax-inner><p>clone</p></div></section>" +
      "</div>" +
      "</div></div>";
    const primaryInner = document.querySelector(
      'section[data-primary="true"] [data-parallax-inner]'
    ) as HTMLElement;
    const replicaInner = document.querySelector(
      'section[data-replica="true"] [data-parallax-inner]'
    ) as HTMLElement;

    runRuntime();

    // The primary parallax channel animates; the replica stays inert.
    expect(primaryInner.style.transform).toMatch(/^translate3d\(0,-?\d+(\.\d+)?px,0\)$/);
    expect(replicaInner.style.transform).toBe("");
  });
});
