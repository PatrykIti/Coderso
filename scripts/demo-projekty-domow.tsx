/**
 * Demo seed: the "Projekty domów" wow-page rebuilt ENTIRELY from the TASK-522/521
 * page toolkit (custom-SVG blueprint block, tilt, floating-drift chips, glass,
 * ambient-orbs, marquee ticker, reveal, cursor spotlight). Emits the normalized
 * PageDocumentV2 JSON to _docs/_DEMO/projekty-domow.page.json so the content is
 * durable + publishable via the admin API. Run: `bun scripts/demo-projekty-domow.tsx`.
 *
 * Section order: [hero, intro, services, wowPanel, featuredProjects, process, cta].
 * The prototype lives in _docs/projekty-domow-wow-site/. Every section carries a
 * capabilityGaps note documenting where a prototype effect had no toolkit
 * equivalent (multi-layer gradients, JS interactivity, em letter-spacing, etc.).
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

// ---- shared helpers (SINGLE definition each; reused across every section) ----
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

// =========================================================================
// hero
// capabilityGaps: pill radius 999px clamped to 64 (renders fully round on short
// chips); eyebrow uppercase+accent-dash approximated with literal uppercase + em
// dash + aqua textColor + letterSpacing 0.08; primary/secondary button gradients
// flattened to single colors (#eaf3ff / rgba(255,255,255,.08)); aqua glow shadow
// dropped (shadow is an enum); statistic renders value+label in the renderer's own
// order (caption emptied); trust pills are `badge` size sm; JS cursor-glow / tilt
// math / draw-in timing / floatOrb-chip-pulseRing keyframes / scroll-hint
// approximated via ambient-orbs + tilt:strong+glare + customSvg drawIn +
// decoration.motion + page cursorSpotlight; sun-ring + blueprint grid pseudo-
// elements omitted (glass surface + surfaceTint stand in).
// =========================================================================
const heroTrustPill = (id: string, text: string) =>
  createPageBlockV2("badge", {
    id,
    props: {
      text,
      variant: "soft",
      size: "sm",
      shape: "pill",
      weight: "medium",
      background: "rgba(255,255,255,0.075)",
      textColor: "#dce7f5",
    },
    style: St({
      borderColor: "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderStyle: "solid",
      radius: 64,
      padding: { top: 9, right: 12, bottom: 9, left: 12 },
    }),
  });

const heroStatTile = (id: string, value: string, caption: string) =>
  createPageBlockV2("statistic", {
    id,
    props: { value, label: caption, caption: "" },
    style: St({
      background: "rgba(6,16,29,0.52)",
      backgroundType: "color",
      textColor: "#f7fbff",
      borderColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderStyle: "solid",
      radius: 20,
      padding: { top: 15, right: 15, bottom: 15, left: 15 },
    }),
  });

const blueprintCard = createPageBlockV2("group", {
  id: "hero-blueprint-card",
  props: { direction: "column", wrap: false, gap: 12 },
  style: St({
    tilt: "strong",
    tiltGlare: true,
    surfacePreset: "glass",
    surfaceTint: "rgba(142,232,255,0.22)",
    composition: "layered",
    background: "#0b1628",
    radius: 34,
    borderColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderStyle: "solid",
  }),
  slots: {
    children: [
      t("hero-bp-topline", "Concept 07 / Modern Barn   ·   142 m²"),
      createPageBlockV2("customSvg", {
        id: "hero-bp-svg",
        props: { svg: HOUSE, drawIn: true, drawSpeed: 2600, label: "Modern Barn blueprint" },
      }),
      h("hero-chip-a", "+ duże przeszklenia", "h3", "center", {
        decoration: { motion: "float", duration: 6000 },
        layer: { x: 6, y: 18, anchor: "top-left" },
        background: "rgba(255,255,255,0.075)",
        textColor: "#dce7f5",
        borderColor: "rgba(255,255,255,0.13)",
        borderWidth: 1,
        borderStyle: "solid",
        radius: 64,
        fontSize: "xs",
      }),
      h("hero-chip-b", "A++ ready", "h3", "center", {
        decoration: { motion: "drift", duration: 11000 },
        layer: { x: 88, y: 30, anchor: "top-right" },
        background: "rgba(255,255,255,0.075)",
        textColor: "#dce7f5",
        borderColor: "rgba(255,255,255,0.13)",
        borderWidth: 1,
        borderStyle: "solid",
        radius: 64,
        fontSize: "xs",
      }),
      h("hero-chip-c", "VR / 3D", "h3", "center", {
        decoration: { motion: "pulse", duration: 2600 },
        layer: { x: 84, y: 86, anchor: "bottom-right" },
        background: "rgba(255,255,255,0.075)",
        textColor: "#dce7f5",
        borderColor: "rgba(255,255,255,0.13)",
        borderWidth: 1,
        borderStyle: "solid",
        radius: 64,
        fontSize: "xs",
      }),
      createPageBlockV2("group", {
        id: "hero-mini-dashboard",
        props: { direction: "row", wrap: false, gap: 10 },
        slots: {
          children: [
            heroStatTile("hero-stat-1", "3", "warianty układu"),
            heroStatTile("hero-stat-2", "21 dni", "koncepcja"),
            heroStatTile("hero-stat-3", "96%", "światło dzienne"),
          ],
        },
      }),
    ],
  },
});

const hero: PageSectionV2 = createPageSectionV2("hero", {
  id: "hero-sec",
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
  spacing: { paddingTop: 120, paddingRight: 48, paddingBottom: 80, paddingLeft: 48, gap: 56 },
  blocks: [
    createPageBlockV2("group", {
      id: "hero-copy",
      props: { direction: "column", wrap: false, gap: 18 },
      slots: {
        children: [
          h("hero-eyebrow", "— PRACOWNIA PROJEKTÓW DOMÓW PRZYSZŁOŚCI", "h3", "left", {
            textColor: "#8ee8ff",
            fontSize: "xs",
            fontWeight: "bold",
            letterSpacing: 0.08,
          }),
          h("hero-h1", "Dom, który wygląda jak przyszłość — i czuje się jak Ty.", "h1", "left", {
            textColor: "#f7fbff",
            letterSpacing: -0.03,
          }),
          t(
            "hero-lead",
            "Projektujemy domy jednorodzinne z efektem „wow”: czyste bryły, światło, funkcjonalny układ i wizualizacje, które pozwalają poczuć przestrzeń zanim powstanie pierwszy fundament."
          ),
          createPageBlockV2("group", {
            id: "hero-actions",
            props: { direction: "row", wrap: true, gap: 14 },
            slots: {
              children: [
                createPageBlockV2("button", {
                  id: "hero-cta-1",
                  props: {
                    label: "Zaprojektujmy Twój dom",
                    href: "/kontakt",
                    target: "self",
                    variant: "primary",
                    size: "lg",
                  },
                  style: St({
                    background: "#eaf3ff",
                    textColor: "#07111f",
                    radius: 64,
                    fontWeight: "bold",
                  }),
                }),
                createPageBlockV2("button", {
                  id: "hero-cta-2",
                  props: {
                    label: "Zobacz projekty",
                    href: "/projekty",
                    target: "self",
                    variant: "secondary",
                    size: "lg",
                  },
                  style: St({
                    background: "rgba(255,255,255,0.08)",
                    textColor: "#f7fbff",
                    borderColor: "rgba(255,255,255,0.14)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    radius: 64,
                    fontWeight: "bold",
                  }),
                }),
              ],
            },
          }),
          createPageBlockV2("group", {
            id: "hero-trust-row",
            props: { direction: "row", wrap: true, gap: 10 },
            slots: {
              children: [
                heroTrustPill("hero-trust-1", "Projekty indywidualne"),
                heroTrustPill("hero-trust-2", "Wizualizacje 3D"),
                heroTrustPill("hero-trust-3", "Proces online"),
              ],
            },
          }),
        ],
      },
    }),
    blueprintCard,
  ],
});

// =========================================================================
// intro
// capabilityGaps: .intro-strip top/bottom hairline border-block dropped (no per-edge
// section border) — only the semi-transparent fill remains; 1fr/1.2fr grid ratio
// approximated with even columns:2 + justify:between; the CSS single-set ticker loop
// is reproduced by duplicating the 5 tags into 10 for a seamless toolkit marquee;
// lineHeight set to 1.5 (vs global 1.75); 1.1rem lead -> `lg`; pill 999px -> clamped
// but still fully round.
// =========================================================================
const introPill = (id: string, word: string) =>
  createPageBlockV2("text", {
    id,
    props: { text: word, format: "plain", align: "center" },
    style: St({
      textColor: "#a8b5c7",
      background: "rgba(255,255,255,.045)",
      backgroundType: "color",
      borderColor: "rgba(255,255,255,.12)",
      borderWidth: 1,
      borderStyle: "solid",
      radius: 64,
      padding: { top: 10, right: 16, bottom: 10, left: 16 },
      fontSize: "sm",
    }),
  });

const intro: PageSectionV2 = createPageSectionV2("content", {
  id: "sec-intro",
  variant: "split",
  name: "Intro strip + ticker",
  layout: { columns: 2, align: "center", justify: "between", maxWidth: 1180 },
  style: Ss({
    background: "rgba(255,255,255,.035)",
    backgroundType: "color",
    accent: "#8ee8ff",
    fullBleed: true,
    composition: "flow",
  }),
  spacing: { paddingTop: 26, paddingRight: 48, paddingBottom: 26, paddingLeft: 48, gap: 26 },
  blocks: [
    createPageBlockV2("text", {
      id: "intro-lead",
      props: {
        text: "Nie robimy katalogowych „pudełek”. Tworzymy domy, które dobrze wyglądają, dobrze działają i dobrze się starzeją.",
        format: "plain",
        align: "left",
      },
      style: St({
        column: 1,
        textColor: "#e6eef8",
        fontSize: "lg",
        lineHeight: 1.5,
      }),
    }),
    createPageBlockV2("group", {
      id: "intro-ticker",
      props: { direction: "row", wrap: false, gap: 12 },
      style: St({
        column: 2,
        marquee: { direction: "left", speed: 18 },
      }),
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
          "technologia",
          "natura",
        ].map((w, i) => introPill(`intro-pill-${i}`, w)),
      },
    }),
  ],
});

// =========================================================================
// services
// capabilityGaps: card diagonal glass gradient approximated with glass surfacePreset +
// surfaceTint over solid #0b1628; :after aqua hover glow + JS 3D tilt -> hoverEffect
// lift-glow + tilt subtle + glare (toolkit-driven direction); .icon-orb 54x54 square ->
// centered aqua h3 (content/padding sized, not a strict square); em letter-spacing ->
// numeric magnitudes; rem/clamp font-sizes -> nearest tokens (4xl / 2xl / xl / xs);
// aqua inline text link -> button block with "→"; .split-head side-by-side head/lead ->
// stacked full-width header group; reveal delays use the brief's 0/140/280 stagger.
// =========================================================================
const servicesCard = (
  slug: string,
  num: string,
  title: string,
  body: string,
  linkLabel: string,
  linkHref: string,
  revealDelay: number
) =>
  createPageBlockV2("group", {
    id: `services-card-${slug}`,
    props: { direction: "column", wrap: false, gap: 0 },
    style: St({
      surfacePreset: "glass",
      surfaceTint: "rgba(255,255,255,0.105)",
      background: "#0b1628",
      borderColor: "rgba(255,255,255,.13)",
      borderWidth: 1,
      borderStyle: "solid",
      radius: 28,
      shadow: "lg",
      padding: { top: 28, right: 28, bottom: 28, left: 28 },
      tilt: "subtle",
      tiltGlare: true,
      hoverEffect: "lift-glow",
      composition: "layered",
      revealDelay,
    }),
    slots: {
      children: [
        h(`services-orb-${slug}`, num, "h3", "center", {
          background: "rgba(142,232,255,.16)",
          textColor: "#8ee8ff",
          borderColor: "rgba(142,232,255,.22)",
          borderWidth: 1,
          borderStyle: "solid",
          radius: 20,
          fontWeight: "bold",
          fontSize: "xl",
          padding: { top: 12, right: 12, bottom: 12, left: 12 },
        }),
        h(`services-title-${slug}`, title, "h3", "left", {
          fontSize: "2xl",
          fontWeight: "semibold",
          letterSpacing: -0.03,
          textColor: "#f7fbff",
          margin: { top: 28, right: 0, bottom: 10, left: 0 },
        }),
        t(`services-body-${slug}`, body, "left"),
        btn(`services-link-${slug}`, linkLabel, linkHref),
      ],
    },
  });

const services: PageSectionV2 = createPageSectionV2("feature-grid", {
  id: "sec-services",
  variant: "cards",
  name: "Co projektujemy",
  layout: { columns: 3, align: "stretch", justify: "start", maxWidth: 1180 },
  style: Ss({
    background: "#07111f",
    backgroundType: "color",
    accent: "#8ee8ff",
    scrollEffect: "reveal-up",
    radius: 28,
  }),
  spacing: { paddingTop: 112, paddingRight: 40, paddingBottom: 112, paddingLeft: 40, gap: 18 },
  blocks: [
    createPageBlockV2("group", {
      id: "services-head",
      props: { direction: "column", wrap: false, gap: 14 },
      style: St({ width: "full" }),
      slots: {
        children: [
          h("services-eyebrow", "◆  Co projektujemy", "h3", "left", {
            textColor: "#8ee8ff",
            fontSize: "xs",
            fontWeight: "semibold",
            letterSpacing: 0.08,
          }),
          h(
            "services-h2",
            "Architektura, która od pierwszego spojrzenia mówi: to mój dom.",
            "h2",
            "left",
            {
              fontSize: "4xl",
              fontWeight: "bold",
              lineHeight: 1.08,
              letterSpacing: -0.04,
              textColor: "#f7fbff",
            }
          ),
          t(
            "services-lead",
            "Prowadzimy Cię spokojnie, krok po kroku — od pierwszego zachwytu, przez poczucie, że jesteś w dobrych rękach, aż po jasny plan działania."
          ),
        ],
      },
    }),
    servicesCard(
      "01",
      "01",
      "Projekty indywidualne",
      "Dom od zera dopasowany do działki, światła, stylu życia i budżetu inwestora.",
      "Poznaj zakres →",
      "/oferta#indywidualne",
      0
    ),
    servicesCard(
      "02",
      "02",
      "Adaptacje gotowych projektów",
      "Modernizacja gotowego projektu tak, żeby nie wyglądał jak kompromis.",
      "Sprawdź adaptacje →",
      "/oferta#adaptacje",
      140
    ),
    servicesCard(
      "03",
      "03",
      "Wizualizacje 3D",
      "Fotorealistyczne ujęcia, animacje bryły i materiały, które budują emocje.",
      "Zobacz możliwości →",
      "/oferta#wizualizacje",
      280
    ),
  ],
});

// =========================================================================
// wowPanel
// capabilityGaps: live JS style-switcher (barn/villa/eco swap) not reproducible — ships
// the barn state statically, pills are non-clickable badges (first active-styled);
// morphing clip-path shapes -> single static barn customSvg; multi-layer preview/panel
// gradients -> radial-glow + glass surfacePresets over flat backgrounds (outer :before
// strip dropped); eyebrow gradient dash + text-transform -> ◆ glyph + aqua + 0.08 spacing;
// tablist/aria + per-section reveal not represented.
// =========================================================================
const WOWPANEL_HOUSE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 210" role="img">' +
  '<defs><linearGradient id="wowPanelHouse" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="rgba(255,255,255,.82)"/>' +
  '<stop offset="1" stop-color="rgba(184,244,255,.54)"/></linearGradient></defs>' +
  '<path d="M20 200 L20 92 L160 12 L300 92 L300 200 Z" fill="url(#wowPanelHouse)" ' +
  'stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-linejoin="round"/>' +
  '<rect x="128" y="118" width="64" height="58" rx="6" fill="rgba(8,17,31,.72)" ' +
  'stroke="rgba(142,232,255,.55)" stroke-width="2"/>' +
  '<line x1="160" y1="118" x2="160" y2="176" stroke="rgba(142,232,255,.35)" stroke-width="2"/>' +
  '<line x1="128" y1="147" x2="192" y2="147" stroke="rgba(142,232,255,.35)" stroke-width="2"/></svg>';

const wowPanelPill = (id: string, label: string, active: boolean) =>
  createPageBlockV2("badge", {
    id,
    props: {
      text: label,
      variant: active ? "solid" : "outline",
      size: "md",
      shape: "pill",
      weight: "semibold",
      background: active ? "#f7fbff" : "rgba(255,255,255,.07)",
      textColor: active ? "#07111f" : "#a8b5c7",
    },
    style: St({
      borderColor: "rgba(255,255,255,.14)",
      borderWidth: 1,
      borderStyle: "solid",
      padding: { top: 12, right: 15, bottom: 12, left: 15 },
    }),
  });

const wowPanel: PageSectionV2 = createPageSectionV2("media-split", {
  id: "wowPanel-sec",
  variant: "split",
  name: "Interaktywny panel wyboru stylu",
  layout: { columns: 2, align: "center", justify: "between", maxWidth: 1180 },
  style: Ss({
    background: "rgba(255,255,255,.06)",
    backgroundType: "color",
    accent: "#8ee8ff",
    surfacePreset: "glass",
    composition: "flow",
    radius: 38,
    shadow: "lg",
  }),
  spacing: { paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24, gap: 24 },
  blocks: [
    createPageBlockV2("group", {
      id: "wowPanel-copy",
      props: { direction: "column", wrap: false, gap: 18 },
      style: St({ padding: { top: 38, right: 38, bottom: 38, left: 38 } }),
      slots: {
        children: [
          h("wowPanel-eyebrow", "◆  Interaktywne doświadczenie", "h3", "left", {
            textColor: "#8ee8ff",
            fontSize: "2xs",
            fontWeight: "semibold",
            letterSpacing: 0.08,
            background: "rgba(255,255,255,.06)",
          }),
          h("wowPanel-h2", "Wybierz klimat, w którym czujesz się jak u siebie.", "h2", "left", {
            textColor: "#f7fbff",
            letterSpacing: -0.04,
            lineHeight: 1.08,
          }),
          createPageBlockV2("text", {
            id: "wowPanel-lead",
            props: {
              text: "Przełącz się między charakterami domu i zobacz, jak zmienia się bryła, materiały i nastrój — od nowoczesnej stodoły, przez miejską willę, po dom eko.",
              format: "plain",
              align: "left",
            },
            style: St({ textColor: "#a8b5c7", fontSize: "lg", lineHeight: 1.75 }),
          }),
          createPageBlockV2("group", {
            id: "wowPanel-switcher",
            props: { direction: "row", wrap: true, gap: 10 },
            style: St({ margin: { top: 28, right: 0, bottom: 0, left: 0 } }),
            slots: {
              children: [
                wowPanelPill("wowPanel-pill-barn", "Nowoczesna stodoła", true),
                wowPanelPill("wowPanel-pill-villa", "Miejska willa", false),
                wowPanelPill("wowPanel-pill-eco", "Dom eko", false),
              ],
            },
          }),
        ],
      },
    }),
    createPageBlockV2("group", {
      id: "wowPanel-preview",
      props: { direction: "column", wrap: false, gap: 16 },
      style: St({
        surfacePreset: "radial-glow",
        surfaceTint: "rgba(142,232,255,0.18)",
        composition: "layered",
        background: "rgba(8,17,31,.72)",
        radius: 30,
        borderColor: "rgba(255,255,255,.14)",
        borderWidth: 1,
        borderStyle: "solid",
        padding: { top: 28, right: 28, bottom: 28, left: 28 },
        align: "center",
      }),
      slots: {
        children: [
          h("wowPanel-label", "Modern Barn", "h3", "center", {
            textColor: "#8ee8ff",
            fontSize: "2xs",
            fontWeight: "bold",
            letterSpacing: 0.08,
          }),
          createPageBlockV2("customSvg", {
            id: "wowPanel-house",
            props: {
              svg: WOWPANEL_HOUSE_SVG,
              drawIn: false,
              label: "Modern Barn — pitched-roof house silhouette",
            },
            style: St({ align: "center", width: "full" }),
          }),
          createPageBlockV2("text", {
            id: "wowPanel-house-copy",
            props: {
              text: "Prosta, elegancka bryła, wysoki salon, naturalne materiały i duże przeszklenia otwierające dom na ogród.",
              format: "plain",
              align: "center",
            },
            style: St({ textColor: "#a8b5c7", lineHeight: 1.75 }),
          }),
        ],
      },
    }),
  ],
});

// =========================================================================
// featuredProjects
// capabilityGaps: two-layer art-* header background (radial glow over base linear-
// gradient) rejected by the single-layer sanitizer -> uses only the BASE linear-
// gradient, glow approximated via the art group's surfaceTint; .project-card.large
// grid-row span 2 + 1.15fr/.85fr asymmetric grid not expressible -> 3 equal columns,
// Aurora featured via a taller art-header padding; house silhouette :after + darkening
// :before overlays omitted; hover shifts border/silhouette dropped (only card lift via
// hoverEffect lift); per-card reveal stagger 0/80/160 via revealDelay; badge weight 950
// clamped to bold.
// =========================================================================
const fpArtGradients: Record<string, string> = {
  aurora: "linear-gradient(135deg,#39445c,#101827 58%,#050b13)",
  linea: "linear-gradient(135deg,#463b60,#101827 58%,#060b14)",
  nova: "linear-gradient(135deg,#5d4937,#121a23 58%,#050b13)",
};
const fpArtTint: Record<string, string> = {
  aurora: "rgba(142,232,255,0.28)",
  linea: "rgba(199,183,255,0.26)",
  nova: "rgba(255,215,168,0.26)",
};
const fpCard = (
  slug: "aurora" | "linea" | "nova",
  badgeLabel: string,
  title: string,
  meta: string,
  large: boolean,
  revealDelay: number
) =>
  createPageBlockV2("group", {
    id: `featuredProjects-card-${slug}`,
    props: { direction: "column", wrap: false, gap: 0 },
    style: St({
      radius: 28,
      background: "rgba(255,255,255,.05)",
      borderColor: "rgba(255,255,255,.13)",
      borderWidth: 1,
      borderStyle: "solid",
      shadow: "lg",
      hoverEffect: "lift",
      revealDelay,
    }),
    slots: {
      children: [
        createPageBlockV2("group", {
          id: `featuredProjects-art-${slug}`,
          props: { direction: "column", wrap: false, gap: 0 },
          style: St({
            background: fpArtGradients[slug],
            backgroundType: "gradient",
            surfaceTint: fpArtTint[slug],
            radius: 28,
            align: "start",
            padding: large
              ? { top: 132, right: 22, bottom: 22, left: 22 }
              : { top: 86, right: 22, bottom: 22, left: 22 },
          }),
          slots: {
            children: [
              createPageBlockV2("badge", {
                id: `featuredProjects-badge-${slug}`,
                props: {
                  text: badgeLabel,
                  variant: "solid",
                  size: "sm",
                  shape: "pill",
                  weight: "bold",
                  background: "rgba(255,255,255,.84)",
                  textColor: "#06101b",
                },
                style: St({ letterSpacing: 0.18, align: "start" }),
              }),
            ],
          },
        }),
        createPageBlockV2("group", {
          id: `featuredProjects-info-${slug}`,
          props: { direction: "column", wrap: false, gap: 4 },
          style: St({ padding: { top: 18, right: 20, bottom: 18, left: 20 } }),
          slots: {
            children: [
              h(`featuredProjects-title-${slug}`, title, "h3", "left", {
                fontSize: "xl",
                letterSpacing: -0.03,
                textColor: "#f7fbff",
              }),
              t(`featuredProjects-meta-${slug}`, meta),
            ],
          },
        }),
      ],
    },
  });

const featuredProjects: PageSectionV2 = createPageSectionV2("feature-grid", {
  id: "featuredProjects",
  variant: "grid",
  name: "Wybrane realizacje",
  layout: { columns: 3, align: "stretch", justify: "between", maxWidth: 1180 },
  style: Ss({
    background: "#07111f",
    backgroundType: "color",
    accent: "#8ee8ff",
    scrollEffect: "reveal-up",
    fullBleed: true,
  }),
  spacing: { paddingTop: 96, paddingRight: 48, paddingBottom: 96, paddingLeft: 48, gap: 18 },
  blocks: [
    h("featuredProjects-eyebrow", "◆  Wybrane realizacje", "h3", "left", {
      textColor: "#8ee8ff",
      letterSpacing: 0.08,
      fontSize: "xs",
      fontWeight: "semibold",
    }),
    h(
      "featuredProjects-head",
      "Domy, które chce się oglądać jak ulubiony album z architekturą.",
      "h2",
      "left",
      { letterSpacing: -0.04, textColor: "#f7fbff" }
    ),
    createPageBlockV2("button", {
      id: "featuredProjects-portfolio",
      props: { label: "Pełne portfolio", href: "/projekty", target: "self", variant: "secondary" },
    }),
    fpCard(
      "aurora",
      "Aurora",
      "Dom Aurora",
      "Nowoczesna stodoła · 142 m² · ogród południowy",
      true,
      0
    ),
    fpCard("linea", "Linea", "Dom Linea", "Minimalistyczna willa · 188 m²", false, 80),
    fpCard("nova", "Nova", "Dom Nova", "Parterowy premium · 121 m²", false, 160),
  ],
});

// =========================================================================
// process
// capabilityGaps: two-column .split-head (h2 left / lead pinned right) -> stacked full-
// width header; step body color inherits section muted text (t() has no textColor) vs
// explicit #a8b5c7; per-card stagger 0/70/140/210 via revealDelay + section reveal-up
// (engine easing); faint vertical wash overlay dropped (base #07111f color); number
// weight 950 -> bold + xl + aqua; static prototype cards given a subtle hoverEffect lift.
// =========================================================================
const processStep = (id: string, num: string, title: string, body: string, revealDelay: number) =>
  createPageBlockV2("group", {
    id,
    props: { direction: "column", wrap: false, gap: 8 },
    style: St({
      background: "rgba(255,255,255,.055)",
      backgroundType: "color",
      borderColor: "rgba(255,255,255,.12)",
      borderWidth: 1,
      borderStyle: "solid",
      radius: 24,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      hoverEffect: "lift",
      revealDelay,
    }),
    slots: {
      children: [
        h(`${id}-n`, num, "h3", "left", {
          textColor: "#8ee8ff",
          fontWeight: "bold",
          fontSize: "xl",
          letterSpacing: -0.02,
        }),
        h(`${id}-t`, title, "h3", "left", {
          textColor: "#f7fbff",
          letterSpacing: -0.03,
          margin: { top: 12, right: 0, bottom: 0, left: 0 },
        }),
        t(`${id}-b`, body),
      ],
    },
  });

const process: PageSectionV2 = createPageSectionV2("feature-grid", {
  id: "process-section",
  variant: "grid",
  name: "Proces bez chaosu",
  layout: { columns: 4, align: "start", justify: "between", maxWidth: 1180 },
  style: Ss({
    background: "#07111f",
    backgroundType: "color",
    accent: "#8ee8ff",
    scrollEffect: "reveal-up",
    fullBleed: true,
  }),
  spacing: { paddingTop: 112, paddingRight: 48, paddingBottom: 112, paddingLeft: 48, gap: 14 },
  blocks: [
    createPageBlockV2("group", {
      id: "process-head",
      props: { direction: "column", wrap: false, gap: 14 },
      style: St({ width: "full", margin: { top: 0, right: 0, bottom: 20, left: 0 } }),
      slots: {
        children: [
          h("process-eyebrow", "—  Proces bez chaosu", "h3", "left", {
            textColor: "#8ee8ff",
            fontWeight: "semibold",
            fontSize: "xs",
            letterSpacing: 0.08,
          }),
          h("process-h2", "Od pierwszej rozmowy do gotowego projektu.", "h2", "left", {
            textColor: "#f7fbff",
            letterSpacing: -0.04,
            lineHeight: 1.08,
          }),
          t(
            "process-lead",
            "Każdy etap ma prosty cel, jasne decyzje i materiały wizualne, które ułatwiają wybór."
          ),
        ],
      },
    }),
    processStep(
      "process-step-1",
      "01",
      "Brief i działka",
      "Analiza potrzeb, ograniczeń, stron świata i potencjału widokowego.",
      0
    ),
    processStep(
      "process-step-2",
      "02",
      "Koncepcja wow",
      "Układ funkcjonalny, bryła, nastrój i pierwsze wizualizacje.",
      70
    ),
    processStep(
      "process-step-3",
      "03",
      "Projekt budowlany",
      "Dokumentacja techniczna i koordynacja branżowa.",
      140
    ),
    processStep(
      "process-step-4",
      "04",
      "Wsparcie",
      "Konsultacje materiałowe, zmiany i przygotowanie do budowy.",
      210
    ),
  ],
});

// =========================================================================
// cta
// capabilityGaps: .button.magnetic JS pointer-follow -> hoverEffect lift; .cta-card
// compound radial+linear gradient -> radial-glow surfacePreset + surfaceTint over flat
// glass background (glow anchor preset-driven); .primary 3-stop gradient/glow -> primary
// variant tokens; eyebrow gradient dash -> ◆ glyph; desktop flex row -> centered single-
// column stack (matches the ≤1060px collapse); clamp() font-sizes -> nearest tokens
// (3xl / xs).
// =========================================================================
const ctaPrimaryBtn = (id: string, label: string, href: string) =>
  createPageBlockV2("button", {
    id,
    props: { label, href, target: "self", variant: "primary", size: "lg" },
    style: St({ align: "center", hoverEffect: "lift" }),
  });

const cta: PageSectionV2 = createPageSectionV2("cta", {
  id: "sec-cta",
  variant: "centered",
  name: "CTA końcowe",
  layout: { columns: 1, align: "center", justify: "center", maxWidth: 1180 },
  style: Ss({
    background: "#0b1628",
    backgroundType: "color",
    accent: "#8ee8ff",
    scrollEffect: "reveal-fade",
  }),
  spacing: { paddingTop: 112, paddingRight: 48, paddingBottom: 112, paddingLeft: 48, gap: 0 },
  blocks: [
    createPageBlockV2("group", {
      id: "cta-card",
      props: { direction: "column", wrap: false, gap: 20 },
      style: St({
        surfacePreset: "radial-glow",
        surfaceTint: "rgba(142,232,255,0.23)",
        background: "rgba(255,255,255,0.08)",
        backgroundType: "color",
        radius: 38,
        shadow: "lg",
        borderColor: "rgba(255,255,255,0.14)",
        borderWidth: 1,
        borderStyle: "solid",
        align: "center",
        padding: { top: 38, right: 38, bottom: 38, left: 38 },
      }),
      slots: {
        children: [
          h("cta-eyebrow", "◆  Gotowy na własny dom?", "h3", "center", {
            textColor: "#8ee8ff",
            fontSize: "xs",
            fontWeight: "semibold",
            letterSpacing: 0.08,
            background: "rgba(142,232,255,.06)",
          }),
          h(
            "cta-heading",
            "Zaprojektujmy dom, do którego codziennie chce się wracać.",
            "h2",
            "center",
            {
              textColor: "#f7fbff",
              fontSize: "3xl",
              fontWeight: "bold",
              lineHeight: 1.08,
              letterSpacing: -0.04,
            }
          ),
          t(
            "cta-lead",
            "Napisz kilka słów o działce i stylu, który lubisz — odezwiemy się z pierwszym pomysłem na Twój dom.",
            "center"
          ),
          ctaPrimaryBtn("cta-button", "Umów konsultację", "/kontakt"),
        ],
      },
    }),
  ],
});

// ---- document assembly ----
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
  sections: [hero, intro, services, wowPanel, featuredProjects, process, cta],
};

const doc = normalizePageDocumentV2ForWrite(rawDoc);
const out = `${import.meta.dir}/../_docs/_DEMO/projekty-domow.page.json`;
writeFileSync(out, JSON.stringify(doc, null, 2));
console.log("WROTE", out, "sections=", doc.sections.length);
