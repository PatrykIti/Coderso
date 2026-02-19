import { expect, test } from "bun:test";
import { Database } from "lucide-react";
import { renderToString } from "react-dom/server";

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import {
  defaultNavSections,
  type NavSection,
} from "../../../core/admin/ui/navigation/sidebarConfig";
import { SidebarNav } from "../../../core/admin/ui/shared/SidebarNav";
import { mapNavSections } from "../../../core/admin/utils/adminPaths";

const renderSidebar = (
  sections: NavSection[],
  options?: {
    activeHref?: string;
    canAccess?: (permission?: string) => boolean;
  }
) =>
  renderToString(
    <AdminRouterProvider initialPath={options?.activeHref ?? "/admin"}>
      <AdminBasePathProvider value="/admin">
        <SidebarNav
          sections={mapNavSections(sections, "/admin")}
          activeHref={options?.activeHref}
          canAccess={options?.canAccess}
          groupState={{ coderso: true }}
        />
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

test("SidebarNav renders Coderso group with canonical child links", () => {
  const html = renderSidebar(defaultNavSections, {
    activeHref: "/admin/coderso/widgets",
  });

  expect(html).toContain("Coderso");
  expect(html).toContain("Engine");
  expect(html).toContain("/admin/coderso/engine");
  expect(html).toContain("/admin/coderso/entries");
  expect(html).toContain("/admin/coderso/widgets");
  expect(html).toContain("/admin/coderso/forms");
  expect(html).toContain("/admin/coderso/reviews");
  expect(html).toContain("/admin/coderso/commerce");
  expect(html).toContain("/admin/coderso/popups");
  expect(html).toContain("/admin/coderso/solution-kits");
});

test("SidebarNav hides Coderso group when all children are unauthorized", () => {
  const restrictedSections: NavSection[] = [
    {
      title: "Main",
      groups: [
        {
          id: "coderso",
          label: "Coderso",
          items: [
            {
              label: "Engine",
              href: "/admin/coderso/engine",
              icon: Database,
              permission: "content:read",
            },
          ],
        },
      ],
    },
  ];

  const html = renderSidebar(restrictedSections, {
    activeHref: "/admin/coderso/engine",
    canAccess: () => false,
  });

  expect(html).not.toContain("Coderso");
  expect(html).not.toContain("/admin/coderso/engine");
});
