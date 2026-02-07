import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PageSettingsDrawer } from "../../../core/admin/ui/pages/PageSettingsDrawer";
import { normalizePageLayoutSettings } from "../../../core/services/pages/layoutSettings";

test("PageSettingsDrawer renders layout and defaults sections", () => {
  const html = renderToString(
    <PageSettingsDrawer
      open
      onOpenChange={() => undefined}
      page={{
        id: "page-1",
        title: "Homepage",
        slug: "/",
        status: "draft",
        currentData: { blocks: [] },
        updatedAt: new Date().toISOString(),
      }}
      settings={{
        template: "landing",
        showInNav: true,
        layout: normalizePageLayoutSettings(undefined),
      }}
      onSave={() => undefined}
      isSubmitting={false}
      error={null}
    />
  );

  expect(html).toContain("Template and navigation");
  expect(html).toContain("Layout and appearance");
  expect(html).toContain("Default widget layout");
  expect(html).toContain("Apply defaults to new blocks");
  expect(html).toContain("Preview modes");
});
