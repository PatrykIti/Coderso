import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { FormCanvas } from "../../../core/admin/ui/forms/FormCanvas";

test("FormCanvas renders empty state fallback copy", () => {
  const html = renderToString(
    <FormCanvas
      formTitle=""
      formDescription=""
      formSelected={false}
      selectedFieldId={null}
      fields={[]}
      onSelectField={() => undefined}
      onSelectForm={() => undefined}
      onRemoveField={() => undefined}
    />
  );

  expect(html).toContain("Form title");
  expect(html).toContain("Add a short description for this form.");
  expect(html).toContain("Drop a field here to add to your form");
  // TASK-516-04: un-themed canvas now renders the prototype default submit label.
  expect(html).toContain("Submit");
  expect(html).not.toContain("Submit Form");
});

test("FormCanvas renders multi-step fields, placeholder values, and hidden labels", () => {
  const html = renderToString(
    <FormCanvas
      formTitle="Checkout"
      formDescription="Collect customer data"
      layoutMode="multi_step"
      stepTitles={["Contact", "Preferences"]}
      formSelected
      selectedFieldId="field-2"
      fields={[
        {
          id: "field-1",
          label: "Full name",
          type: "text",
          required: true,
          settings: {
            placeholder: "Jane Doe",
            step: 1,
            style: { width: "full", labelPosition: "above" },
          },
        },
        {
          id: "field-2",
          label: "Newsletter",
          type: "checkbox",
          required: false,
          settings: {
            defaultValue: "Yes, subscribe me",
            step: 2,
            style: { width: "half", labelPosition: "hidden" },
          },
        },
      ]}
      onSelectField={() => undefined}
      onSelectForm={() => undefined}
      onRemoveField={() => undefined}
    />
  );

  expect(html).toContain("Checkout");
  expect(html).toContain("Collect customer data");
  expect(html).toContain("Contact");
  expect(html).toContain("Preferences");
  expect(html).toContain("Jane Doe");
  expect(html).toContain("Yes, subscribe me");
  expect(html).not.toContain("Newsletter</label>");
});
