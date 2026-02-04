import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MediaPicker } from "../../../core/admin/ui/media/MediaPicker";

test("MediaPicker renders browse button", () => {
  const html = renderToString(
    <MediaPicker value={null} onChange={() => undefined} />
  );

  expect(html).toContain("Browse media");
});
