// @vitest-environment happy-dom

import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "../../../core/admin/ui/assistant/activeSurfaceContext";
import {
  buildAssistantAdminRuntimeSnapshot,
  useAssistantAdminContext,
} from "../../../core/admin/ui/assistant/useAssistantAdminContext";

const SnapshotProbe = ({ activeHref }: { activeHref?: string | null }) => {
  const context = useAssistantAdminContext({ activeHref });
  return (
    <pre data-context="assistant-admin-context">
      {JSON.stringify(context)}
    </pre>
  );
};

const readContextFromHtml = (html: string) => {
  const match = html.match(/<pre[^>]*>(.*)<\/pre>/);
  if (!match?.[1]) throw new Error("missing_context");
  return JSON.parse(match[1].replaceAll("&quot;", "\"")) as {
    page?: string;
    runtimeSnapshot?: {
      route: string | null;
      activeHref: string | null;
      selectedResource: { kind: string; id: string } | null;
      visibleActions: Array<{ id: string; requiredPermission: string | null }>;
      permissionHints: {
        known: boolean;
        requiredForVisibleActions: string[];
        reason: string;
      };
    };
    activeSurface?: {
      kind: "page" | "widget-template";
      page?: { id: string; title: string; slug: string; status: string; template: string | null };
      template?: { id: string; name: string; status: string; category: string };
      selectedBlockId: string | null;
      blocks: Array<{ id: string; type: string; templateId: string | null }>;
      settings?: { wrapperContainer: string | null; sectionGap: string | null; hasBackgroundMedia: boolean };
      warnings: string[];
    } | null;
  };
};

test("useAssistantAdminContext uses AdminRouterContext path and supplied active href", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/coderso/forms/form-1">
      <SnapshotProbe activeHref="/admin/coderso/forms/form-1" />
    </AdminRouterProvider>
  );
  const context = readContextFromHtml(html);

  expect(context.page).toBe("/admin/coderso/forms/form-1");
  expect(context.runtimeSnapshot).toMatchObject({
    route: "/admin/coderso/forms/form-1",
    activeHref: "/admin/coderso/forms/form-1",
    selectedResource: {
      kind: "form",
      id: "form-1",
    },
    permissionHints: {
      known: false,
      reason: "frontend_user_has_no_permissions",
    },
  });
  expect(context.runtimeSnapshot?.visibleActions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "form.create",
        requiredPermission: "forms:write",
      }),
    ])
  );
  expect(context.runtimeSnapshot?.permissionHints.requiredForVisibleActions).toContain(
    "forms:write"
  );
  expect(JSON.stringify(context)).not.toContain("email");
  expect(JSON.stringify(context)).not.toContain("session");
});

test("useAssistantAdminContext falls back to browser path without provider", () => {
  window.history.replaceState({}, "", "/admin/pages/page-1?tab=seo#settings");

  const html = renderToString(<SnapshotProbe />);
  const context = readContextFromHtml(html);

  expect(context.page).toBe("/admin/pages/page-1");
  expect(context.runtimeSnapshot?.selectedResource).toEqual({
    kind: "page",
    id: "page-1",
  });
  expect(context.runtimeSnapshot?.visibleActions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "page.publish",
        requiredPermission: "content:publish",
      }),
    ])
  );
});

test("buildAssistantAdminRuntimeSnapshot derives entry and widget-template resources", () => {
  expect(
    buildAssistantAdminRuntimeSnapshot({
      route: "/admin/coderso/entries/articles/entry-1",
    }).selectedResource
  ).toEqual({ kind: "entry", id: "entry-1" });

  expect(
    buildAssistantAdminRuntimeSnapshot({
      route: "/admin/coderso/widgets/templates/template-1",
    }).selectedResource
  ).toEqual({ kind: "widget-template", id: "template-1" });
});

test("useAssistantAdminContext includes matching active page surface context", () => {
  setActiveAssistantSurfaceContext({
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
        label: "Contact hero",
        path: "0",
        childCount: 0,
        slotKeys: [],
        templateId: null,
        templateName: null,
      },
      {
        id: "template-1",
        type: "template-section",
        label: null,
        path: "1",
        childCount: 0,
        slotKeys: [],
        templateId: "tpl-1",
        templateName: "Contact CTA",
      },
    ],
    warnings: ["page_has_unsaved_changes"],
  });

  try {
    const html = renderToString(
      <AdminRouterProvider initialPath="/admin/pages/page-1">
        <SnapshotProbe activeHref="/admin/pages/page-1" />
      </AdminRouterProvider>
    );
    const context = readContextFromHtml(html);

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
        { id: "hero-1", type: "hero", templateId: null },
        { id: "template-1", type: "template-section", templateId: "tpl-1" },
      ],
      warnings: ["page_has_unsaved_changes"],
    });
  } finally {
    clearActiveAssistantSurfaceContext();
  }
});

test("useAssistantAdminContext drops active page surface for a different route", () => {
  setActiveAssistantSurfaceContext({
    kind: "page",
    page: {
      id: "page-1",
      title: "Contact",
      slug: "/contact",
      status: "draft",
      template: null,
    },
    selectedBlockId: null,
    blocks: [],
    warnings: [],
  });

  try {
    const html = renderToString(
      <AdminRouterProvider initialPath="/admin/pages/page-2">
        <SnapshotProbe activeHref="/admin/pages/page-2" />
      </AdminRouterProvider>
    );
    const context = readContextFromHtml(html);

    expect(context.activeSurface).toBeNull();
  } finally {
    clearActiveAssistantSurfaceContext();
  }
});

test("useAssistantAdminContext includes matching active widget template context", () => {
  setActiveAssistantSurfaceContext({
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
        label: "Contact CTA",
        path: "0",
        childCount: 0,
        slotKeys: [],
        templateId: null,
        templateName: null,
      },
    ],
    settings: {
      wrapperContainer: "default",
      sectionGap: "md",
      hasBackgroundMedia: false,
    },
    warnings: ["template_remote_update_pending"],
  });

  try {
    const html = renderToString(
      <AdminRouterProvider initialPath="/admin/coderso/widgets/templates/template-1">
        <SnapshotProbe activeHref="/admin/coderso/widgets/templates/template-1" />
      </AdminRouterProvider>
    );
    const context = readContextFromHtml(html);

    expect(context.activeSurface).toMatchObject({
      kind: "widget-template",
      template: {
        id: "template-1",
        name: "Contact Template",
        status: "published",
        category: "Marketing",
      },
      selectedBlockId: "cta-1",
      blocks: [{ id: "cta-1", type: "cta-banner", templateId: null }],
      settings: {
        wrapperContainer: "default",
        sectionGap: "md",
        hasBackgroundMedia: false,
      },
      warnings: ["template_remote_update_pending"],
    });
  } finally {
    clearActiveAssistantSurfaceContext();
  }
});
