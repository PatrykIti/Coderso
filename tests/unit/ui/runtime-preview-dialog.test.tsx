import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { RuntimePreviewDialog } from "../../../core/admin/ui/preview/RuntimePreviewDialog";

test("RuntimePreviewDialog allows scripts in iframe sandbox", () => {
  const html = renderAdminUi(
    <RuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      title="Preview"
      canPreview
      previewUrl="/preview?type=page&token=test"
      isLoading={false}
      error={null}
      device="tablet"
    />
  );

  expect(html).toContain("sandbox=\"allow-same-origin allow-scripts\"");
  expect(html).toContain("Runtime preview");
  expect(html).toContain("device=tablet");
  expect(html).toContain("data-preview-device=\"tablet\"");
});
