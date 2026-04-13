import { expect, test } from "vitest";

import { hydrateAssistantActiveSurfaceContext } from "../../../core/services/assistant/activeSurfaceHydration";

const deps = {
  getPage: async (id: string) =>
    id === "page-1"
      ? {
          id,
          title: "Contact from server",
          slug: "/contact",
          status: "published",
        }
      : null,
  getWidgetTemplate: async (id: string) =>
    id === "template-1"
      ? {
          id,
          name: "Template from server",
          status: "published",
          category: "Marketing",
        }
      : null,
  getCustomScreen: async (id: string) =>
    id === "screen-1"
      ? {
          id,
          name: "Screen from server",
          status: "active",
          contentTypeId: "type-1",
          showInSidebar: true,
          sidebarLabel: "Screen",
          capabilities: { mode: "editor" },
        }
      : null,
};

test("hydrateAssistantActiveSurfaceContext rehydrates page identity and preserves block summary", async () => {
  const context = await hydrateAssistantActiveSurfaceContext(
    {
      page: "/admin/pages/page-1",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-1",
          title: "Contact local",
          slug: "/local",
          status: "draft",
          template: "landing",
        },
        selectedBlockId: "hero-1",
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            label: "Hero",
            path: "0",
            childCount: 0,
            slotKeys: [],
            templateId: null,
            templateName: null,
          },
        ],
        warnings: [],
      },
    },
    deps
  );

  expect(context?.activeSurface).toMatchObject({
    kind: "page",
    page: {
      id: "page-1",
      title: "Contact from server",
      slug: "/contact",
      status: "published",
      template: "landing",
    },
    blocks: [{ id: "hero-1", type: "hero" }],
  });
});

test("hydrateAssistantActiveSurfaceContext drops missing active resources", async () => {
  const context = await hydrateAssistantActiveSurfaceContext(
    {
      activeSurface: {
        kind: "widget-template",
        template: {
          id: "missing",
          name: "Missing",
          status: "draft",
          category: "Marketing",
        },
        selectedBlockId: null,
        blocks: [],
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    },
    deps
  );

  expect(context?.activeSurface).toBeNull();
});
