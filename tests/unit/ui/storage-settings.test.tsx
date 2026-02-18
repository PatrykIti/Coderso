import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { StorageSettingsPage } from "../../../core/admin/ui/settings/StorageSettingsPage";

test("StorageSettingsPage renders provider cards and config panel", () => {
  const html = renderAdminUi(<StorageSettingsPage />);

  expect(html).toContain("Storage Settings");
  expect(html).toContain("Local Storage");
  expect(html).toContain("Amazon S3");
  expect(html).toContain("Azure Blob");
  expect(html).toContain("Test Connection");
  expect(html).toContain("Delivery Access");
  expect(html).toContain("Auto-save settings across all screens");
});
