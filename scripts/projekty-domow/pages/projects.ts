import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import type { PackageRef } from "../../../core/services/kits/fullSitePackage/types";
import {
  badge,
  buildPageSeed,
  button,
  FORMA_COLORS,
  FORMA_GRADIENTS,
  group,
  heroHeading,
  section,
  sectionHeading,
  statistic,
  surface,
  text,
} from "./shared";

const CONTENT_ID = "00000000-0000-4000-8000-000000000561";
const QUERY_ID = "00000000-0000-4000-8000-000000000562";
const TEMPLATE_ID = "00000000-0000-4000-8000-000000000563";

export const buildProjectsPage = (refs: {
  contentType: PackageRef;
  query: PackageRef;
  template: PackageRef;
}) =>
  buildPageSeed(
    "projekty",
    "Projekty domów — FormaDom",
    [
      section(
        "projects-hero",
        "Projekty",
        [
          group("projects-hero-copy", [
            badge("projects-eyebrow", "KATALOG FORMA DOM", { icon: "star" }),
            heroHeading("projects-title", "Znajdź punkt wyjścia dla swojego domu"),
            text(
              "projects-lead",
              "Filtruj projekty według stylu, kondygnacji i standardu energii. Każdy wariant możemy dopasować do działki."
            ),
            button("projects-browse-cta", "Przejdź do katalogu", "/projekty#katalog", {
              magnetic: true,
              size: "lg",
            }),
          ]),
          surface(
            "projects-hero-card",
            [
              badge("projects-card-label", "KATALOG 2026", { icon: "sparkles" }),
              sectionHeading("projects-card-title", "Konkret zamiast przypadkowych inspiracji"),
              text(
                "projects-card-copy",
                "Każda karta pokazuje parametry, założenia funkcjonalne i kierunek materiałowy projektu."
              ),
              group(
                "projects-card-stats",
                [
                  statistic("projects-count", "6", "projektów bazowych"),
                  statistic("projects-classes", "A / A+", "standard energii"),
                ],
                { direction: "row", wrap: true, gap: 12 }
              ),
            ],
            {
              background: FORMA_GRADIENTS.highlight,
              backgroundType: "gradient",
              glow: { color: "rgba(142,232,255,0.28)", blur: 46 },
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
        "projects-proof",
        "Jak czytać katalog",
        [
          sectionHeading("projects-proof-title", "Parametry, które pomagają podjąć decyzję", 3),
          statistic("projects-proof-style", "3", "kierunki stylu", "minimal · natural · classic"),
          statistic("projects-proof-storeys", "1–2", "kondygnacje", "parterowe i piętrowe"),
          statistic(
            "projects-proof-energy",
            "A+",
            "najwyższy standard",
            "gotowość na niską energię"
          ),
        ],
        {
          type: "feature-grid",
          variant: "grid",
          layout: { columns: 3 },
          style: {
            background: FORMA_COLORS.navy,
            border: {
              top: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
              bottom: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
            },
          },
          spacing: { paddingTop: 62, paddingBottom: 62 },
        }
      ),
      section(
        "projects-browser",
        "Katalog",
        [
          group("projects-browser-intro", [
            badge("projects-browser-eyebrow", "DOPASUJ WYNIKI", { icon: "check" }),
            sectionHeading("projects-browser-title", "Projekty gotowe do odkrycia"),
            text(
              "projects-browser-copy",
              "Zaznacz kryteria lub wpisz nazwę. Filtry pracują na tej samej liście, którą widzisz poniżej."
            ),
          ]),
          createPageBlockV2("filters", {
            id: "projects-filters",
            props: {
              queryId: QUERY_ID,
              autoApply: true,
              showSearch: true,
              showCount: false,
              searchLabel: "Szukaj projektu",
              searchPlaceholder: "Wpisz nazwę projektu...",
              applyLabel: "Pokaż projekty",
              facets: [
                {
                  id: "style",
                  kind: "checkbox",
                  label: "Styl",
                  field: "data.style",
                  op: "in",
                  options: [
                    { value: "minimal", label: "Minimalistyczny" },
                    { value: "natural", label: "Naturalny" },
                    { value: "classic", label: "Klasyczny" },
                  ],
                },
                {
                  id: "storeys",
                  kind: "checkbox",
                  label: "Kondygnacje",
                  field: "data.storeys",
                  op: "in",
                  options: [
                    { value: "1", label: "Parterowy" },
                    { value: "2", label: "Piętrowy" },
                  ],
                },
                {
                  id: "energy",
                  kind: "checkbox",
                  label: "Energia",
                  field: "data.energyClass",
                  op: "in",
                  options: [
                    { value: "A+", label: "A+" },
                    { value: "A", label: "A" },
                    { value: "B", label: "B" },
                  ],
                },
              ],
            },
            style: {
              background: FORMA_COLORS.surface,
              backgroundType: "color",
              borderColor: FORMA_COLORS.border,
              borderWidth: 1,
              borderStyle: "solid",
              radius: 22,
              padding: { top: 24, right: 24, bottom: 24, left: 24 },
              glow: { color: "rgba(142,232,255,0.16)", blur: 28 },
            },
          }),
          createPageBlockV2("collection", {
            id: "projects-collection",
            props: {
              contentTypeId: CONTENT_ID,
              queryId: QUERY_ID,
              templateId: TEMPLATE_ID,
              limit: 24,
            },
            style: {
              background: "rgba(255,255,255,0.03)",
              backgroundType: "color",
              borderColor: FORMA_COLORS.quietBorder,
              borderWidth: 1,
              borderStyle: "solid",
              radius: 24,
              padding: { top: 26, right: 26, bottom: 26, left: 26 },
            },
          }),
        ],
        {
          type: "collection",
          variant: "grid",
          anchor: "katalog",
          layout: { columns: 1, maxWidth: 1240 },
          style: {
            background: FORMA_COLORS.ink,
            scrollEffect: "reveal-fade",
          },
        }
      ),
      section(
        "projects-cta",
        "Adaptacja",
        [
          badge("projects-cta-eyebrow", "MASZ JUŻ FAWORYTA?"),
          sectionHeading("projects-cta-title", "Sprawdźmy projekt na Twojej działce"),
          text(
            "projects-cta-copy",
            "Wyślij numer działki i nazwę projektu. Wrócimy z listą najważniejszych punktów do weryfikacji.",
            { align: "center" }
          ),
          button("projects-contact-cta", "Zapytaj o adaptację", "/kontakt#formularz", {
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
            background: FORMA_GRADIENTS.cyan,
            backgroundType: "gradient",
            surfacePreset: "radial-glow",
          },
        }
      ),
    ],
    new Map([
      [CONTENT_ID, refs.contentType],
      [QUERY_ID, refs.query],
      [TEMPLATE_ID, refs.template],
    ])
  );
