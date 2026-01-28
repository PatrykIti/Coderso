import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Monitor } from "lucide-react";

import { PageCreateDrawer } from "../../../core/admin/ui/pages/PageCreateDrawer";
import { EntryCreateDrawer } from "../../../core/admin/ui/entries/EntryCreateDrawer";
import { ContentTypeCreateDrawer } from "../../../core/admin/ui/content-types/ContentTypeCreateDrawer";
import { AccessLogDetailsDrawer } from "../../../core/admin/ui/security/AccessLogDetailsDrawer";
import type { AccessLogItem } from "../../../core/admin/ui/security/types";
import { WidgetDetailsDrawer } from "../../../core/admin/ui/widgets/WidgetDetailsDrawer";
import type { WidgetItem } from "../../../core/admin/ui/widgets/types";
import { ThemeProfileDrawer } from "../../../core/admin/ui/themes/ThemeProfileDrawer";
import type { ThemeProfile } from "../../../core/admin/ui/themes/ThemeCard";
import { IntegrationDrawer } from "../../../core/admin/ui/settings/IntegrationDrawer";
import { EmailLogsDrawer } from "../../../core/admin/ui/settings/EmailLogsDrawer";

const accessLog: AccessLogItem = {
  id: "log-1",
  user: { name: "Admin", detail: "admin@nextless.io" },
  ipAddress: "192.168.1.1",
  device: { label: "Chrome / macOS", icon: Monitor },
  timestamp: { date: "Jan 28", time: "09:00" },
  status: "success",
};

const widget: WidgetItem = {
  id: "hero-split",
  name: "Hero Split",
  category: "hero",
  categoryLabel: "Hero Section",
};

const themeProfile: ThemeProfile = {
  id: "neo-minimalist",
  name: "Neo Minimalist",
  description: "Minimal layout.",
  palette: ["#0f172a"],
  icon: null,
  iconClassName: "bg-primary text-primary-foreground",
};

test("PageCreateDrawer renders title", () => {
  const html = renderToString(
    <PageCreateDrawer open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Create New Page");
});

test("EntryCreateDrawer renders title", () => {
  const html = renderToString(
    <EntryCreateDrawer open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Create New Entry");
});

test("ContentTypeCreateDrawer renders title", () => {
  const html = renderToString(
    <ContentTypeCreateDrawer open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Create New Collection");
});

test("AccessLogDetailsDrawer renders log info", () => {
  const html = renderToString(
    <AccessLogDetailsDrawer log={accessLog} open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Access Log Details");
  expect(html).toContain("admin@nextless.io");
});

test("WidgetDetailsDrawer renders widget name", () => {
  const html = renderToString(
    <WidgetDetailsDrawer widget={widget} open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Hero Split");
});

test("ThemeProfileDrawer renders profile name", () => {
  const html = renderToString(
    <ThemeProfileDrawer open onOpenChange={() => undefined} profile={themeProfile} />
  );

  expect(html).toContain("Edit Profile");
  expect(html).toContain("Neo Minimalist");
});

test("IntegrationDrawer renders integration", () => {
  const html = renderToString(
    <IntegrationDrawer
      open
      onOpenChange={() => undefined}
      integration={{
        name: "Slack",
        status: "connected",
        description: "Team notifications",
      }}
    />
  );

  expect(html).toContain("Slack");
});

test("EmailLogsDrawer renders delivery logs", () => {
  const html = renderToString(
    <EmailLogsDrawer open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Delivery Logs");
});
