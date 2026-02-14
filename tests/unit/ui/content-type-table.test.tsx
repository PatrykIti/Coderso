import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ContentTypeTable } from "../../../core/admin/ui/content-types/ContentTypeTable";

const row = {
  id: "type-1",
  name: "Blog",
  slug: "blog",
  schema: {},
  createdAt: "2026-02-14T00:00:00.000Z",
  updatedAt: "2026-02-14T00:00:00.000Z",
  fieldCount: 3,
  status: "published" as const,
};

test("ContentTypeTable renders name as edit link", () => {
  const html = renderToString(
    <ContentTypeTable rows={[row]} basePath="/admin" />
  );

  expect(html).toContain("Edit content type: Blog");
  expect(html).toContain("/admin/content-types/type-1");
});
