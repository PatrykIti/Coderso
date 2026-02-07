import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WidgetTemplatePreviewDialog } from "../../../core/admin/ui/widgets/WidgetTemplatePreviewDialog";

test("WidgetTemplatePreviewDialog allows scripts in iframe sandbox", () => {
  const html = renderToString(
    <WidgetTemplatePreviewDialog
      open
      onOpenChange={() => undefined}
      templateName="Test template"
      canPreview
      preview={{
        token: "preview-token",
        previewUrl: "/preview?type=widget-template&token=preview-token",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        blocksCount: 1,
      }}
      isLoading={false}
      error={null}
    />
  );

  expect(html).toContain("sandbox=\"allow-same-origin allow-scripts\"");
});
