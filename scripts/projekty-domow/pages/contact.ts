import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import type { PackageRef } from "../../../core/services/kits/fullSitePackage/types";
import {
  badge,
  button,
  buildPageSeed,
  FORMA_COLORS,
  FORMA_GRADIENTS,
  group,
  heroHeading,
  list,
  section,
  sectionHeading,
  surface,
  text,
} from "./shared";

const FORM_ID = "00000000-0000-4000-8000-000000000564";

export const buildContactPage = (form: PackageRef) =>
  buildPageSeed(
    "kontakt",
    "Kontakt — FormaDom",
    [
      section(
        "contact-hero",
        "Kontakt",
        [
          group("contact-hero-copy", [
            badge("contact-eyebrow", "Zacznij projekt", { icon: "sparkles" }),
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
            background: FORMA_GRADIENTS.hero,
            backgroundType: "gradient",
            surfacePreset: "ambient-orbs",
            noiseOverlay: true,
          },
          spacing: { paddingTop: 96, paddingBottom: 72, gap: 24 },
        }
      ),
      section(
        "contact-form-section",
        "Formularz",
        [
          createPageBlockV2("form", {
            id: "contact-form",
            props: { formId: FORM_ID, title: "Zacznij projekt" },
            style: {
              background: FORMA_COLORS.surface,
              backgroundType: "color",
              borderColor: FORMA_COLORS.border,
              borderWidth: 1,
              borderStyle: "solid",
              radius: 28,
              shadow: "lg",
              padding: { top: 32, right: 32, bottom: 32, left: 32 },
              glow: { color: "rgba(142,232,255,0.18)", blur: 34 },
            },
          }),
          group(
            "contact-side",
            [
              surface(
                "contact-direct",
                [
                  sectionHeading("contact-direct-title", "Kontakt bezpośredni"),
                  button(
                    "contact-direct-email",
                    "kontakt@formadom.studio",
                    "mailto:kontakt@formadom.studio",
                    { variant: "link", style: { textColor: FORMA_COLORS.white } }
                  ),
                  button("contact-direct-phone", "+48 500 100 200", "tel:+48500100200", {
                    variant: "link",
                    style: { textColor: FORMA_COLORS.white },
                  }),
                  text(
                    "contact-direct-copy",
                    "Warszawa / projekty online w całej Polsce",
                    { textColor: FORMA_COLORS.white }
                  ),
                ],
                {
                  background: FORMA_COLORS.surface,
                  backgroundType: "color",
                  glow: { color: "rgba(142,232,255,0.2)", blur: 38 },
                }
              ),
              surface(
                "contact-map-approximation",
                [
                  text("contact-map-label", "Studio", {
                    textColor: FORMA_COLORS.white,
                    fontWeight: "bold",
                    fontSize: "xl",
                  }),
                ],
                {
                  background: FORMA_GRADIENTS.highlight,
                  backgroundType: "gradient",
                  surfacePreset: "glass-grid",
                  glow: { color: "rgba(216,255,122,0.18)", blur: 42 },
                  tilt: "subtle",
                }
              ),
            ],
            { gap: 24 }
          ),
        ],
        {
          type: "lead-form",
          variant: "split",
          anchor: "formularz",
          layout: { columns: 2, align: "start", maxWidth: 1180 },
          style: {
            background: FORMA_COLORS.navy,
            columnTemplate: "1.15fr .85fr",
            scrollEffect: "reveal-up",
            border: {
              top: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
              bottom: { color: FORMA_COLORS.quietBorder, width: 1, style: "solid" },
            },
          },
          spacing: { paddingTop: 96, paddingBottom: 104, gap: 36 },
        }
      ),
    ],
    new Map([[FORM_ID, form]])
  );
