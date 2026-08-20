import { resolveCustomScreenCapabilities } from "../../../../core/services/customScreens/capabilities";
import { buildGuidedSiteBuilderPlanResult } from "../../../../core/services/assistant/siteBuilderPlanAdapter";
import type {
  AssistantActionPlan,
  AssistantSiteKitPlanInput,
} from "../../../../core/services/assistant/actionPlanTypes";
import {
  type CustomScreenBinding,
  type CustomScreenDefinition,
  getCustomScreenEditorViewBindings,
  getCustomScreenEditorViewBlocks,
  normalizeCustomScreenDefinitionForWrite,
  withCustomScreenEditorViewCompat,
} from "../../../../core/services/customScreens/customScreenSchemas";
import type { LegacyWidgetBlock } from "../../../../core/services/renderContracts/legacyWidgetBlock";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageSectionV2,
} from "../../../../core/services/pages/pageDocumentV2";

export const createTestPageIntroSection = (id: string, text: string) =>
  createPageSectionV2("content", {
    id,
    name: "Intro",
    blocks: [
      createPageBlockV2("heading", {
        id: `${id}-heading`,
        props: { text, level: "h2", align: "left" },
      }),
    ],
  });

export const createTestPageData = (sections: PageSectionV2[] = []) => ({
  schemaVersion: 2,
  sections,
  settings: {
    template: "page-v2",
    showInNav: true,
  },
});

export const createTestCustomScreenDefinition = (
  blocks: LegacyWidgetBlock[] = [],
  bindings: CustomScreenBinding[] = []
): CustomScreenDefinition =>
  withCustomScreenEditorViewCompat(normalizeCustomScreenDefinitionForWrite(), {
    blocks,
    bindings,
    saveMode: "entry",
    interactionMode: "inline",
  });

export const createNativeTestCustomScreenDefinition = (
  blocks: CustomScreenDefinition["editorView"]["document"]["sections"][number]["blocks"],
  bindings: CustomScreenDefinition["editorView"]["bindings"] = []
): CustomScreenDefinition =>
  normalizeCustomScreenDefinitionForWrite({
    definition: {
      schemaVersion: 4,
      editorView: {
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "main",
              type: "section",
              data: {},
              blocks,
            },
          ],
        },
        bindings,
        saveMode: "entry",
        interactionMode: "inline",
      },
    },
  });

export const projectTestCustomScreenDefinition = (definition: CustomScreenDefinition) => {
  const blocks = getCustomScreenEditorViewBlocks(definition);
  const bindings = getCustomScreenEditorViewBindings(definition);
  return {
    blocks,
    bindings,
    capabilities: resolveCustomScreenCapabilities({ blocks, bindings }),
  };
};

export const readPageSections = (data: unknown) => {
  if (!data || typeof data !== "object") return [];
  const sections = (data as { sections?: unknown }).sections;
  return Array.isArray(sections)
    ? (sections as Array<{ type?: string; blocks?: Array<{ type?: string; props?: unknown }> }>)
    : [];
};

export const readPageBlockTypes = (data: unknown) =>
  readPageSections(data).flatMap((section) => section.blocks?.map((block) => block.type) ?? []);

export const readPageBlocks = (data: unknown) =>
  readPageSections(data).flatMap((section) => section.blocks ?? []);

export const hasPageBlockType = (data: unknown, type: string) =>
  readPageBlockTypes(data).includes(type);

export const automotiveSiteKitInput: AssistantSiteKitPlanInput = {
  businessType: "automotive_workshop",
  goals: ["lead_generation"],
  locale: "en",
  selectedKitId: "automotive-workshop",
  enabledStepIds: ["settings", "pages", "qa"],
};

export const buildExecutorSiteKitPlan = (): AssistantActionPlan => {
  const preview = buildGuidedSiteBuilderPlanResult(automotiveSiteKitInput);
  const resolvedInput = {
    ...automotiveSiteKitInput,
    selectedKitId: preview.selectedKitId,
    enabledStepIds: [...preview.enabledStepIds],
  };

  return {
    id: `plan-site-kit-${preview.selectedKitId}`,
    status: "ready",
    intentId: "site-kit-install",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    title: `${preview.selectedKitTitle} Site Kit`,
    answer: `I can prepare the ${preview.selectedKitTitle} site kit.`,
    summary: "Dry-run and execute the selected site kit through typed assistant actions.",
    confidence: preview.plan.confidence / 100,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: `site-kit-recommend-${preview.selectedKitId}`,
        type: "site-kit.recommend",
        title: `Recommend ${preview.selectedKitTitle}`,
        description: "Recommend the reviewed site kit.",
        input: {
          ...resolvedInput,
          preview,
        },
      },
      {
        id: `site-kit-install-${preview.selectedKitId}`,
        type: "site-kit.install",
        title: `Install ${preview.selectedKitTitle}`,
        description: "Install the reviewed site kit.",
        input: {
          ...resolvedInput,
          continueOnError: true,
          preview,
        },
      },
    ],
  };
};
