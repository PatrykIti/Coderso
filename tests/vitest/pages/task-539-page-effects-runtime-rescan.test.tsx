// TASK-539-07-L02 — per-root idempotence proof for the shared page-effects
// controller (TASK-539-07-L01's pageEffectsRuntime). Additive suite; L01 source
// and suites stay read-only. Proves parser-order rescan in both directions,
// observation-only flag semantics, repeated-run cardinality, per-binder
// WeakSets, failure isolation + retry, reduced-motion neutrality, transform
// custom-property ownership, replica-safe marquee pre-bind rejection, unsafe
// one-segment fallbacks, and zero console errors. Executes the static runtime
// via the L01 happy-dom harness (new Function("window","document",…)); no
// DOM/runtime kernel executes here.
// Contract: _docs/_TASKS/TASK-539-07-L02-Prove-Main-And-Footer-Idempotence.md
import { Window } from "happy-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  PAGE_EFFECTS_RUNTIME_INIT_FLAG,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";
import { PAGE_MARQUEE_REPLICA_ATTRIBUTE } from "../../../core/services/pages/pageCompositionEffects";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
  type PageSectionStyleV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { PageDocumentRender, PageSectionRender } from "../../../core/services/pages/pageRendererV2";
import { createEffectsDocument, countMarkup } from "./pageRendererV2TestFixtures";

// ── harness: L01-proven happy-dom execution pattern ──────────────────────────
type MediaOpts = { reduce?: boolean; fine?: boolean };
type IoInstance = {
  observed: unknown[];
  unobServed: unknown[];
  fire: (t: unknown, intersecting: boolean) => void;
};

const installMedia = (win: Window, opts: MediaOpts) => {
  (win as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (q: string) => {
    const reduce = q.includes("(prefers-reduced-motion: reduce)");
    const fine = q.includes("(pointer:fine)");
    return {
      matches: reduce ? opts.reduce === true : fine ? opts.fine !== false : false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    };
  };
  (win as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
    (cb: () => void) => {
      cb();
      return 0;
    };
};

const installIo = (win: Window): IoInstance[] => {
  const instances: IoInstance[] = [];
  (win as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observed: unknown[] = [];
    unobServed: unknown[] = [];
    constructor(
      private readonly callback: (entries: { target: unknown; isIntersecting: boolean }[]) => void
    ) {
      instances.push(this);
    }
    observe(target: unknown) {
      this.observed.push(target);
    }
    unobserve(target: unknown) {
      this.unobServed.push(target);
    }
    disconnect() {}
    fire(target: unknown, intersecting: boolean) {
      this.callback([{ target, isIntersecting: intersecting }]);
    }
  };
  return instances;
};

const createWindow = (html: string, opts: MediaOpts = {}) => {
  const win = new Window();
  const doc = win.document;
  doc.body.innerHTML = html;
  installMedia(win, opts);
  return { win, doc, io: installIo(win) };
};

const runScript = (win: Window, doc: Window["document"]) => {
  // eslint-disable-next-line no-new-func
  const fn = new Function("window", "document", PAGE_EFFECTS_RUNTIME_SOURCE);
  fn(win, doc);
};

const controllerOf = (win: Window) =>
  (win as unknown as { __codersoPageEffectsV2: { init: (root: unknown) => void } })
    .__codersoPageEffectsV2;
const initFlagOf = (win: Window) =>
  (win as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG];

type DispatchTarget = { dispatchEvent: (event: unknown) => boolean };
const click = (el: unknown, win: Window) =>
  (el as DispatchTarget).dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
const move = (el: unknown, win: Window, clientX: number, clientY: number) =>
  (el as DispatchTarget).dispatchEvent(
    new win.MouseEvent("pointermove", { clientX, clientY, bubbles: true })
  );
const leave = (el: unknown, win: Window) =>
  (el as DispatchTarget).dispatchEvent(new win.MouseEvent("pointerleave", { bubbles: true }));
const keydown = (el: unknown, win: Window, key: string) =>
  (el as DispatchTarget).dispatchEvent(new win.KeyboardEvent("keydown", { key, bubbles: true }));

// Listener spy (L01 countBindings style): counts addEventListener calls AFTER
// installation, so 0 proves no listener was ever attached.
const countListeners = (el: unknown): (() => number) => {
  const target = el as unknown as {
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => void;
  };
  const real = target.addEventListener.bind(target);
  let n = 0;
  target.addEventListener = (type, listener, options) => {
    n += 1;
    return real(type, listener, options);
  };
  return () => n;
};

const winListenerCounts = (win: Window): Record<string, number> => {
  const counts: Record<string, number> = {};
  const real = win.addEventListener.bind(win) as (...args: unknown[]) => void;
  (
    win as unknown as {
      addEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) => void;
    }
  ).addEventListener = (type, listener, options) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return real(type, listener, options);
  };
  return counts;
};

const mockRect = (el: unknown, width: number, height: number) => {
  (
    el as unknown as {
      getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
    }
  ).getBoundingClientRect = () => ({ left: 0, top: 0, width, height });
};

// Captures console.error/warn from the happy-dom window and node around a run;
// the captured list must stay empty for every fixture.
const captureConsole = (win: Window, run: () => void): string[] => {
  const captured: string[] = [];
  const record = (...args: unknown[]) => {
    captured.push(args.map(String).join(" "));
  };
  const winConsole = (win as unknown as { console?: unknown }).console as
    { error?: (...a: unknown[]) => void; warn?: (...a: unknown[]) => void } | undefined;
  const realWinError = winConsole?.error;
  const realWinWarn = winConsole?.warn;
  const realGlobalError = console.error;
  const realGlobalWarn = console.warn;
  if (winConsole) {
    winConsole.error = record;
    winConsole.warn = record;
  }
  console.error = record;
  console.warn = record;
  try {
    run();
  } finally {
    if (winConsole) {
      winConsole.error = realWinError;
      winConsole.warn = realWinWarn;
    }
    console.error = realGlobalError;
    console.warn = realGlobalWarn;
  }
  return captured;
};

// ── minimal fixed-DOM family fixture ─────────────────────────────────────────
const SWITCHER_HTML = (prefix: string) =>
  "<div data-switcher>" +
  `<button data-switcher-tab aria-selected="true" tabindex="0">${prefix}A</button>` +
  `<button data-switcher-tab aria-selected="false" tabindex="-1">${prefix}B</button>` +
  `<div data-switcher-panel data-active="true">${prefix}PA</div>` +
  `<div data-switcher-panel data-active="false" hidden>${prefix}PB</div>` +
  "</div>";

// Matches the real gallery renderer chip model: All + one chip per category.
const GALLERY_HTML = (prefix: string) =>
  "<div data-gallery>" +
  "<div data-gallery-filter>" +
  '<button data-filter="all" aria-pressed="true" tabindex="0">All</button>' +
  '<button data-filter="modern" aria-pressed="false" tabindex="-1">Modern</button>' +
  '<button data-filter="eco" aria-pressed="false" tabindex="-1">Eco</button>' +
  `<figure data-filter-item data-category="modern">${prefix}M</figure>` +
  `<figure data-filter-item data-category="eco">${prefix}E</figure>` +
  "</div>" +
  "</div>";

const FAMILIES_HTML = (prefix: string) =>
  `<div data-host="${prefix}-switcher">${SWITCHER_HTML(prefix)}</div>` +
  `<div data-host="${prefix}-gallery">${GALLERY_HTML(prefix)}</div>` +
  `<div data-host="${prefix}-tilt" data-block-tilt="subtle"><div class="cx-glare"></div></div>` +
  `<div data-host="${prefix}-mag"><a data-magnetic href="#">go</a></div>` +
  `<section data-host="${prefix}-reveal" data-page-effect="reveal-up"></section>` +
  `<section data-host="${prefix}-parallax" data-page-effect="parallax" data-parallax="20"><div data-parallax-inner></div></section>` +
  `<div data-host="${prefix}-spotlight" data-page-spotlight></div>`;

// ── real renderer fixtures ───────────────────────────────────────────────────
const textBlock = (id: string, text = "T"): PageBlockV2 =>
  createPageBlockV2("text", { id, props: { text, format: "plain", align: "left" } });
const switcherBlock = (
  id: string,
  tabs: string[],
  panels: Record<string, PageBlockV2[]>
): PageBlockV2 =>
  createPageBlockV2("switcher", {
    id,
    props: { tabs: tabs.map((label) => ({ label })), activeIndex: 0, variant: "pill" },
    slots: panels,
  });
const galleryBlock = (id: string): PageBlockV2 =>
  createPageBlockV2("gallery", {
    id,
    props: {
      layout: "grid",
      filterable: true,
      filterCategories: ["modern", "eco"],
      items: [
        { src: "https://example.com/a.jpg", alt: "a", category: "modern" },
        { src: "https://example.com/b.jpg", alt: "b", category: "eco" },
      ],
    },
  });
const tiltBlock = (id: string): PageBlockV2 =>
  createPageBlockV2("heading", {
    id,
    props: { text: "Tilt", level: "h2", align: "left" },
    style: { tilt: "subtle" },
  });
const magneticBlock = (id: string): PageBlockV2 =>
  createPageBlockV2("button", {
    id,
    props: { label: "Go", href: "/go" },
    style: { magnetic: true },
  });
const marqueeGroup = (children: PageBlockV2[]): PageBlockV2 =>
  createPageBlockV2("group", {
    id: "blk-mq",
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee: { speed: 18, direction: "left", seamless: true } },
    slots: { children },
  });

const sectionWithStyle = (
  id: string,
  style: Partial<PageSectionStyleV2>,
  blocks: PageBlockV2[]
): PageSectionV2 => {
  const base = createPageSectionV2("content", { id, blocks });
  return { ...base, style: { ...base.style, ...style } };
};

const motionSections = (prefix: string): PageSectionV2[] => [
  sectionWithStyle(`${prefix}-reveal`, { scrollEffect: "reveal-up" }, [
    textBlock(`${prefix}-rev-t`),
  ]),
  sectionWithStyle(`${prefix}-parallax`, { scrollEffect: "parallax", parallaxIntensity: 20 }, [
    textBlock(`${prefix}-par-t`),
  ]),
  sectionWithStyle(`${prefix}-interactive`, {}, [
    switcherBlock(`${prefix}-sw`, ["One", "Two"], {
      "panel:1": [textBlock(`${prefix}-p1`)],
      "panel:2": [textBlock(`${prefix}-p2`)],
    }),
    galleryBlock(`${prefix}-g`),
    tiltBlock(`${prefix}-tl`),
    magneticBlock(`${prefix}-mg`),
  ]),
];
const renderMain = () =>
  renderToStaticMarkup(
    <PageDocumentRender
      document={createEffectsDocument(motionSections("main"), { cursorSpotlight: true })}
    />
  );
const renderFooter = () =>
  renderToStaticMarkup(
    <PageDocumentRender
      document={createEffectsDocument(motionSections("footer"), { cursorSpotlight: true })}
      rootTag="div"
      rootClassName="cx-footer-root"
      documentRole="secondary"
      peerSpotlightOn
    />
  );

// Shared responder proof for a real main/footer scope: switcher, gallery,
// tilt, magnetic and the spotlight root all respond after binding.
const assertRealFamiliesRespond = (win: Window, doc: Window["document"], scope: string) => {
  const tabs = [...doc.querySelectorAll(`${scope} [data-switcher-tab]`)];
  const panels = [
    ...doc.querySelectorAll(`${scope} [data-switcher-panel]`),
  ] as unknown as HTMLElement[];
  click(tabs[1]!, win);
  expect(panels[1]!.hidden).toBe(false);
  expect(panels[0]!.hidden).toBe(true);

  const chips = [...doc.querySelectorAll(`${scope} [data-gallery-filter] [data-filter]`)];
  const items = [
    ...doc.querySelectorAll(`${scope} [data-filter-item]`),
  ] as unknown as HTMLElement[];
  click(chips[2]!, win); // Eco
  expect(items[0]!.hidden).toBe(true);
  expect(items[1]!.hidden).toBe(false);

  const tilt = doc.querySelector(`${scope} [data-block-tilt]`)!;
  mockRect(tilt, 100, 100);
  move(tilt, win, 75, 20);
  expect((tilt as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).toBe("2.10deg");

  const mag = doc.querySelector(`${scope} [data-magnetic]`)!;
  mockRect(mag, 100, 40);
  move(mag, win, 200, 100);
  expect((mag as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe("14.0px");

  const root = doc.querySelector(scope)!;
  move(root, win, 120, 80);
  expect((root as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe("120px");
};

// ── item 1: parser-order rescan, both directions, on real renderer docs ──────
describe("parser-order rescan binds every family in both orders (item 1)", () => {
  const assertRevealParallax = (win: Window, doc: Window["document"], io: IoInstance[]) => {
    const revMain = doc.querySelector('main [data-page-effect="reveal-up"]')!;
    const revFooter = doc.querySelector('.cx-footer-root [data-page-effect="reveal-up"]')!;
    expect(io.flatMap((i) => i.observed)).toContain(revMain);
    expect(io.flatMap((i) => i.observed)).toContain(revFooter);
    const armedRoots = [...doc.querySelectorAll("[data-page-motion]")];
    expect(armedRoots).toHaveLength(2);
    for (const root of armedRoots) expect(root.hasAttribute("data-reveal-armed")).toBe(true);
    io[0]!.fire(revFooter, true);
    expect(revFooter.getAttribute("data-revealed")).toBe("true");
    for (const sel of [
      'main [data-page-effect="parallax"] [data-parallax-inner]',
      '.cx-footer-root [data-page-effect="parallax"] [data-parallax-inner]',
    ]) {
      expect((doc.querySelector(sel) as unknown as HTMLElement).style.transform).toContain(
        "translate3d"
      );
    }
  };

  const assertSpotlightIsolation = (win: Window, doc: Window["document"]) => {
    const mainRoot = doc.querySelector("main")!;
    const footerRoot = doc.querySelector(".cx-footer-root")!;
    // Main movement never writes footer vars (footer keeps its own value).
    const footerBefore = (footerRoot as unknown as HTMLElement).style.getPropertyValue(
      "--spotlight-x"
    );
    move(mainRoot, win, 100, 100);
    expect((footerRoot as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe(
      footerBefore
    );
    // Footer movement never writes main vars.
    const mainBefore = (mainRoot as unknown as HTMLElement).style.getPropertyValue("--spotlight-x");
    move(footerRoot, win, 200, 200);
    expect((mainRoot as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe(
      mainBefore
    );
    expect((footerRoot as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe(
      "200px"
    );
    // The overlay node is a painted consumer, never a binder candidate.
    const overlay = doc.querySelector("[data-page-spotlight-overlay]")!;
    const overlayCount = countListeners(overlay);
    expect(overlayCount()).toBe(0);
    move(overlay, win, 50, 50);
    expect((overlay as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe("");
  };

  const runOrder = (first: () => string, second: () => string) => {
    const { win, doc, io } = createWindow(first());
    runScript(win, doc); // first document copy
    doc.body.insertAdjacentHTML("beforeend", second()); // second doc appears later
    runScript(win, doc); // second copy rescans
    assertRealFamiliesRespond(win, doc, "main");
    assertRealFamiliesRespond(win, doc, ".cx-footer-root");
    assertRevealParallax(win, doc, io);
    assertSpotlightIsolation(win, doc);
  };

  test("main markup + script first, footer second", () => {
    runOrder(renderMain, renderFooter);
  });
  test("footer markup + script first, main second (reversed parser order)", () => {
    runOrder(renderFooter, renderMain);
  });
});

// ── item 2: the observation flag is never idempotence authority ──────────────
describe("observation flag is written but never read as authority (item 2)", () => {
  test("pre-set flag still installs a fresh controller and scans", () => {
    const { win, doc } = createWindow(`<main data-page-motion>${SWITCHER_HTML("pre-")}</main>`);
    (win as unknown as Record<string, unknown>)[PAGE_EFFECTS_RUNTIME_INIT_FLAG] = true;
    runScript(win, doc);
    expect(initFlagOf(win)).toBe(true);
    expect(typeof controllerOf(win).init).toBe("function");
    const tabs = [...doc.querySelectorAll("[data-switcher-tab]")];
    const panels = [...doc.querySelectorAll("[data-switcher-panel]")] as unknown as HTMLElement[];
    click(tabs[1]!, win);
    expect(panels[1]!.hidden).toBe(false); // the scan happened despite the preset flag
    expect(panels[0]!.hidden).toBe(true);
  });

  test("flag is written for observation on a fresh window", () => {
    const { win, doc } = createWindow(SWITCHER_HTML("obs-"));
    expect(initFlagOf(win)).toBeUndefined();
    runScript(win, doc);
    expect(initFlagOf(win)).toBe(true);
  });
});

// ── item 3: repeated runs keep one action = one effect ───────────────────────
describe("repeated source/init runs keep cardinality one (item 3)", () => {
  test("three source copies + init(document) x2 never duplicate a binding", () => {
    const { win, doc, io } = createWindow(`<main data-page-motion>${FAMILIES_HTML("rep")}</main>`);
    const winCounts = winListenerCounts(win);
    const tabCount = countListeners(
      doc.querySelector('[data-host="rep-switcher"] [data-switcher-tab]')
    );
    const tiltCount = countListeners(doc.querySelector('[data-host="rep-tilt"]'));
    const magCount = countListeners(doc.querySelector('[data-host="rep-mag"] a'));
    const spotlightCount = countListeners(doc.querySelector('[data-host="rep-spotlight"]'));
    const revealEl = doc.querySelector('[data-host="rep-reveal"]')!;
    const revealObserved = () => io.flatMap((i) => i.observed).filter((t) => t === revealEl).length;

    runScript(win, doc);
    runScript(win, doc);
    runScript(win, doc);
    controllerOf(win).init(doc);
    controllerOf(win).init(doc);

    expect(winCounts["scroll"]).toBe(1);
    expect(winCounts["resize"]).toBe(1);
    expect(tabCount()).toBe(2); // click + keydown, exactly once
    expect(tiltCount()).toBe(2); // pointermove + pointerleave
    expect(magCount()).toBe(2);
    expect(spotlightCount()).toBe(1);
    expect(revealObserved()).toBe(1);

    // One user action = exactly one transition per bound tab.
    const tabs = [...doc.querySelectorAll('[data-host="rep-switcher"] [data-switcher-tab]')];
    const panels = [
      ...doc.querySelectorAll('[data-host="rep-switcher"] [data-switcher-panel]'),
    ] as unknown as HTMLElement[];
    click(tabs[1]!, win);
    expect(panels[1]!.hidden).toBe(false);
    expect(panels[0]!.hidden).toBe(true);
    click(tabs[0]!, win);
    expect(panels[1]!.hidden).toBe(true);
    expect(panels[0]!.hidden).toBe(false);
  });

  test("init(subtree) twice binds a later-appended subtree exactly once", () => {
    const { win, doc } = createWindow(SWITCHER_HTML("doc-"));
    runScript(win, doc);
    doc.body.insertAdjacentHTML(
      "beforeend",
      `<div data-host="appended">${SWITCHER_HTML("app-")}</div>`
    );
    const appended = doc.querySelector('[data-host="appended"]')!;
    const appTab = appended.querySelector("[data-switcher-tab]")!;
    const appTabCount = countListeners(appTab);
    controllerOf(win).init(appended);
    controllerOf(win).init(appended);
    expect(appTabCount()).toBe(2);
    const appTabs = [...appended.querySelectorAll("[data-switcher-tab]")];
    const appPanels = [
      ...appended.querySelectorAll("[data-switcher-panel]"),
    ] as unknown as HTMLElement[];
    click(appTabs[1]!, win);
    expect(appPanels[1]!.hidden).toBe(false);
    expect(appPanels[0]!.hidden).toBe(true);
  });
});

// ── item 4: per-binder WeakSets, one global listener pair, no retained lists ──
describe("WeakSet ownership and appended-node discovery (item 4)", () => {
  test("one element hosting switcher + tilt + magnetic binds in all three families", () => {
    const { win, doc } = createWindow(
      '<div data-host="triple" data-switcher data-block-tilt="subtle" data-magnetic>' +
        '<button data-switcher-tab aria-selected="true" tabindex="0">A</button>' +
        '<button data-switcher-tab aria-selected="false" tabindex="-1">B</button>' +
        '<div data-switcher-panel data-active="true">PA</div>' +
        '<div data-switcher-panel data-active="false" hidden>PB</div>' +
        "</div>"
    );
    runScript(win, doc);
    const host = doc.querySelector('[data-host="triple"]')!;
    mockRect(host, 100, 100);
    const tabs = [...host.querySelectorAll("[data-switcher-tab]")];
    const panels = [...host.querySelectorAll("[data-switcher-panel]")] as unknown as HTMLElement[];
    click(tabs[1]!, win);
    expect(panels[1]!.hidden).toBe(false);
    move(host, win, 75, 20);
    expect((host as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).toBe("2.10deg");
    move(host, win, 200, 100);
    expect((host as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe(
      "14.0px"
    );
  });

  test("appended footer nodes bind on the next scan (no retained snapshot)", () => {
    const { win, doc, io } = createWindow(
      `<main data-page-motion>${SWITCHER_HTML("main-")}</main>`
    );
    const mainTab = doc.querySelector("main [data-switcher-tab]")!;
    const mainTabCount = countListeners(mainTab);
    runScript(win, doc);
    expect(mainTabCount()).toBe(2);

    doc.body.insertAdjacentHTML(
      "beforeend",
      `<footer>${SWITCHER_HTML("ft-")}<section data-page-effect="reveal-up"></section></footer>`
    );
    const footerTab = doc.querySelector("footer [data-switcher-tab]")!;
    const footerTabCount = countListeners(footerTab);
    expect(footerTabCount()).toBe(0); // not bound until the next scan

    controllerOf(win).init(doc);
    expect(footerTabCount()).toBe(2);
    expect(io.flatMap((i) => i.observed)).toContain(
      doc.querySelector('footer [data-page-effect="reveal-up"]')
    );
    expect(mainTabCount()).toBe(2); // main stays bound exactly once
  });
});

// ── item 5: binder/element failure isolation + retry ─────────────────────────
describe("failure isolation and retry (item 5)", () => {
  test("one failing binder does not block later binders; retry binds the failed one", () => {
    const { win, doc } = createWindow(
      "<main data-page-motion>" +
        '<section data-page-effect="parallax" data-parallax="20" data-host="p"><div data-parallax-inner></div></section>' +
        '<div data-host="sp" data-page-spotlight></div>' +
        '<div data-host="t" data-block-tilt><div class="cx-glare"></div></div>' +
        '<div data-host="m"><a data-magnetic href="#">go</a></div>' +
        "</main>"
    );
    const sp = doc.querySelector('[data-host="sp"]')!;
    const t = doc.querySelector('[data-host="t"]')!;
    const m = doc.querySelector('[data-host="m"] a')!;
    const spCount = countListeners(sp);
    const tCount = countListeners(t);
    const mCount = countListeners(m);
    const realQuery = doc.querySelectorAll.bind(doc);
    let throwOnce = true;
    (doc as unknown as { querySelectorAll: (sel: string) => unknown }).querySelectorAll = (
      sel: string
    ) => {
      if (throwOnce && sel.includes("parallax")) {
        throwOnce = false;
        throw new Error("boom-query");
      }
      return realQuery(sel);
    };

    runScript(win, doc);
    // bindParallax failed: its candidate query threw before any framing.
    const inner = doc.querySelector('[data-host="p"] [data-parallax-inner]')!;
    expect((inner as unknown as HTMLElement).style.transform).toBe("");
    // Later binders still bound and respond.
    move(sp, win, 120, 80);
    expect((sp as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe("120px");
    mockRect(t, 100, 100);
    move(t, win, 75, 20);
    expect((t as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).toBe("2.10deg");
    mockRect(m, 100, 40);
    move(m, win, 200, 100);
    expect((m as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe("14.0px");

    // Retry (fresh scan): the parallax binder succeeds; nothing was duplicated.
    runScript(win, doc);
    expect((inner as unknown as HTMLElement).style.transform).toContain("translate3d");
    expect(spCount()).toBe(1);
    expect(tCount()).toBe(2);
    expect(mCount()).toBe(2);
  });

  test("element setup failure rolls back partial listeners; retry binds exactly once", () => {
    const { win, doc } = createWindow(
      '<div data-host="one" data-switcher>' +
        '<button data-switcher-tab aria-selected="true" tabindex="0">A1</button>' +
        '<button data-switcher-tab aria-selected="false" tabindex="-1">A2</button>' +
        '<div data-switcher-panel data-active="true">P1</div>' +
        '<div data-switcher-panel data-active="false" hidden>P2</div>' +
        "</div>" +
        `<div data-host="two">${SWITCHER_HTML("two-")}</div>` +
        '<div data-host="m"><a data-magnetic href="#">go</a></div>'
    );
    const firstRoot = doc.querySelector('[data-host="one"]')!;
    const firstTab1 = firstRoot.querySelectorAll("[data-switcher-tab]")[1]!;
    const realFirstTab1 = (
      firstTab1.addEventListener as unknown as (...args: unknown[]) => void
    ).bind(firstTab1);
    let throwOnBind = true;
    let removedPartial = 0;
    (
      firstTab1 as unknown as {
        addEventListener: (
          t: string,
          l: EventListenerOrEventListenerObject,
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
      firstTab1.removeEventListener as unknown as (...args: unknown[]) => void
    ).bind(firstTab1);
    (
      firstTab1 as unknown as {
        removeEventListener: (
          t: string,
          l: EventListenerOrEventListenerObject,
          o?: boolean | EventListenerOptions
        ) => void;
      }
    ).removeEventListener = (type, listener, options) => {
      removedPartial += 1;
      return realFirstTab1Remove(type, listener, options);
    };

    runScript(win, doc);
    // Later elements still bind.
    const twoTabs = [...doc.querySelectorAll('[data-host="two"] [data-switcher-tab]')];
    const twoPanels = [
      ...doc.querySelectorAll('[data-host="two"] [data-switcher-panel]'),
    ] as unknown as HTMLElement[];
    click(twoTabs[1]!, win);
    expect(twoPanels[1]!.hidden).toBe(false);
    const m = doc.querySelector('[data-host="m"] a')!;
    mockRect(m, 100, 40);
    move(m, win, 200, 100);
    expect((m as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe("14.0px");
    expect(removedPartial).toBeGreaterThan(0);

    // Retry binds the failed switcher once; the rollback prevents duplicates.
    runScript(win, doc);
    const firstTabs = [...firstRoot.querySelectorAll("[data-switcher-tab]")];
    const firstPanels = [
      ...firstRoot.querySelectorAll("[data-switcher-panel]"),
    ] as unknown as HTMLElement[];
    click(firstTabs[1]!, win);
    expect(firstPanels[1]!.hidden).toBe(false);
    expect(firstTabs[1]!.getAttribute("aria-selected")).toBe("true");
  });
});

// ── item 6: reduced motion ───────────────────────────────────────────────────
describe("reduced motion: toggles live, motion never arms (item 6)", () => {
  test("switcher/gallery keyboard + ARIA work; reveal never armed; motion neutral", () => {
    const { win, doc, io } = createWindow(
      SWITCHER_HTML("rm-") +
        GALLERY_HTML("rmg-") +
        "<main data-page-motion>" +
        '<section data-page-effect="reveal-up" data-host="rm-reveal"></section>' +
        '<section data-page-effect="parallax" data-parallax="20"><div data-parallax-inner></div></section>' +
        "</main>" +
        '<div data-host="rm-spot" data-page-spotlight></div>' +
        '<div data-host="rm-tilt" data-block-tilt><div class="cx-glare"></div></div>' +
        '<div data-host="rm-mag"><a data-magnetic href="#">go</a></div>',
      { reduce: true }
    );
    runScript(win, doc);

    // Switcher keyboard + ARIA/hidden behavior works under reduce.
    const tabs = [...doc.querySelectorAll("[data-switcher-tab]")];
    const panels = [...doc.querySelectorAll("[data-switcher-panel]")] as unknown as HTMLElement[];
    keydown(tabs[0]!, win, "ArrowRight");
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs[1]!.getAttribute("tabindex")).toBe("0");
    expect(tabs[0]!.getAttribute("tabindex")).toBe("-1");
    expect(panels[1]!.hidden).toBe(false);
    expect(panels[0]!.hidden).toBe(true);

    // Gallery keyboard roving + click filtering work under reduce.
    const chips = [...doc.querySelectorAll("[data-gallery-filter] [data-filter]")];
    keydown(chips[0]!, win, "ArrowRight");
    expect(chips[1]!.getAttribute("tabindex")).toBe("0");
    expect(chips[0]!.getAttribute("tabindex")).toBe("-1");
    click(chips[1]!, win); // Modern
    expect(
      (doc.querySelector('[data-filter-item][data-category="modern"]') as unknown as HTMLElement)
        .hidden
    ).toBe(false);
    expect(
      (doc.querySelector('[data-filter-item][data-category="eco"]') as unknown as HTMLElement)
        .hidden
    ).toBe(true);

    // Reveal is never armed and never observed.
    expect(doc.querySelector("main")!.hasAttribute("data-reveal-armed")).toBe(false);
    expect(io.flatMap((i) => i.observed)).toHaveLength(0);

    // Parallax/spotlight/tilt/magnetic stay neutral.
    expect(
      (doc.querySelector("[data-parallax-inner]") as unknown as HTMLElement).style.transform
    ).toBe("");
    const sp = doc.querySelector('[data-host="rm-spot"]')!;
    move(sp, win, 120, 80);
    expect((sp as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe("");
    const t = doc.querySelector('[data-host="rm-tilt"]')!;
    mockRect(t, 100, 100);
    move(t, win, 75, 20);
    expect((t as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).toBe("");
    const m = doc.querySelector('[data-host="rm-mag"] a')!;
    mockRect(m, 100, 40);
    move(m, win, 200, 100);
    expect((m as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe("");
  });
});

// ── item 7: transform custom-property ownership ──────────────────────────────
describe("tilt/magnetic write only their own vars; real markup keeps composition (item 7)", () => {
  test("fine-pointer tilt/magnetic change only their vars; leave restores exact neutrals", () => {
    const { win, doc } = createWindow(
      '<div data-host="t" data-block-tilt="subtle"><div class="cx-glare"></div></div>' +
        '<div data-host="m"><a data-magnetic href="#">go</a></div>'
    );
    runScript(win, doc);

    const t = doc.querySelector('[data-host="t"]')!;
    mockRect(t, 100, 100);
    const glare = doc.querySelector(".cx-glare")!;
    move(t, win, 75, 20);
    const th = t as unknown as HTMLElement;
    expect(th.style.getPropertyValue("--cx-tilt-x")).toBe("2.10deg");
    expect(th.style.getPropertyValue("--cx-tilt-y")).toBe("1.75deg");
    expect(th.style.getPropertyValue("--cx-magnetic-x")).toBe("");
    expect(th.style.getPropertyValue("--cx-reveal-y")).toBe("");
    expect(th.style.transform).toBe("");
    const glareX = (glare as unknown as HTMLElement).style.getPropertyValue("--glare-x");
    expect(glareX).toBe("75.0%");
    leave(t, win);
    expect(th.style.getPropertyValue("--cx-tilt-x")).toBe("0deg");
    expect(th.style.getPropertyValue("--cx-tilt-y")).toBe("0deg");
    expect(th.style.transform).toBe("");
    // Leave resets ONLY the tilt vars: glare keeps its own value.
    expect((glare as unknown as HTMLElement).style.getPropertyValue("--glare-x")).toBe(glareX);

    const m = doc.querySelector('[data-host="m"] a')!;
    mockRect(m, 100, 40);
    move(m, win, 200, 100);
    const mh = m as unknown as HTMLElement;
    expect(mh.style.getPropertyValue("--cx-magnetic-x")).toBe("14.0px");
    expect(mh.style.getPropertyValue("--cx-magnetic-y")).toBe("14.0px");
    expect(mh.style.getPropertyValue("--cx-tilt-x")).toBe("");
    expect(mh.style.transform).toBe("");
    leave(m, win);
    expect(mh.style.getPropertyValue("--cx-magnetic-x")).toBe("0.0px");
    expect(mh.style.getPropertyValue("--cx-magnetic-y")).toBe("0.0px");
    expect(mh.style.transform).toBe("");
  });

  test("real renderer markup: fixed composition transform retained; only parallax writes transform", () => {
    const section = createPageSectionV2("content", {
      id: "sec-combined",
      blocks: [
        createPageBlockV2("heading", {
          id: "blk-t",
          props: { text: "Composed", level: "h2", align: "left" },
          style: { tilt: "subtle", layer: { x: 8, y: 12, z: 3, anchor: "bottom-right" } },
        }),
        magneticBlock("blk-m"),
      ],
    });
    const parallaxSection = sectionWithStyle(
      "sec-par",
      { scrollEffect: "parallax", parallaxIntensity: 20 },
      [textBlock("blk-par")]
    );
    const html = renderToStaticMarkup(
      <PageDocumentRender document={createEffectsDocument([section, parallaxSection])} />
    );
    const { win, doc } = createWindow(html);
    const compStyle = doc.querySelector("style[data-page-composition-css]");
    expect(compStyle?.textContent).toContain("[data-page-transform-host]{transform:");
    expect(compStyle?.textContent).toContain("rotateX(var(--cx-tilt-x,0deg))");

    runScript(win, doc);
    const tiltHost = doc.querySelector('[data-block-id="blk-t"]')!;
    mockRect(tiltHost, 100, 100);
    move(tiltHost, win, 75, 20);
    const th = tiltHost as unknown as HTMLElement;
    expect(th.getAttribute("data-page-transform-host")).not.toBeNull();
    expect(th.style.getPropertyValue("--cx-tilt-x")).toBe("2.10deg");
    expect(th.style.getPropertyValue("--cx-reveal-y")).toBe("");
    expect(th.style.transform).toBe("");

    const magHost = doc.querySelector('[data-block-id="blk-m"]')!;
    mockRect(magHost, 100, 40);
    move(magHost, win, 200, 100);
    expect((magHost as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe(
      "14.0px"
    );
    expect((magHost as unknown as HTMLElement).style.transform).toBe("");

    const parInner = doc.querySelector("[data-parallax-inner]")!;
    expect((parInner as unknown as HTMLElement).style.transform).toContain("translate3d");
    const transformWriters = [...doc.querySelectorAll("*")].filter(
      (el) => (el as unknown as HTMLElement).style.transform !== ""
    );
    expect(transformWriters).toEqual([parInner]);
  });
});

// ── item 8: replica-safe marquee + pre-bind rejection ────────────────────────
describe("replica-safe marquee and pre-bind rejection (item 8)", () => {
  const marqueeHtml = renderToStaticMarkup(
    <PageSectionRender
      section={createPageSectionV2("content", {
        id: "sec-mq",
        blocks: [
          marqueeGroup([
            switcherBlock("mq-sw", ["One", "Two"], {
              "panel:1": [textBlock("mq-p1")],
              "panel:2": [textBlock("mq-p2")],
            }),
            galleryBlock("mq-g"),
            tiltBlock("mq-tl"),
            magneticBlock("mq-mg"),
          ]),
        ],
      })}
    />
  );

  test("primary binds/responds; replica excluded before setup; rescans never bind it", () => {
    expect(countMarkup(marqueeHtml, "cx-marquee-segment")).toBe(2);
    expect(countMarkup(marqueeHtml, `${PAGE_MARQUEE_REPLICA_ATTRIBUTE}=""`)).toBe(1);
    const { win, doc } = createWindow(marqueeHtml);
    const primarySel = `.cx-marquee-segment:not([${PAGE_MARQUEE_REPLICA_ATTRIBUTE}])`;
    const replicaSel = `[${PAGE_MARQUEE_REPLICA_ATTRIBUTE}]`;

    const repTabCount = countListeners(doc.querySelector(`${replicaSel} [data-switcher-tab]`));
    const repChipCount = countListeners(doc.querySelector(`${replicaSel} [data-filter]`));
    const repTiltCount = countListeners(doc.querySelector(`${replicaSel} [data-block-tilt]`));
    const repMagCount = countListeners(doc.querySelector(`${replicaSel} [data-magnetic]`));
    const pTab0 = doc.querySelector(`${primarySel} [data-switcher-tab]`)!;
    const pTabCount = countListeners(pTab0);

    runScript(win, doc);
    runScript(win, doc);
    runScript(win, doc);

    // Replica candidates were excluded BEFORE any setup and stay excluded.
    expect(repTabCount()).toBe(0);
    expect(repChipCount()).toBe(0);
    expect(repTiltCount()).toBe(0);
    expect(repMagCount()).toBe(0);

    // Primary binds with exact cardinality; one action = one transition.
    expect(pTabCount()).toBe(2);
    const pTabs = [...doc.querySelectorAll(`${primarySel} [data-switcher-tab]`)];
    const pPanels = [
      ...doc.querySelectorAll(`${primarySel} [data-switcher-panel]`),
    ] as unknown as HTMLElement[];
    click(pTabs[1]!, win);
    expect(pPanels[1]!.hidden).toBe(false);
    expect(pPanels[0]!.hidden).toBe(true);
    click(pTabs[0]!, win);
    expect(pPanels[1]!.hidden).toBe(true);

    const pChips = [...doc.querySelectorAll(`${primarySel} [data-filter]`)];
    click(pChips[2]!, win); // eco
    expect(
      (
        doc.querySelector(
          `${primarySel} [data-filter-item][data-category="modern"]`
        ) as unknown as HTMLElement
      ).hidden
    ).toBe(true);

    const pTilt = doc.querySelector(`${primarySel} [data-block-tilt]`)!;
    mockRect(pTilt, 100, 100);
    move(pTilt, win, 75, 20);
    expect((pTilt as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).toBe("2.10deg");
    const pMag = doc.querySelector(`${primarySel} [data-magnetic]`)!;
    mockRect(pMag, 100, 40);
    move(pMag, win, 200, 100);
    expect((pMag as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe(
      "14.0px"
    );

    // The replica stays inert: no toggle, no filter, no transform vars.
    const repTabs = [...doc.querySelectorAll(`${replicaSel} [data-switcher-tab]`)];
    const repPanels = [
      ...doc.querySelectorAll(`${replicaSel} [data-switcher-panel]`),
    ] as unknown as HTMLElement[];
    click(repTabs[1]!, win);
    expect(repTabs[1]!.getAttribute("aria-selected")).toBe("false");
    expect(repPanels[0]!.hidden).toBe(false); // panel 1 stays visible
    expect(repPanels[1]!.hidden).toBe(true); // panel 2 stays hidden
    const repChips = [...doc.querySelectorAll(`${replicaSel} [data-filter]`)];
    click(repChips[2]!, win);
    expect(
      (
        doc.querySelector(
          `${replicaSel} [data-filter-item][data-category="modern"]`
        ) as unknown as HTMLElement
      ).hidden
    ).toBe(false);
    const repTilt = doc.querySelector(`${replicaSel} [data-block-tilt]`)!;
    mockRect(repTilt, 100, 100);
    move(repTilt, win, 75, 20);
    expect((repTilt as unknown as HTMLElement).style.getPropertyValue("--cx-tilt-x")).toBe("");
    const repMag = doc.querySelector(`${replicaSel} [data-magnetic]`)!;
    mockRect(repMag, 100, 40);
    move(repMag, win, 200, 100);
    expect((repMag as unknown as HTMLElement).style.getPropertyValue("--cx-magnetic-x")).toBe("");
  });

  test("reveal/parallax/spotlight reject replica-self and replica-ancestor before setup", () => {
    const html =
      `<div class="cx-marquee-segment" ${PAGE_MARQUEE_REPLICA_ATTRIBUTE}="" aria-hidden="true">` +
      '<main data-page-motion><section data-page-effect="reveal-up" data-host="ra-reveal"></section></main>' +
      '<section data-page-effect="parallax" data-parallax="20" data-host="ra-par"><div data-parallax-inner></div></section>' +
      '<div data-page-spotlight data-host="ra-spot"></div>' +
      "</div>" +
      `<section data-page-effect="reveal-up" ${PAGE_MARQUEE_REPLICA_ATTRIBUTE}="" data-host="rs-reveal"></section>` +
      `<section data-page-effect="parallax" data-parallax="20" ${PAGE_MARQUEE_REPLICA_ATTRIBUTE}="" data-host="rs-par"><div data-parallax-inner></div></section>` +
      `<div data-page-spotlight ${PAGE_MARQUEE_REPLICA_ATTRIBUTE}="" data-host="rs-spot"></div>` +
      '<main data-page-motion data-host="ctrl-main"><section data-page-effect="reveal-up" data-host="ctrl-reveal"></section></main>' +
      '<section data-page-effect="parallax" data-parallax="20" data-host="ctrl-par"><div data-parallax-inner></div></section>' +
      '<div data-page-spotlight data-host="ctrl-spot"></div>';
    const { win, doc, io } = createWindow(html);
    const raSpotCount = countListeners(doc.querySelector('[data-host="ra-spot"]'));
    const rsSpotCount = countListeners(doc.querySelector('[data-host="rs-spot"]'));
    const ctrlSpotCount = countListeners(doc.querySelector('[data-host="ctrl-spot"]'));
    runScript(win, doc);
    runScript(win, doc);

    // Control binds: armed, observed, framed, spotlight live.
    expect(
      doc.querySelector('main[data-host="ctrl-main"]')!.hasAttribute("data-reveal-armed")
    ).toBe(true);
    expect(io.flatMap((i) => i.observed)).toContain(doc.querySelector('[data-host="ctrl-reveal"]'));
    expect(
      (doc.querySelector('[data-host="ctrl-par"] [data-parallax-inner]') as unknown as HTMLElement)
        .style.transform
    ).toContain("translate3d");
    const ctrlSpot = doc.querySelector('[data-host="ctrl-spot"]')!;
    move(ctrlSpot, win, 120, 80);
    expect((ctrlSpot as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe(
      "120px"
    );
    expect(ctrlSpotCount()).toBe(1);

    // Replica-ancestor: nothing armed, observed, framed, or bound.
    const armedReplicas = [
      ...doc.querySelectorAll(`[${PAGE_MARQUEE_REPLICA_ATTRIBUTE}] [data-page-motion]`),
    ];
    expect(armedReplicas.every((el) => !el.hasAttribute("data-reveal-armed"))).toBe(true);
    expect(io.flatMap((i) => i.observed)).not.toContain(
      doc.querySelector('[data-host="ra-reveal"]')
    );
    expect(
      (doc.querySelector('[data-host="ra-par"] [data-parallax-inner]') as unknown as HTMLElement)
        .style.transform
    ).toBe("");
    expect(raSpotCount()).toBe(0);
    const raSpot = doc.querySelector('[data-host="ra-spot"]')!;
    move(raSpot, win, 50, 50);
    expect((raSpot as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe("");

    // Replica-SELF: the same pre-bind rejection.
    expect(io.flatMap((i) => i.observed)).not.toContain(
      doc.querySelector('[data-host="rs-reveal"]')
    );
    expect(doc.querySelector('[data-host="rs-reveal"]')!.getAttribute("data-revealed")).toBeNull();
    expect(
      (doc.querySelector('[data-host="rs-par"] [data-parallax-inner]') as unknown as HTMLElement)
        .style.transform
    ).toBe("");
    expect(rsSpotCount()).toBe(0);
    const rsSpot = doc.querySelector('[data-host="rs-spot"]')!;
    move(rsSpot, win, 50, 50);
    expect((rsSpot as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe("");
  });

  test("unsafe form/collection/embed and nested-marquee: one segment, no replica candidate", () => {
    const renderUnsafe = (block: PageBlockV2) =>
      renderToStaticMarkup(
        <PageSectionRender
          section={createPageSectionV2("content", {
            id: "sec-unsafe",
            blocks: [marqueeGroup([block])],
          })}
        />
      );
    const unsafeCases: [string, PageBlockV2][] = [
      ["form", createPageBlockV2("form", { id: "blk-form", props: { formId: null, title: "" } })],
      [
        "collection",
        createPageBlockV2("collection", { id: "blk-col", props: { contentTypeId: "ct-1" } }),
      ],
      ["embed", createPageBlockV2("embed", { id: "blk-emb" })],
    ];
    for (const [label, block] of unsafeCases) {
      const html = renderUnsafe(block);
      expect(countMarkup(html, "cx-marquee-viewport"), label).toBe(1);
      expect(countMarkup(html, "cx-marquee-segment"), label).toBe(1);
      expect(html, label).not.toContain(PAGE_MARQUEE_REPLICA_ATTRIBUTE);
      const { win, doc } = createWindow(html);
      const captured = captureConsole(win, () => runScript(win, doc));
      expect(captured, label).toEqual([]);
    }

    // Nested marquee: outer = one segment (no replica), inner = its own two.
    const nested = renderToStaticMarkup(
      <PageSectionRender
        section={createPageSectionV2("content", {
          id: "sec-nested",
          blocks: [
            marqueeGroup([
              textBlock("blk-ot"),
              marqueeGroup([switcherBlock("sw-inner", ["A"], { "panel:1": [textBlock("leaf")] })]),
            ]),
          ],
        })}
      />
    );
    expect(countMarkup(nested, "cx-marquee-segment")).toBe(3);
    expect(countMarkup(nested, `${PAGE_MARQUEE_REPLICA_ATTRIBUTE}=""`)).toBe(1);
    const { win, doc } = createWindow(nested);
    const innerTabCount = countListeners(
      doc.querySelector(
        `.cx-marquee-segment:not([${PAGE_MARQUEE_REPLICA_ATTRIBUTE}]) [data-switcher-tab]`
      )
    );
    const repTabCount = countListeners(
      doc.querySelector(`[${PAGE_MARQUEE_REPLICA_ATTRIBUTE}] [data-switcher-tab]`)
    );
    runScript(win, doc);
    runScript(win, doc);
    expect(innerTabCount()).toBe(2); // inner primary binds
    expect(repTabCount()).toBe(0); // inner replica never binds
  });
});

// ── item 9: soft-fail fixtures with zero console errors ──────────────────────
describe("soft-fail fixtures finish with zero console errors (item 9)", () => {
  const zeroErrors = (win: Window, run: () => void) => {
    const captured = captureConsole(win, run);
    expect(captured).toEqual([]);
  };

  test("main-only document", () => {
    const { win, doc } = createWindow(renderMain());
    zeroErrors(win, () => runScript(win, doc));
    expect(
      (doc.querySelector("main [data-switcher-tab]") as unknown as HTMLElement).getAttribute(
        "aria-selected"
      )
    ).toBe("true");
  });

  test("footer-only document", () => {
    const { win, doc } = createWindow(renderFooter());
    zeroErrors(win, () => runScript(win, doc));
    const footerTabs = [...doc.querySelectorAll(".cx-footer-root [data-switcher-tab]")];
    const footerPanels = [
      ...doc.querySelectorAll(".cx-footer-root [data-switcher-panel]"),
    ] as unknown as HTMLElement[];
    click(footerTabs[1]!, win);
    expect(footerPanels[1]!.hidden).toBe(false);
  });

  test("no-match document (no hooks at all)", () => {
    const { win, doc } = createWindow("<div><p>plain</p></div>");
    zeroErrors(win, () => runScript(win, doc));
    expect(typeof controllerOf(win).init).toBe("function");
  });

  test("missing APIs (no matchMedia / rAF / IntersectionObserver)", () => {
    const win = new Window();
    const doc = win.document;
    doc.body.innerHTML =
      "<main data-page-motion>" +
      '<section data-page-effect="reveal-up"></section>' +
      '<section data-page-effect="parallax" data-parallax="20"><div data-parallax-inner></div></section>' +
      "</main>";
    (win as unknown as { matchMedia: unknown }).matchMedia = undefined;
    (win as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = undefined;
    (win as unknown as { IntersectionObserver: unknown }).IntersectionObserver = undefined;
    zeroErrors(win, () => runScript(win, doc));
    // Fail-soft reveal: shown directly, never permanently hidden.
    expect(doc.querySelector('[data-page-effect="reveal-up"]')!.getAttribute("data-revealed")).toBe(
      "true"
    );
    expect(
      (doc.querySelector("[data-parallax-inner]") as unknown as HTMLElement).style.transform
    ).toContain("translate3d");
  });

  test("main without spotlight, then footer with spotlight", () => {
    const mainOnly = createEffectsDocument(motionSections("main"));
    const footerWithSpot = createEffectsDocument(motionSections("footer"), {
      cursorSpotlight: true,
    });
    const { win, doc } = createWindow(
      renderToStaticMarkup(<PageDocumentRender document={mainOnly} />)
    );
    runScript(win, doc);
    doc.body.insertAdjacentHTML(
      "beforeend",
      renderToStaticMarkup(
        <PageDocumentRender
          document={footerWithSpot}
          rootTag="div"
          rootClassName="cx-footer-root"
          documentRole="secondary"
        />
      )
    );
    zeroErrors(win, () => runScript(win, doc));
    // Main has no spotlight root; the footer root is the only owner and responds.
    expect(doc.querySelector("main[data-page-spotlight]")).toBeNull();
    const footerRoot = doc.querySelector(".cx-footer-root")!;
    move(footerRoot, win, 200, 100);
    expect((footerRoot as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe(
      "200px"
    );
    // The footer-only spotlight overlay is emitted once and never binds.
    const overlay = doc.querySelector("[data-page-spotlight-overlay]")!;
    expect(overlay).not.toBeNull();
    const overlayCount = countListeners(overlay);
    expect(overlayCount()).toBe(0);
    expect((overlay as unknown as HTMLElement).style.getPropertyValue("--spotlight-x")).toBe("");
  });
});
