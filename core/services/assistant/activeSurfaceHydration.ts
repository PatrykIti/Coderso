import type { getCustomScreen } from "../customScreens/customScreenService";
import type { getPage } from "../pages/pageService";
import type { getWidgetTemplate } from "../widgets/widgetTemplateService";
import type { AssistantActionContext } from "./actionPlanTypes";
import {
  extractAssistantTemplateSectionReferences,
  mergeAssistantTemplateSectionReferences,
  normalizeAssistantReferencedWidgetTemplates,
} from "./adminContextCatalogNormalizer";
import type { AssistantTemplateSectionReferenceSummary } from "./adminContextTypes";

export type AssistantActiveSurfaceHydrationDeps = {
  getPage: typeof getPage;
  getWidgetTemplate: typeof getWidgetTemplate;
  getCustomScreen: typeof getCustomScreen;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readPageBlocks = (currentData: unknown) => {
  if (!isRecord(currentData)) return [];
  return Array.isArray(currentData.blocks) ? currentData.blocks : [];
};

const hydrateReferencedTemplates = async (
  references: AssistantTemplateSectionReferenceSummary[],
  deps: AssistantActiveSurfaceHydrationDeps
) => {
  if (references.length === 0) {
    return { templates: [], warnings: [] };
  }

  const warnings = new Set<string>();
  const templates: unknown[] = [];

  await Promise.all(
    references.map(async (reference) => {
      try {
        const template = await deps.getWidgetTemplate(reference.templateId);
        if (template) {
          templates.push(template);
          return;
        }
        warnings.add("referenced_widget_template_missing");
      } catch {
        warnings.add("referenced_widget_template_unavailable");
      }
    })
  );

  return {
    templates: normalizeAssistantReferencedWidgetTemplates(templates, {
      maxTemplateReferences: references.length,
    }),
    warnings: [...warnings].sort((left, right) => left.localeCompare(right)),
  };
};

export async function hydrateAssistantActiveSurfaceContext(
  context: AssistantActionContext | undefined,
  deps: AssistantActiveSurfaceHydrationDeps
): Promise<AssistantActionContext | undefined> {
  const activeSurface = context?.activeSurface;
  if (!activeSurface) return context;

  if (activeSurface.kind === "page") {
    const page = await deps.getPage(activeSurface.page.id);
    if (!page) return { ...context, activeSurface: null };
    const templateReferences = mergeAssistantTemplateSectionReferences([
      ...extractAssistantTemplateSectionReferences(activeSurface.blocks),
      ...extractAssistantTemplateSectionReferences(readPageBlocks(page.currentData)),
    ]);
    const referencedTemplates = await hydrateReferencedTemplates(templateReferences, deps);
    return {
      ...context,
      activeSurface: {
        ...activeSurface,
        page: {
          id: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status,
          template: activeSurface.page.template,
        },
        templateReferences,
        referencedTemplates: referencedTemplates.templates,
        warnings: [
          ...new Set([...activeSurface.warnings, ...referencedTemplates.warnings]),
        ].sort((left, right) => left.localeCompare(right)),
      },
    };
  }

  if (activeSurface.kind === "widget-template") {
    const template = await deps.getWidgetTemplate(activeSurface.template.id);
    if (!template) return { ...context, activeSurface: null };
    return {
      ...context,
      activeSurface: {
        ...activeSurface,
        template: {
          id: template.id,
          name: template.name,
          status: template.status,
          category: template.category,
        },
      },
    };
  }

  if (activeSurface.kind === "custom-screen") {
    const screen = await deps.getCustomScreen(activeSurface.screen.id);
    if (!screen) return { ...context, activeSurface: null };
    return {
      ...context,
      activeSurface: {
        ...activeSurface,
        screen: {
          id: screen.id,
          name: screen.name,
          status: screen.status,
          contentTypeId: screen.contentTypeId,
          showInSidebar: screen.showInSidebar,
          sidebarLabel: screen.sidebarLabel,
          mode: screen.capabilities.mode,
        },
      },
    };
  }

  return context;
}
