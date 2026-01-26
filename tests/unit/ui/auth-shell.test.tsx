import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AuthShell } from "../../../core/admin/ui/layouts/AuthShell";

test("AuthShell renders brand and content", () => {
  const html = renderToString(
    <AuthShell brand={<div>Brand</div>}>
      <div>Content</div>
    </AuthShell>
  );

  expect(html).toContain("Brand");
  expect(html).toContain("Content");
});
