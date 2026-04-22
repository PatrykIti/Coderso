import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { BlockToolbar } from "../../../core/admin/ui/pages/builder/BlockToolbar";

test("BlockToolbar exposes accessible labels and destructive affordance", () => {
  const html = renderToString(
    <BlockToolbar
      blockLabel="Hero"
      onMoveUp={() => undefined}
      onMoveDown={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
      disableMoveUp
    />
  );

  expect(html).toContain('aria-label="Move Hero up"');
  expect(html).toContain('title="Move Hero down"');
  expect(html).toContain('aria-label="Duplicate Hero"');
  expect(html).toContain('title="Delete Hero"');
  expect(html).toContain("text-destructive/80");
});
