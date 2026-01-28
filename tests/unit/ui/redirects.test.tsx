import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { RedirectDrawer } from "../../../core/admin/ui/redirects/RedirectDrawer";
import { RedirectsTable } from "../../../core/admin/ui/redirects/RedirectsTable";

test("Redirects UI renders table and drawer", () => {
  const html = renderToString(
    <>
      <RedirectsTable />
      <RedirectDrawer defaultOpen />
    </>
  );

  expect(html).toContain("From URL");
  expect(html).toContain("New Redirect");
  expect(html).toContain("Destination URL");
});
