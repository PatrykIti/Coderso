import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { defaultNavSections } from "../../../core/admin/ui/navigation/sidebarConfig";
import { SidebarNav } from "../../../core/admin/ui/shared/SidebarNav";
import { mapNavSections } from "../../../core/admin/utils/adminPaths";

test("SidebarNav renders primary navigation links", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/coderso/entries">
      <AdminBasePathProvider value="/admin">
        <SidebarNav
          sections={mapNavSections(defaultNavSections, "/admin")}
          activeHref="/admin/coderso/entries"
          groupState={{ coderso: true }}
        />
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("Dashboard");
  expect(html).toContain("/admin/pages");
  expect(html).toContain("Coderso");
  expect(html).toContain("/admin/coderso/entries");
  expect(html).toContain("/admin/coderso/engine");
  expect(html).toContain("/admin/media");
  expect(html).toContain("/admin/menus");
  expect(html).toContain("/admin/coderso/widgets");
  expect(html).toContain("/admin/coderso/forms");
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
