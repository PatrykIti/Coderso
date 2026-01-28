import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";

test("MediaLibraryPage renders upload and details drawer", () => {
  const html = renderToString(<MediaLibraryPage />);

  expect(html).toContain("Media Library");
  expect(html).toContain("Drag and drop files");
  expect(html).toContain("Media Details");
});
