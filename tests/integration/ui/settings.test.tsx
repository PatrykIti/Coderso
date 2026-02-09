import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { GeneralSettingsPage } from "../../../core/admin/ui/settings/GeneralSettingsPage";
import { SettingsPage } from "../../../core/admin/ui/settings/SettingsPage";

const noop = () => undefined;

test("SettingsPage renders tokens editor and actions", () => {
  const html = renderToString(
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
  const html = renderToString(
    <GeneralSettingsPage
      values={{ siteName: "Nextless", siteLocale: "en" }}
      onSave={noop}
    />
  );

  expect(html).toContain("General Settings");
  expect(html).toContain("Assistant");
  expect(html).toContain("Public Site URL");
  expect(html).toContain("Save changes");
});
