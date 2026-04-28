import React from "react";
import { expect, test } from "vitest";

import { applyWizardSelection, createBlock } from "../../../core/admin/ui/pages/builder/blockUtils";

test("applyWizardSelection sets variant and mode", () => {
  const block = createBlock("hero");
  const updated = applyWizardSelection(block, "centered");
  if (!updated.editor) throw new Error("missing_editor_state");

  expect(updated.variant).toBe("centered");
  expect(updated.editor.mode).toBe("visual");
  expect(updated.editor.wizardCompleted).toBe(true);
});
