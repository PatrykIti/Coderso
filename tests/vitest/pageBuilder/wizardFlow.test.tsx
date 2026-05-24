import React from "react";
import { expect, test } from "vitest";

import {
  applyWizardSelection,
  createBlock,
  reopenWidgetSetup,
  resolveWidgetEditorState,
} from "../../../core/admin/ui/pages/builder/blockUtils";

test("applyWizardSelection sets variant and mode", () => {
  const block = createBlock("hero");
  const updated = applyWizardSelection(block, "centered");
  if (!updated.editor) throw new Error("missing_editor_state");

  expect(updated.variant).toBe("centered");
  expect(updated.editor.mode).toBe("visual");
  expect(updated.editor.wizardCompleted).toBe(true);
});

test("resolveWidgetEditorState keeps Wizard one-time and daily modes explicit", () => {
  const fresh = createBlock("hero");
  expect(resolveWidgetEditorState(fresh)).toEqual({ mode: "wizard", wizardCompleted: false });

  expect(
    resolveWidgetEditorState({
      editor: { mode: "visual", wizardCompleted: true },
    })
  ).toEqual({ mode: "visual", wizardCompleted: true });

  expect(
    resolveWidgetEditorState({
      editor: { mode: "advanced", wizardCompleted: true },
    })
  ).toEqual({ mode: "advanced", wizardCompleted: true });

  expect(
    resolveWidgetEditorState({
      editor: { mode: "wizard", wizardCompleted: true },
    })
  ).toEqual({ mode: "visual", wizardCompleted: true });
});

test("reopenWidgetSetup preserves widget data and re-enters the one-time setup path", () => {
  const block = applyWizardSelection(createBlock("hero"), "centered");
  const withData = {
    ...block,
    data: {
      headline: "Keep this headline",
    },
  };

  expect(reopenWidgetSetup(withData)).toEqual({
    ...withData,
    editor: { mode: "wizard", wizardCompleted: false },
  });
});
