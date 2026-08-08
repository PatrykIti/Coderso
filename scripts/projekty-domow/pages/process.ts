import {
  FORMA_DOM_PAGE_GRADIENTS,
  FORMA_DOM_PAGE_PALETTE,
  FORMA_DOM_PAGE_SEO_DESCRIPTION,
  badge,
  buildPageSeed,
  button,
  group,
  heroHeading,
  section,
  sectionHeading,
  surface,
  text,
} from "./shared";

const timelineItem = (id: string, number: string, title: string, copy: string) =>
  surface(id, [
    badge(`${id}-number`, number),
    sectionHeading(`${id}-title`, title),
    text(`${id}-copy`, copy),
  ]);

export const buildProcessPage = () =>
  buildPageSeed({
    key: "proces",
    route: "/proces",
    seo: {
      title: "Proces projektowy — FormaDom Studio",
      description: FORMA_DOM_PAGE_SEO_DESCRIPTION,
    },
    sections: [
      section(
        "process-hero",
        "Proces",
        [
          group("process-hero-copy", [
            badge("process-eyebrow", "Jak pracujemy"),
            heroHeading(
              "process-title",
              "Spokojna droga od pierwszej rozmowy do gotowego projektu."
            ),
            text(
              "process-lead",
              "Bez chaosu i niedomówień. Na każdym etapie wiesz, co się dzieje, jaką decyzję podejmujemy i co będzie dalej."
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
        "process-timeline",
        "Etapy",
        [
          timelineItem(
            "process-step-1",
            "01",
            "Rozmowa startowa",
            "Rozumiemy potrzeby, budżet, styl życia, inspiracje i ograniczenia inwestycji."
          ),
          timelineItem(
            "process-step-2",
            "02",
            "Analiza działki",
            "Sprawdzamy strony świata, dojazd, widoki, sąsiedztwo i potencjał bryły."
          ),
          timelineItem(
            "process-step-3",
            "03",
            "Koncepcja",
            "Tworzymy układ, bryłę, klimat materiałowy i pierwsze wizualizacje."
          ),
          timelineItem(
            "process-step-4",
            "04",
            "Decyzje projektowe",
            "Porównujemy warianty i wybieramy rozwiązania, które najlepiej pasują do domu."
          ),
          timelineItem(
            "process-step-5",
            "05",
            "Dokumentacja",
            "Przygotowujemy projekt budowlany, a następnie opcjonalnie wykonawczy i wnętrzarski."
          ),
        ],
        {
          type: "timeline",
          variant: "grid",
          layout: { columns: 1, maxWidth: 980 },
          style: { background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary },
        }
      ),
      section(
        "process-cta",
        "Brief",
        [
          sectionHeading("process-cta-title", "Masz działkę? Możemy zacząć od analizy."),
          text(
            "process-cta-copy",
            "To najprostszy sposób, żeby sprawdzić potencjał domu przed dużymi decyzjami.",
            { align: "center" }
          ),
          button("process-cta-button", "Zacznij od briefu", "/kontakt", {
            size: "lg",
            style: { align: "center" },
          }),
        ],
        {
          type: "cta",
          variant: "centered",
          layout: { columns: 1, align: "center", justify: "center", maxWidth: 900 },
          style: {
            background: FORMA_DOM_PAGE_GRADIENTS.highlight,
            backgroundType: "gradient",
          },
        }
      ),
    ],
  });
