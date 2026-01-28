import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { BackupsPage } from "../../../core/admin/ui/backups/BackupsPage";

test("BackupsPage renders schedule and table", () => {
  const html = renderToString(<BackupsPage />);

  expect(html).toContain("Backup Schedule");
  expect(html).toContain("Recent Backups");
  expect(html).toContain("Create Backup Now");
});
