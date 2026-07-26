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

const processStep = (
  index: number,
  title: string,
  copy: string,
  result: string,
  highlighted = false
) =>
  surface(
    `process-step-${index}`,
    [
      badge(`process-step-${index}-number`, `0${index}`, {
        icon: highlighted ? "star" : "check",
      }),
      sectionHeading(`process-step-${index}-title`, title),
      text(`process-step-${index}-copy`, copy),
      statistic(`process-step-${index}-result`, result, "rezultat"),
    ],
    {
      ...(highlighted
        ? {
            background: FORMA_GRADIENTS.highlight,
            backgroundType: "gradient" as const,
            borderColor: FORMA_COLORS.lime,
            borderWidth: 2,
            glow: { color: "rgba(216,255,122,0.2)", blur: 36 },
          }
        : {}),
      revealDelay: index * 100,
    }
  );

export const buildProcessPage = () =>
  buildPageSeed("proces", "Proces projektowy — FormaDom", [
    section(
      "process-hero",
      "Proces",
      [
        group("process-hero-copy", [
          badge("process-eyebrow", "PIĘĆ KROKÓW", { icon: "shield" }),
          heroHeading("process-title", "Dobra architektura potrzebuje dobrego procesu"),
          text(
            "process-lead",
            "Stały kontakt, decyzje podejmowane we właściwym czasie i rezultat widoczny po każdym etapie."
          ),
          button("process-timeline-cta", "Zobacz etapy", "/proces#etapy", {
            magnetic: true,
            size: "lg",
          }),
        ]),
        surface(
          "process-hero-map",
          [
            badge("process-map-badge", "OD BRIEFU DO BUDOWY"),
            sectionHeading("process-map-title", "Jedna ścieżka, pięć czytelnych odbiorów"),
            list("process-map-list", [
              "rozmowa i brief",
              "analiza działki",
              "koncepcja",
              "projekt i branże",
              "wsparcie realizacji",
            ]),
          ],
          {
            background: FORMA_GRADIENTS.cyan,
            backgroundType: "gradient",
            glow: { color: "rgba(142,232,255,0.24)", blur: 44 },
            tilt: "subtle",
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
      "process-timeline",
      "Pięć etapów",
      [
        group("process-timeline-intro", [
          badge("process-timeline-eyebrow", "PLAN WSPÓŁPRACY"),
          sectionHeading("process-timeline-title", "Pięć etapów, jeden spójny kierunek"),
          text(
            "process-timeline-copy",
            "Nie przechodzimy dalej bez wspólnego rozumienia rezultatu. Dzięki temu projekt rośnie bez kosztownych cofnięć."
          ),
        ]),
        processStep(
          1,
          "Rozmowa i brief",
          "Poznajemy rytm dnia, potrzeby rodziny, budżet i sposób podejmowania decyzji.",
          "Mapa potrzeb"
        ),
        processStep(
          2,
          "Analiza działki",
          "Czytamy słońce, widoki, dojazd, zapisy planu i możliwości przyłączy.",
          "Raport działki"
        ),
        processStep(
          3,
          "Koncepcja",
          "Porównujemy warianty układu i bryły, a wybrany kierunek dopracowujemy w modelu.",
          "Zatwierdzona koncepcja",
          true
        ),
        processStep(
          4,
          "Projekt i koordynacja",
          "Architektura, konstrukcja i instalacje spotykają się w jednej dokumentacji.",
          "Komplet dokumentacji"
        ),
        processStep(
          5,
          "Wsparcie realizacji",
          "Wyjaśniamy projekt wykonawcom i pilnujemy, by zmiany nie zgubiły jego najważniejszych założeń.",
          "Pewny start budowy"
        ),
      ],
      {
        type: "timeline",
        variant: "default",
        anchor: "etapy",
        layout: { columns: 1, maxWidth: 940 },
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
      "process-handoff",
      "Współpraca",
      [
        group("process-handoff-copy", [
          badge("process-handoff-eyebrow", "W KAŻDYM ETAPIE"),
          sectionHeading("process-handoff-title", "Wiesz, co dzieje się teraz i co będzie dalej"),
          text(
            "process-handoff-text",
            "Spotkania mają agendę, materiały przychodzą przed decyzją, a ustalenia zapisujemy w jednym miejscu."
          ),
        ]),
        surface("process-handoff-card", [
          statistic("process-handoff-owner", "1", "opiekun procesu"),
          statistic("process-handoff-recaps", "100%", "spotkań z podsumowaniem"),
          statistic("process-handoff-scope", "0", "ukrytych etapów"),
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
      "process-cta",
      "Rozpocznij rozmowę",
      [
        badge("process-cta-eyebrow", "KROK ZERO"),
        sectionHeading("process-cta-title", "Zacznijmy od krótkiej rozmowy o działce"),
        text(
          "process-cta-copy",
          "Nie potrzebujesz gotowego briefu. Pomożemy nazwać najważniejsze pytania i kolejność działań.",
          { align: "center" }
        ),
        button("process-cta-button", "Rozpocznij rozmowę", "/kontakt#formularz", {
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
