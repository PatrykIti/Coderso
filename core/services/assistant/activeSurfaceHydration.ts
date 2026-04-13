import type { getCustomScreen } from "../customScreens/customScreenService";
import type { getPage } from "../pages/pageService";
import type { getWidgetTemplate } from "../widgets/widgetTemplateService";
import type { AssistantActionContext } from "./actionPlanTypes";

export type AssistantActiveSurfaceHydrationDeps = {
  getPage: typeof getPage;
  getWidgetTemplate: typeof getWidgetTemplate;
  getCustomScreen: typeof getCustomScreen;
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
