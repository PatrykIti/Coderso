import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PageRowActions } from "../../../core/admin/ui/pages/PageRowActions";

test("PageRowActions renders menu trigger", () => {
  const html = renderToString(
    <PageRowActions
      status="draft"
      onEdit={() => undefined}
      onPreview={() => undefined}
      onDuplicate={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
    />
  );

  expect(html).toContain("dropdown-menu-trigger");
});
