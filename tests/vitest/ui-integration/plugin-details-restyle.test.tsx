import React from "react";
import { describe, expect, it } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PluginDetailsPage } from "../../../core/admin/ui/store/PluginDetailsPage";

// TASK-479-24-L03: presentation guards for the Plugin Details restyle (L02).
// SSR string assertions only — only the default-active Overview tab body is in the
// HTML, so we assert on the hero chrome, the tab TRIGGER labels, and the active
// Overview tab body; never the inactive Changelog/Settings bodies.
describe("Plugin Details restyle", () => {
  it("renders hero header, status badge, and install controls", () => {
    const html = renderAdminUi(<PluginDetailsPage />, { path: "/admin/store" });
    expect(html).toContain("SEO Optimizer");
    expect(html).toContain("Enabled"); // token-driven status badge
    expect(html).toContain("Auto-update");
    expect(html).toContain("Uninstall");
  });

  it("renders the line-variant tab triggers and active Overview content", () => {
    const html = renderAdminUi(<PluginDetailsPage />, { path: "/admin/store" });
    // tab TRIGGER labels always render (the triggers, not the inactive bodies)
    expect(html).toMatch(/Overview/);
    expect(html).toMatch(/Permissions/);
    expect(html).toMatch(/Changelog/);
    expect(html).toMatch(/Settings/);
    // active Overview tab body + its SectionCard sidebar (default tab = "overview")
    expect(html).toContain("Information"); // Information SectionCard (Overview sidebar)
    expect(html).toContain("content:read"); // scope in the Overview Permissions SectionCard (L02)
    expect(html).toMatch(/2\.4\.1/); // hero version "v2.4.1" (chrome OUTSIDE the tabs)
  });
});
