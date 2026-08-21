// TASK-539-07-L02 — replica-safe marquee pre-bind rejection and zero-console
// soft-fail proofs for the shared page-effects controller (TASK-539-07-L01's
// pageEffectsRuntime). Additive split suite; the idempotence/cardinality/
// isolation proofs live in task-539-page-effects-runtime-rescan.test.tsx, L01
// source and suites stay read-only. Executes the static runtime via the L01
// happy-dom harness (new Function("window","document",…)); no DOM/runtime
// kernel executes here.
// Contract: _docs/_TASKS/TASK-539-07-L02-Prove-Main-And-Footer-Idempotence.md
import { Window } from "happy-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { PAGE_EFFECTS_RUNTIME_SOURCE } from "../../../core/services/pages/pageEffectsRuntime";
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

type DispatchTarget = { dispatchEvent: (event: unknown) => boolean };
const click = (el: unknown, win: Window) =>
  (el as DispatchTarget).dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
const move = (el: unknown, win: Window, clientX: number, clientY: number) =>
  (el as DispatchTarget).dispatchEvent(
    new win.MouseEvent("pointermove", { clientX, clientY, bubbles: true })
  );

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

// ── real renderer fixtures (shared shapes, kept local for independent runs) ──
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
