import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import {
  badge,
  buildPageSeed,
  button,
  FORMA_COLORS,
  FORMA_GRADIENTS,
  group,
  heroHeading,
  list,
  section,
  sectionHeading,
  statistic,
  surface,
  text,
} from "./shared";

const homeHero = () =>
  section(
    "home-hero",
    "Hero",
    [
      group("home-hero-copy", [
        badge("home-eyebrow", "FORMA · FUNKCJA · DOM", { icon: "sparkles" }),
        heroHeading("home-title", "Dom zaczyna się od dobrego pomysłu"),
        text(
          "home-lead",
          "Projektujemy nowoczesne domy dopasowane do ludzi, działki i rytmu codzienności.",
          { fontSizeCustom: "clamp(1.05rem,2vw,1.35rem)" }
        ),
        group(
          "home-actions",
          [
            button("home-projects-cta", "Zobacz projekty", "/projekty", {
              magnetic: true,
              size: "lg",
            }),
            button("home-offer-cta", "Poznaj ofertę", "/oferta#zakres", {
              variant: "ghost",
              size: "lg",
            }),
          ],
          { direction: "row", wrap: true, gap: 14 }
        ),
        createPageBlockV2("scrollHint", {
          id: "home-scroll",
          props: { label: "Poznaj FormaDom", glyph: "chevron" },
          style: { textColor: FORMA_COLORS.cyan },
        }),
      ]),
      surface(
        "home-hero-blueprint",
        [
          badge("home-blueprint-badge", "PROJEKT 01 / AURORA", { icon: "star" }),
          sectionHeading("home-blueprint-title", "Światło. Spokój. Proporcja."),
          text(
            "home-blueprint-copy",
            "Zwarta bryła otwiera się na ogród, a czytelny podział stref upraszcza każdy dzień."
          ),
          group(
            "home-blueprint-stats",
            [
              statistic("home-area", "148 m²", "powierzchnia"),
              statistic("home-energy", "A+", "standard energii"),
            ],
            { direction: "row", wrap: true, gap: 12 }
          ),
        ],
        {
          background: FORMA_GRADIENTS.highlight,
          backgroundType: "gradient",
          glow: { color: "rgba(142,232,255,0.32)", blur: 54, spread: 4 },
          tilt: "subtle",
          tiltGlare: true,
          radius: 30,
        }
      ),
    ],
    {
      type: "hero",
      variant: "split",
      anchor: "start",
      layout: { columns: 2, maxWidth: 1240, align: "center" },
      style: {
        background: FORMA_GRADIENTS.hero,
        backgroundType: "gradient",
        columnTemplate: "minmax(0,1fr) minmax(420px,.9fr)",
        surfacePreset: "ambient-orbs",
        fullBleed: true,
        glow: { color: "rgba(142,232,255,0.2)", blur: 80, spread: 8 },
        noiseOverlay: true,
      },
      spacing: { paddingTop: 118, paddingBottom: 104, gap: 54 },
    }
  );

const feature = (id: string, number: string, title: string, copy: string, span = {}) =>
  surface(
    id,
    [
      badge(`${id}-number`, number, { icon: "check" }),
      sectionHeading(`${id}-title`, title),
      text(`${id}-copy`, copy),
    ],
    span
  );

export const buildHomePage = () =>
  buildPageSeed("home", "FormaDom — projekty domów", [
    homeHero(),
    section(
      "home-features",
      "Dlaczego FormaDom",
      [
        sectionHeading("home-features-title", "Projekt, który porządkuje życie", 3),
        feature(
          "home-feature-context",
          "01",
          "Zaczynamy od kontekstu",
          "Analizujemy słońce, widoki, sąsiedztwo i ograniczenia działki, zanim powstanie pierwszy rzut.",
          { colSpan: 2 }
        ),
        feature(
          "home-feature-decisions",
          "02",
          "Decyzje bez chaosu",
          "Każdy etap kończy się czytelnym rezultatem, zakresem decyzji i rekomendacją zespołu.",
          { rowSpan: 2, background: FORMA_GRADIENTS.cyan, backgroundType: "gradient" }
        ),
        feature(
          "home-feature-energy",
          "03",
          "Energia od początku",
          "Orientacja bryły, przeszklenia i instalacje tworzą jeden przemyślany standard."
        ),
        feature(
          "home-feature-support",
          "04",
          "Wsparcie aż do budowy",
          "Koordynujemy branże i pomagamy utrzymać sens projektu podczas realizacji."
        ),
      ],
      {
        type: "feature-grid",
        variant: "cards",
        anchor: "dlaczego",
        layout: { columns: 3 },
        style: {
          background: FORMA_COLORS.navy,
          scrollEffect: "reveal-up",
          border: {
            top: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
            right: { color: FORMA_COLORS.border, width: 2, style: "solid" },
            bottom: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
            left: { color: FORMA_COLORS.border, width: 2, style: "solid" },
          },
        },
      }
    ),
    section(
      "home-switcher",
      "Style domów",
      [
        group("home-switch-intro", [
          badge("home-switch-eyebrow", "TRZY KIERUNKI"),
          sectionHeading("home-switch-title", "Wybierz charakter, nie katalogową etykietę"),
          text(
            "home-switch-copy",
            "Każdy kierunek dopasowujemy do miejsca i programu. Forma wynika z potrzeb, nie odwrotnie."
          ),
        ]),
        createPageBlockV2("switcher", {
          id: "home-style-switcher",
          props: {
            tabs: [
              { id: "barn", label: "Nowoczesna stodoła" },
              { id: "villa", label: "Miejska willa" },
              { id: "eco", label: "Dom eko" },
            ],
            activeIndex: 0,
            variant: "pill",
          },
          style: {
            background: FORMA_COLORS.surface,
            backgroundType: "color",
            borderColor: FORMA_COLORS.border,
            borderWidth: 1,
            borderStyle: "solid",
            radius: 26,
            padding: { top: 24, right: 24, bottom: 24, left: 24 },
            glow: { color: "rgba(142,232,255,0.2)", blur: 36 },
          },
          slots: {
            "panel:1": [
              text("home-barn", "Prosta bryła, wysoka przestrzeń dzienna i naturalne materiały."),
              list("home-barn-list", ["otwarcie na ogród", "czytelny dach", "elastyczny układ"]),
            ],
            "panel:2": [
              text(
                "home-villa",
                "Kompaktowa elegancja, prywatne patio i światło prowadzone w głąb domu."
              ),
              list("home-villa-list", [
                "miejska działka",
                "chronione wnętrze",
                "tarasy na piętrze",
              ]),
            ],
            "panel:3": [
              text(
                "home-eco",
                "Niska energia użytkowa, zdrowy mikroklimat i materiały o długim życiu."
              ),
              list("home-eco-list", ["standard A+", "pasywne zyski", "gotowość na OZE"]),
            ],
          },
        }),
      ],
      {
        variant: "split",
        layout: { columns: 2, align: "center" },
        style: {
          columnTemplate: "1fr 1.2fr",
          background: FORMA_GRADIENTS.cyan,
          backgroundType: "gradient",
        },
      }
    ),
    section(
      "home-proof",
      "Dowody",
      [
        sectionHeading("home-proof-title", "Mniej obietnic, więcej mierzalnych decyzji", 4),
        statistic("home-proof-years", "12+", "lat praktyki", "architektura mieszkaniowa"),
        statistic("home-proof-houses", "86", "zaprojektowanych domów", "indywidualne historie"),
        statistic("home-proof-energy", "74%", "projektów A lub A+", "energooszczędny standard"),
        statistic("home-proof-rating", "4,9/5", "ocena współpracy", "po odbiorze projektu"),
      ],
      {
        type: "feature-grid",
        variant: "grid",
        layout: { columns: 4 },
        style: { background: FORMA_COLORS.ink, scrollEffect: "reveal-fade" },
      }
    ),
    section(
      "home-cta",
      "Rozpocznij projekt",
      [
        badge("home-cta-eyebrow", "PIERWSZY KROK"),
        sectionHeading("home-cta-title", "Opowiedz nam o miejscu, w którym chcesz zamieszkać"),
        text(
          "home-cta-copy",
          "Krótki brief wystarczy, byśmy wrócili z konkretną propozycją następnego kroku.",
          { align: "center" }
        ),
        button("home-contact-cta", "Umów rozmowę", "/kontakt#formularz", {
          magnetic: true,
          size: "lg",
          style: { align: "center" },
        }),
      ],
      {
        type: "cta",
        variant: "centered",
        layout: { columns: 1, align: "center", justify: "center", maxWidth: 920 },
        style: {
          background: FORMA_GRADIENTS.highlight,
          backgroundType: "gradient",
          surfacePreset: "radial-glow",
          glow: { color: "rgba(216,255,122,0.18)", blur: 50 },
        },
      }
    ),
  ]);
