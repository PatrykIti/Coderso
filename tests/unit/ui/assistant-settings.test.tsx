import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AssistantSettingsPage } from "../../../core/admin/ui/settings/AssistantSettingsPage";

test("AssistantSettingsPage renders assistant settings", () => {
  const html = renderToString(<AssistantSettingsPage />);

  expect(html).toContain("Assistant Settings");
  expect(html).toContain("Assistant");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
});
