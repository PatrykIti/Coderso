import { Window } from "happy-dom";
import { describe, expect, test } from "vitest";

import {
  PAGE_EFFECTS_REDUCED_MOTION_QUERY,
  PAGE_EFFECTS_RUNTIME_ID,
  PAGE_EFFECTS_RUNTIME_INIT_FLAG,
  PAGE_EFFECTS_RUNTIME_SOURCE,
  prefersReducedMotion,
} from "../../../core/services/pages/pageEffectsRuntime";
import {
  PAGE_BLOCK_TRANSFORM_VARIABLES,
  PAGE_MARQUEE_REPLICA_SELECTOR,
} from "../../../core/services/pages/pageCompositionEffects";

// TASK-539-07-L01 — pure string assertions on the STATIC runtime source plus
// happy-dom behavioral execution of the emitted controller. No DOM kernel is
// executed here outside happy-dom (per _docs/TESTING_STRATEGY.md this belongs in
// the Vitest pure-TS lane), so these assertions guard the security + accessibility
// invariants both by inspecting the emitted literal and by running it.

describe("pageEffectsRuntime static source (TASK-539-07-L01)", () => {
  const source = PAGE_EFFECTS_RUNTIME_SOURCE;

  test("id / flag / reduced-motion-query exports are stable", () => {
    expect(PAGE_EFFECTS_RUNTIME_ID).toBe("page-motion-effects");
    expect(PAGE_EFFECTS_RUNTIME_INIT_FLAG).toBe("__codersoPageMotionEffectsInit");
    expect(PAGE_EFFECTS_REDUCED_MOTION_QUERY).toBe("(prefers-reduced-motion: reduce)");
  });

  test("source is a non-empty IIFE string", () => {
    expect(typeof source).toBe("string");
    expect(source.length).toBeGreaterThan(0);
    expect(source.startsWith("(function(){")).toBe(true);
    expect(source.endsWith("})();")).toBe(true);
  });

  test("exposes the exact controller name/shape: window.__codersoPageEffectsV2 with init", () => {
    expect(source).toContain("window.__codersoPageEffectsV2");
    expect(source).toContain("createController");
    expect(source).toContain("typeof state.init!=='function'");
    expect(source).toContain("init(document)");
  });

  test("old flag is written for compatibility but NEVER read or early-returned on", () => {
    // The legacy observation flag literal stays stable in the emitted source…
    expect(source).toContain(`window.${PAGE_EFFECTS_RUNTIME_INIT_FLAG}=true;`);
    // …but the old self-guard (`if(window.__codersoPageMotionEffectsInit)return;`)
    // is GONE: the source must never read the flag.
    expect(source).not.toContain(`if(window.${PAGE_EFFECTS_RUNTIME_INIT_FLAG}`);
    expect(source).not.toContain(`${PAGE_EFFECTS_RUNTIME_INIT_FLAG})return`);
    // Every emitted main/footer copy calls init(document) unconditionally.
    expect(source).toContain("state.init(document);");
  });

  test("controller owns one WeakSet per binder and no strong element collections", () => {
    const weakSets = source.match(/new WeakSet\(\)/g) ?? [];
    expect(weakSets.length).toBe(7);
    // No global strong collections: no MutationObserver, no retained element
    // arrays (the legacy `var px=[].slice.call(document.querySelectorAll(...))`
    // parallax array is gone; the frame re-queries the document each tick).
    expect(source).not.toContain("MutationObserver");
    expect(source).not.toContain("var px=[].slice.call(document.querySelectorAll");
    expect(source).not.toContain("[].slice.call(document.querySelectorAll");
  });

  test("init order is switcher/gallery toggles, reduced-motion branch, then motion binders", () => {
    expect(source).toContain("if(RM&&RM.matches)return;");
    const initBlock = source.slice(
      source.indexOf("function init(root){"),
      source.indexOf("return {init:init};")
    );
    const order = [
      "bindSwitcher(root)",
      "bindGallery(root)",
      "if(RM&&RM.matches)return;",
      "bindReveal(root)",
      "bindParallax(root)",
      "bindSpotlight(root)",
      "bindTilt(root)",
      "bindMagnetic(root)",
    ];
    let last = -1;
    for (const marker of order) {
      const at = initBlock.indexOf(marker);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
  });

  test("serializes the marquee replica selector/attribute from the owner (no respelling)", () => {
    expect(source).toContain(`var REPLICA_SEL=${JSON.stringify(PAGE_MARQUEE_REPLICA_SELECTOR)};`);
    expect(source).toContain("closest(REPLICA_SEL)");
    expect(source).toContain("function isReplica(el){");
  });

  test("tilt/magnetic write ONLY the imported transform custom properties", () => {
    // The emitted TV literal is exactly the four transform variables this runtime
    // may write (single source of truth: PAGE_BLOCK_TRANSFORM_VARIABLES).
    const expectedTv = JSON.stringify({
      tiltX: PAGE_BLOCK_TRANSFORM_VARIABLES.tiltX,
      tiltY: PAGE_BLOCK_TRANSFORM_VARIABLES.tiltY,
      magneticX: PAGE_BLOCK_TRANSFORM_VARIABLES.magneticX,
      magneticY: PAGE_BLOCK_TRANSFORM_VARIABLES.magneticY,
    });
    expect(source).toContain(`var TV=${expectedTv};`);
    for (const own of ["--cx-tilt-x", "--cx-tilt-y", "--cx-magnetic-x", "--cx-magnetic-y"]) {
      expect(source).toContain(own);
    }
    // No other transform variable may be written by the runtime.
    for (const foreign of [
      "--cx-reveal-y",
      "--cx-decoration-x",
      "--cx-decoration-y",
      "--cx-decoration-rotate",
      "--cx-decoration-scale",
      "--cx-hover-y",
      "--cx-hover-scale",
    ]) {
      expect(source).not.toContain(foreign);
    }
  });

  test("tilt/magnetic/spotlight never write style.transform or clear it", () => {
    expect(source).not.toContain("el.style.transform");
    expect(source).not.toContain("style.transform='rotateX");
    expect(source).not.toContain('style.transform="rotateX');
    expect(source).not.toContain('style.transform="translate');
    expect(source).not.toContain("setProperty('transform'");
    expect(source).not.toContain('setProperty("transform"');
    expect(source).not.toContain("removeProperty('transform'");
    expect(source).not.toContain('removeProperty("transform"');
    // The only transform write left is parallax's separate [data-parallax-inner]
    // channel (on `inner`, never on the tilt/magnetic host `el`), guarded against
    // transform hosts.
    expect(source).toContain("inner.style.transform=");
    expect(source).toContain("inner.getAttribute&&inner.getAttribute(HOST_ATTR)!=null");
    expect(source).toContain("[data-parallax-inner]");
  });

  test("glare writes stay on .cx-glare only", () => {
    expect(source).toContain("gl.style.setProperty('--glare-x'");
    expect(source).toContain("gl.style.setProperty('--glare-y'");
    expect(source).not.toContain("el.style.setProperty('--glare");
  });

  test("spotlight binds only the root hook with --spotlight-x/y and no leave/reset", () => {
    expect(source).toContain("collect(root,SEL_SPOTLIGHT)");
    expect(source).toContain("sp.style.setProperty('--spotlight-x'");
    expect(source).toContain("sp.style.setProperty('--spotlight-y'");
    // No pointerleave reset for spotlight, no overlay-node binding.
    expect(source).not.toContain("sp.addEventListener('pointerleave'");
    expect(source).not.toContain("data-page-spotlight-overlay");
    // Viewport coords: raw clientX/clientY (feeds a position:fixed overlay).
    expect(source).toContain("sx=Math.round(ev.clientX);sy=Math.round(ev.clientY);");
    expect(source).not.toContain("ev.clientX-r.left");
  });

  test("fine-pointer gating stays local to spotlight/tilt/magnetic", () => {
    const gates = source.match(/matchMedia\('\(pointer:fine\)'\)/g) ?? [];
    expect(gates.length).toBe(3);
    const switcherIdx = source.indexOf("bindSwitcher(root)");
    expect(gates.every((g) => source.indexOf(g) === -1 || source.indexOf(g) > switcherIdx)).toBe(
      true
    );
  });

  test("reveal fallback reveals directly when IntersectionObserver is unusable", () => {
    expect(source).toContain("el.setAttribute('data-revealed','true');");
    expect(source).toContain("new window.IntersectionObserver");
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

  test("uses passive listeners + rAF + try/catch page guard", () => {
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

// ── behavioral harness: run the emitted IIFE against a fresh happy-dom Window
// with stubbed matchMedia / rAF / IntersectionObserver (never shipped). ──
type RuntimeOpts = { reduce?: boolean; fine?: boolean };
const runRuntime = (html: string, opts: RuntimeOpts = {}) => {
  const win = new Window();
  const doc = win.document;
  doc.body.innerHTML = html;
  (win as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (q: string) => ({
    matches: q.includes("(prefers-reduced-motion: reduce)")
      ? opts.reduce === true
      : q.includes("(pointer:fine)")
        ? opts.fine !== false
        : false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
  (win as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
    (cb: () => void) => {
      cb();
      return 0;
    };
  (win as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function("window", "document", PAGE_EFFECTS_RUNTIME_SOURCE);
  fn(win, doc);
  return { win, doc, fn };
};

type DispatchTarget = { dispatchEvent: (event: unknown) => boolean };
const click = (el: unknown, win: Window) =>
  (el as DispatchTarget).dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
const move = (el: unknown, win: Window, clientX: number, clientY: number) =>
  (el as DispatchTarget).dispatchEvent(
    new win.MouseEvent("pointermove", { clientX, clientY, bubbles: true })
  );
const leave = (el: unknown, win: Window) =>
  (el as DispatchTarget).dispatchEvent(new win.MouseEvent("pointerleave", { bubbles: true }));

const SWITCHER = (label: string) =>
  "<div data-switcher>" +
  `<button data-switcher-tab aria-selected="true" tabindex="0">${label}A</button>` +
  `<button data-switcher-tab aria-selected="false" tabindex="-1">${label}B</button>` +
  `<div data-switcher-panel data-active="true">${label}PA</div>` +
  `<div data-switcher-panel data-active="false" hidden>${label}PB</div>` +
  "</div>";

describe("pageEffectsRuntime controller (TASK-539-07-L01)", () => {
  test("a second script copy reuses the SAME controller and binds no new window listeners", () => {
    const { win, doc, fn } = runRuntime(
      '<div data-page-effect="parallax" data-parallax="20"><div data-parallax-inner></div></div>'
    );
    const controller1 = (win as unknown as { __codersoPageEffectsV2: unknown })
      .__codersoPageEffectsV2;
    expect(typeof controller1).toBe("object");
    expect(typeof (controller1 as { init: unknown }).init).toBe("function");

    // The observation flag is set for compatibility observers.
    expect((win as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG]).toBe(true);

    const seen: string[] = [];
    const real = win.addEventListener.bind(win);
    (
      win as unknown as { addEventListener: (t: string, ...r: unknown[]) => void }
    ).addEventListener = (type: string, ...rest: unknown[]) => {
      seen.push(type);
      return (real as (t: string, ...r: unknown[]) => void)(type, ...rest);
    };

    fn(win, doc);

    // Same controller object; the global scroll/resize listener was installed
    // once and is NOT re-installed by the second copy.
    expect((win as unknown as { __codersoPageEffectsV2: unknown }).__codersoPageEffectsV2).toBe(
      controller1
    );
    expect(seen).toEqual([]);
    expect(doc.querySelector("[data-parallax-inner]")!.getAttribute("style")).toContain(
      "translate3d"
    );
  });

  test("parser-order rescan binds footer nodes exactly once and never re-binds main", () => {
    const win = new Window();
    const doc = win.document;
    doc.body.innerHTML = SWITCHER("main-");
    (win as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    });
    (
      win as unknown as { requestAnimationFrame: (cb: () => void) => number }
    ).requestAnimationFrame = (cb: () => void) => {
      cb();
      return 0;
    };
    (win as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    // eslint-disable-next-line no-new-func
    const fn = new Function("window", "document", PAGE_EFFECTS_RUNTIME_SOURCE);
    fn(win, doc); // main document copy

    // Footer nodes appear after the main script ran (parser order). Append
    // WITHOUT re-parsing the existing main DOM (innerHTML += would replace the
    // main nodes, which never happens in production parser-order execution).
    doc.body.insertAdjacentHTML("beforeend", "<footer>" + SWITCHER("footer-") + "</footer>");

    const countBindings = (root: Element) => {
      const tab = root.querySelector("[data-switcher-tab]")!;
      const real = tab.addEventListener.bind(tab);
      let n = 0;
      (
        tab as unknown as {
          addEventListener: (
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions
          ) => void;
        }
      ).addEventListener = (type, listener, options) => {
        n += 1;
        return real(type, listener, options);
      };
      return () => n;
    };
    const mainTabCount = countBindings(doc.querySelector("body > div") as unknown as Element);
    const footerTabCount = countBindings(doc.querySelector("footer") as unknown as Element);

    fn(win, doc); // footer document copy

    // Main tab was already bound (WeakSet skip): zero new listeners. Footer tab
    // gets exactly click + keydown once.
    expect(mainTabCount()).toBe(0);
    expect(footerTabCount()).toBe(2);

    const footerTabs = [...doc.querySelectorAll("footer [data-switcher-tab]")];
    const footerPanels = [
      ...doc.querySelectorAll("footer [data-switcher-panel]"),
    ] as unknown as HTMLElement[];
    click(footerTabs[1]!, win);
    expect(footerPanels[1]!.hidden).toBe(false);
    expect(footerPanels[0]!.hidden).toBe(true);
  });

  test("reduced-motion: toggles stay functional, motion binders never run", () => {
    const html =
      SWITCHER("t-") +
      '<div data-gallery data-gallery-filter><button data-filter="all" aria-pressed="true" tabindex="0">All</button><button data-filter="eco" aria-pressed="false" tabindex="-1">Eco</button><figure data-filter-item data-category="modern">M</figure><figure data-filter-item data-category="eco">E</figure></div>' +
      '<main data-page-motion><section data-page-effect="reveal-up"></section></main>' +
      '<div data-block-tilt><div class="cx-glare"></div></div>' +
      '<a data-magnetic href="#">Go</a>' +
      "<div data-page-spotlight></div>";
    const { win, doc } = runRuntime(html, { reduce: true });

    // Toggles work under reduce.
    const tabs = [...doc.querySelectorAll("[data-switcher-tab]")];
    click(tabs[1]!, win);
    expect(
      (doc.querySelectorAll("[data-switcher-panel]")[1] as unknown as HTMLElement).hidden
    ).toBe(false);

    const chips = [...doc.querySelectorAll("[data-gallery-filter] [data-filter]")];
    click(chips[1]!, win);
    expect(
      (doc.querySelector("[data-filter-item]") as unknown as HTMLElement).classList.contains(
        "is-hidden"
      )
    ).toBe(true);

    // Motion never armed / bound: no reveal arm, no tilt/magnetic/spotlight writes.
    expect(doc.querySelector("[data-page-motion]")!.hasAttribute("data-reveal-armed")).toBe(false);
    const tilt = doc.querySelector("[data-block-tilt]")!;
    tilt.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as unknown as ReturnType<
        typeof tilt.getBoundingClientRect
      >;
    move(tilt, win, 75, 20);
    expect((tilt as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).toBe("");
    const mag = doc.querySelector("[data-magnetic]")!;
    mag.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 40 }) as unknown as ReturnType<
        typeof mag.getBoundingClientRect
      >;
    move(mag, win, 200, 100);
    expect((mag as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe("");
    const sp = doc.querySelector("[data-page-spotlight]")!;
    move(sp, win, 120, 80);
    expect((sp as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe("");
  });

  test("missing APIs (no IntersectionObserver, no matchMedia, no rAF) complete without exception", () => {
    const win = new Window();
    const doc = win.document;
    doc.body.innerHTML =
      "<main data-page-motion>" +
      '<section data-page-effect="reveal-up"></section>' +
      '<section data-page-effect="parallax" data-parallax="20"><div data-parallax-inner></div></section>' +
      "</main>" +
      "<div data-block-tilt></div>" +
      '<a data-magnetic href="#">Go</a>';
    // IntersectionObserver exists as a key but cannot be constructed, matchMedia
    // and requestAnimationFrame are absent entirely.
    (win as unknown as { IntersectionObserver: unknown }).IntersectionObserver = undefined;
    (win as unknown as { matchMedia: unknown }).matchMedia = undefined;
    (win as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = undefined;

    // eslint-disable-next-line no-new-func
    const fn = new Function("window", "document", PAGE_EFFECTS_RUNTIME_SOURCE);
    expect(() => fn(win, doc)).not.toThrow();
    // Fail-soft reveal: the section is shown directly (never hidden).
    expect(doc.querySelector('[data-page-effect="reveal-up"]')!.getAttribute("data-revealed")).toBe(
      "true"
    );
    // Parallax still frames synchronously through the raf fallback.
    expect(
      (doc.querySelector("[data-parallax-inner]") as unknown as HTMLElement).style.transform
    ).toContain("translate3d");
  });

  test("every binder rejects replica-self and replica-descendant candidates while the primary binds", () => {
    const marquee = (segment: string, replica: boolean) =>
      `<div class="cx-marquee-segment"${replica ? ' data-page-marquee-replica aria-hidden="true"' : ""}>` +
      segment +
      "</div>";
    const primarySegment = marquee(
      SWITCHER("p-") +
        '<div data-block-tilt><div class="cx-glare"></div></div>' +
        '<div data-gallery data-gallery-filter><button data-filter="all" aria-pressed="true" tabindex="0">All</button><button data-filter="eco" aria-pressed="false" tabindex="-1">Eco</button><figure data-filter-item data-category="eco">E</figure></div>',
      false
    );
    const replicaSegment = marquee(
      SWITCHER("r-") +
        '<div data-block-tilt><div class="cx-glare"></div></div>' +
        '<div data-gallery data-gallery-filter><button data-filter="all" aria-pressed="true" tabindex="0">All</button><button data-filter="eco" aria-pressed="false" tabindex="-1">Eco</button><figure data-filter-item data-category="eco">E</figure></div>',
      true
    );
    const { win, doc } = runRuntime(
      '<div class="cx-marquee-viewport"><div class="cx-marquee-rail">' +
        primarySegment +
        replicaSegment +
        "</div></div>"
    );

    // Primary segment binds: switcher, gallery, tilt.
    const pTabs = [
      ...doc.querySelectorAll(
        ".cx-marquee-segment:not([data-page-marquee-replica]) [data-switcher-tab]"
      ),
    ];
    const pPanels = [
      ...doc.querySelectorAll(
        ".cx-marquee-segment:not([data-page-marquee-replica]) [data-switcher-panel]"
      ),
    ] as unknown as HTMLElement[];
    click(pTabs[1]!, win);
    expect(pPanels[1]!.hidden).toBe(false);

    const pTilt = doc.querySelector(
      ".cx-marquee-segment:not([data-page-marquee-replica]) [data-block-tilt]"
    )!;
    pTilt.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as unknown as ReturnType<
        typeof pTilt.getBoundingClientRect
      >;
    move(pTilt, win, 75, 20);
    expect((pTilt as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).not.toBe("");

    const pChips = [
      ...doc.querySelectorAll(
        ".cx-marquee-segment:not([data-page-marquee-replica]) [data-gallery-filter] [data-filter]"
      ),
    ];
    click(pChips[1]!, win);
    expect(
      (
        doc.querySelector(
          ".cx-marquee-segment:not([data-page-marquee-replica]) [data-filter-item]"
        ) as unknown as HTMLElement
      ).classList.contains("is-hidden")
    ).toBe(false);

    // Replica segment stays inert: no switcher toggle, no tilt vars, no gallery.
    const rTabs = [...doc.querySelectorAll("[data-page-marquee-replica] [data-switcher-tab]")];
    const rPanels = [
      ...doc.querySelectorAll("[data-page-marquee-replica] [data-switcher-panel]"),
    ] as unknown as HTMLElement[];
    click(rTabs[1]!, win);
    expect(rPanels[1]!.hidden).toBe(true); // untouched
    expect(rTabs[1]!.getAttribute("aria-selected")).toBe("false");

    const rTilt = doc.querySelector("[data-page-marquee-replica] [data-block-tilt]")!;
    rTilt.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as unknown as ReturnType<
        typeof rTilt.getBoundingClientRect
      >;
    move(rTilt, win, 75, 20);
    expect((rTilt as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).toBe("");

    const rChips = [
      ...doc.querySelectorAll("[data-page-marquee-replica] [data-gallery-filter] [data-filter]"),
    ];
    click(rChips[1]!, win);
    expect(
      (
        doc.querySelector(
          "[data-page-marquee-replica] [data-filter-item]"
        ) as unknown as HTMLElement
      ).classList.contains("is-hidden")
    ).toBe(false); // untouched
  });

  test("an unsafe one-segment marquee (no replica candidate) binds normally", () => {
    const { win, doc } = runRuntime(
      '<div class="cx-marquee-viewport"><div class="cx-marquee-rail"><div class="cx-marquee-segment">' +
        SWITCHER("s-") +
        "</div></div></div>"
    );
    const tabs = [...doc.querySelectorAll("[data-switcher-tab]")];
    const panels = [...doc.querySelectorAll("[data-switcher-panel]")] as unknown as HTMLElement[];
    click(tabs[1]!, win);
    expect(panels[1]!.hidden).toBe(false);
  });
});

// TASK-522-01-L05 / TASK-539-04 — generalized block tilt ([data-block-tilt]).
// The runtime writes ONLY the imported tilt custom properties (degrees); leave
// resets ONLY those to 0deg. Never writes style.transform or another effect's var.
describe("pageEffectsRuntime block tilt (TASK-522-01-L05 / TASK-539-04)", () => {
  const source = PAGE_EFFECTS_RUNTIME_SOURCE;

  test("source binds [data-block-tilt] with its OWN pointer:fine gate", () => {
    expect(source).toContain("collect(root,SEL_TILT)");
    expect(source).toContain("TV.tiltX");
    expect(source).toContain("TV.tiltY");
  });

  test("the reduced-motion branch still gates the tilt binding", () => {
    expect(source).toContain("if(RM&&RM.matches)return;");
    const initBlock = source.slice(
      source.indexOf("function init(root){"),
      source.indexOf("return {init:init};")
    );
    expect(initBlock.indexOf("bindTilt(root)")).toBeGreaterThan(
      initBlock.indexOf("if(RM&&RM.matches)return;")
    );
  });

  const runTilt = (opts: { pointerFine: boolean; reduce?: boolean; html?: string }) => {
    const win = new Window();
    const doc = win.document;
    doc.body.innerHTML =
      opts.html ?? '<div id="card" data-block-tilt="subtle"><div class="cx-glare"></div></div>';
    const card = doc.querySelector("[data-block-tilt]")! as unknown as HTMLElement;
    card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    (win as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (q: string) => ({
      matches: q.includes("(prefers-reduced-motion: reduce)")
        ? opts.reduce === true
        : q.includes("(pointer:fine)")
          ? opts.pointerFine
          : false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    });
    (
      win as unknown as { requestAnimationFrame: (cb: () => void) => number }
    ).requestAnimationFrame = (cb: () => void) => {
      cb();
      return 0;
    };
    (win as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    // eslint-disable-next-line no-new-func
    const fn = new Function("window", "document", PAGE_EFFECTS_RUNTIME_SOURCE);
    fn(win, doc);
    return { win, doc, card };
  };

  test("pointer:fine → pointermove writes ONLY --cx-tilt-x/--cx-tilt-y (deg) + glare vars", () => {
    const { win, doc, card } = runTilt({ pointerFine: true });
    move(card, win, 75, 20);

    expect(card.style.getPropertyValue("--cx-tilt-x")).toBe("2.10deg");
    expect(card.style.getPropertyValue("--cx-tilt-y")).toBe("1.75deg");
    // Never writes transform or another effect's variable.
    expect(card.style.transform).toBe("");
    expect(card.style.getPropertyValue("--cx-magnetic-x")).toBe("");
    expect(card.style.getPropertyValue("--cx-magnetic-y")).toBe("");
    // Glare vars live on .cx-glare only.
    const glare = doc.querySelector(".cx-glare") as unknown as HTMLElement;
    expect(glare.style.getPropertyValue("--glare-x")).toBe("75.0%");
    expect(glare.style.getPropertyValue("--glare-y")).toBe("20.0%");
  });

  test("pointerleave resets ONLY the tilt vars to 0deg (glare vars untouched, no transform)", () => {
    const { win, doc, card } = runTilt({ pointerFine: true });
    move(card, win, 75, 20);
    const glare = doc.querySelector(".cx-glare") as unknown as HTMLElement;
    const glareXAfterMove = glare.style.getPropertyValue("--glare-x");

    leave(card, win);

    expect(card.style.getPropertyValue("--cx-tilt-x")).toBe("0deg");
    expect(card.style.getPropertyValue("--cx-tilt-y")).toBe("0deg");
    expect(card.style.transform).toBe("");
    expect(card.style.getPropertyValue("--cx-magnetic-x")).toBe("");
    // Leave resets ONLY the tilt vars: glare keeps its own values.
    expect(glare.style.getPropertyValue("--glare-x")).toBe(glareXAfterMove);
  });

  test("coarse pointer (pointer:fine=false) → no listener/transform/custom-property attached", () => {
    const { win, card } = runTilt({ pointerFine: false });
    move(card, win, 75, 20);
    expect(card.style.getPropertyValue("--cx-tilt-x")).toBe("");
    expect(card.style.transform).toBe("");
  });

  test("reduced motion → no tilt binding", () => {
    const { win, card } = runTilt({ pointerFine: true, reduce: true });
    move(card, win, 75, 20);
    expect(card.style.getPropertyValue("--cx-tilt-x")).toBe("");
  });

  test("tilts even on a page WITHOUT a spotlight element (not dead-without-spotlight)", () => {
    const { win, card } = runTilt({
      pointerFine: true,
      html: '<div data-block-tilt><div class="cx-glare"></div></div>',
    });
    move(card, win, 60, 40);
    expect(card.style.getPropertyValue("--cx-tilt-x")).toMatch(/-?\d+\.\d+deg$/);
  });
});
