import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type { AssistantActionPlan, AssistantPromptKind } from "../actionPlanTypes";
import { createPageBlockV2, createPageSectionV2 } from "../../pages/pageDocumentV2";
import type { AssistantBusinessBlueprintPack } from "./businessBlueprintTypes";

export const buildEditorialContentHubPlan = (options?: {
  promptKind?: AssistantPromptKind;
}): AssistantActionPlan =>
  normalizeAssistantActionPlan({
    id: "plan-editorial-content-hub",
    status: "ready",
    intentId: "editorial-content-hub",
    promptKind: options?.promptKind ?? "setup_request",
    intentFamily: "editorial_content_hub",
    title: "Editorial Content Hub",
    answer:
      "I can create an editorial hub page for published posts without creating or mutating post records.",
    summary: "Create a public content hub page with intro copy and post navigation guidance.",
    confidence: 0.82,
    assumptions: [
      "This pack creates a static hub page only; it does not create or edit post records.",
      "Dynamic post feeds require a later Page collection authoring contract before assistant emission is enabled.",
    ],
    questions: [],
    actions: [
      {
        id: "page-editorial-content-hub",
        type: "page.upsert",
        title: "Create editorial content hub page",
        description: "Create a public hub page with intro copy and post navigation guidance.",
        input: {
          title: "Aktualności i poradniki",
          slug: "/blog",
          status: "published",
          introTitle: "Aktualności i poradniki",
          introBody: "Przeglądaj najnowsze wpisy, poradniki i aktualności w jednym miejscu.",
          sections: [
            createPageSectionV2("content", {
              id: "editorial-hub-intro",
              name: "Intro",
              blocks: [
                createPageBlockV2("heading", {
                  id: "editorial-hub-intro-heading",
                  props: { text: "Wiedza i aktualnosci", level: "h2", align: "left" },
                }),
                createPageBlockV2("text", {
                  id: "editorial-hub-intro-copy",
                  props: {
                    text: "Ta strona zbiera opublikowane wpisy i ulatwia czytelnikom przejscie do szczegolow.",
                    format: "plain",
                    align: "left",
                  },
                }),
              ],
            }),
            createPageSectionV2("content", {
              id: "editorial-hub-posts-overview",
              name: "Posts overview",
              blocks: [
                createPageBlockV2("heading", {
                  id: "editorial-hub-posts-heading",
                  props: { text: "Najnowsze wpisy", level: "h2", align: "left" },
                }),
                createPageBlockV2("text", {
                  id: "editorial-hub-posts-copy",
                  props: {
                    text: "Dodawaj i publikuj wpisy w panelu Posts, a nastepnie polacz te strone z docelowa lista wpisow po wdrozeniu Page Templates/collection controls.",
                    format: "plain",
                    align: "left",
                  },
                }),
                createPageBlockV2("list", {
                  id: "editorial-hub-posts-steps",
                  props: {
                    ordered: false,
                    items: [
                      "Publikuj aktualnosci, poradniki i wpisy eksperckie.",
                      "Grupuj wpisy po kategoriach lub tematach w Posts.",
                      "Dodaj dynamiczna liste wpisow po udostepnieniu Page collection controls.",
                    ],
                  },
                }),
                createPageBlockV2("button", {
                  id: "editorial-hub-posts-button",
                  props: {
                    label: "Przejdz do wpisow",
                    href: "/posts",
                    target: "self",
                    variant: "secondary",
                    size: "md",
                  },
                }),
              ],
            }),
          ],
        },
      },
    ],
  });

export const EDITORIAL_CONTENT_HUB_PACK: AssistantBusinessBlueprintPack = {
  id: "editorial-content-hub",
  title: "Editorial Content Hub",
  intentFamily: "editorial_content_hub",
  status: "ready",
  surfaces: ["page"],
  actionTypes: ["page.upsert"],
  assumptions: [
    "This pack creates a static hub page only; it does not create or edit post records.",
    "Dynamic post feeds require a later Page collection authoring contract before assistant emission is enabled.",
  ],
  buildPlan: (options) => buildEditorialContentHubPlan({ promptKind: options?.promptKind }),
};
