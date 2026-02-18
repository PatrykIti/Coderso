import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { BindingEditor } from "../../../core/admin/ui/listings/components/BindingEditor";

test("BindingEditor renders empty state", () => {
  const html = renderToString(<BindingEditor value={[]} onChange={() => undefined} />);

  expect(html).toContain("Dynamic field bindings");
  expect(html).toContain("No field bindings defined yet");
  expect(html).toContain("Add binding");
});

test("BindingEditor renders conditions for existing binding", () => {
  const html = renderToString(
    <BindingEditor
      value={[
        {
          key: "excerpt",
          source: "data.summary",
          label: null,
          fallback: null,
          format: "text",
          conditions: [
            {
              id: "cond-1",
              field: "status",
              op: "eq",
              value: "published",
            },
          ],
        },
      ]}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Visibility conditions");
  expect(html).toContain("status");
  expect(html).toContain("Add condition");
});

