import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FieldEditor } from "../../../core/admin/ui/content-types/FieldEditor";

test("FieldEditor renders relation target selector", () => {
  const html = renderToString(
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
});
