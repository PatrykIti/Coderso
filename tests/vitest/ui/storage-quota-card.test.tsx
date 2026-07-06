import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { StorageQuotaCard } from "../../../core/admin/ui/media/StorageQuotaCard";

const GB = 1024 * 1024 * 1024;

test("StorageQuotaCard renders a quota-backed progress bar at the clamped pct", () => {
  const html = renderAdminUi(
    <StorageQuotaCard
      usedBytes={5 * GB}
      totalBytes={10 * GB}
      planLabel="Pro plan"
      assetCount={12}
    />
  );

  // Reused Radix Progress indicator reflects the computed pct (5/10 = 50%).
  expect(html).toContain('data-slot="progress-indicator"');
  expect(html).toContain("translateX(-50%)");
  expect(html).toContain("50% used");
  expect(html).toContain("5.0 GB of 10 GB used");
  expect(html).toContain("5.0 GB available");
  // Plan label drives the action button.
  expect(html).toContain("Pro plan");
});

test("StorageQuotaCard clamps over-quota usage to 100%", () => {
  const html = renderAdminUi(
    <StorageQuotaCard usedBytes={20 * GB} totalBytes={10 * GB} planLabel={null} assetCount={99} />
  );
  expect(html).toContain("translateX(-0%)");
  expect(html).toContain("100% used");
  // Falls back to the default action label when planLabel is null.
  expect(html).toContain("Manage plan");
});

test("StorageQuotaCard degrades to a count-only card with no progress when quota is null", () => {
  const html = renderAdminUi(
    <StorageQuotaCard usedBytes={2 * GB} totalBytes={null} planLabel={null} assetCount={7} />
  );
  expect(html).not.toContain('data-slot="progress-indicator"');
  expect(html).toContain("7 assets · 2.0 GB");
  expect(html).toContain("No storage quota configured");
});
