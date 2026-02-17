import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageRowActions } from "../../../core/admin/ui/pages/PageRowActions";

test("PageRowActions renders menu trigger", () => {
  const html = renderAdminUi(
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
