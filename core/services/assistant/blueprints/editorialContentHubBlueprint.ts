import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type {
  AssistantActionPlan,
  AssistantPromptKind,
} from "../actionPlanTypes";
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
    summary:
      "Create a public content hub page with intro copy and a posts feed widget.",
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
          introBody:
            "Przeglądaj najnowsze wpisy, poradniki i aktualności w jednym miejscu.",
          blocks: [
            {
              id: "editorial-hub-intro",
              type: "rich-text-section",
              variant: "single-column",
              data: {
                titleBlock: {
                  eyebrow: "Blog",
                  title: "Wiedza i aktualności",
                },
                body: {
                  blocks: [
                    {
                      id: "editorial-hub-intro-copy",
                      heading: "Najnowsze treści",
                      content:
                        "Ta strona zbiera opublikowane wpisy i ułatwia czytelnikom przejście do szczegółów.",
                    },
                  ],
                },
                options: {
                  outputMode: "blocks-fallback",
                  maxWidth: "lg",
                },
              },
            },
            {
              id: "editorial-hub-posts-feed",
              type: "posts-feed",
              variant: "cards",
              data: {
                source: {
                  mode: "latest",
                  limit: 9,
                  sort: "published-desc",
                },
                fields: {
                  showExcerpt: true,
                  showAuthor: true,
                  showDate: true,
                  showCta: true,
                },
                emptyState: {
                  title: "No posts yet",
                  description: "Publish posts to populate this hub.",
                },
                style: {
                  columns: "3",
                  gap: "md",
                  cardStyle: "outlined",
                  ctaLabel: "Read more",
                },
              },
            },
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
