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

const packageCard = ({
  id,
  badgeText,
  title,
  price,
  copy,
  items,
  highlighted = false,
}: {
  id: string;
  badgeText: string;
  title: string;
  price: string;
  copy: string;
  items: string[];
  highlighted?: boolean;
}) =>
  surface(
    id,
    [
      badge(`${id}-badge`, badgeText, { icon: highlighted ? "star" : "check" }),
      sectionHeading(`${id}-title`, title),
      statistic(`${id}-price`, price, "cena od"),
      text(`${id}-copy`, copy),
      list(`${id}-items`, items),
      button(`${id}-cta`, "Dobierz pakiet", "/kontakt#formularz", {
        magnetic: highlighted,
        variant: highlighted ? "primary" : "ghost",
        size: "lg",
      }),
    ],
    highlighted
      ? {
          background: FORMA_GRADIENTS.highlight,
          backgroundType: "gradient",
          borderColor: FORMA_COLORS.lime,
          borderWidth: 2,
          glow: { color: "rgba(216,255,122,0.3)", blur: 52, spread: 4 },
          shadow: "lg",
          tilt: "subtle",
          tiltGlare: true,
        }
      : {}
  );

export const buildPricingPage = () =>
  buildPageSeed("cennik", "Cennik — FormaDom", [
    section(
      "pricing-hero",
      "Cennik",
      [
        group("pricing-hero-copy", [
          badge("pricing-eyebrow", "JASNY ZAKRES · JASNA CENA", { icon: "shield" }),
          heroHeading("pricing-title", "Przejrzyste pakiety projektowe"),
          text(
            "pricing-lead",
            "Zakres, rezultat i koszt poznajesz przed rozpoczęciem współpracy. Bez ukrytych etapów i przypadkowych dopłat."
          ),
          button("pricing-packages-cta", "Porównaj pakiety", "/cennik#pakiety", {
            magnetic: true,
            size: "lg",
          }),
        ]),
        surface(
          "pricing-hero-card",
          [
            badge("pricing-card-badge", "WSPÓLNY STANDARD"),
            sectionHeading("pricing-card-title", "Każdy pakiet zaczyna się od dobrej diagnozy"),
            list("pricing-card-list", [
              "spotkanie otwierające",
              "analiza potrzeb i działki",
              "harmonogram decyzji",
              "jedno miejsce ustaleń",
            ]),
          ],
          {
            background: FORMA_GRADIENTS.cyan,
            backgroundType: "gradient",
            glow: { color: "rgba(142,232,255,0.22)", blur: 40 },
          }
        ),
      ],
      {
        type: "hero",
        variant: "split",
        layout: { columns: 2, align: "center", maxWidth: 1240 },
        style: {
          background: FORMA_GRADIENTS.hero,
          backgroundType: "gradient",
          columnTemplate: "minmax(0,1fr) minmax(420px,.9fr)",
          surfacePreset: "ambient-orbs",
          noiseOverlay: true,
        },
        spacing: { paddingTop: 112, paddingBottom: 96, gap: 50 },
      }
    ),
    section(
      "pricing-packages",
      "Pakiety",
      [
        sectionHeading("pricing-packages-title", "Trzy zakresy, jeden standard współpracy", 3),
        packageCard({
          id: "pricing-package-start",
          badgeText: "START",
          title: "Analiza i kierunek",
          price: "4 900 zł",
          copy: "Dla osób przed zakupem działki lub wyborem konkretnego projektu.",
          items: [
            "analiza działki",
            "brief funkcjonalny",
            "warsztat kierunku",
            "raport rekomendacji",
          ],
        }),
        packageCard({
          id: "pricing-package-project",
          badgeText: "NAJCZĘŚCIEJ WYBIERANY",
          title: "Projekt indywidualny",
          price: "38 000 zł",
          copy: "Kompletna droga od programu do skoordynowanej dokumentacji domu.",
          items: [
            "analiza i dwa warianty",
            "pełna koncepcja",
            "projekt budowlany",
            "projekt techniczny i branże",
          ],
          highlighted: true,
        }),
        packageCard({
          id: "pricing-package-complete",
          badgeText: "KOMPLETNY",
          title: "Projekt + wsparcie",
          price: "52 000 zł",
          copy: "Pełny projekt rozszerzony o konsultacje i kontrolę spójności podczas budowy.",
          items: [
            "cały pakiet Projekt",
            "detale kluczowych miejsc",
            "6 konsultacji wykonawczych",
            "wsparcie zmian materiałowych",
          ],
        }),
      ],
      {
        type: "comparison",
        variant: "cards",
        anchor: "pakiety",
        layout: { columns: 3, align: "stretch" },
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
        spacing: { paddingTop: 96, paddingBottom: 104, gap: 24 },
      }
    ),
    section(
      "pricing-included",
      "Co obejmuje wycena",
      [
        group("pricing-included-copy", [
          badge("pricing-included-eyebrow", "BEZ DROBNYCH DRUKÓW"),
          sectionHeading("pricing-included-title", "Wycena obejmuje cały opisany rezultat"),
          text(
            "pricing-included-text",
            "Przed startem otrzymujesz harmonogram, liczbę spotkań i listę materiałów kończących każdy etap."
          ),
        ]),
        surface("pricing-included-card", [
          list("pricing-included-list", [
            "koordynacja spotkań i podsumowania",
            "dwie rundy uwag na etapie koncepcji",
            "koordynacja podstawowych branż",
            "wersja cyfrowa dokumentacji",
          ]),
          text(
            "pricing-included-note",
            "Koszty map, badań, uzgodnień urzędowych i opracowań dodatkowych wyceniamy osobno, zanim je zlecisz."
          ),
        ]),
      ],
      {
        type: "media-split",
        variant: "split",
        layout: { columns: 2, align: "center" },
        style: {
          background: FORMA_GRADIENTS.cyan,
          backgroundType: "gradient",
          columnTemplate: "1fr 1.2fr",
        },
      }
    ),
    section(
      "pricing-cta",
      "Wycena",
      [
        badge("pricing-cta-eyebrow", "POTRZEBUJESZ INNEGO ZAKRESU?"),
        sectionHeading("pricing-cta-title", "Przygotujemy wycenę dla Twojej sytuacji"),
        text(
          "pricing-cta-copy",
          "Napisz, co już masz i jakiej decyzji potrzebujesz. Dopasujemy zakres bez dokładania zbędnych etapów.",
          { align: "center" }
        ),
        button("pricing-cta-button", "Zapytaj o wycenę", "/kontakt#formularz", {
          magnetic: true,
          size: "lg",
          style: { align: "center" },
        }),
      ],
      {
        type: "cta",
        variant: "centered",
        layout: { columns: 1, align: "center", justify: "center", maxWidth: 900 },
        style: {
          background: FORMA_GRADIENTS.highlight,
          backgroundType: "gradient",
          surfacePreset: "radial-glow",
        },
      }
    ),
  ]);
