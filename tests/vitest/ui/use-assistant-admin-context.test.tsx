// @vitest-environment happy-dom

import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
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
