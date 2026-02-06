import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

test("PageEditor renders builder UI", () => {
  const html = renderToString(<PageEditor />);

  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Variant and Presets");
});
