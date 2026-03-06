import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MediaPicker } from "../../../core/admin/ui/media/MediaPicker";

test("MediaPicker renders browse button", () => {
  const html = renderAdminUi(
    <MediaPicker value={null} onChange={() => undefined} />
  );

  expect(html).toContain("Browse media");
});

test("MediaPicker shows loading state for selected media until assets are resolved", () => {
  const html = renderAdminUi(
    <MediaPicker value="asset-1" onChange={() => undefined} />
  );

  expect(html).toContain("Loading selected media...");
});
