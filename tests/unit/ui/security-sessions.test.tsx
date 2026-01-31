import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SessionsPage } from "../../../core/admin/ui/settings/SessionsPage";

test("SessionsPage renders sessions table", () => {
  const html = renderToString(<SessionsPage />);

  expect(html).toContain("Where you&#x27;re signed in");
  expect(html).toContain("Device/OS");
  expect(html).toContain("Loading sessions");
});
