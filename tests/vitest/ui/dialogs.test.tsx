import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SeoAuditDialog } from "../../../core/admin/ui/seo/SeoAuditDialog";
import { ExportDialog } from "../../../core/admin/ui/shared/ExportDialog";
import { BackupNowDialog } from "../../../core/admin/ui/backups/BackupNowDialog";
import { ThemeExportDialog } from "../../../core/admin/ui/themes/ThemeExportDialog";
import { WidgetInsertDialog } from "../../../core/admin/ui/widgets/WidgetInsertDialog";
import { IntegrationRequestDialog } from "../../../core/admin/ui/settings/IntegrationRequestDialog";

test("SeoAuditDialog renders audit options", () => {
  const html = renderAdminUi(
    <SeoAuditDialog open onOpenChange={() => undefined} onRun={() => undefined} />
  );

  expect(html).toContain("Run SEO Audit");
});

test("ExportDialog renders fields", () => {
  const html = renderAdminUi(
    <ExportDialog
      open
      onOpenChange={() => undefined}
      title="Export Logs"
      description="Download records."
      filename="export.csv"
      fields={[{ id: "event", label: "Event" }]}
    />
  );

  expect(html).toContain("Export Logs");
  expect(html).toContain("Event");
  expect(html).toContain("Export is not available for this surface yet.");
  expect(html).not.toContain("Excel");
});

test("BackupNowDialog renders options", () => {
  const html = renderAdminUi(
    <BackupNowDialog
      open
      onOpenChange={() => undefined}
      onCreate={async () => true}
      isSubmitting={false}
    />
  );

  expect(html).toContain("Create Backup");
});

test("ThemeExportDialog renders title", () => {
  const html = renderAdminUi(<ThemeExportDialog open onOpenChange={() => undefined} />);

  expect(html).toContain("Export Theme Config");
});

test("WidgetInsertDialog renders title", () => {
  const html = renderAdminUi(<WidgetInsertDialog open onOpenChange={() => undefined} pages={[]} />);

  expect(html).toContain("Insert Widget");
});

test("IntegrationRequestDialog renders title", () => {
  const html = renderAdminUi(<IntegrationRequestDialog open onOpenChange={() => undefined} />);

  expect(html).toContain("Request New Integration");
});
