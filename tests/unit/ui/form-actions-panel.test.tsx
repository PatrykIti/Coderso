import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FormActionsPanel } from "../../../core/admin/ui/forms/FormActionsPanel";

test("FormActionsPanel renders action controls", () => {
  const html = renderToString(
    <FormActionsPanel
      actions={[
        {
          type: "success_message",
          label: "Success message",
          enabled: true,
          continueOnError: true,
          condition: { operator: "always" },
          config: { message: "Thanks!" },
        },
      ]}
      contentTypes={[]}
      onChange={() => undefined}
      onOpenLogs={() => undefined}
    />
  );

  expect(html).toContain("Automation");
  expect(html).toContain("Action logs");
  expect(html).toContain("Success message");
  expect(html).toContain("Run condition");
});
