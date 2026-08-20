// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_EFFECTS_RUNTIME_INIT_FLAG,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";

/**
 * TASK-521-05-L04 / TASK-539-07-L01 — behavioral smoke of the per-page
 * cursor-spotlight runtime (owned by 521-01, emitted at the page root by
 * 521-05). The runtime is a STATIC IIFE string executed via `new Function()` in
 * happy-dom against the DOM contract 521-05 stamps: the `[data-page-spotlight]`
 * root marker + the `--spotlight-x/y` CSS custom properties updated on
 * `pointermove`. Guards: `prefers-reduced-motion: reduce` and a coarse pointer
 * disable it entirely. TASK-539-07: the controller lives on
 * `window.__codersoPageEffectsV2`, so BOTH the controller and the legacy
 * observation flag are reset between tests; spotlight binds only the exact
 * `[data-page-spotlight]` root and the overlay merely inherits the values.
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
  // TASK-539-07: the shared controller and its per-binder WeakSets would survive
  // across tests in the shared happy-dom window, and the legacy observation flag
  // is written by every copy. Reset BOTH so each runRuntime() re-binds a clean
  // runtime. The production controller is unchanged; this only resets the shared
  // test window.
  delete (window as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG];
  delete (window as unknown as Record<string, unknown>)["__codersoPageEffectsV2"];
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

// TASK-539-07-L01 — spotlight binds ONLY the exact [data-page-spotlight] root,
// with main/footer root-local updates and no overlay-node binding. The overlay
// ([data-page-spotlight-overlay]) merely inherits the values; the runtime never
// queries or binds it, and adds no pointer-leave/reset behavior.
describe("cursor-spotlight root contract (TASK-539-07-L01)", () => {
  it("two spotlight roots (main + footer) each update their OWN vars; the overlay node is never bound", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML =
      '<main data-page-spotlight data-motion-root="main">' +
      '<div data-page-spotlight-overlay aria-hidden="true"></div>' +
      "<p>main</p></main>" +
      '<footer data-page-spotlight data-motion-root="footer">' +
      '<div data-page-spotlight-overlay aria-hidden="true"></div>' +
      "<p>footer</p></footer>";
    const mainRoot = document.querySelector('[data-motion-root="main"]') as HTMLElement;
    const footerRoot = document.querySelector('[data-motion-root="footer"]') as HTMLElement;
    const mainOverlay = mainRoot.querySelector("[data-page-spotlight-overlay]") as HTMLElement;
    const footerOverlay = footerRoot.querySelector("[data-page-spotlight-overlay]") as HTMLElement;

    runRuntime();

    movePointer(mainRoot, 120, 80);
    expect(mainRoot.style.getPropertyValue("--spotlight-x")).toBe("120px");
    expect(mainRoot.style.getPropertyValue("--spotlight-y")).toBe("80px");
    // Footer root is untouched by the main-root move (root-local writes).
    expect(footerRoot.style.getPropertyValue("--spotlight-x")).toBe("");

    movePointer(footerRoot, 640, 500);
    expect(footerRoot.style.getPropertyValue("--spotlight-x")).toBe("640px");
    expect(footerRoot.style.getPropertyValue("--spotlight-y")).toBe("500px");
    expect(mainRoot.style.getPropertyValue("--spotlight-x")).toBe("120px");

    // The overlays only inherit — the runtime never writes vars on them.
    expect(mainOverlay.style.getPropertyValue("--spotlight-x")).toBe("");
    expect(footerOverlay.style.getPropertyValue("--spotlight-x")).toBe("");
  });

  it("a spotlight root inside a marquee replica is never bound; the primary root still tracks", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML =
      "<main data-page-spotlight data-primary='true'><p>primary</p></main>" +
      '<div class="cx-marquee-viewport"><div class="cx-marquee-rail">' +
      '<div class="cx-marquee-segment" data-page-marquee-replica aria-hidden="true">' +
      '<div data-page-spotlight data-replica="true"><p>clone</p></div>' +
      "</div>" +
      "</div></div>";
    const primary = document.querySelector('[data-primary="true"]') as HTMLElement;
    const replica = document.querySelector('[data-replica="true"]') as HTMLElement;

    runRuntime();

    movePointer(primary, 120, 80);
    expect(primary.style.getPropertyValue("--spotlight-x")).toBe("120px");

    movePointer(replica, 640, 500);
    // The replica spotlight never became interactive (no listener attached).
    expect(replica.style.getPropertyValue("--spotlight-x")).toBe("");
    expect(replica.style.getPropertyValue("--spotlight-y")).toBe("");
  });

  it("repeated scans never double-bind a spotlight root (WeakSet skip)", () => {
    mockMatchMedia(false, true);
    document.body.innerHTML = "<main data-page-spotlight><p>content</p></main>";
    const sp = document.querySelector("[data-page-spotlight]") as HTMLElement;
    sp.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;

    runRuntime();
    runRuntime(); // second copy (footer) rescans the same window

    movePointer(sp, 100, 60);
    // Exactly one rAF frame per move: the value is written once and correctly.
    expect(sp.style.getPropertyValue("--spotlight-x")).toBe("100px");
    expect(sp.style.getPropertyValue("--spotlight-y")).toBe("60px");
  });
});
