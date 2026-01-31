import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { RedirectDrawer } from "../../../core/admin/ui/redirects/RedirectDrawer";
import { RedirectsTable, type RedirectRow } from "../../../core/admin/ui/redirects/RedirectsTable";

test("Redirects UI renders table and drawer", () => {
  const rows: RedirectRow[] = [
    {
      id: "redirect-1",
      from: "/old",
      to: "/new",
      type: "301",
      status: "active",
      lastHit: "Now",
    },
  ];
  const html = renderToString(
    <>
      <RedirectsTable items={rows} isLoading={false} isSaving={false} />
      <RedirectDrawer
        open
        onOpenChange={() => undefined}
        mode="create"
        redirect={null}
        isSaving={false}
        onSave={async () => true}
      />
    </>
  );

  expect(html).toContain("From URL");
  expect(html).toContain("New Redirect");
  expect(html).toContain("Destination URL");
});
