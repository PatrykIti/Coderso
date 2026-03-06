import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FieldBindingPanel } from "../../../core/admin/ui/custom-screens/FieldBindingPanel";

test("FieldBindingPanel renders empty state without selected block", () => {
  const html = renderToString(
    <FieldBindingPanel
      selectedBlock={null}
      value={[]}
      fields={[]}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Select a widget block to configure field bindings.");
});

test("FieldBindingPanel renders existing bindings for a selected block", () => {
  const html = renderToString(
    <FieldBindingPanel
      selectedBlock={{
        id: "hero-1",
        type: "hero",
        data: {
          heading: {
            title: "Welcome",
          },
        },
      }}
      value={[
        {
          id: "binding-1",
          widgetId: "hero-1",
          propPath: "heading.title",
          field: "headline",
          mode: "readwrite",
        },
      ]}
      fields={[
        {
          id: "field-headline",
          name: "headline",
          type: "text",
          label: "Headline",
        },
      ]}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Field bindings");
  expect(html).toContain("heading.title");
  expect(html).toContain("Content field");
  expect(html).toContain("Mode");
});
