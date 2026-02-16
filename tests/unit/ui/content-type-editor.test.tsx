import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";

test("ContentTypeEditor renders editor shell", () => {
  const html = renderToString(<ContentTypeEditor />);

  expect(html).toContain("Content Type Editor");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
});
