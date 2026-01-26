import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { DesignTokensPreview } from "../../../core/admin/ui/settings/DesignTokensPreview";

test("DesignTokensPreview renders tabs", () => {
  const html = renderToString(<DesignTokensPreview />);

  expect(html).toContain("All Components");
  expect(html).toContain("Typography");
  expect(html).toContain("Buttons");
});
