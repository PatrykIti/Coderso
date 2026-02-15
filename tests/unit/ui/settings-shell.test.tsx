import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SettingsShell } from "../../../core/admin/ui/layouts/SettingsShell";

test("SettingsShell uses independent scroll containers", () => {
  const html = renderToString(
    <SettingsShell sidebar={<div>Sidebar</div>} preview={<div>Preview</div>}>
      <div>Content</div>
    </SettingsShell>
  );

  const overscrollCount = (html.match(/overscroll-contain/g) ?? []).length;
  expect(overscrollCount).toBeGreaterThanOrEqual(3);
  expect(html).toContain("overflow-hidden");
});
