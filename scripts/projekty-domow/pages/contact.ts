import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import type { PackageRef } from "../../../core/services/kits/fullSitePackage/types";
import { PROJECT_BRIEF_FORM_TITLE, PROJECT_BRIEF_LOADING_LABEL } from "../content/projectForm";
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
  sectionHeading,
  surface,
  text,
  type FormaDomPageBinding,
} from "./shared";

const buildContactForm = () =>
  createPageBlockV2("form", {
    id: "contact-form",
    props: {
      formId: PAGE_BINDING_PLACEHOLDERS.projectBriefForm,
      title: PROJECT_BRIEF_FORM_TITLE,
      textareaRows: 5,
      showSelectPrompt: false,
      loadingLabel: PROJECT_BRIEF_LOADING_LABEL,
      successBehavior: "show-message-keep-form",
    },
    style: {
      background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary,
      backgroundType: "color",
      borderColor: FORMA_DOM_PAGE_PALETTE.line,
      borderWidth: 1,
      borderStyle: "solid",
      radius: 28,
      shadow: "lg",
      padding: { top: 32, right: 32, bottom: 32, left: 32 },
    },
  });

const contactBindings = (form: PackageRef): readonly FormaDomPageBinding[] => [
  {
    sectionId: "contact-form-section",
    blockId: "contact-form",
    blockType: "form",
    prop: "formId",
    value: form,
  },
];

const buildMap = () =>
  surface(
    "contact-map",
    [
      createPageBlockV2("customSvg", {
        id: "contact-map-art",
        props: {
          svg: '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg"><path d="M18 38 92 18l68 30 72-24 70 28v108l-70-28-72 24-68-30-74 20V38Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="170" cy="82" r="12" fill="none" stroke="currentColor" stroke-width="4"/><path d="M170 94v30" stroke="currentColor" stroke-width="4"/></svg>',
          drawIn: true,
          drawSpeed: 1800,
          label: "Abstrakcyjna mapa lokalizacji",
        },
        style: { textColor: FORMA_DOM_PAGE_PALETTE.aqua },
      }),
      text("contact-map-label", "Studio", {
        textColor: FORMA_DOM_PAGE_PALETTE.text,
        fontWeight: "bold",
        fontSize: "xl",
      }),
    ],
    {
      background: FORMA_DOM_PAGE_GRADIENTS.highlight,
      backgroundType: "gradient",
      surfacePreset: "glass-grid",
    }
  );

export const buildContactPage = (form: PackageRef) =>
  buildPageSeed({
    key: "kontakt",
    route: "/kontakt",
    seo: {
      title: "Kontakt — FormaDom Studio",
      description: FORMA_DOM_PAGE_SEO_DESCRIPTION,
    },
    sections: [
      section(
        "contact-hero",
        "Kontakt",
        [
          group("contact-hero-copy", [
            badge("contact-eyebrow", "Zacznij projekt"),
            heroHeading("contact-title", "Opowiedz nam o działce, marzeniu albo pomyśle na dom."),
            text(
              "contact-lead",
              "Nie musisz mieć gotowego planu ani wiedzy technicznej. Wystarczy kilka zdań — resztę spokojnie ustalimy razem."
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
        "contact-form-section",
        "Formularz",
        [
          buildContactForm(),
          surface("contact-direct", [
            sectionHeading("contact-direct-title", "Kontakt bezpośredni"),
            button("contact-email", "kontakt@formadom.studio", "mailto:kontakt@formadom.studio", {
              variant: "link",
            }),
            button("contact-phone", "+48 500 100 200", "tel:+48500100200", {
              variant: "link",
            }),
            text("contact-direct-location", "Warszawa / projekty online w całej Polsce"),
          ]),
          buildMap(),
        ],
        {
          type: "lead-form",
          variant: "split",
          layout: { columns: 2, align: "start", maxWidth: 1180 },
          style: {
            background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary,
            columnTemplate: "1.15fr .85fr",
          },
        }
      ),
    ],
    bindings: contactBindings(form),
  });
