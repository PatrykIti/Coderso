import type {
  getCollectionWorkspaceSummary,
  CollectionWorkspaceSummary,
} from "../content/collectionWorkspaceService";
import type { getDetailPageDocument } from "../content/detailPageDocumentService";
import type { getCustomScreen } from "../customScreens/customScreenService";
import type { getPage } from "../pages/pageService";
import type { getWidgetTemplate } from "../widgets/widgetTemplateService";
import type {
  AssistantActionContext,
  AssistantCollectionWorkspaceSummary,
} from "./actionPlanTypes";
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
  getDetailPageDocument: typeof getDetailPageDocument;
  getCollectionWorkspaceSummary: typeof getCollectionWorkspaceSummary;
  permissions?: readonly string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readPageBlocks = (currentData: unknown) => {
  if (!isRecord(currentData)) return [];
  return Array.isArray(currentData.blocks) ? currentData.blocks : [];
};

const readDetailPageBlocks = (currentDocument: unknown) => {
  if (!isRecord(currentDocument)) return [];
  return Array.isArray(currentDocument.blocks) ? currentDocument.blocks : [];
};

const hasPermission = (permissions: readonly string[], permission: string) =>
  permissions.includes("*") || permissions.includes(permission);

const resolveWorkspaceActiveDetailPageId = (
  summary: CollectionWorkspaceSummary,
  activeDetailPageId: string | null | undefined
) => {
  if (!activeDetailPageId) return null;
  const detailPageIds = new Set(
    [
      summary.canonical.detailPage?.id ?? null,
      ...summary.candidates.detailPages.map((candidate) => candidate.id),
    ].filter((id): id is string => Boolean(id))
  );
  return detailPageIds.has(activeDetailPageId) ? activeDetailPageId : null;
};

const clearWorkspaceActiveDetailPage = (
  workspace: AssistantCollectionWorkspaceSummary | null | undefined
) => (workspace ? { ...workspace, activeDetailPageId: null } : workspace);

const hydrateCollectionWorkspace = async (
  context: AssistantActionContext,
  deps: AssistantActiveSurfaceHydrationDeps
): Promise<AssistantActionContext> => {
  const hint = context.collectionWorkspaceHint;
  if (!hint?.contentTypeId) {
    return context.collectionWorkspace ? { ...context, collectionWorkspace: null } : context;
  }

  const permissions = deps.permissions ?? ["content:read"];
  if (!hasPermission(permissions, "content:read")) {
    return {
      ...context,
      activeSurface: context.activeSurface?.kind === "detail-page" ? null : context.activeSurface,
      collectionWorkspace: null,
    };
  }

  try {
    const summary = await deps.getCollectionWorkspaceSummary(hint.contentTypeId, {
      permissions,
    });
    if (summary.contentType.id !== hint.contentTypeId) {
      return {
        ...context,
        activeSurface: context.activeSurface?.kind === "detail-page" ? null : context.activeSurface,
        collectionWorkspace: null,
      };
    }
    const activeDetailPageId = resolveWorkspaceActiveDetailPageId(summary, hint.activeDetailPageId);
    return {
      ...context,
      activeSurface:
        context.activeSurface?.kind === "detail-page" &&
        context.activeSurface.detailPage.contentTypeId !== summary.contentType.id
          ? null
          : context.activeSurface,
      collectionWorkspace: {
        ...summary,
        activeDetailPageId,
      },
    };
  } catch {
    return {
      ...context,
      activeSurface: context.activeSurface?.kind === "detail-page" ? null : context.activeSurface,
      collectionWorkspace: null,
    };
  }
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
  if (!context) return context;

  const contextWithWorkspace = await hydrateCollectionWorkspace(context, deps);
  const activeSurface = contextWithWorkspace.activeSurface;
  if (!activeSurface) return contextWithWorkspace;

  if (activeSurface.kind === "page") {
    const page = await deps.getPage(activeSurface.page.id);
    if (!page) return { ...contextWithWorkspace, activeSurface: null };
    const templateReferences = mergeAssistantTemplateSectionReferences([
      ...extractAssistantTemplateSectionReferences(activeSurface.blocks),
      ...extractAssistantTemplateSectionReferences(readPageBlocks(page.currentData)),
    ]);
    const referencedTemplates = await hydrateReferencedTemplates(templateReferences, deps);
    return {
      ...contextWithWorkspace,
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
        warnings: [...new Set([...activeSurface.warnings, ...referencedTemplates.warnings])].sort(
          (left, right) => left.localeCompare(right)
        ),
      },
    };
  }

  if (activeSurface.kind === "widget-template") {
    const template = await deps.getWidgetTemplate(activeSurface.template.id);
    if (!template) return { ...contextWithWorkspace, activeSurface: null };
    return {
      ...contextWithWorkspace,
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
    if (!screen) return { ...contextWithWorkspace, activeSurface: null };
    return {
      ...contextWithWorkspace,
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

  if (activeSurface.kind === "detail-page") {
    if (!contextWithWorkspace.collectionWorkspaceHint) {
      return {
        ...contextWithWorkspace,
        activeSurface: null,
        collectionWorkspace: clearWorkspaceActiveDetailPage(
          contextWithWorkspace.collectionWorkspace
        ),
      };
    }
    const detailPage = await deps.getDetailPageDocument(activeSurface.detailPage.id);
    if (!detailPage) {
      return {
        ...contextWithWorkspace,
        activeSurface: null,
        collectionWorkspace: clearWorkspaceActiveDetailPage(
          contextWithWorkspace.collectionWorkspace
        ),
      };
    }
    const document = detailPage.currentDocument;
    const expectedContentTypeId =
      contextWithWorkspace.collectionWorkspace?.contentType.id ??
      contextWithWorkspace.collectionWorkspaceHint.contentTypeId;
    if (detailPage.contentTypeId !== expectedContentTypeId) {
      return {
        ...contextWithWorkspace,
        activeSurface: null,
        collectionWorkspace: clearWorkspaceActiveDetailPage(
          contextWithWorkspace.collectionWorkspace
        ),
      };
    }

    const templateReferences = mergeAssistantTemplateSectionReferences([
      ...extractAssistantTemplateSectionReferences(activeSurface.blocks),
      ...extractAssistantTemplateSectionReferences(readDetailPageBlocks(document)),
    ]);
    const referencedTemplates = await hydrateReferencedTemplates(templateReferences, deps);
    return {
      ...contextWithWorkspace,
      activeSurface: {
        ...activeSurface,
        detailPage: {
          id: detailPage.id,
          name: detailPage.name,
          status: detailPage.status,
          contentTypeId: detailPage.contentTypeId,
          contentTypeSlug: document.contentTypeSlug,
          titlePattern: document.titlePattern,
        },
        templateReferences,
        referencedTemplates: referencedTemplates.templates,
        warnings: [...new Set([...activeSurface.warnings, ...referencedTemplates.warnings])].sort(
          (left, right) => left.localeCompare(right)
        ),
      },
      collectionWorkspace: contextWithWorkspace.collectionWorkspace
        ? {
            ...contextWithWorkspace.collectionWorkspace,
            activeDetailPageId:
              contextWithWorkspace.collectionWorkspaceHint.activeDetailPageId === detailPage.id
                ? detailPage.id
                : contextWithWorkspace.collectionWorkspace.activeDetailPageId,
          }
        : contextWithWorkspace.collectionWorkspace,
    };
  }

  return contextWithWorkspace;
}
