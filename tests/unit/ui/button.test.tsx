import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { Button } from "../../../core/admin/components/ui/button";

test("Button renders content", () => {
  const html = renderAdminUi(<Button>Save</Button>);
  expect(html).toContain("Save");
});
