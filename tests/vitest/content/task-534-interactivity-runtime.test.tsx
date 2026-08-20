// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_EFFECTS_RUNTIME_INIT_FLAG,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";
import { PAGE_BLOCK_TRANSFORM_VARIABLES } from "../../../core/services/pages/pageCompositionEffects";

/**
 * TASK-534-05-L01 / TASK-539-07-L01 — behavioral smoke of the declarative-
 * interactivity runtime clauses (switcher toggle, gallery filter, magnetic
 * pointer-attract) appended to the ONE runtime IIFE. Executes the STATIC source
 * via `new Function()` in happy-dom against the data-attribute contract the
 * renderer (534-02) stamps, then simulates real events. Asserts the SPLIT
 * placement: switcher + filter TOGGLES work even under
 * `prefers-reduced-motion: reduce` (they precede the reduced-motion branch),
 * while the magnetic MOTION clause is suppressed for reduce / coarse pointer.
 * TASK-539-07: the controller lives on `window.__codersoPageEffectsV2`, so BOTH
 * the controller and the legacy observation flag are reset between tests; every
 * binder rejects marquee-replica candidates; magnetic writes ONLY the imported
 * `--cx-magnetic-x/y` custom properties (never `style.transform`).
 */

const runRuntime = () => {
  // eslint-disable-next-line no-new-func
  new Function(PAGE_EFFECTS_RUNTIME_SOURCE)();
};

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
  window.matchMedia = globalThis.matchMedia;
};

const click = (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
const keydown = (el: Element, key: string) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
const movePointer = (el: Element, clientX: number, clientY: number) =>
  el.dispatchEvent(new MouseEvent("pointermove", { clientX, clientY, bubbles: true }));
const leavePointer = (el: Element) =>
  el.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }));

const SWITCHER_DOM =
  '<div data-switcher data-switcher-variant="pill">' +
  '<div role="tablist">' +
  '<button role="tab" data-switcher-tab aria-selected="true" tabindex="0">A</button>' +
  '<button role="tab" data-switcher-tab aria-selected="false" tabindex="-1">B</button>' +
  '<button role="tab" data-switcher-tab aria-selected="false" tabindex="-1">C</button>' +
  "</div>" +
  '<div data-switcher-panel data-active="true">PA</div>' +
  '<div data-switcher-panel data-active="false" hidden>PB</div>' +
  '<div data-switcher-panel data-active="false" hidden>PC</div>' +
  "</div>";

// The chip bar is a role="toolbar" of aria-pressed toggle buttons with roving
// tabindex (active=0, rest=-1) — mirrors the 534-render markup (NOT a tablist).
const GALLERY_DOM =
  "<div data-gallery>" +
  '<div role="toolbar" aria-label="Filter gallery" data-gallery-filter>' +
  '<button data-filter="all" aria-pressed="true" tabindex="0">All</button>' +
  '<button data-filter="modern" aria-pressed="false" tabindex="-1">Modern</button>' +
  '<button data-filter="eco" aria-pressed="false" tabindex="-1">Eco</button>' +
  "</div>" +
  '<figure data-filter-item data-category="modern">M</figure>' +
  '<figure data-filter-item data-category="eco">E</figure>' +
  '<figure data-filter-item data-category="modern eco">ME</figure>' +
  "</div>";

const MAGNETIC_DOM = '<a data-magnetic href="#">Go</a>';

beforeEach(() => {
  document.body.innerHTML = "";
  // TASK-539-07: the shared controller and its per-binder WeakSets would survive
  // across tests in the shared happy-dom window, and the legacy observation flag
  // is written by every copy. Reset BOTH so each runRuntime() re-binds a clean
  // runtime. The production controller is unchanged; this only resets the shared
  // test window.
  delete (window as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG];
  delete (window as unknown as Record<string, unknown>)["__codersoPageEffectsV2"];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TASK-534 switcher runtime", () => {
  it("clicking tab 2 hides panel 1, shows panel 2, moves aria-selected", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = SWITCHER_DOM;
    runRuntime();
    const tabs = [...document.querySelectorAll("[data-switcher-tab]")];
    const panels = [...document.querySelectorAll("[data-switcher-panel]")] as HTMLElement[];

    click(tabs[1]!);
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("false");
    expect(panels[0]!.hidden).toBe(true);
    expect(panels[1]!.hidden).toBe(false);
    expect(panels[1]!.getAttribute("data-active")).toBe("true");
  });

  it("ArrowRight roves selection + tabindex", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = SWITCHER_DOM;
    runRuntime();
    const tabs = [...document.querySelectorAll("[data-switcher-tab]")] as HTMLElement[];

    keydown(tabs[0]!, "ArrowRight");
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs[1]!.tabIndex).toBe(0);
    expect(tabs[0]!.tabIndex).toBe(-1);
    // Wraps at the end back to the first.
    keydown(tabs[1]!, "ArrowRight");
    keydown(tabs[2]!, "ArrowRight");
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
  });

  it("reduced-motion: the toggle STILL works (panels swap) — toggles precede the early-return", () => {
    mockMatchMedia(true, true);
    document.body.innerHTML = SWITCHER_DOM;
    runRuntime();
    const tabs = [...document.querySelectorAll("[data-switcher-tab]")];
    const panels = [...document.querySelectorAll("[data-switcher-panel]")] as HTMLElement[];

    click(tabs[1]!);
    // Regression guard: if a future edit moves the toggles below the reduced-motion
    // branch, reduce users lose tabs and THIS assertion fails.
    expect(panels[1]!.hidden).toBe(false);
    expect(panels[0]!.hidden).toBe(true);
  });
});

describe("TASK-534 gallery filter runtime", () => {
  it("clicking 'eco' hides non-eco items; 'all' restores; token-split match (no substring FP)", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = GALLERY_DOM;
    runRuntime();
    const chips = [...document.querySelectorAll("[data-filter]")];
    const items = [...document.querySelectorAll("[data-filter-item]")] as HTMLElement[];

    click(chips[2]!); // Eco
    expect(items[0]!.classList.contains("is-hidden")).toBe(true); // modern hidden
    expect(items[1]!.classList.contains("is-hidden")).toBe(false); // eco visible
    expect(items[2]!.classList.contains("is-hidden")).toBe(false); // "modern eco" matches eco
    expect(chips[2]!.getAttribute("aria-pressed")).toBe("true");
    expect(chips[0]!.getAttribute("aria-pressed")).toBe("false");

    click(chips[0]!); // All
    expect(items.every((it) => !it.classList.contains("is-hidden"))).toBe(true);
    expect(chips[0]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("ArrowRight/Home/End rove focus + tabindex across the toolbar (no aria-pressed change until click)", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = GALLERY_DOM;
    runRuntime();
    const chips = [...document.querySelectorAll("[data-filter]")] as HTMLElement[];

    keydown(chips[0]!, "ArrowRight");
    expect(chips[1]!.tabIndex).toBe(0);
    expect(chips[0]!.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(chips[1]!);
    // Roving does NOT change selection — it is a toolbar, not a follow-focus tablist.
    expect(chips[1]!.getAttribute("aria-pressed")).toBe("false");
    expect(chips[0]!.getAttribute("aria-pressed")).toBe("true");

    keydown(chips[1]!, "End");
    expect(chips[2]!.tabIndex).toBe(0);
    expect(document.activeElement).toBe(chips[2]!);
    keydown(chips[2]!, "Home");
    expect(chips[0]!.tabIndex).toBe(0);
    expect(document.activeElement).toBe(chips[0]!);
    // ArrowLeft wraps to the last chip.
    keydown(chips[0]!, "ArrowLeft");
    expect(chips[2]!.tabIndex).toBe(0);
  });

  it("multi-category item matches BOTH the 'modern' and 'eco' chips", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = GALLERY_DOM;
    runRuntime();
    const chips = [...document.querySelectorAll("[data-filter]")];
    const items = [...document.querySelectorAll("[data-filter-item]")] as HTMLElement[];

    click(chips[1]!); // Modern
    expect(items[2]!.classList.contains("is-hidden")).toBe(false); // "modern eco" matches modern
    click(chips[2]!); // Eco
    expect(items[2]!.classList.contains("is-hidden")).toBe(false); // and eco.
  });

  it("reduced-motion: filter toggle STILL works (items hide) — precedes the early-return", () => {
    mockMatchMedia(true, true);
    document.body.innerHTML = GALLERY_DOM;
    runRuntime();
    const chips = [...document.querySelectorAll("[data-filter]")];
    const items = [...document.querySelectorAll("[data-filter-item]")] as HTMLElement[];

    click(chips[1]!); // Modern
    expect(items[1]!.classList.contains("is-hidden")).toBe(true); // eco hidden under reduce.
  });
});

describe("TASK-534 magnetic runtime (TASK-539-07 transform ownership)", () => {
  it("pointer:fine + no-reduce: pointermove writes ONLY --cx-magnetic-x/y; leave resets ONLY those to 0px", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = MAGNETIC_DOM;
    const el = document.querySelector("[data-magnetic]") as HTMLElement;
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    runRuntime();

    movePointer(el, 200, 100);
    // Exact custom-property ownership: clamped to ±14px, in px, on the imported
    // magnetic variables ONLY. style.transform is never written.
    expect(el.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX)).toBe("14.0px");
    expect(el.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticY)).toBe("14.0px");
    expect(el.style.transform).toBe("");
    // No other transform variable is touched.
    expect(el.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.tiltX)).toBe("");
    expect(el.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.tiltY)).toBe("");

    leavePointer(el);
    expect(el.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX)).toBe("0.0px");
    expect(el.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticY)).toBe("0.0px");
    expect(el.style.transform).toBe("");
  });

  it("reduced-motion: NO magnetic transform or variables (motion suppressed by the branch)", () => {
    mockMatchMedia(true, true);
    document.body.innerHTML = MAGNETIC_DOM;
    const el = document.querySelector("[data-magnetic]") as HTMLElement;
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    runRuntime();

    movePointer(el, 200, 100);
    expect(el.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX)).toBe("");
    expect(el.style.transform).toBe("");
  });

  it("coarse pointer: NO magnetic transform or variables (pointer:fine gate)", () => {
    mockMatchMedia(false, false);
    document.body.innerHTML = MAGNETIC_DOM;
    const el = document.querySelector("[data-magnetic]") as HTMLElement;
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    runRuntime();

    movePointer(el, 200, 100);
    expect(el.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX)).toBe("");
    expect(el.style.transform).toBe("");
  });
});

// TASK-539-07-L01 — replica rejection + per-element failure isolation.
describe("TASK-534 replica safety + isolation (TASK-539-07-L01)", () => {
  it("switcher/gallery/tilt/magnetic inside a marquee replica stay inert while the primary binds", () => {
    mockMatchMedia(false, true);
    const segment = (replica: boolean) =>
      `<div class="cx-marquee-segment"${replica ? ' data-page-marquee-replica aria-hidden="true"' : ""}>` +
      SWITCHER_DOM +
      GALLERY_DOM +
      '<div data-block-tilt><div class="cx-glare"></div></div>' +
      MAGNETIC_DOM +
      "</div>";
    document.body.innerHTML =
      '<div class="cx-marquee-viewport"><div class="cx-marquee-rail">' +
      segment(false) +
      segment(true) +
      "</div></div>";
    runRuntime();

    // Primary segment: switcher, gallery, tilt and magnetic all bind.
    const pSwitcherTabs = [
      ...document.querySelectorAll(
        ".cx-marquee-segment:not([data-page-marquee-replica]) [data-switcher-tab]"
      ),
    ];
    const pPanels = [
      ...document.querySelectorAll(
        ".cx-marquee-segment:not([data-page-marquee-replica]) [data-switcher-panel]"
      ),
    ] as HTMLElement[];
    click(pSwitcherTabs[1]!);
    expect(pPanels[1]!.hidden).toBe(false);

    const pChips = [
      ...document.querySelectorAll(
        ".cx-marquee-segment:not([data-page-marquee-replica]) [data-gallery-filter] [data-filter]"
      ),
    ];
    click(pChips[2]!); // Eco
    expect(
      (
        document.querySelector(
          ".cx-marquee-segment:not([data-page-marquee-replica]) [data-filter-item]"
        ) as HTMLElement
      ).classList.contains("is-hidden")
    ).toBe(true);

    const pTilt = document.querySelector(
      ".cx-marquee-segment:not([data-page-marquee-replica]) [data-block-tilt]"
    ) as HTMLElement;
    pTilt.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    movePointer(pTilt, 75, 20);
    expect(pTilt.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.tiltX)).not.toBe("");

    const pMag = document.querySelector(
      ".cx-marquee-segment:not([data-page-marquee-replica]) [data-magnetic]"
    ) as HTMLElement;
    pMag.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    movePointer(pMag, 200, 100);
    expect(pMag.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX)).not.toBe("");

    // Replica segment: everything stays inert.
    const rSwitcherTabs = [
      ...document.querySelectorAll("[data-page-marquee-replica] [data-switcher-tab]"),
    ];
    click(rSwitcherTabs[1]!);
    expect(rSwitcherTabs[1]!.getAttribute("aria-selected")).toBe("false");

    const rChips = [
      ...document.querySelectorAll(
        "[data-page-marquee-replica] [data-gallery-filter] [data-filter]"
      ),
    ];
    click(rChips[2]!);
    expect(
      (
        document.querySelector("[data-page-marquee-replica] [data-filter-item]") as HTMLElement
      ).classList.contains("is-hidden")
    ).toBe(false); // untouched

    const rTilt = document.querySelector(
      "[data-page-marquee-replica] [data-block-tilt]"
    ) as HTMLElement;
    rTilt.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    movePointer(rTilt, 75, 20);
    expect(rTilt.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.tiltX)).toBe("");

    const rMag = document.querySelector(
      "[data-page-marquee-replica] [data-magnetic]"
    ) as HTMLElement;
    rMag.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    movePointer(rMag, 200, 100);
    expect(rMag.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX)).toBe("");
  });

  it("an unsafe one-segment marquee (no replica candidate) binds normally", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML =
      '<div class="cx-marquee-viewport"><div class="cx-marquee-rail">' +
      '<div class="cx-marquee-segment">' +
      SWITCHER_DOM +
      "</div>" +
      "</div></div>";
    runRuntime();
    const tabs = [...document.querySelectorAll("[data-switcher-tab]")];
    const panels = [...document.querySelectorAll("[data-switcher-panel]")] as HTMLElement[];

    click(tabs[1]!);
    expect(panels[1]!.hidden).toBe(false);
  });

  it("a failing element binder rolls back partial listeners and does not abort later binders", () => {
    mockMatchMedia(false, true);
    // Two switchers + one magnetic: the first switcher's tab[1] addEventListener
    // throws on the FIRST binding attempt only (click attaches, keydown throws →
    // partial attach). The runtime must roll the partial click listener back,
    // leave the root unmarked, bind the second switcher and the magnetic block,
    // and a later rescan must bind the recovered first switcher cleanly.
    document.body.innerHTML =
      '<div data-switcher data-slot="one">' +
      '<button data-switcher-tab aria-selected="true" tabindex="0">A1</button>' +
      '<button data-switcher-tab aria-selected="false" tabindex="-1">A2</button>' +
      '<div data-switcher-panel data-active="true">P1</div>' +
      '<div data-switcher-panel data-active="false" hidden>P2</div>' +
      "</div>" +
      SWITCHER_DOM +
      MAGNETIC_DOM;

    const firstRoot = document.querySelector('[data-switcher][data-slot="one"]')!;
    // Patch A2 (tabs[1]) so its KEYDOWN attach throws on the FIRST attempt only:
    // the specs attach A1-click, A1-keydown, A2-click (partial) then A2-keydown
    // (throws) → bindOne must roll the A2-click partial listener back and leave
    // the root unmarked, so a retry can never duplicate it.
    const firstTab1 = firstRoot.querySelectorAll("[data-switcher-tab]")[1]!;
    const realFirstTab1 = (
      firstTab1.addEventListener as unknown as (
        t: string,
        f: EventListenerOrEventListenerObject,
        o?: boolean | AddEventListenerOptions
      ) => void
    ).bind(firstTab1);
    let throwOnBind = true;
    let removedPartial = 0;
    (
      firstTab1 as unknown as {
        addEventListener: (
          t: string,
          f: EventListenerOrEventListenerObject,
          o?: boolean | AddEventListenerOptions
        ) => void;
      }
    ).addEventListener = (type, listener, options) => {
      if (type === "keydown" && throwOnBind) {
        throwOnBind = false;
        throw new Error("boom");
      }
      return realFirstTab1(type, listener, options);
    };
    const realFirstTab1Remove = (
      firstTab1.removeEventListener as unknown as (
        t: string,
        f: EventListenerOrEventListenerObject,
        o?: boolean | EventListenerOptions
      ) => void
    ).bind(firstTab1);
    (
      firstTab1 as unknown as {
        removeEventListener: (
          t: string,
          f: EventListenerOrEventListenerObject,
          o?: boolean | EventListenerOptions
        ) => void;
      }
    ).removeEventListener = (type, listener, options) => {
      removedPartial += 1;
      return realFirstTab1Remove(type, listener, options);
    };

    runRuntime();

    // The failing first switcher did NOT abort the others: the second switcher
    // and the magnetic block bound normally.
    const secondTabs = [
      ...document.querySelectorAll('[data-switcher]:not([data-slot="one"]) [data-switcher-tab]'),
    ];
    const secondPanels = [
      ...document.querySelectorAll('[data-switcher]:not([data-slot="one"]) [data-switcher-panel]'),
    ] as HTMLElement[];
    click(secondTabs[1]!);
    expect(secondPanels[1]!.hidden).toBe(false);

    const mag = document.querySelector("[data-magnetic]") as HTMLElement;
    mag.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    movePointer(mag, 200, 100);
    expect(mag.style.getPropertyValue(PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX)).toBe("14.0px");

    // Partial listeners from the failed attempt were rolled back (the click that
    // attached before the keydown threw is removed, so a retry cannot duplicate).
    expect(removedPartial).toBeGreaterThan(0);
    // The first root was left unmarked, so the rescan binds it cleanly with NO
    // duplicate listeners: clicking tab A2 once toggles exactly once.
    runRuntime();
    const firstTabs = [...firstRoot.querySelectorAll("[data-switcher-tab]")];
    const firstPanels = [...firstRoot.querySelectorAll("[data-switcher-panel]")] as HTMLElement[];
    click(firstTabs[1]!);
    expect(firstPanels[1]!.hidden).toBe(false);
    expect(firstTabs[1]!.getAttribute("aria-selected")).toBe("true");
    // And the previously bound second switcher was NOT re-bound (WeakSet skip):
    // clicking tab 0 after the retry toggles exactly once to the expected state.
    click(secondTabs[0]!);
    expect(secondPanels[1]!.hidden).toBe(true);
    expect(secondPanels[0]!.hidden).toBe(false);
  });
});
