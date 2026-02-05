import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { Card } from "../../../core/admin/components/ui/card";

test("Card uses card border token by default", () => {
  const html = renderToString(<Card>Content</Card>);

  expect(html).toContain('data-slot="card"');
  expect(html).toContain("border-border");
});
