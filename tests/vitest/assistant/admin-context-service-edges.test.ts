import { expect, test } from "vitest";

import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import { buildAssistantAdminContext } from "../../../core/services/assistant/adminContextService";

test("buildAssistantAdminContext canonicalizes coderso posts and content routes", () => {
  const posts = buildAssistantAdminContext({
    page: "/admin/coderso/posts/page-1",
    locale: "pl-PL",
  });
  expect(posts.route).toBe("/admin/posts/page-1");

  const coderso = buildAssistantAdminContext({ page: "/admin/coderso/engine", locale: "pl-PL" });
  expect(coderso.route).toBe("/admin/advanced/engine");

  const content = buildAssistantAdminContext({ page: "/admin/content/entries", locale: "pl-PL" });
  expect(content.route).toBe("/admin/advanced/entries/entries");
});

const runtimeSnapshot = {
  schemaVersion: 2,
  route: "/admin/posts",
  activeHref: "/admin/posts",
  area: "posts",
  advancedModule: null,
  selectedResource: null,
  visibleActions: [
    {
      id: "action-1",
      label: "Valid",
      kind: "edit",
      href: "/admin/posts",
      requiredPermission: "posts:update",
    },
    {
      id: "action-2",
      label: "Invalid",
      kind: "edit",
      href: "/admin/posts",
      requiredPermission: "not a valid permission",
    },
  ],
  permissionHints: { known: true, requiredForVisibleActions: [], reason: "server_enriched" },
} satisfies AssistantActionContext["runtimeSnapshot"];

test("buildAssistantAdminContext skips actions with invalid required permissions", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/posts",
    locale: "pl-PL",
    runtimeSnapshot,
  });

  expect(context.runtimeSnapshot?.visibleActions.map((action) => action.id)).toEqual(["action-1"]);
});

const permissionSnapshot = {
  schemaVersion: 2,
  route: "/admin/posts",
  activeHref: "/admin/posts",
  area: "posts",
  advancedModule: null,
  selectedResource: null,
  visibleActions: [
    {
      id: "action-1",
      label: "Update",
      kind: "edit",
      href: "/admin/posts",
      requiredPermission: "posts:update",
    },
    {
      id: "action-2",
      label: "Delete",
      kind: "delete",
      href: "/admin/posts",
      requiredPermission: "posts:delete",
    },
    {
      id: "action-3",
      label: "Read",
      kind: "navigate",
      href: "/admin/posts",
      requiredPermission: "posts:read",
    },
  ],
  permissionHints: { known: true, requiredForVisibleActions: [], reason: "server_enriched" },
} satisfies AssistantActionContext["runtimeSnapshot"];

test("buildAssistantAdminContext sorts permission hints from visible actions", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/posts",
    locale: "pl-PL",
    runtimeSnapshot: permissionSnapshot,
  });

  expect(context.runtimeSnapshot?.permissionHints.requiredForVisibleActions).toEqual([
    "posts:delete",
    "posts:read",
    "posts:update",
  ]);
});

test("buildAssistantAdminContext normalizes section capabilities", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/pages/page-home",
    locale: "pl-PL",
    activeSurface: {
      kind: "page",
      page: { id: "page-home", title: "Home", slug: "/", status: "draft", template: null },
      selectedSectionId: "section-1",
      selectedBlockId: null,
      sections: [
        {
          id: "section-1",
          type: "hero",
          name: "Hero",
          path: "sections.0",
          blockCount: 1,
          capabilities: { insertable: true, assistantEmittable: false, reason: "locked" },
          blocks: [],
        },
      ],
      warnings: [],
    },
  });

  expect(context.activeSurface).toMatchObject({
    kind: "page",
    sections: [
      {
        id: "section-1",
        capabilities: {
          insertable: true,
          assistantEmittable: false,
          reason: "locked",
        },
      },
    ],
  });
});

test("buildAssistantAdminContext normalizes nested block children", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/pages/page-home",
    locale: "pl-PL",
    activeSurface: {
      kind: "page",
      page: { id: "page-home", title: "Home", slug: "/", status: "draft", template: null },
      selectedSectionId: "section-1",
      selectedBlockId: "block-1",
      sections: [
        {
          id: "section-1",
          type: "template",
          name: "Hero",
          path: "sections.0",
          blockCount: 2,
          blocks: [
            {
              id: "block-1",
              type: "container",
              label: "Container",
              path: "sections.0.blocks.0",
              childCount: 1,
              slotKeys: [],
              templateId: null,
              templateName: null,
              children: [
                {
                  id: "block-1-1",
                  type: "heading",
                  label: "Heading",
                  path: "sections.0.blocks.0.children.0",
                  childCount: 0,
                  slotKeys: [],
                  templateId: null,
                  templateName: null,
                },
              ],
            },
          ],
        },
      ],
      warnings: [],
    },
  });

  expect(context.activeSurface).toMatchObject({
    kind: "page",
    sections: [
      expect.objectContaining({
        blocks: [
          expect.objectContaining({
            id: "block-1",
            children: [expect.objectContaining({ id: "block-1-1", childCount: 0 })],
          }),
        ],
      }),
    ],
  });
});

test("buildAssistantAdminContext rejects invalid detail page surfaces", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/content-types/products/detail-pages",
    locale: "pl-PL",
    activeSurface: {
      kind: "detail-page",
      detailPage: {
        id: "detail",
        name: "Detail",
        status: "draft",
        contentTypeId: "products",
        contentTypeSlug: "",
        titlePattern: "Product detail",
      },
      sampleEntryId: null,
      selectedBlockId: null,
      blocks: [],
      warnings: [],
    },
  });

  expect(context.activeSurface).toBeNull();
});

test("buildAssistantAdminContext rejects unknown surface kinds", () => {
  // The kind union is closed at the type level, so feed a deliberately-invalid kind
  // through the runtime boundary to verify the defensive fall-through (same idiom as
  // active-surface-hydration.test.ts for untrusted deps).
  const malformedSurface = { kind: "unknown-kind" };
  const context = buildAssistantAdminContext({
    page: "/admin",
    locale: "pl-PL",
    activeSurface: malformedSurface as unknown as AssistantActionContext["activeSurface"],
  });

  expect(context.activeSurface).toBeNull();
});

test("buildAssistantAdminContext canonicalizes coderso routes for pages", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/coderso/posts/page-1",
    locale: "pl-PL",
  });

  expect(context.route).toBe("/admin/posts/page-1");
});
