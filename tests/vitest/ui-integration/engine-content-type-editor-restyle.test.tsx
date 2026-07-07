import React from "react";
import { expect, test } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";

test("content type editor renders tabs + fields section + prototype header actions", () => {
  const html = renderAdminUi(<ContentTypeEditor />, { path: "/admin/content-types/sample" });

  // Four line-variant tab triggers — TASK-513-03 ADDED the Permissions tab to the prototype shell.
  for (const label of ["Fields", "Relations", "Settings", "Permissions"]) {
    expect(html).toContain(label);
  }

  // Prototype PageHeader action surface: inline Save + Open schema, secondary actions in the
  // More menu (TASK-513-03 replaced the EditorShell sticky toolbar with the in-page PageHeader).
  expect(html).toContain(">Save<");
  expect(html).toContain("Open schema");
  expect(html).toContain('aria-label="More actions"');

  // Active Fields tab SectionCard action + the right-column Type settings card (TASK-513-01/03).
  expect(html).toContain("Add field");
  expect(html).toContain("Type settings");

  // No fabricated raw-palette status chrome leaked back in.
  expect(html).not.toContain("border-rose-200");
  expect(html).not.toContain("bg-amber-50/70");
});
