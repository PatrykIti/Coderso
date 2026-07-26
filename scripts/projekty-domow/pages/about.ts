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

const valueCard = (id: string, number: string, title: string, copy: string) =>
  surface(id, [
    badge(`${id}-number`, number, { icon: "check" }),
    sectionHeading(`${id}-title`, title),
    text(`${id}-copy`, copy),
  ]);

const teamCard = (id: string, initials: string, name: string, role: string, focus: string) =>
  surface(
    id,
    [
      badge(`${id}-initials`, initials, { icon: "star" }),
      sectionHeading(`${id}-name`, name),
      text(`${id}-role`, role, { textColor: FORMA_COLORS.cyan, fontWeight: "bold" }),
      text(`${id}-focus`, focus),
    ],
    { hoverEffect: "lift", surfacePreset: "glass-grid" }
  );

export const buildAboutPage = () =>
  buildPageSeed("o-nas", "O nas — FormaDom", [
    section(
      "about-hero",
      "O nas",
      [
        group("about-hero-copy", [
          badge("about-eyebrow", "PRACOWNIA FORMA DOM", { icon: "sparkles" }),
          heroHeading("about-title", "Projektujemy domy do prawdziwego życia"),
          text(
            "about-lead",
            "Łączymy architekturę, technologię i uważną rozmowę. Efektem ma być nie obrazek, lecz spokojna codzienność."
          ),
          button("about-approach-cta", "Poznaj nasze podejście", "/o-nas#podejscie", {
            magnetic: true,
            size: "lg",
          }),
        ]),
        surface(
          "about-hero-manifesto",
          [
            badge("about-manifesto-badge", "NASZA ZASADA", { icon: "shield" }),
            sectionHeading("about-manifesto-title", "Forma ma służyć temu, co ważne"),
            text(
              "about-manifesto-copy",
              "Każdą decyzję sprawdzamy trzema pytaniami: czy poprawia funkcję, czy odpowiada miejscu i czy da się ją dobrze zbudować."
            ),
            statistic("about-manifesto-years", "12+", "lat wspólnego projektowania"),
          ],
          {
            background: FORMA_GRADIENTS.highlight,
            backgroundType: "gradient",
            glow: { color: "rgba(142,232,255,0.26)", blur: 46 },
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
      "about-approach",
      "Podejście",
      [
        group("about-approach-copy", [
          badge("about-approach-eyebrow", "OD MIEJSCA DO DETALU"),
          sectionHeading("about-approach-title", "Najpierw rozumiemy, potem rysujemy"),
          text(
            "about-approach-text",
            "Nie zaczynamy od gotowej bryły. Porządkujemy potrzeby, czytamy działkę i szukamy układu, który naturalnie odpowiada obu."
          ),
          list("about-approach-list", [
            "kontekst przed stylem",
            "funkcja przed metrażem",
            "energetyka przed dodatkami",
            "czytelny proces przed tempem",
          ]),
        ]),
        surface(
          "about-approach-frame",
          [
            statistic("about-frame-context", "01", "miejsce", "światło · widoki · sąsiedztwo"),
            statistic("about-frame-life", "02", "życie", "rytuały · relacje · zmiany"),
            statistic("about-frame-craft", "03", "wykonanie", "materiały · energia · koszt"),
          ],
          {
            background: FORMA_GRADIENTS.cyan,
            backgroundType: "gradient",
            glow: { color: "rgba(142,232,255,0.18)", blur: 34 },
          }
        ),
      ],
      {
        type: "media-split",
        variant: "split",
        anchor: "podejscie",
        layout: { columns: 2, align: "center" },
        style: {
          background: FORMA_COLORS.navy,
          columnTemplate: "1fr 1.2fr",
          border: {
            top: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
            bottom: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
          },
        },
      }
    ),
    section(
      "about-values",
      "Wartości",
      [
        sectionHeading("about-values-title", "Trzy wartości widoczne w każdej decyzji", 3),
        valueCard(
          "about-value-simplicity",
          "01",
          "Prostota",
          "Czytelne układy, mniej zbędnych metrów i decyzje, które łatwo wyjaśnić."
        ),
        valueCard(
          "about-value-responsibility",
          "02",
          "Odpowiedzialność",
          "Energia, materiały, koszt i trwałość liczą się od pierwszego szkicu."
        ),
        valueCard(
          "about-value-partnership",
          "03",
          "Partnerstwo",
          "Projekt powstaje w dialogu, ale z jasną rekomendacją po stronie architekta."
        ),
      ],
      {
        type: "feature-grid",
        variant: "cards",
        layout: { columns: 3 },
        style: { background: FORMA_COLORS.ink, scrollEffect: "reveal-up" },
      }
    ),
    section(
      "about-team",
      "Zespół",
      [
        sectionHeading("about-team-title", "Zespół FormaDom", 3),
        teamCard(
          "about-team-anna",
          "AK",
          "Anna Kowal",
          "architektka prowadząca",
          "Program funkcjonalny, koncepcja i relacja domu z krajobrazem."
        ),
        teamCard(
          "about-team-marek",
          "MN",
          "Marek Nowak",
          "architekt · koordynator",
          "Dokumentacja, branże i przejście od koncepcji do realizacji."
        ),
        teamCard(
          "about-team-julia",
          "JL",
          "Julia Lis",
          "projektantka wnętrz",
          "Światło, materiały i miejsca, których dotykasz każdego dnia."
        ),
      ],
      {
        type: "feature-grid",
        variant: "grid",
        anchor: "zespol",
        layout: { columns: 3 },
        style: {
          background: FORMA_GRADIENTS.cyan,
          backgroundType: "gradient",
          scrollEffect: "reveal-fade",
        },
      }
    ),
    section(
      "about-cta",
      "Poznajmy się",
      [
        badge("about-cta-eyebrow", "DOBRY PROJEKT ZACZYNA SIĘ OD ROZMOWY"),
        sectionHeading("about-cta-title", "Sprawdźmy, czy pasujemy do Twojej inwestycji"),
        text(
          "about-cta-copy",
          "Opowiedz o działce i planach. Odpowiemy konkretnie, jak możemy pomóc i jaki zakres ma sens.",
          { align: "center" }
        ),
        button("about-contact-cta", "Umów rozmowę", "/kontakt#formularz", {
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
