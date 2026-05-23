// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: ({ label }: { label: string }) => <span data-info-tip={label} />,
}));

import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorModeRoot,
  WidgetEditorSection,
} from "../../../core/admin/ui/widgets/editors/WidgetEditorControls";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("widget editor DOM ownership metadata", () => {
  test("mode root exposes the stable widget and mode markers", () => {
    const view = mount(
      <WidgetEditorModeRoot widgetType="hero" mode="visual">
        <span>Visual editor</span>
      </WidgetEditorModeRoot>
    );
    const root = view.container.querySelector("[data-widget-editor='hero']");

    expect(root?.getAttribute("data-widget-editor")).toBe("hero");
    expect(root?.getAttribute("data-widget-editor-mode")).toBe("visual");
  });

  test("section exposes explicit id, mode, role, and accessible heading", () => {
    const view = mount(
      <WidgetEditorSection
        id="hero.visual-main-copy"
        mode="visual"
        role="content"
        title="Main copy"
        description="Primary public text."
      >
        <p>Fields</p>
      </WidgetEditorSection>
    );
    const section = view.container.querySelector("section");
    const heading = section?.querySelector("h3");

    expect(section?.getAttribute("data-widget-editor-section")).toBe("hero.visual-main-copy");
    expect(section?.getAttribute("data-widget-editor-mode")).toBe("visual");
    expect(section?.getAttribute("data-widget-editor-section-role")).toBe("content");
    expect(heading?.textContent).toBe("Main copy");
    expect(section?.getAttribute("aria-labelledby")).toBe(heading?.id);
  });

  test("writable control row exposes exactly one persisted path marker", () => {
    const view = mount(
      <WidgetControlRow id="hero.visual.title" label="Title" path="content.title">
        {(fieldProps) => <input {...fieldProps} />}
      </WidgetControlRow>
    );
    const pathMarkers = view.container.querySelectorAll(
      "[data-widget-control-path='content.title']"
    );
    const row = pathMarkers.item(0);
    const input = view.container.querySelector("input");

    expect(pathMarkers).toHaveLength(1);
    expect(row.getAttribute("data-widget-control")).toBe("hero.visual.title");
    expect(row.getAttribute("data-widget-control-ownership")).toBe("writable");
    expect(row.hasAttribute("data-widget-control-readonly")).toBe(false);
    expect(input?.getAttribute("aria-labelledby")).toBe("hero-visual-title-label");
  });

  test("read-only summary rows are path-aware but excluded from writable ownership", () => {
    const view = mount(
      <ReadonlyWidgetSummaryRow
        id="hero.advanced.resolved-source"
        label="Resolved source"
        path="source.collectionId"
        value="Blog posts"
      />
    );
    const row = view.container.querySelector("[data-widget-control-path='source.collectionId']");
    const writableRows = Array.from(
      view.container.querySelectorAll("[data-widget-control-path]")
    ).filter((element) => element.getAttribute("data-widget-control-readonly") !== "true");

    expect(row?.getAttribute("data-widget-control-ownership")).toBe("readonly");
    expect(row?.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(row?.querySelector("[data-widget-control-summary='true']")?.textContent).toBe(
      "Blog posts"
    );
    expect(writableRows).toHaveLength(0);
  });

  test("action rows can be discoverable without becoming writable controls", () => {
    const view = mount(
      <WidgetControlRow id="hero.advanced.reset" label="Reset" ownership="action">
        {(fieldProps) => (
          <button type="button" {...fieldProps}>
            Reset
          </button>
        )}
      </WidgetControlRow>
    );
    const row = view.container.querySelector("[data-widget-control='hero.advanced.reset']");

    expect(row?.getAttribute("data-widget-control-ownership")).toBe("action");
    expect(row?.hasAttribute("data-widget-control-path")).toBe(false);
  });
});
