/**
 * Demo seed: the "Projekty domów" wow-page built ENTIRELY from the TASK-522/521
 * page toolkit (custom-SVG blueprint block, tilt, floating-drift chips, glass,
 * ambient-orbs, marquee ticker, reveal, cursor spotlight). Emits the normalized
 * PageDocumentV2 JSON to _docs/_DEMO/projekty-domow.page.json so the content is
 * durable + publishable via the admin API. Run: `bun scripts/demo-projekty-domow.tsx`.
 */
import { writeFileSync } from "node:fs";
import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  normalizePageDocumentV2ForWrite,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../core/services/pages/pageDocumentV2";

const St = (s: object) => s as NonNullable<PageBlockV2["style"]>;
const Ss = (s: object) => s as NonNullable<PageSectionV2["style"]>;
const h = (
  id: string,
  text: string,
  level: "h1" | "h2" | "h3",
  align: "left" | "center" = "left",
  style?: object
) =>
  createPageBlockV2("heading", {
    id,
    props: { text, level, align },
    ...(style ? { style: St(style) } : {}),
  });
const t = (id: string, text: string, align: "left" | "center" = "left") =>
  createPageBlockV2("text", { id, props: { text, format: "plain", align } });
const btn = (id: string, label: string, href: string) =>
  createPageBlockV2("button", { id, props: { label, href, target: "self" } });

const HOUSE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 420" role="img">' +
  '<defs><linearGradient id="lineGlow" x1="0" x2="1"><stop offset="0" stop-color="#b8f4ff"/><stop offset="1" stop-color="#d4c2ff"/></linearGradient></defs>' +
  '<path d="M90 276 L238 142 L470 276" fill="none" stroke="url(#lineGlow)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M128 276 H432 V352 H128 Z" fill="rgba(255,255,255,.03)" stroke="url(#lineGlow)" stroke-width="5" stroke-linejoin="round"/>' +
  '<path d="M204 352 V255 H286 V352 M326 352 V285 H392 V352" fill="none" stroke="url(#lineGlow)" stroke-width="5" stroke-linecap="round"/>' +
  '<path d="M235 156 V94 H290 V204" fill="none" stroke="url(#lineGlow)" stroke-width="5" stroke-linecap="round"/>' +
  '<path d="M74 352 H490" fill="none" stroke="url(#lineGlow)" stroke-width="4" stroke-linecap="round" opacity=".55"/></svg>';

const blueprintCard = createPageBlockV2("group", {
  id: "blueprint-card",
  props: { direction: "column", wrap: false, gap: 12 },
  style: St({
    tilt: "strong",
    tiltGlare: true,
    surfacePreset: "glass",
    surfaceTint: "rgba(142,232,255,0.22)",
    composition: "layered",
    background: "#0b1628",
  }),
  slots: {
    children: [
      t("bp-topline", "Concept 07 / Modern Barn   ·   142 m²"),
      createPageBlockV2("customSvg", {
        id: "bp-svg",
        props: { svg: HOUSE, drawIn: true, drawSpeed: 2600, label: "Modern Barn blueprint" },
      }),
      h("chip-a", "+ duże przeszklenia", "h3", "center", {
        decoration: { motion: "float", duration: 6000 },
        layer: { x: 6, y: 18, anchor: "top-left" },
        background: "#8ee8ff",
      }),
      h("chip-b", "A++ ready", "h3", "center", {
        decoration: { motion: "drift", duration: 11000 },
        layer: { x: 88, y: 30, anchor: "top-right" },
        background: "#c7b7ff",
      }),
      h("chip-c", "VR / 3D", "h3", "center", {
        decoration: { motion: "pulse", duration: 2600 },
        layer: { x: 84, y: 86, anchor: "bottom-right" },
        background: "#adffd8",
      }),
      t("bp-dash", "3 warianty układu   ·   21 dni koncepcja   ·   96% światło dzienne"),
    ],
  },
});

const hero: PageSectionV2 = createPageSectionV2("hero", {
  id: "sec-hero",
  variant: "split",
  name: "Hero",
  layout: { columns: 2, align: "center", justify: "between", maxWidth: 1180 },
  style: Ss({
    background: "#07111f",
    backgroundType: "color",
    accent: "#8ee8ff",
    surfacePreset: "ambient-orbs",
    composition: "layered",
    radius: 28,
    fullBleed: true,
  }),
  spacing: { paddingTop: 96, paddingRight: 48, paddingBottom: 96, paddingLeft: 48, gap: 48 },
  blocks: [
    createPageBlockV2("group", {
      id: "hero-copy",
      props: { direction: "column", wrap: false, gap: 18 },
      slots: {
        children: [
          h("eyebrow", "◆  Pracownia projektów domów przyszłości", "h3", "left", {
            background: "rgba(255,255,255,.06)",
          }),
          h("hero-h1", "Dom, który wygląda jak przyszłość — i czuje się jak Ty.", "h1", "left"),
          t(
            "hero-lead",
            "Projektujemy domy jednorodzinne z efektem „wow”: czyste bryły, światło, funkcjonalny układ i wizualizacje, które pozwalają poczuć przestrzeń zanim powstanie pierwszy fundament."
          ),
          createPageBlockV2("group", {
            id: "hero-actions",
            props: { direction: "row", wrap: true, gap: 14 },
            slots: {
              children: [
                btn("cta-1", "Zaprojektujmy Twój dom", "/kontakt"),
                btn("cta-2", "Zobacz projekty", "/projekty"),
              ],
            },
          }),
          t("trust", "Projekty indywidualne    ·    Wizualizacje 3D    ·    Proces online"),
        ],
      },
    }),
    blueprintCard,
  ],
});

const ticker: PageSectionV2 = createPageSectionV2("cta", {
  id: "sec-ticker",
  variant: "default",
  style: Ss({ background: "#0b1628" }),
  spacing: { paddingTop: 28, paddingRight: 0, paddingBottom: 28, paddingLeft: 0, gap: 0 },
  blocks: [
    createPageBlockV2("group", {
      id: "ticker-mq",
      props: { direction: "row", wrap: false, gap: 40 },
      style: St({ marquee: { direction: "left", speed: 18 } }),
      slots: {
        children: [
          "minimalizm",
          "światło",
          "komfort",
          "technologia",
          "natura",
          "minimalizm",
          "światło",
          "komfort",
        ].map((w, i) => t(`tk-${i}`, `${w}  ✦`)),
      },
    }),
  ],
});

const svc = (id: string, num: string, title: string, body: string, revealDelay: number) =>
  createPageBlockV2("group", {
    id,
    props: { direction: "column", wrap: false, gap: 10 },
    style: St({
      tilt: "subtle",
      tiltGlare: true,
      surfacePreset: "glass",
      surfaceTint: "rgba(199,183,255,0.20)",
      hoverEffect: "lift-glow",
      background: "#0b1628",
      revealDelay,
    }),
    slots: {
      children: [
        h(`${id}-n`, num, "h3", "left", { background: "rgba(142,232,255,.16)" }),
        h(`${id}-t`, title, "h3", "left"),
        t(`${id}-b`, body),
      ],
    },
  });
const services: PageSectionV2 = createPageSectionV2("cta", {
  id: "sec-services",
  variant: "default",
  style: Ss({ scrollEffect: "reveal-up", background: "#07111f", fullBleed: true }),
  layout: { columns: 3, align: "start", justify: "between", maxWidth: 1180 },
  spacing: { paddingTop: 96, paddingRight: 48, paddingBottom: 96, paddingLeft: 48, gap: 24 },
  blocks: [
    h("svc-head", "Architektura, która od pierwszego spojrzenia mówi: to mój dom.", "h2", "left"),
    svc(
      "svc-1",
      "01",
      "Projekty indywidualne",
      "Dom od zera dopasowany do działki, światła, stylu życia i budżetu inwestora.",
      0
    ),
    svc(
      "svc-2",
      "02",
      "Adaptacje gotowych projektów",
      "Modernizacja gotowego projektu tak, żeby nie wyglądał jak kompromis.",
      140
    ),
    svc(
      "svc-3",
      "03",
      "Wizualizacje 3D",
      "Fotorealistyczne ujęcia, animacje bryły i materiały, które budują emocje.",
      280
    ),
  ],
});

const ctaSection: PageSectionV2 = createPageSectionV2("cta", {
  id: "sec-cta",
  variant: "default",
  style: Ss({ scrollEffect: "reveal-fade", background: "#0b1628" }),
  spacing: { paddingTop: 96, paddingRight: 48, paddingBottom: 96, paddingLeft: 48, gap: 18 },
  blocks: [
    createPageBlockV2("group", {
      id: "cta-card",
      props: { direction: "column", wrap: false, gap: 16 },
      style: St({ surfacePreset: "radial-glow", background: "#0b1628" }),
      slots: {
        children: [
          h("cta-h", "Zaprojektujmy dom, który poczujesz zanim powstanie.", "h2", "center"),
          btn("cta-btn", "Zacznij projekt", "/kontakt"),
        ],
      },
    }),
  ],
});

const rawDoc: PageDocumentV2 = {
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: { title: "Projekty domów — pracownia" },
  settings: {
    template: "page-v2",
    showInNav: true,
    background: "linear-gradient(180deg, #07111f 0%, #0b1628 55%, #06101b 100%)",
    effects: {
      cursorSpotlight: true,
      spotlightColor: "rgba(142,232,255,0.14)",
      spotlightSize: 460,
    },
  } as PageDocumentV2["settings"],
  sections: [hero, ticker, services, ctaSection],
};

const doc = normalizePageDocumentV2ForWrite(rawDoc);
const out = `${import.meta.dir}/../_docs/_DEMO/projekty-domow.page.json`;
writeFileSync(out, JSON.stringify(doc, null, 2));
console.log("WROTE", out, "sections=", doc.sections.length);
