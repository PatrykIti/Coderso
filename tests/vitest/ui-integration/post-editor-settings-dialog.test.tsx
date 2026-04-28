import React from "react";
import { expect, test } from "vitest";
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
        editorDensity: "comfortable",
        showKeyboardHints: true,
        defaultInspectorTab: "post",
        restoreLastSidebarsState: true,
      }}
      onChange={() => undefined}
      onReset={() => undefined}
    />
  );

  expect(html).toContain("Editor settings");
  expect(html).toContain("Open in focus mode");
  expect(html).toContain("Restore panel state");
  expect(html).toContain("Default inspector tab");
  expect(html).toContain("Compact side panels");
  expect(html).toContain("Editor density");
  expect(html).toContain("Show outline hints");
  expect(html).toContain("Show keyboard hints");
});
