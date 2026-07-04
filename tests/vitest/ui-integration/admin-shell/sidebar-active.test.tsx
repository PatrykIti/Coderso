// @vitest-environment happy-dom
//
// TASK-479-06-L07: SidebarNav is a pure component — active-state / RBAC / de-SaaS
// invariants are asserted on its SSR string, and the (interactive) advanced-group
// toggle via createRoot + React.act.

import { FileText, LayoutDashboard, ScrollText, Settings, Blocks } from "lucide-react";
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { SidebarNav, SiteIdentity } from "@/ui/shared/SidebarNav";
import { AdminRouterProvider } from "@/ui/contexts/AdminRouterContext";
import type { NavSection } from "@/ui/navigation/sidebarConfig";

import { renderAdminUi } from "../../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Audit Logs", href: "/admin/audit", icon: ScrollText, permission: "audit:read" },
    ],
    groups: [
      {
        id: "advanced",
        label: "Advanced",
        icon: Blocks,
        defaultExpanded: true,
        items: [
          { label: "Screens", href: "/admin/advanced/custom-screens", icon: FileText },
          {
            label: "Entries",
            href: "/admin/advanced/custom-screens/p1/entries",
            icon: FileText,
          },
        ],
      },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/admin/settings", icon: Settings }],
  },
];

afterEach(() => {
  document.body.innerHTML = "";
});

test("highlights the longest-prefix winner only (deepest href, not its broader parent)", () => {
  const html = renderAdminUi(
    <SidebarNav
      sections={sections}
      activeHref="/admin/advanced/custom-screens/p1/entries"
      canAccess={() => true}
    />
  );

  // Exactly one active item — no broader prefix lights up alongside it.
  const activeMarkers = html.match(/--admin-sidebar-active-bg/g) ?? [];
  expect(activeMarkers).toHaveLength(1);

  // ...and that single active pill is anchored to the deepest (entries) link.
  // In the SSR output the anchor renders `href="..."` before its `class="..."`,
  // so the active token follows the entries href on the same element.
  expect(html).toMatch(/custom-screens\/p1\/entries[^]*?--admin-sidebar-active-bg/);
});

test("filters items by permission (RBAC preserved)", () => {
  const granted = renderAdminUi(<SidebarNav sections={sections} canAccess={() => true} />);
  expect(granted).toContain("Audit Logs");

  const denied = renderAdminUi(
    <SidebarNav sections={sections} canAccess={(p) => p !== "audit:read"} />
  );
  expect(denied).not.toContain("Audit Logs");
});

test("is de-SaaS: site identity + version, no workspace switcher / no Pro-trial", () => {
  const html = renderAdminUi(
    <SidebarNav
      sections={sections}
      canAccess={() => true}
      brand={<SiteIdentity siteName="Acme" siteDomain="acme.com" siteUrl="https://acme.com" />}
    />
  );

  expect(html).toContain("Acme");
  expect(html).toContain("Coderso 1.0");
  // "Visit site" is a raw external anchor (target=_blank), not an AdminLink.
  expect(html).toMatch(/href="https:\/\/acme\.com"[^>]*target="_blank"/);
  expect(html.toLowerCase()).not.toMatch(/coderso pro|upgrade|trial|workspace/);
});

test("falls back to the neutral Coderso identity when no brand is provided", () => {
  const html = renderAdminUi(<SidebarNav sections={sections} canAccess={() => true} />);
  expect(html).toContain("Coderso");
  // No fabricated site domain / visit-site anchor for the neutral fallback.
  expect(html).not.toMatch(/target="_blank"/);
});

// Advanced-group toggle is interactive (controlled by the host's groupState) —
// mount a stateful host and assert onGroupToggle fired + aria-expanded flipped.
test("advanced-group toggle calls onGroupToggle and flips aria-expanded", () => {
  const calls: Array<[string, boolean]> = [];

  function Host() {
    const [groupState, setGroupState] = React.useState<Record<string, boolean>>({ advanced: true });
    return (
      <AdminRouterProvider initialPath="/admin">
        <SidebarNav
          sections={sections}
          canAccess={() => true}
          groupState={groupState}
          onGroupToggle={(id, next) => {
            calls.push([id, next]);
            setGroupState((prev) => ({ ...prev, [id]: next }));
          }}
        />
      </AdminRouterProvider>
    );
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<Host />);
  });

  try {
    const groupButton = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Advanced")
    );
    if (!groupButton) throw new Error("missing Advanced group button");
    expect(groupButton.getAttribute("aria-expanded")).toBe("true");

    React.act(() => {
      groupButton.click();
    });

    expect(calls).toEqual([["advanced", false]]);
    const after = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Advanced")
    );
    expect(after?.getAttribute("aria-expanded")).toBe("false");
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});
