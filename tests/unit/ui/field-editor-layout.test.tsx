import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FieldEditor } from "../../../core/admin/ui/content-types/FieldEditor";

test("FieldEditor renders layout controls", () => {
  const html = renderToString(
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
