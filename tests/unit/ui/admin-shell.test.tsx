import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AdminShell } from "../../../core/admin/ui/layouts/AdminShell";


test("AdminShell renders navigation", () => {
  const html = renderToString(
    <AdminShell>
      <div>Content</div>
    </AdminShell>
  );

  expect(html).toContain("Dashboard");
  expect(html).toContain("Content");
});
