// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { InfoBanner } from "../../../core/admin/ui/auth/InfoBanner";

test("InfoBanner renders title and description with info semantics", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<InfoBanner title="Maintenance window" description="Imports pause at midnight." />);
  });

  expect(container.textContent).toContain("Maintenance window");
  expect(container.textContent).toContain("Imports pause at midnight.");
  expect(container.querySelector("[role='alert']")).not.toBeNull();
  expect(container.querySelector("svg.lucide-info")).not.toBeNull();
  React.act(() => {
    root.unmount();
  });
});
