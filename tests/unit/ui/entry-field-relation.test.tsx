import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FieldRenderer } from "../../../core/admin/ui/entries/FieldRenderer";

test("FieldRenderer renders relation search input", () => {
  const html = renderToString(
    <FieldRenderer
      field={{
        id: "field-rel",
        name: "related-projects",
        type: "relation",
        label: "Related Projects",
        required: false,
        help: "Custom relation help",
        relation: { target: "projects", multiple: true },
      }}
      value={[]}
      onChange={() => undefined}
      relationTargets={[{ slug: "projects", name: "Projects" }]}
    />
  );

  expect(html).toContain("Search Projects");
  expect(html).toContain("No items found yet.");
  expect(html).toContain("Custom relation help");
});
