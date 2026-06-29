import React from "react";
import { expect, test } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";

test("content type editor renders tabs + fields section + sticky actions", () => {
  const html = renderAdminUi(<ContentTypeEditor />, { path: "/admin/content-types/sample" });

  // Three line-variant tab triggers (no fabricated Permissions tab).
  for (const label of ["Fields", "Relations", "Settings"]) {
    expect(html).toContain(label);
  }
  expect(html).not.toContain("Permissions");

  // Active Fields tab SectionCard action (editor seeds defaultFields, so it renders under SSR).
  expect(html).toContain("Add field");

  // Seeded default field rows render their labels in the FieldsListPanel.
  expect(html).toContain("Title");
  expect(html).toContain("Body");

  // Sticky action bar is preserved.
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Collection workspace");
  expect(html).toContain("Duplicate");
  expect(html).toContain("Delete");

  // No fabricated raw-palette status chrome leaked back in.
  expect(html).not.toContain("border-rose-200");
  expect(html).not.toContain("bg-amber-50/70");
});
