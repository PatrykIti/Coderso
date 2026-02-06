import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MediaPicker } from "../../../core/admin/ui/media/MediaPicker";

test("MediaPicker renders browse button", () => {
  const html = renderToString(
    <MediaPicker value={null} onChange={() => undefined} />
  );

  expect(html).toContain("Browse media");
});

test("MediaPicker shows loading state for selected media until assets are resolved", () => {
  const html = renderToString(
    <MediaPicker value="asset-1" onChange={() => undefined} />
  );

  expect(html).toContain("Loading selected media...");
});
