import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

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
  const html = renderAdminUi(
    <>
      <RedirectsTable
        items={rows}
        isLoading={false}
        isSaving={false}
        total={rows.length}
        page={1}
        limit={10}
      />
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
  const text = html.replaceAll("<!-- -->", "");

  expect(html).toContain("From URL");
  expect(html).toContain("New Redirect");
  expect(html).toContain("Destination path");
  expect(text).toContain("Showing 1 of 1 redirects");
  expect(html).not.toContain("Previous");
});

test("RedirectsTable renders empty create state without one-page controls", () => {
  const html = renderAdminUi(
    <RedirectsTable
      items={[]}
      isLoading={false}
      isSaving={false}
      total={0}
      page={1}
      limit={10}
      onCreate={() => undefined}
    />
  );
  const text = html.replaceAll("<!-- -->", "");

  expect(html).toContain("No redirects found.");
  expect(html).toContain("Create your first redirect");
  expect(text).toContain("Showing 0 of 0 redirects");
  expect(html).not.toContain("Previous");
  expect(html).not.toContain("Next");
});

test("RedirectsTable renders filtering empty state without create CTA", () => {
  const html = renderAdminUi(
    <RedirectsTable
      items={[]}
      isLoading={false}
      isSaving={false}
      total={0}
      page={1}
      limit={10}
      isFiltering
      onCreate={() => undefined}
    />
  );

  expect(html).toContain("No redirects match your search.");
  expect(html).not.toContain("Create your first redirect");
});
