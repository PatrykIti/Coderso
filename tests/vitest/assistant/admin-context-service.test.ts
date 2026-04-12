import { expect, test } from "vitest";

import { buildAssistantAdminContext } from "../../../core/services/assistant/adminContextService";

test("buildAssistantAdminContext keeps route/module mapping and resource catalog", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/coderso/widgets/templates/template-1?tab=design",
    locale: "pl-PL",
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: "2026-04-11T10:00:00.000Z",
      budget: {
        maxItemsPerGroup: 50,
        maxFieldsPerResource: 24,
        truncated: false,
      },
      contentTypes: [],
      customScreens: [],
      listings: { queries: [], templates: [] },
      forms: [],
      widgets: [],
      warnings: [],
    },
  });

  expect(context).toMatchObject({
    route: "/admin/coderso/widgets/templates/template-1",
    locale: "pl-PL",
    area: "coderso",
    codersoModule: "widgets",
    resourceCatalog: {
      schemaVersion: 1,
    },
  });
});

test("buildAssistantAdminContext normalizes runtime snapshot as advisory context", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/coderso/forms/form-1",
    runtimeSnapshot: {
      schemaVersion: 1,
      route: "/admin/coderso/forms/form-1?tab=settings",
      activeHref: "/admin/coderso/forms/form-1",
      area: "other",
      codersoModule: null,
      selectedResource: {
        kind: "form",
        id: "form-1",
      },
      visibleActions: [
        {
          id: "form.create",
          label: "Create form",
          kind: "create",
          href: "/admin/coderso/forms",
          requiredPermission: "forms:write",
        },
        {
          id: "unsafe",
          label: "Unsafe",
          kind: "execute",
          href: "https://example.com",
          requiredPermission: "apiKey:read",
        },
      ],
      permissionHints: {
        known: true,
        reason: "server_enriched",
        requiredForVisibleActions: ["forms:write", "session:read"],
      },
    },
  });

  expect(context.runtimeSnapshot).toMatchObject({
    route: "/admin/coderso/forms/form-1",
    activeHref: "/admin/coderso/forms/form-1",
    area: "coderso",
    codersoModule: "forms",
    selectedResource: {
      kind: "form",
      id: "form-1",
    },
    permissionHints: {
      known: false,
      reason: "frontend_user_has_no_permissions",
      requiredForVisibleActions: ["forms:write"],
    },
  });
  expect(context.runtimeSnapshot?.visibleActions).toEqual([
    {
      id: "form.create",
      label: "Create form",
      kind: "create",
      href: "/admin/coderso/forms",
      requiredPermission: "forms:write",
    },
  ]);
});

test("buildAssistantAdminContext drops unsafe selected resource data", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/coderso/forms",
    runtimeSnapshot: {
      schemaVersion: 1,
      route: "/admin/coderso/forms",
      activeHref: "/admin/coderso/forms",
      area: "coderso",
      codersoModule: "forms",
      selectedResource: {
        kind: "session",
        id: "secret-session",
      },
      visibleActions: [],
      permissionHints: {
        known: false,
        reason: "frontend_user_has_no_permissions",
        requiredForVisibleActions: [],
      },
    },
  });

  expect(context.runtimeSnapshot?.selectedResource).toBeNull();
});
