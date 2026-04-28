import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { Card } from "../../../core/admin/components/ui/card";

test("Card uses card border token by default", () => {
  const html = renderAdminUi(<Card>Content</Card>);

  expect(html).toContain('data-slot="card"');
  expect(html).toContain("border-border");
});
