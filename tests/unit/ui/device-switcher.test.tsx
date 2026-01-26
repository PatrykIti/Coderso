import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { DeviceSwitcher } from "../../../core/admin/ui/pages/DeviceSwitcher";

test("DeviceSwitcher renders device buttons", () => {
  const html = renderToString(<DeviceSwitcher />);

  expect(html).toContain("Desktop");
  expect(html).toContain("Tablet");
  expect(html).toContain("Mobile");
});
