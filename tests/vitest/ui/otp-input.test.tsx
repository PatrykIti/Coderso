import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { OtpInput } from "../../../core/admin/ui/auth/OtpInput";

test("OtpInput renders expected number of fields", () => {
  const html = renderAdminUi(<OtpInput value="" onChange={() => undefined} />);
  const matches = html.match(/data-slot=\"input\"/g) ?? [];

  expect(matches.length).toBe(6);
});
