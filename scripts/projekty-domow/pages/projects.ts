import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import type { PackageRef } from "../../../core/services/kits/fullSitePackage/types";
import { PROJECT_CATEGORY_FILTERS } from "../content/projectListing";
import {
  FORMA_DOM_PAGE_GRADIENTS,
  FORMA_DOM_PAGE_PALETTE,
  FORMA_DOM_PAGE_SEO_DESCRIPTION,
  PAGE_BINDING_PLACEHOLDERS,
  badge,
  buildPageSeed,
  button,
  group,
  heroHeading,
  section,
  text,
  type FormaDomPageBinding,
} from "./shared";

const buildProjectControls = () => {
  const [reset, ...categories] = PROJECT_CATEGORY_FILTERS;
  if (reset.value !== "all" || reset.label !== "Wszystkie" || categories.length !== 4) {
    throw new Error("Invalid project category controls.");
  }
  return [
    button("projects-reset", reset.label, "/projekty", { variant: "ghost" }),
    createPageBlockV2("filters", {
      id: "projects-filters",
      props: {
        queryId: PAGE_BINDING_PLACEHOLDERS.projectListingQuery,
        facets: [
          {
            id: "category",
            kind: "radio",
            label: "Kategoria",
            field: "data.categories",
            op: "eq",
            options: categories.map(({ value, label }) => ({ value, label })),
          },
        ],
        layout: "horizontal",
        autoApply: false,
        showSearch: false,
        showCount: false,
        applyLabel: "Pokaż projekty",
      },
      style: {
        background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary,
        backgroundType: "color",
        borderColor: FORMA_DOM_PAGE_PALETTE.line,
        borderWidth: 1,
        borderStyle: "solid",
        radius: 22,
        padding: { top: 24, right: 24, bottom: 24, left: 24 },
      },
    }),
    createPageBlockV2("collection", {
      id: "projects-collection",
      props: {
        contentTypeId: PAGE_BINDING_PLACEHOLDERS.projectContentType,
        queryId: PAGE_BINDING_PLACEHOLDERS.projectListingQuery,
        limit: 24,
        templateId: PAGE_BINDING_PLACEHOLDERS.projectListingTemplate,
        paginationMode: "none",
        pageSize: null,
        showCta: false,
      },
      style: {
        background: "rgba(255,255,255,.03)",
        backgroundType: "color",
        borderColor: FORMA_DOM_PAGE_PALETTE.line,
        borderWidth: 1,
        borderStyle: "solid",
        radius: 24,
        padding: { top: 26, right: 26, bottom: 26, left: 26 },
      },
    }),
  ];
};

const projectBindings = (refs: {
  contentType: PackageRef;
  query: PackageRef;
  template: PackageRef;
}): readonly FormaDomPageBinding[] => [
  {
    sectionId: "projects-browser",
    blockId: "projects-filters",
    blockType: "filters",
    prop: "queryId",
    value: refs.query,
  },
  {
    sectionId: "projects-browser",
    blockId: "projects-collection",
    blockType: "collection",
    prop: "contentTypeId",
    value: refs.contentType,
  },
  {
    sectionId: "projects-browser",
    blockId: "projects-collection",
    blockType: "collection",
    prop: "queryId",
    value: refs.query,
  },
  {
    sectionId: "projects-browser",
    blockId: "projects-collection",
    blockType: "collection",
    prop: "templateId",
    value: refs.template,
  },
];

export const buildProjectsPage = (refs: {
  contentType: PackageRef;
  query: PackageRef;
  template: PackageRef;
}) =>
  buildPageSeed({
    key: "projekty",
    route: "/projekty",
    seo: {
      title: "Projekty domów — FormaDom Studio",
      description: FORMA_DOM_PAGE_SEO_DESCRIPTION,
    },
    sections: [
      section(
        "projects-hero",
        "Projekty",
        [
          group("projects-hero-copy", [
            badge("projects-eyebrow", "Portfolio"),
            heroHeading("projects-title", "Domy, w których łatwo wyobrazić sobie własne życie."),
            text(
              "projects-lead",
              "Przeglądaj po klimacie, metrażu albo stylu i znajdź projekt, przy którym pomyślisz: „właśnie o czymś takim marzyłem”."
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
      section("projects-browser", "Portfolio", buildProjectControls(), {
        type: "collection",
        variant: "grid",
        layout: { columns: 1, maxWidth: 1240 },
        style: { background: FORMA_DOM_PAGE_PALETTE.background },
      }),
    ],
    bindings: projectBindings(refs),
  });
