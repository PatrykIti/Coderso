import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";
import { ContentTypeList } from "../../../core/admin/ui/content-types/ContentTypeList";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

test("ContentTypeList renders table view", () => {
  const html = renderToString(<ContentTypeList />);

  expect(html).toContain("Content Types");
  expect(html).toContain("New type");
});

test("ContentTypeEditor renders schema preview and actions", () => {
  const html = renderToString(<ContentTypeEditor />);

  expect(html).toContain("Schema Preview");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
});

test("ContentTypeEditor surfaces invalid field names", () => {
  const invalidFields: ContentField[] = [
    {
      id: "title",
      name: "Invalid Name",
      type: "text",
      label: "Title",
    },
  ];
  const html = renderToString(
    <ContentTypeEditor
      initialName="Invalid"
      initialSlug="invalid"
      initialFields={invalidFields}
    />
  );

  expect(html).toContain("Use kebab-case");
});
