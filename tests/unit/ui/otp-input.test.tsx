import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { OtpInput } from "../../../core/admin/ui/auth/OtpInput";

test("OtpInput renders expected number of fields", () => {
  const html = renderToString(<OtpInput value="" onChange={() => undefined} />);
  const matches = html.match(/data-slot=\"input\"/g) ?? [];

  expect(matches.length).toBe(6);
});
