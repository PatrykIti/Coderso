import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MediaCard } from "../../../core/admin/ui/media/MediaCard";

test("MediaCard renders file name", () => {
  const html = renderToString(
    <MediaCard name="asset.jpg" size="1 MB" type="image" />
  );

  expect(html).toContain("asset.jpg");
});
