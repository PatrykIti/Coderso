import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { InfoTip } from "../../../core/admin/ui/shared/InfoTip";

test("InfoTip renders aria-label for accessibility", () => {
  const html = renderToString(
    <InfoTip content="Helpful text" label="Field type help" />
  );

  expect(html).toContain("aria-label=\"Field type help\"");
});
