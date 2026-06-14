import { expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { PageList } from "../../../core/admin/ui/pages/PageList";

vi.mock("../../../core/admin/ui/pages/PageListPage", () => ({
  PageListPage: () => <div>Mocked page list shell</div>,
}));

test("PageList delegates to PageListPage", () => {
  const html = renderToString(<PageList />);

  expect(html).toContain("Mocked page list shell");
});
