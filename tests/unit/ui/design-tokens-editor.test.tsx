import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { DesignTokensEditor } from "../../../core/admin/ui/settings/DesignTokensEditor";

test("DesignTokensEditor renders editor shell", () => {
  const html = renderAdminUi(
    <DesignTokensEditor
      value={{ colors: { primary: "#1392ec" } }}
      onChange={() => {}}
      onReset={() => {}}
    />
  );

  expect(html).toContain("theme.json");
  expect(html).toContain("Apply tokens");
});

test("DesignTokensEditor shows error state for invalid JSON", () => {
  const html = renderAdminUi(
    <DesignTokensEditor
      value={{}}
      initialDraft="{ invalid"
      onChange={() => {}}
      onReset={() => {}}
    />
  );

  expect(html).toContain("Invalid JSON");
});
