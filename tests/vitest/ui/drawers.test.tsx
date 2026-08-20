import React from "react";
import { expect, test } from "vitest";
import type { AdminThemeTemplate } from "../../../core/admin/services/adminThemeClient";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { Monitor } from "lucide-react";

import { PageCreateDrawer } from "../../../core/admin/ui/pages/PageCreateDrawer";
import { EntryCreateDrawer } from "../../../core/admin/ui/entries/EntryCreateDrawer";
import { ContentTypeCreateDrawer } from "../../../core/admin/ui/content-types/ContentTypeCreateDrawer";
import { AccessLogDetailsDrawer } from "../../../core/admin/ui/security/AccessLogDetailsDrawer";
import type { AccessLogItem } from "../../../core/admin/ui/security/types";
import { ThemeProfileDrawer } from "../../../core/admin/ui/themes/ThemeProfileDrawer";
import type { AdminThemeProfileCard } from "../../../core/admin/ui/themes/ThemeProfileCard";
import { IntegrationDrawer } from "../../../core/admin/ui/settings/IntegrationDrawer";
import { EmailLogsDrawer } from "../../../core/admin/ui/settings/EmailLogsDrawer";

const accessLog: AccessLogItem = {
  id: "log-1",
  user: { name: "Admin", detail: "admin@coderso.io" },
  ipAddress: "192.168.1.1",
  device: { label: "Chrome / macOS", icon: Monitor },
  timestamp: { date: "Jan 28", time: "09:00" },
  status: "success",
  method: "GET",
  path: "/admin",
  statusCode: 200,
  session: {
    state: "active",
    label: "Active session",
    sessionId: "session-1",
    current: false,
    expiresAt: "2026-06-02T10:00:00.000Z",
    revokedAt: null,
    view: { enabled: true },
    revoke: { enabled: true },
  },
};

const themeProfile: AdminThemeProfileCard = {
  id: "neo-minimalist",
  name: "Neo Minimalist",
  description: "Minimal layout.",
  templateId: "template-1",
  templateName: "Default Admin",
  palette: ["#0f172a"],
};

const templates = [
  {
    id: "template-1",
    name: "Default Admin",
    description: null,
    tokens: {
      base: {
        bg: "#ffffff",
        surface: "#f8fafc",
        text: "#0f172a",
        border: "#e2e8f0",
      },
      typography: {
        mutedText: "#64748b",
        sans: "Inter",
        display: "Inter",
        sm: "0.875rem",
        md: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      buttons: {
        primary: { bg: "#1d4ed8", text: "#fff", hoverBg: "#1e40af", hoverText: "#fff" },
        secondary: { bg: "#0f766e", text: "#fff", hoverBg: "#115e59", hoverText: "#fff" },
        outline: {
          border: "#e2e8f0",
          text: "#0f172a",
          hoverBg: "#f1f5f9",
          hoverText: "#0f172a",
        },
        ghost: { hoverBg: "#f1f5f9", hoverText: "#0f172a" },
      },
      inputs: {
        bg: "#ffffff",
        border: "#e2e8f0",
        text: "#0f172a",
        placeholder: "#94a3b8",
        focusRing: "#1d4ed8",
      },
      sidebar: {
        bg: "#ffffff",
        text: "#64748b",
        activeBg: "#e0f2fe",
        activeText: "#1d4ed8",
        hoverBg: "#f1f5f9",
      },
      topbar: { bg: "#ffffff", text: "#64748b", border: "#e2e8f0" },
      card: { bg: "#ffffff", border: "#e2e8f0" },
      state: { success: "#16a34a", warning: "#f59e0b", danger: "#ef4444" },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

test("PageCreateDrawer renders title", () => {
  const html = renderAdminUi(
    <PageCreateDrawer
      open
      onOpenChange={() => undefined}
      onCreate={() => undefined}
      openAfterCreate
      onOpenAfterCreateChange={() => undefined}
    />
  );

  expect(html).toContain("Create New Page");
  expect(html).toContain("Start with a template and publish when ready.");
  expect(html).toContain("Title is required before you can create the page.");
  expect(html).toContain("Open in editor after create");
});

test("EntryCreateDrawer renders title", () => {
  const html = renderAdminUi(
    <EntryCreateDrawer
      open
      onOpenChange={() => undefined}
      types={[
        {
          id: "blog",
          slug: "blog",
          name: "Blog",
          schema: { type: "object", additionalProperties: false, properties: {} },
        },
      ]}
    />
  );

  expect(html).toContain("Create New Content");
});

test("ContentTypeCreateDrawer renders title", () => {
  const html = renderAdminUi(<ContentTypeCreateDrawer open onOpenChange={() => undefined} />);

  expect(html).toContain("Create New Collection");
});

test("AccessLogDetailsDrawer renders log info", () => {
  const html = renderAdminUi(
    <AccessLogDetailsDrawer log={accessLog} open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Access Log Details");
  expect(html).toContain("admin@coderso.io");
});

test("ThemeProfileDrawer renders profile name", () => {
  const html = renderAdminUi(
    <ThemeProfileDrawer
      open
      onOpenChange={() => undefined}
      profile={themeProfile}
      templates={templates as AdminThemeTemplate[]}
    />
  );

  expect(html).toContain("Edit Profile");
  expect(html).toContain("Neo Minimalist");
});

test("IntegrationDrawer renders integration", () => {
  const html = renderAdminUi(
    <IntegrationDrawer
      open
      onOpenChange={() => undefined}
      integration={{
        id: "slack",
        name: "Slack",
        status: "connected",
        description: "Team notifications",
        scopes: ["notifications:send"],
        fields: [
          {
            key: "webhookUrl",
            label: "Webhook URL",
            type: "secret",
            required: true,
            configured: true,
            value: null,
          },
        ],
      }}
    />
  );

  expect(html).toContain("Slack");
});

test("EmailLogsDrawer renders delivery logs", () => {
  const html = renderAdminUi(<EmailLogsDrawer open onOpenChange={() => undefined} logs={[]} />);

  expect(html).toContain("Delivery Logs");
});
