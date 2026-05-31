import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";

test("ContentTypeEditor renders editor shell", () => {
  const html = renderAdminUi(<ContentTypeEditor />);

  expect(html).toContain("Content Type Editor");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Collection workspace");
  expect(html).toContain("Duplicate");
  expect(html).toContain("Delete");
  expect(html).toContain("sticky top-0 z-10 border-b bg-background/80 px-6 py-3 backdrop-blur");
  expect(html).toContain("flex flex-col gap-6 px-6 py-6");
  expect(html).toContain("flex h-full min-h-0 flex-col overflow-hidden p-6");
  expect(html).toContain("min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-3");
  expect(html).not.toContain("overflow-y-auto overscroll-contain");
  expect(html).not.toContain("border-rose-200");
  expect(html).not.toContain("bg-rose-50/70");
  expect(html).not.toContain("border-amber-200");
  expect(html).not.toContain("bg-amber-50/70");
});
