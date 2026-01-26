import { expect, test } from "bun:test";

import { sanitizeLayout } from "../../../core/admin/ui/pages/builder/blockUtils";
import type { LayoutValue } from "../../../core/admin/ui/pages/builder/types";

const layout = {
  container: "invalid",
  padding: { top: "bad", bottom: "md" },
  margin: { top: "none", bottom: "oops" },
  background: { color: "white", image: null },
} as unknown as LayoutValue;

test("sanitizeLayout enforces token values", () => {
  const sanitized = sanitizeLayout(layout);

  expect(sanitized.container).toBe("default");
  expect(sanitized.padding.top).toBe("md");
  expect(sanitized.margin.bottom).toBe("none");
});
