import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { FieldEditor } from "../../../core/admin/ui/content-types/FieldEditor";

test("FieldEditor renders layout controls", () => {
  const html = renderAdminUi(
    <FieldEditor
      field={{
        id: "field-title",
        name: "title",
        type: "text",
        label: "Title",
        required: false,
      }}
      onChange={() => undefined}
      onRemove={() => undefined}
    />
  );

  expect(html).toContain("Layout &amp; grouping");
  expect(html).toContain("Tab");
  expect(html).toContain("Section");
  expect(html).toContain("Width");
  expect(html).toContain("Display density");
});
