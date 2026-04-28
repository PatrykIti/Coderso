import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { FieldEditor } from "../../../core/admin/ui/content-types/FieldEditor";

test("FieldEditor renders layout controls", () => {
  const html = renderAdminUi(
    <FieldEditor
      field={{
        id: "field-title",
        name: "title",
        type: "text",
        label: "Title",
        required: false,
      }}
      onChange={() => undefined}
      onRemove={() => undefined}
    />
  );

  expect(html).toContain("Layout &amp; grouping");
  expect(html).toContain("Tab");
  expect(html).toContain("Section");
  expect(html).toContain("Width");
  expect(html).toContain("Display density");
});

test("FieldEditor renders select option and number constraint controls", () => {
  const selectHtml = renderAdminUi(
    <FieldEditor
      field={{
        id: "field-status",
        name: "status",
        type: "select",
        label: "Status",
        required: false,
        options: [{ id: "option-draft", label: "Draft", value: "draft" }],
        multiple: true,
      }}
      onChange={() => undefined}
      onRemove={() => undefined}
    />
  );

  expect(selectHtml).toContain("Options");
  expect(selectHtml).toContain("Allow multiple selections");
  expect(selectHtml).toContain("Draft");

  const numberHtml = renderAdminUi(
    <FieldEditor
      field={{
        id: "field-price",
        name: "price",
        type: "number",
        label: "Price",
        required: false,
        number: { format: "decimal", min: 0, max: 100, step: 0.01 },
      }}
      onChange={() => undefined}
      onRemove={() => undefined}
    />
  );

  expect(numberHtml).toContain("Number constraints");
  expect(numberHtml).toContain("Format");
  expect(numberHtml).toContain("Step");
  expect(numberHtml).toContain("Min value");
  expect(numberHtml).toContain("Max value");
});
