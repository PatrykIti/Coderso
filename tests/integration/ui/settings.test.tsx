import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { GeneralSettingsPage } from "../../../core/admin/ui/settings/GeneralSettingsPage";
import { SettingsPage } from "../../../core/admin/ui/settings/SettingsPage";

const noop = () => undefined;

test("SettingsPage renders tokens editor and actions", () => {
  const html = renderAdminUi(
    <SettingsPage
      values={{ siteName: "Nextless", siteLocale: "en" }}
      tokens={{}}
      onSave={noop}
      onResetTokens={noop}
    />
  );

  expect(html).toContain("Theme Configuration");
  expect(html).toContain("Save changes");
});

test("GeneralSettingsPage renders form actions", () => {
  const html = renderAdminUi(
    <GeneralSettingsPage
      values={{ siteName: "Nextless", siteLocale: "en" }}
      onSave={noop}
    />
  );

  expect(html).toContain("General Settings");
  expect(html).toContain("Site Identity");
  expect(html).toContain("Manage site identity and branding");
  expect(html).toContain("Save changes");
});
