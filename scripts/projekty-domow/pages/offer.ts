import {
  FORMA_DOM_PAGE_GRADIENTS,
  FORMA_DOM_PAGE_PALETTE,
  FORMA_DOM_PAGE_SEO_DESCRIPTION,
  badge,
  buildPageSeed,
  button,
  group,
  heroHeading,
  list,
  section,
  sectionHeading,
  surface,
  text,
} from "./shared";

const serviceSection = (input: {
  id: string;
  anchor?: string;
  number: string;
  title: string;
  copy: string;
  items: string[];
  cta?: { label: string; href: string };
}) =>
  section(
    input.id,
    input.title,
    [
      surface(`${input.id}-card`, [
        badge(`${input.id}-number`, input.number),
        sectionHeading(`${input.id}-title`, input.title),
        text(`${input.id}-copy`, input.copy),
        list(`${input.id}-items`, input.items),
        ...(input.cta ? [button(`${input.id}-cta`, input.cta.label, input.cta.href)] : []),
      ]),
    ],
    {
      type: "media-split",
      variant: "centered",
      anchor: input.anchor,
      layout: { columns: 1, maxWidth: 900 },
      style: {
        background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary,
        border: {
          bottom: { color: FORMA_DOM_PAGE_PALETTE.line, width: 1, style: "solid" },
        },
      },
    }
  );

const comparisonRow = (id: string, question: string, answer: string) =>
  surface(id, [sectionHeading(`${id}-question`, question), text(`${id}-answer`, answer)]);

export const buildOfferPage = () =>
  buildPageSeed({
    key: "oferta",
    route: "/oferta",
    seo: {
      title: "Oferta — FormaDom Studio",
      description: FORMA_DOM_PAGE_SEO_DESCRIPTION,
    },
    sections: [
      section(
        "offer-hero",
        "Oferta",
        [
          group("offer-hero-copy", [
            badge("offer-eyebrow", "Zakres współpracy"),
            heroHeading("offer-title", "Od pierwszej koncepcji po dokumentację gotową do budowy."),
            text(
              "offer-lead",
              "Prowadzimy Cię przez cały proces — od pierwszego szkicu po dokumentację gotową do budowy. Wybierz zakres, który pasuje do miejsca, w którym teraz jesteś."
            ),
          ]),
        ],
        {
          type: "hero",
          variant: "centered",
          layout: { columns: 1, align: "center", maxWidth: 980 },
          style: {
            background: FORMA_DOM_PAGE_GRADIENTS.hero,
            backgroundType: "gradient",
            surfacePreset: "ambient-orbs",
            noiseOverlay: true,
          },
        }
      ),
      serviceSection({
        id: "offer-individual",
        anchor: "indywidualne",
        number: "01",
        title: "Projekt indywidualny domu",
        copy: "Najlepszy wybór, gdy działka, styl życia albo oczekiwany efekt wymagają czegoś więcej niż gotowiec.",
        items: [
          "analiza działki i stron świata",
          "układ funkcjonalny dopasowany do rodziny",
          "bryła, elewacje i materiały",
          "projekt budowlany i wykonawczy jako opcja",
        ],
        cta: { label: "Zapytaj o projekt", href: "/kontakt" },
      }),
      serviceSection({
        id: "offer-adaptation",
        anchor: "adaptacje",
        number: "02",
        title: "Adaptacja projektu gotowego",
        copy: "Dostosowanie gotowego projektu do działki, przepisów i realnych potrzeb inwestora.",
        items: [
          "zmiany układu pomieszczeń",
          "korekta elewacji",
          "dopasowanie do warunków lokalnych",
        ],
      }),
      serviceSection({
        id: "offer-visualization",
        anchor: "wizualizacje",
        number: "03",
        title: "Wizualizacje i animacje 3D",
        copy: "Materiały, które pomagają zobaczyć proporcje domu, światło i klimat jeszcze przed budową.",
        items: ["ujęcia zewnętrzne", "spacer po bryle", "plansze materiałowe"],
      }),
      serviceSection({
        id: "offer-plot",
        number: "04",
        title: "Konsultacja działki",
        copy: "Szybka ocena potencjału działki przed zakupem lub przed startem projektu.",
        items: ["usytuowanie domu", "dojazd i widoki", "ryzyka formalne"],
      }),
      serviceSection({
        id: "offer-interiors",
        number: "05",
        title: "Projekt wnętrz jako rozszerzenie",
        copy: "Spójny styl domu od fasady po salon, kuchnię i prywatne strefy.",
        items: ["moodboard", "układ funkcjonalny", "materiały i oświetlenie"],
      }),
      section(
        "offer-comparison",
        "Jak wybrać",
        [
          badge("offer-comparison-eyebrow", "Jak wybrać?"),
          sectionHeading(
            "offer-comparison-title",
            "Nie sprzedajemy pakietu na siłę — dobieramy zakres do etapu inwestora.",
            3
          ),
          comparisonRow("offer-comparison-idea", "Masz tylko pomysł?", "Konsultacja + koncepcja."),
          comparisonRow(
            "offer-comparison-plot",
            "Masz działkę?",
            "Analiza + projekt indywidualny."
          ),
          comparisonRow(
            "offer-comparison-ready",
            "Masz gotowiec?",
            "Adaptacja + lifting elewacji."
          ),
        ],
        {
          type: "comparison",
          variant: "cards",
          layout: { columns: 3 },
          style: {
            background: FORMA_DOM_PAGE_GRADIENTS.aqua,
            backgroundType: "gradient",
          },
        }
      ),
    ],
  });
