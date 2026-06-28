import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { DashboardPage } from "../../../core/admin/ui/dashboard/DashboardPage";

// `DashboardPage` always fetches on mount and the SSR `renderAdminUi` helper runs
// no effects, so each render is the loading/empty state. We assert the always-
// rendered header, loading affordance, restyled static section headings, and the
// canonicalized nav link — data-gated content (recent-edit rows, donut/stat
// values) is NOT asserted here. (TASK-479-07-L02)

test("DashboardPage renders header + loading affordance", () => {
  const html = renderAdminUi(<DashboardPage />);

  expect(html).toContain("Dashboard");
  expect(html).toMatch(/Loading dashboard|aria-busy="true"/);
});

test("DashboardPage renders restyled sections", () => {
  const html = renderAdminUi(<DashboardPage />);

  expect(html).toContain("Recent Edits");
  expect(html).toContain("Content breakdown");
  expect(html).toContain("Site Health");
  expect(html).toContain("Security Status");
});

test("DashboardPage canonicalizes its nav links", () => {
  const html = renderAdminUi(<DashboardPage />); // base path "/admin"

  expect(html).toContain("/admin/pages"); // AdminLink href="/pages" → resolveAdminHref
  expect(html).not.toContain('href="/pages"'); // raw prototype literal gone
});
