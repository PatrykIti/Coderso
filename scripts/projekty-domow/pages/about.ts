import {
  FORMA_DOM_PAGE_GRADIENTS,
  FORMA_DOM_PAGE_PALETTE,
  FORMA_DOM_PAGE_SEO_DESCRIPTION,
  badge,
  buildPageSeed,
  group,
  heroHeading,
  section,
  sectionHeading,
  surface,
  text,
} from "./shared";

const value = (id: string, number: string, label: string) =>
  surface(id, [badge(`${id}-number`, number), sectionHeading(`${id}-label`, label)]);

const teamRole = (id: string, role: string, copy: string) =>
  surface(id, [sectionHeading(`${id}-role`, role), text(`${id}-copy`, copy)]);

export const buildAboutPage = () =>
  buildPageSeed({
    key: "o-nas",
    route: "/o-nas",
    seo: {
      title: "O nas — FormaDom Studio",
      description: FORMA_DOM_PAGE_SEO_DESCRIPTION,
    },
    sections: [
      section(
        "about-hero",
        "O nas",
        [
          group("about-hero-copy", [
            badge("about-eyebrow", "Pracownia"),
            heroHeading(
              "about-title",
              "Łączymy architekturę, technologię i emocje pierwszego wrażenia."
            ),
            text(
              "about-lead",
              "Jesteśmy niewielką pracownią, która projektuje z uważnością — tak, by Twój dom był piękny, wygodny i dobrze się starzał przez lata."
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
        "about-approach",
        "Podejście",
        [
          sectionHeading("about-approach-title", "Nasze podejście", 4),
          text(
            "about-approach-copy-1",
            "Dobry dom nie zaczyna się od modnej elewacji. Zaczyna się od rozmowy o codzienności: porannej kawie, ciszy, pracy, dzieciach, ogrodzie i świetle.",
            { colSpan: 4 }
          ),
          text(
            "about-approach-copy-2",
            "Technologię traktujemy jako narzędzie: wizualizacje, modele i animacje mają pomagać podejmować lepsze decyzje, a nie robić pokaz dla samego pokazu.",
            { colSpan: 4 }
          ),
          value("about-value-shape", "01", "Proste bryły"),
          value("about-value-light", "02", "Naturalne światło"),
          value("about-value-function", "03", "Funkcjonalne układy"),
          value("about-value-premium", "04", "Efekt premium bez przesady"),
        ],
        {
          type: "feature-grid",
          variant: "cards",
          layout: { columns: 4 },
          style: {
            background: FORMA_DOM_PAGE_GRADIENTS.aqua,
            backgroundType: "gradient",
          },
        }
      ),
      section(
        "about-team",
        "Zespół",
        [
          teamRole(
            "about-team-architect",
            "Architekt prowadzący",
            "Koncepcja, bryła, funkcja i kontakt z inwestorem."
          ),
          teamRole(
            "about-team-interior",
            "Projektant wnętrz",
            "Materiały, światło, klimat i spójność przestrzeni."
          ),
          teamRole(
            "about-team-modeler",
            "Modelarz 3D",
            "Wizualizacje, animacje i prezentacje premium."
          ),
        ],
        {
          type: "feature-grid",
          variant: "grid",
          layout: { columns: 3 },
          style: { background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary },
        }
      ),
    ],
  });
