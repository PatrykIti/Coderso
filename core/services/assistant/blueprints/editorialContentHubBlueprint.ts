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
      "I can create an editorial hub page that highlights existing published posts without creating or mutating posts.",
    summary: "Create a public content hub page with intro copy and a posts feed widget.",
    confidence: 0.82,
    assumptions: [
      "This pack creates a page that reads existing posts; it does not create or edit post records.",
      "The posts feed uses existing posts runtime behavior and remains empty until posts are published.",
    ],
    questions: [],
    actions: [
      {
        id: "page-editorial-content-hub",
        type: "page.upsert",
        title: "Create editorial content hub page",
        description: "Create a public hub page with intro copy and posts feed.",
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
            createPageSectionV2("collection", {
              id: "editorial-hub-posts-feed",
              name: "Posts feed",
              variant: "cards",
              blocks: [
                createPageBlockV2("collection", {
                  id: "editorial-hub-posts-feed-block",
                  props: {
                    source: {
                      mode: "latest",
                      limit: 9,
                      sort: "published-desc",
                    },
                    columns: "3",
                    cardStyle: "outlined",
                    ctaLabel: "Read more",
                    emptyTitle: "No posts yet",
                    emptyDescription: "Publish posts to populate this hub.",
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
    "This pack creates a page that reads existing posts; it does not create or edit post records.",
    "The posts feed uses existing posts runtime behavior and remains empty until posts are published.",
  ],
  buildPlan: (options) => buildEditorialContentHubPlan({ promptKind: options?.promptKind }),
};
