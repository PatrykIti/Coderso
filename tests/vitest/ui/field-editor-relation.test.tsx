import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { FieldEditor } from "../../../core/admin/ui/content-types/FieldEditor";

test("FieldEditor renders relation target selector", () => {
  const html = renderAdminUi(
    <FieldEditor
      field={{
        id: "field-related",
        name: "related",
        type: "relation",
        label: "Related",
        required: false,
        relation: { target: "projects" },
      }}
      relationTargets={[
        { slug: "projects", name: "Projects" },
        { slug: "team", name: "Team" },
      ]}
      onChange={() => undefined}
      onRemove={() => undefined}
    />
  );

  expect(html).toContain("Related content type");
  expect(html).toContain("Projects");
  expect(html).toContain("Allow multiple");
  expect(html).toContain("Link to entries from another content type.");
});
