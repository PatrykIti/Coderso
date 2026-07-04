import React from "react";
import { describe, expect, it } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PluginStorePage } from "../../../core/admin/ui/store/PluginStorePage";

// TASK-479-24-L03: presentation guards for the Plugin Store gallery restyle (L01).
// SSR string assertions only (no RTL/user-event) — `renderAdminUi` is a single SSR
// snapshot, so only the default-active Store tab body is in the HTML. We assert
// visible text + load-bearing tokens, never click-driven master-detail selection.
describe("Plugin Store gallery restyle", () => {
  it("renders header, featured banner, and category tabs", () => {
    const html = renderAdminUi(<PluginStorePage />, { path: "/admin/store" });
    expect(html).toContain("Plugin Store"); // PageHeader preserved
    expect(html).toContain("Featured"); // new featured banner
    expect(html).toContain("Search plugins"); // search preserved (keeps old test green)
    // category strip + Store/Installed tabs
    expect(html).toMatch(/All|Analytics|Marketing/);
    expect(html).toContain("Installed");
  });

  it("renders a gallery card per catalog item with score + installs + CTA", () => {
    const html = renderAdminUi(<PluginStorePage />, { path: "/admin/store" });
    expect(html).toContain("SEO Boost"); // seed catalog item
    expect(html).toContain("Coderso Analytics");
    expect(html).toMatch(/installs/); // downloads label
    expect(html).toMatch(/rounded-2xl/); // prototype card token
    expect(html).toMatch(/Install|View|Manage/); // per-card affordance
  });

  // NO interaction test: master-detail click selection is NOT reachable through
  // `renderAdminUi` (SSR single snapshot, no event loop) and the repo has no
  // user-event/RTL.
});
