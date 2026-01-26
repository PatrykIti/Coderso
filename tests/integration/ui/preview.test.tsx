import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { UiPreview } from "../../../core/admin/ui/debug/UiPreview";

test("UiPreview renders", () => {
  const html = renderToString(<UiPreview />);
  expect(html).toContain("UI Preview");
});
