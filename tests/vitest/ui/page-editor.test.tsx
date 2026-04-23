import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageEditorPage } from "../../../core/admin/ui/pages/PageEditorPage";

test("PageEditorPage renders key panels", () => {
  const html = renderAdminUi(<PageEditorPage />);

  expect(html).toContain("Homepage");
  expect(html).toContain("Publish");
  expect(html).toContain("Find components");
  expect(html).toContain("Templates");
  expect(html).toContain("Runtime preview device");
  expect(html).toContain("Runtime preview");
  expect(html).toContain("History");
  expect(html).toMatch(
    /data-slot="tabs"[^>]*class="[^"]*min-h-0[^"]*overflow-hidden[^"]*"/
  );
  expect(html).toMatch(
    /data-slot="tabs-content"[^>]*class="[^"]*min-h-0[^"]*flex-1[^"]*overflow-hidden[^"]*"/
  );
  expect(html).toMatch(
    /data-slot="scroll-area"[^>]*class="[^"]*min-h-0[^"]*flex-1[^"]*p-4[^"]*"/
  );
});
