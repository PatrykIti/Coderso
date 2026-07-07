import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";

test("ContentTypeEditor renders editor shell", () => {
  const html = renderAdminUi(<ContentTypeEditor />);

  // PageHeader: Engine breadcrumb + dynamic display name (falls back with no id loaded)
  expect(html).toContain("Engine");
  expect(html).toContain("Content type");
  expect(html).toContain("Define the fields and behavior");
  // Primary action surface: inline Save + Open schema, secondary actions in the More menu
  expect(html).toContain(">Save<");
  expect(html).toContain("Open schema");
  expect(html).toContain('aria-label="More actions"');
  // Four editor tabs (incl. Permissions) from the refactored shell
  expect(html).toContain(">Fields");
  expect(html).toContain(">Relations");
  expect(html).toContain(">Settings");
  expect(html).toContain(">Permissions");
  // Fields tab panels
  expect(html).toContain("Add field");
  expect(html).toContain("Field settings");
  expect(html).toContain("Type settings");
});
