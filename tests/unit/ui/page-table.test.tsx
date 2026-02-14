import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PageTable } from "../../../core/admin/ui/pages/PageTable";

const page = {
  id: "page-1",
  title: "Home",
  slug: "/",
  status: "draft",
  updatedAt: "2026-02-14T00:00:00.000Z",
  author: null,
};

test("PageTable renders page title as edit button", () => {
  const html = renderToString(
    <PageTable
      items={[page]}
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
    />
  );

  expect(html).toContain("Edit page: Home");
  expect(html).toContain(">Home<");
});
