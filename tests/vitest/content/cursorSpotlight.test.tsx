// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PAGE_EFFECTS_RUNTIME_SOURCE } from "../../../core/services/pages/pageEffectsRuntime";

/**
 * TASK-521-05-L04 — behavioral smoke of the per-page cursor-spotlight runtime
 * (owned by 521-01, emitted at the page root by 521-05). The runtime is a STATIC
 * IIFE string executed via `new Function()` in happy-dom against the DOM contract
 * 521-05 stamps: the `[data-page-spotlight]` root marker + the
 * `--spotlight-x/y` CSS custom properties updated on `pointermove`. Guards:
 * `prefers-reduced-motion: reduce` and a coarse pointer disable it entirely.
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

const movePointer = (el: Element, clientX: number, clientY: number) => {
  el.dispatchEvent(new MouseEvent("pointermove", { clientX, clientY, bubbles: true }));
};

beforeEach(() => {
  document.body.innerHTML = "";
  // Run rAF callbacks synchronously so sFrame() executes deterministically.
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

describe("cursor-spotlight runtime (TASK-521-05)", () => {
  it("pointermove updates --spotlight-x/y (pointer:fine)", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = "<main data-page-motion data-page-spotlight><p>content</p></main>";
    const sp = document.querySelector("[data-page-spotlight]") as HTMLElement;
    sp.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;

    runRuntime();
    movePointer(sp, 120, 80);

    expect(sp.style.getPropertyValue("--spotlight-x")).toBe("120px");
    expect(sp.style.getPropertyValue("--spotlight-y")).toBe("80px");
  });

  it("TASK-529 — spotlight vars are VIEWPORT coords under non-zero scroll (glow does not fall below the fold)", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = "<main data-page-motion data-page-spotlight><p>content</p></main>";
    const sp = document.querySelector("[data-page-spotlight]") as HTMLElement;
    // Simulate the page scrolled 577px: `sp` is the ROOT (full page height), so
    // after scroll its rect top is negative (-scrollY). The overlay it feeds is
    // position:fixed inset:0, so the vars MUST stay viewport-relative (== client),
    // NOT client+scrollY (which painted the gradient below the visible viewport).
    sp.getBoundingClientRect = () => ({ left: 0, top: -577 }) as DOMRect;

    runRuntime();
    movePointer(sp, 640, 500);

    // Viewport coords: exactly clientX/clientY, ignoring the negative root rect.
    expect(sp.style.getPropertyValue("--spotlight-x")).toBe("640px");
    expect(sp.style.getPropertyValue("--spotlight-y")).toBe("500px");
    // Regression guard: NOT the pre-fix page coordinate (clientY - (-scrollY)).
    expect(sp.style.getPropertyValue("--spotlight-y")).not.toBe("1077px");
  });

  it("reduce ⇒ runtime no-ops (no spotlight vars set)", () => {
    mockMatchMedia(true, true);
    document.body.innerHTML = "<main data-page-motion data-page-spotlight><p>content</p></main>";
    const sp = document.querySelector("[data-page-spotlight]") as HTMLElement;
    sp.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;

    runRuntime();
    movePointer(sp, 120, 80);

    expect(sp.style.getPropertyValue("--spotlight-x")).toBe("");
  });

  it("coarse pointer ⇒ no spotlight tracking", () => {
    mockMatchMedia(false, false);
    document.body.innerHTML = "<main data-page-motion data-page-spotlight><p>content</p></main>";
    const sp = document.querySelector("[data-page-spotlight]") as HTMLElement;
    sp.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;

    runRuntime();
    movePointer(sp, 120, 80);

    expect(sp.style.getPropertyValue("--spotlight-x")).toBe("");
  });
});
