import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";

test("MediaLibraryPage renders toolbar and grid", () => {
  const html = renderToString(<MediaLibraryPage />);

  expect(html).toContain("Media Library");
  expect(html).toContain("Upload New");
});
