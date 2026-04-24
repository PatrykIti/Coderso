import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { ContentTypePreviewPanel } from "../../../core/admin/ui/content-types/ContentTypePreviewPanel";

test("ContentTypePreviewPanel owns bounded JSON scroll containment", () => {
  const html = renderToString(
    <ContentTypePreviewPanel
      name="Catalog"
      slug="catalog"
      fields={Array.from({ length: 24 }, (_, index) => ({
        id: `field-${index}`,
        name: `long_field_name_${index}`,
        type: "text" as const,
        label: `Long field ${index}`,
      }))}
    />
  );

  expect(html).toContain("flex h-full min-h-0 flex-col gap-4");
  expect(html).toContain("min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-3");
  expect(html).toContain("min-w-max whitespace-pre text-xs leading-relaxed");
  expect(html).toContain("Type:");
  expect(html).toContain("Slug:");
});
