import { expect, test } from "bun:test";

import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { CustomScreenListPage } from "../../../core/admin/ui/custom-screens/CustomScreenListPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("CustomScreenListPage renders list shell", () => {
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/coderso/custom-screens",
  });

  expect(html).toContain("Custom Screens");
  expect(html).toContain("New screen");
});

test("CustomScreenEditorPage renders builder canvas and save action", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/coderso/custom-screens/new",
  });

  expect(html).toContain("Create screen");
  expect(html).toContain("Screen canvas");
  expect(html).toContain("Drag widgets");
});
