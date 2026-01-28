import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { defaultNavSections } from "../../../core/admin/ui/navigation/sidebarConfig";
import { SidebarNav } from "../../../core/admin/ui/shared/SidebarNav";

test("SidebarNav renders primary navigation links", () => {
  const html = renderToString(<SidebarNav sections={defaultNavSections} />);

  expect(html).toContain("Dashboard");
  expect(html).toContain("/admin/pages");
  expect(html).toContain("/admin/entries");
  expect(html).toContain("/admin/content-types");
  expect(html).toContain("/admin/media");
  expect(html).toContain("/admin/menus");
  expect(html).toContain("/admin/widgets");
  expect(html).toContain("/admin/forms");
  expect(html).toContain("/admin/store");
  expect(html).toContain("/admin/themes");
  expect(html).toContain("/admin/search");
  expect(html).toContain("/admin/seo");
  expect(html).toContain("/admin/analytics");
  expect(html).toContain("/admin/backups");
  expect(html).toContain("/admin/tools/import-export");
  expect(html).toContain("/admin/redirects");
  expect(html).toContain("/admin/users");
  expect(html).toContain("/admin/roles");
  expect(html).toContain("/admin/audit");
  expect(html).toContain("/admin/access-logs");
  expect(html).toContain("/admin/settings");
});
