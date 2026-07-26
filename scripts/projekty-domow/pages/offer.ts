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

const serviceSection = ({
  id,
  anchor,
  eyebrow,
  title,
  copy,
  deliverables,
  result,
}: {
  id: string;
  anchor: string;
  eyebrow: string;
  title: string;
  copy: string;
  deliverables: string[];
  result: string;
}) =>
  section(
    id,
    title,
    [
      group(`${id}-copy`, [
        badge(`${id}-eyebrow`, eyebrow, { icon: "check" }),
        sectionHeading(`${id}-title`, title),
        text(`${id}-lead`, copy),
        button(`${id}-cta`, "Zapytaj o ten zakres", "/kontakt#formularz", {
          magnetic: true,
          size: "lg",
        }),
      ]),
      surface(
        `${id}-card`,
        [
          headingForCard(`${id}-card-title`, "Co otrzymujesz"),
          list(`${id}-list`, deliverables),
          statistic(`${id}-result`, result, "rezultat etapu"),
        ],
        {
          background: FORMA_GRADIENTS.cyan,
          backgroundType: "gradient",
          glow: { color: "rgba(142,232,255,0.18)", blur: 32 },
        }
      ),
    ],
    {
      type: "media-split",
      variant: "split",
      anchor,
      layout: { columns: 2, align: "center" },
      style: {
        background: FORMA_COLORS.navy,
        columnTemplate: "1.15fr .85fr",
        scrollEffect: "reveal-up",
        border: {
          bottom: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
        },
      },
    }
  );

const headingForCard = (id: string, value: string) => sectionHeading(id, value);

const comparisonCard = (
  id: string,
  label: string,
  title: string,
  copy: string,
  items: string[],
  highlighted = false
) =>
  surface(
    id,
    [
      badge(`${id}-label`, label, { icon: highlighted ? "star" : "check" }),
      headingForCard(`${id}-title`, title),
      text(`${id}-copy`, copy),
      list(`${id}-items`, items),
    ],
    highlighted
      ? {
          background: FORMA_GRADIENTS.highlight,
          backgroundType: "gradient",
          borderColor: FORMA_COLORS.lime,
          borderWidth: 2,
          glow: { color: "rgba(216,255,122,0.24)", blur: 42, spread: 2 },
          tilt: "subtle",
        }
      : {}
  );

export const buildOfferPage = () =>
  buildPageSeed("oferta", "Oferta — FormaDom", [
    section(
      "offer-hero",
      "Oferta",
      [
        group("offer-hero-copy", [
          badge("offer-eyebrow", "OFERTA FORMA DOM"),
          heroHeading("offer-title", "Od pierwszej kreski do pewnej decyzji"),
          text(
            "offer-lead",
            "Wybierz zakres dopasowany do etapu inwestycji. Każda usługa ma jasny rezultat i moment odbioru."
          ),
          group(
            "offer-anchor-links",
            [
              button(
                "offer-link-individual",
                "Projekt indywidualny",
                "/oferta#projekt-indywidualny",
                {
                  size: "sm",
                }
              ),
              button("offer-link-adaptation", "Adaptacja", "/oferta#adaptacja", {
                variant: "ghost",
                size: "sm",
              }),
              button("offer-link-visual", "Wizualizacje", "/oferta#wizualizacje", {
                variant: "ghost",
                size: "sm",
              }),
            ],
            { direction: "row", wrap: true, gap: 12 }
          ),
        ]),
        surface(
          "offer-hero-scope",
          [
            badge("offer-scope-badge", "JEDEN ZESPÓŁ", { icon: "shield" }),
            headingForCard("offer-scope-title", "Architektura bez luk między etapami"),
            text(
              "offer-scope-copy",
              "Ten sam kierunek projektowy prowadzi analizę, koncepcję, dokumentację i konsultacje wykonawcze."
            ),
            group(
              "offer-scope-stats",
              [
                statistic("offer-scope-steps", "5", "czytelnych etapów"),
                statistic("offer-scope-contact", "1", "opiekun projektu"),
              ],
              { direction: "row", wrap: true, gap: 12 }
            ),
          ],
          {
            background: FORMA_GRADIENTS.highlight,
            backgroundType: "gradient",
            tilt: "subtle",
            glow: { color: "rgba(142,232,255,0.24)", blur: 44 },
          }
        ),
      ],
      {
        type: "hero",
        variant: "split",
        anchor: "zakres",
        layout: { columns: 2, align: "center", maxWidth: 1240 },
        style: {
          background: FORMA_GRADIENTS.hero,
          backgroundType: "gradient",
          columnTemplate: "minmax(0,1fr) minmax(420px,.9fr)",
          surfacePreset: "ambient-orbs",
          noiseOverlay: true,
        },
        spacing: { paddingTop: 112, paddingBottom: 100, gap: 50 },
      }
    ),
    serviceSection({
      id: "offer-individual",
      anchor: "projekt-indywidualny",
      eyebrow: "01 · OD PODSTAW",
      title: "Projekt indywidualny",
      copy: "Tworzymy dom od programu i działki. Układ, bryła, materiały i standard energetyczny rozwijają się jako jeden system.",
      deliverables: [
        "analiza działki i programu",
        "warianty koncepcji",
        "projekt budowlany i techniczny",
        "koordynacja branżowa",
      ],
      result: "Pełny projekt",
    }),
    serviceSection({
      id: "offer-adaptation",
      anchor: "adaptacja",
      eyebrow: "02 · DOBRE DOPASOWANIE",
      title: "Adaptacja projektu",
      copy: "Sprawdzamy gotowy projekt wobec działki i potrzeb rodziny. Zmieniamy to, co naprawdę poprawia codzienne użytkowanie.",
      deliverables: [
        "bilans mocnych i słabych stron",
        "dopasowanie do planu miejscowego",
        "korekty układu funkcjonalnego",
        "koordynacja dokumentacji",
      ],
      result: "Projekt na działkę",
    }),
    serviceSection({
      id: "offer-visuals",
      anchor: "wizualizacje",
      eyebrow: "03 · PEWNOŚĆ WYBORU",
      title: "Wizualizacje i materiały",
      copy: "Pokazujemy światło, proporcje i zestawienia materiałów przed kosztownymi decyzjami wykonawczymi.",
      deliverables: [
        "widoki bryły w kontekście",
        "paleta materiałowa",
        "sceny dzienne i wieczorne",
        "czytelny kierunek dla wykonawców",
      ],
      result: "Spójny kierunek",
    }),
    section(
      "offer-comparison",
      "Porównanie zakresów",
      [
        sectionHeading("offer-comparison-title", "Porównaj warianty współpracy", 3),
        comparisonCard(
          "offer-compare-concept",
          "KONCEPCJA",
          "Kierunek",
          "Dla osób, które chcą sprawdzić potencjał działki i programu.",
          ["analiza", "2 warianty", "rekomendacja"]
        ),
        comparisonCard(
          "offer-compare-project",
          "NAJCZĘŚCIEJ WYBIERANY",
          "Projekt indywidualny",
          "Kompletna ścieżka od koncepcji do dokumentacji technicznej.",
          ["pełna koncepcja", "projekt budowlany", "koordynacja branż"],
          true
        ),
        comparisonCard(
          "offer-compare-support",
          "ROZSZERZONY",
          "Projekt + wsparcie",
          "Projekt indywidualny uzupełniony konsultacjami podczas budowy.",
          ["komplet projektu", "konsultacje wykonawcze", "kontrola spójności"]
        ),
      ],
      {
        type: "comparison",
        variant: "cards",
        anchor: "porownanie",
        layout: { columns: 3 },
        style: {
          background: FORMA_COLORS.ink,
          scrollEffect: "reveal-up",
          border: {
            top: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
            bottom: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
          },
        },
      }
    ),
    section(
      "offer-cta",
      "Dobierz zakres",
      [
        badge("offer-cta-badge", "NIE MUSISZ WYBIERAĆ SAMODZIELNIE"),
        sectionHeading("offer-cta-title", "Dobierzmy zakres do etapu Twojej inwestycji"),
        text(
          "offer-cta-copy",
          "Opisz działkę i swoje priorytety. W odpowiedzi wskażemy sensowny wariant współpracy.",
          { align: "center" }
        ),
        group(
          "offer-cta-actions",
          [
            button("offer-contact", "Wyślij brief", "/kontakt#formularz", {
              magnetic: true,
              size: "lg",
            }),
            button("offer-pricing", "Zobacz pakiety", "/cennik#pakiety", {
              variant: "ghost",
              size: "lg",
            }),
          ],
          { direction: "row", wrap: true, gap: 14, style: { align: "center" } }
        ),
      ],
      {
        type: "cta",
        variant: "centered",
        layout: { columns: 1, align: "center", justify: "center", maxWidth: 940 },
        style: {
          background: FORMA_GRADIENTS.highlight,
          backgroundType: "gradient",
          surfacePreset: "radial-glow",
        },
      }
    ),
  ]);
