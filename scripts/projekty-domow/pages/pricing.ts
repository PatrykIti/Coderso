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

const packageCard = (input: {
  id: string;
  label: string;
  title: string;
  price: string;
  items: string[];
  cta: string;
  highlighted?: boolean;
}) =>
  surface(
    input.id,
    [
      badge(`${input.id}-label`, input.label),
      sectionHeading(`${input.id}-title`, input.title),
      text(`${input.id}-price`, input.price, {
        textColor: FORMA_DOM_PAGE_PALETTE.text,
        fontSizeCustom: "clamp(1.8rem,3vw,3rem)",
        fontWeight: "bold",
      }),
      list(`${input.id}-items`, input.items),
      button(`${input.id}-cta`, input.cta, "/kontakt", {
        variant: input.highlighted ? "primary" : "ghost",
      }),
    ],
    input.highlighted
      ? {
          background: FORMA_DOM_PAGE_GRADIENTS.highlight,
          backgroundType: "gradient",
          borderColor: FORMA_DOM_PAGE_PALETTE.aqua,
          borderWidth: 2,
          glow: { color: "rgba(173,255,216,.28)", blur: 48, spread: 3 },
        }
      : {}
  );

export const buildPricingPage = () =>
  buildPageSeed({
    key: "cennik",
    route: "/cennik",
    seo: {
      title: "Cennik — FormaDom Studio",
      description: FORMA_DOM_PAGE_SEO_DESCRIPTION,
    },
    sections: [
      section(
        "pricing-hero",
        "Cennik",
        [
          group("pricing-hero-copy", [
            badge("pricing-eyebrow", "Pakiety"),
            heroHeading(
              "pricing-title",
              "Jasne zasady od pierwszej rozmowy — bez ukrytych kosztów."
            ),
            text(
              "pricing-lead",
              "Poniższe kwoty to orientacyjny punkt wyjścia. Ostateczną wycenę zawsze dopasowujemy do Twojej działki, zakresu i marzeń."
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
      section(
        "pricing-packages",
        "Pakiety",
        [
          packageCard({
            id: "pricing-start",
            label: "Start",
            title: "Konsultacja działki",
            price: "od 900 zł",
            items: ["analiza możliwości", "rekomendacje ustawienia domu", "notatka z konsultacji"],
            cta: "Wybieram start",
          }),
          packageCard({
            id: "pricing-premium",
            label: "Najczęściej wybierane",
            title: "Koncepcja premium",
            price: "od 6 900 zł",
            items: [
              "2 warianty układu",
              "bryła i elewacje",
              "wizualizacja 3D",
              "konsultacja online",
            ],
            cta: "Zapytaj o termin",
            highlighted: true,
          }),
          packageCard({
            id: "pricing-complete",
            label: "Kompleksowo",
            title: "Projekt indywidualny",
            price: "wycena indywidualna",
            items: [
              "pełny proces projektowy",
              "koordynacja branżowa",
              "projekt budowlany",
              "opcjonalny wykonawczy",
            ],
            cta: "Poproś o wycenę",
          }),
        ],
        {
          type: "comparison",
          variant: "cards",
          layout: { columns: 3, align: "stretch" },
          style: { background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary },
        }
      ),
    ],
  });
