import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PagePreview } from "../../../core/admin/ui/pages/PagePreview";

test("PagePreview renders placeholder copy", () => {
  const html = renderToString(<PagePreview />);

  expect(html).toContain("Preview Mode");
  expect(html).toContain("Preview link details");
});
