import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SetupWizard } from "../../../core/admin/ui/setup/SetupWizard";

const noopSubmit = async () => undefined;

test("SetupWizard renders first-run setup shell", () => {
  const html = renderAdminUi(<SetupWizard onSubmit={noopSubmit} />);

  expect(html).toContain("First-run setup");
  expect(html).toContain("Site Identity");
  expect(html).toContain("Runtime URL");
  expect(html).toContain("Security TTL");
  expect(html).toContain("Next");
});

test("SetupWizard renders error state", () => {
  const html = renderAdminUi(
    <SetupWizard onSubmit={noopSubmit} error="Failed to complete setup." />
  );

  expect(html).toContain("Setup error");
  expect(html).toContain("Failed to complete setup.");
});
