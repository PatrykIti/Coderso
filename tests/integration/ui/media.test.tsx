import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";

test("MediaLibraryPage renders metadata editor actions", () => {
  const html = renderToString(<MediaLibraryPage />);

  expect(html).toContain("Metadata");
  expect(html).toContain("Copy URL");
  expect(html).toContain("Replace");
});
