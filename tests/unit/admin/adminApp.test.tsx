import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AdminApp } from "../../../core/admin/app/AdminApp";

test("AdminApp renders theme tokens during loading state", () => {
  const html = renderToString(<AdminApp path="/admin/pages" />);
  expect(html).toContain("nextless-theme-tokens");
  expect(html).toContain("Loading...");
});
