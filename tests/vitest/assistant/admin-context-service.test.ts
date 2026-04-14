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
      menus: [],
      seoDocuments: [],
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

test("buildAssistantAdminContext normalizes active page surface context", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/pages/page-1",
    activeSurface: {
      kind: "page",
      page: {
        id: "page-1",
        title: "Contact",
        slug: "/contact",
        status: "draft",
        template: "landing",
      },
      selectedBlockId: "hero-1",
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          label: "token secret label",
          path: "0",
          childCount: 0,
          slotKeys: [],
          templateId: null,
          templateName: null,
        },
        {
          id: "template-1",
          type: "template-section",
          label: "CTA",
          path: "1",
          childCount: 0,
          slotKeys: [],
          templateId: "tpl-1",
          templateName: "Contact CTA",
        },
      ],
      warnings: ["page_has_unsaved_changes"],
    },
  });

  expect(context.activeSurface).toMatchObject({
    kind: "page",
    page: {
      id: "page-1",
      title: "Contact",
      slug: "/contact",
      template: "landing",
    },
    selectedBlockId: "hero-1",
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        label: null,
      },
      {
        id: "template-1",
        type: "template-section",
        label: "CTA",
        templateId: "tpl-1",
        templateName: "Contact CTA",
      },
    ],
    templateReferences: [
      {
        templateId: "tpl-1",
        templateName: "Contact CTA",
        blockIds: ["template-1"],
        paths: ["1"],
        count: 1,
      },
    ],
    warnings: ["page_has_unsaved_changes"],
  });
});

test("buildAssistantAdminContext normalizes active widget template surface context", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/coderso/widgets/templates/template-1",
    activeSurface: {
      kind: "widget-template",
      template: {
        id: "template-1",
        name: "Contact Template",
        status: "published",
        category: "Marketing",
      },
      selectedBlockId: "cta-1",
      blocks: [
        {
          id: "cta-1",
          type: "cta-banner",
          label: "CTA",
          path: "0",
          childCount: 0,
          slotKeys: [],
          templateId: null,
          templateName: null,
        },
        {
          id: "secret",
          type: "token-secret-widget",
          label: "Secret",
          path: "1",
          childCount: 0,
          slotKeys: [],
          templateId: null,
          templateName: null,
        },
      ],
      settings: {
        wrapperContainer: "default",
        sectionGap: "md",
        hasBackgroundMedia: true,
      },
      warnings: ["template_remote_update_pending"],
    },
  });

  expect(context.activeSurface).toMatchObject({
    kind: "widget-template",
    template: {
      id: "template-1",
      name: "Contact Template",
      status: "published",
      category: "Marketing",
    },
    selectedBlockId: "cta-1",
    blocks: [
      {
        id: "cta-1",
        type: "cta-banner",
        label: "CTA",
      },
    ],
    settings: {
      wrapperContainer: "default",
      sectionGap: "md",
      hasBackgroundMedia: true,
    },
    warnings: ["template_remote_update_pending"],
  });
});

test("buildAssistantAdminContext normalizes active custom screen surface context", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/coderso/custom-screens/screen-1/entries/entry-1",
    activeSurface: {
      kind: "custom-screen",
      screen: {
        id: "screen-1",
        name: "House Projects",
        status: "active",
        contentTypeId: "type-1",
        showInSidebar: true,
        sidebarLabel: "House Projects",
        mode: "editor",
      },
      selectedEntryId: "entry-1",
      selectedBlockId: "header-1",
      blocks: [
        {
          id: "header-1",
          type: "screen-record-header",
          label: "Project header",
          path: "0",
          childCount: 0,
          slotKeys: [],
          templateId: null,
          templateName: null,
        },
      ],
      bindings: [
        {
          widgetId: "header-1",
          field: "title",
          propPath: "token.secret",
          mode: "readwrite",
        },
        {
          widgetId: "header-1",
          field: "summary",
          propPath: "subtitle",
          mode: "read",
        },
      ],
      writableBindingFields: ["title", "session_secret"],
      warnings: ["custom_screen_entry_has_unsaved_changes"],
    },
  });

  expect(context.activeSurface).toMatchObject({
    kind: "custom-screen",
    screen: {
      id: "screen-1",
      name: "House Projects",
      mode: "editor",
    },
    selectedEntryId: "entry-1",
    selectedBlockId: "header-1",
    blocks: [{ id: "header-1", type: "screen-record-header" }],
    bindings: [
      {
        widgetId: "header-1",
        field: "summary",
        propPath: "subtitle",
        mode: "read",
      },
    ],
    writableBindingFields: ["title"],
    warnings: ["custom_screen_entry_has_unsaved_changes"],
  });
});
