import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Button } from "../../../core/admin/components/ui/button";

test("Button renders content", () => {
  const html = renderToString(<Button>Save</Button>);
  expect(html).toContain("Save");
});
