import React from "react";
import { expect, test } from "vitest";
import type { ComponentProps } from "react";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageSettingsDrawer } from "../../../core/admin/ui/pages/PageSettingsDrawer";
import { normalizePageLayoutSettings } from "../../../core/services/pages/layoutSettings";

const basePage = {
  id: "page-1",
  title: "Homepage",
  slug: "/",
  status: "draft" as const,
  currentData: { blocks: [] },
  updatedAt: new Date().toISOString(),
};

const baseSettings = {
  template: "landing",
  showInNav: true,
  layout: normalizePageLayoutSettings(undefined),
  revisionRetention: 10,
};

const renderDrawer = (
  overrides: Partial<ComponentProps<typeof PageSettingsDrawer>> = {}
) =>
  renderAdminUi(
    <PageSettingsDrawer
      open
      onOpenChange={() => undefined}
      page={basePage}
      settings={baseSettings}
      onSave={() => true}
      isSubmitting={false}
      error={null}
      {...overrides}
    />
  );

test("PageSettingsDrawer renders layout and defaults sections", () => {
  const html = renderDrawer();

  expect(html).toContain("Configure metadata, layout, and defaults for this page.");
  expect(html).toContain("Template and navigation");
  expect(html).toContain("Revision history");
  expect(html).toContain("Layout and appearance");
  expect(html).toContain("Default widget layout");
  expect(html).toContain("Apply defaults to new blocks");
  expect(html).toContain("Preview modes");
});

test("PageSettingsDrawer hides blocking template loading copy when fallback choices are usable", () => {
  const html = renderDrawer({ templateOptionsLoading: true });

  expect(html).not.toContain("Loading template options...");
});

test("PageSettingsDrawer surfaces template options error state", () => {
  const html = renderDrawer({
    templateOptionsError: "Failed to load template options.",
    onRetryTemplateOptions: () => undefined,
  });

  expect(html).toContain("Failed to load template options.");
  expect(html).toContain("Try again");
});
