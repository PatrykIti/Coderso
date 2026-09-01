// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import { SolutionKitCard } from "../../../core/admin/ui/kits/SolutionKitCard";
import type { SolutionKitSummary } from "../../../core/admin/services/solutionKitsClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Array<{ container: HTMLDivElement; root: Root }> = [];

afterEach(() => {
  for (const { container, root } of roots.splice(0)) {
    React.act(() => root.unmount());
    container.remove();
  }
});

test("renders and selects the local service business card", () => {
  const kit: SolutionKitSummary = {
    id: "local-service-business",
    title: "Local Service Business",
    shortDescription: "A focused site for a local service business.",
    recommendedModules: ["booking"],
    features: ["service pages"],
  };
  const onSelect = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ container, root });

  React.act(() => {
    root.render(<SolutionKitCard kit={kit} isActive={false} onSelect={onSelect} />);
  });

  expect(container.textContent).toContain("Local Service Business");
  expect(container.textContent).toContain(kit.shortDescription);
  expect(container.textContent).toContain("booking");
  expect(container.querySelector("button")?.textContent).toContain("Select kit");
  expect(container.querySelector("svg.lucide-boxes")).not.toBeNull();
  expect(container.querySelector("svg")?.parentElement?.className).toContain(
    "bg-muted text-muted-foreground"
  );

  React.act(() => {
    container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onSelect).toHaveBeenCalledWith("local-service-business");

  React.act(() => {
    root.render(<SolutionKitCard kit={kit} isActive onSelect={onSelect} />);
  });
  expect(container.textContent).toContain("Selected");
  expect(container.querySelector(".border-primary\\/70")).not.toBeNull();
});
