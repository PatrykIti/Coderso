import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostEditorSettingsDialog } from "../../../core/admin/ui/posts/editor/settings/PostEditorSettingsDialog";

test("PostEditorSettingsDialog renders editor preference controls", () => {
  const html = renderToString(
    <PostEditorSettingsDialog
      open
      onOpenChange={() => undefined}
      preferences={{
        focusModeOnOpen: false,
        compactSidePanels: false,
        showOutlineHints: true,
      }}
      onChange={() => undefined}
      onReset={() => undefined}
    />
  );

  expect(html).toContain("Editor settings");
  expect(html).toContain("Open in full width mode");
  expect(html).toContain("Compact side panels");
  expect(html).toContain("Show outline hints");
});
