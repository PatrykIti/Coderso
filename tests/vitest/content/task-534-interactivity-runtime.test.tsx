// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_EFFECTS_RUNTIME_INIT_FLAG,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";

/**
 * TASK-534-05-L01 — behavioral smoke of the declarative-interactivity runtime
 * clauses (switcher toggle, gallery filter, magnetic pointer-attract) appended to
 * the ONE runtime IIFE. Executes the STATIC source via `new Function()` in happy-dom
 * against the data-attribute contract the renderer (534-02) stamps, then simulates
 * real events. Asserts the SPLIT placement: switcher + filter TOGGLES work even under
 * `prefers-reduced-motion: reduce` (they precede the early-return), while the magnetic
 * MOTION clause is suppressed for reduce / coarse pointer (it follows the return).
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
  // TASK-535 idempotence flag is a plain window property vi.unstubAllGlobals does not
  // clear; reset it so each runRuntime() re-binds a clean runtime (shared happy-dom).
  delete (window as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG];
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
    // whole-IIFE early-return, reduce users lose tabs and THIS assertion fails.
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

describe("TASK-534 magnetic runtime", () => {
  it("pointer:fine + no-reduce: pointermove sets a clamped translate transform; leave resets", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = MAGNETIC_DOM;
    const el = document.querySelector("[data-magnetic]") as HTMLElement;
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    runRuntime();

    movePointer(el, 200, 100);
    expect(el.style.transform).toContain("translate(");
    // Clamped to ±14px.
    const match = /translate\(([-\d.]+)px,([-\d.]+)px\)/.exec(el.style.transform);
    expect(match).toBeTruthy();
    expect(Math.abs(Number(match![1]))).toBeLessThanOrEqual(14);
    expect(Math.abs(Number(match![2]))).toBeLessThanOrEqual(14);

    leavePointer(el);
    expect(el.style.transform).toBe("translate(0.0px,0.0px)");
  });

  it("reduced-motion: NO magnetic transform (motion suppressed by the early-return)", () => {
    mockMatchMedia(true, true);
    document.body.innerHTML = MAGNETIC_DOM;
    const el = document.querySelector("[data-magnetic]") as HTMLElement;
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    runRuntime();

    movePointer(el, 200, 100);
    expect(el.style.transform).toBe("");
  });

  it("coarse pointer: NO magnetic transform (pointer:fine gate)", () => {
    mockMatchMedia(false, false);
    document.body.innerHTML = MAGNETIC_DOM;
    const el = document.querySelector("[data-magnetic]") as HTMLElement;
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect;
    runRuntime();

    movePointer(el, 200, 100);
    expect(el.style.transform).toBe("");
  });
});
