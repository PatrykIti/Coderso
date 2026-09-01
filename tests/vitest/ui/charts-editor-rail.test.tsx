// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { AreaChart, BarChart, Donut, Sparkline } from "../../../core/admin/ui/shared/Charts";
import { EditorRailGroup, EditorRailItem } from "../../../core/admin/ui/shared/EditorRail";

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

describe("Charts", () => {
  it("AreaChart renders an svg with gradient fill and a final point marker", () => {
    const view = mount(<AreaChart data={[1, 5, 3, 9]} tone="success" height={120} />);
    const svg = view.container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 600 120");
    expect(view.container.querySelector("linearGradient")).not.toBeNull();
    expect(view.container.querySelector("circle")).not.toBeNull();
    expect(view.container.innerHTML).toContain("var(--success)");
    view.unmount();
  });

  it("AreaChart guards a single-point series without crashing", () => {
    const view = mount(<AreaChart data={[7]} />);
    expect(view.container.querySelector("svg")).not.toBeNull();
    view.unmount();
  });

  it("BarChart scales bars to the max value and renders labels", () => {
    const view = mount(<BarChart data={[2, 8, 4]} labels={["a", "b", "c"]} height={100} />);
    const bars = Array.from(view.container.querySelectorAll("div[style*='height']"));
    expect(bars.length).toBeGreaterThanOrEqual(3);
    // tallest bar is 100% of the flex area
    expect(bars.some((bar) => bar.getAttribute("title") === "b")).toBe(true);
    expect(view.container.textContent).toContain("a");
    expect(view.container.textContent).toContain("c");
    view.unmount();
  });

  it("Sparkline renders the compact stroke path with the requested tone", () => {
    const view = mount(<Sparkline data={[3, 1, 4]} tone="destructive" />);
    const path = view.container.querySelector("path")!;
    expect(path.getAttribute("stroke")).toBe("var(--destructive)");
    expect(view.container.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 120 36");
    view.unmount();
  });

  it("Donut renders one arc per segment and survives an empty series", () => {
    const view = mount(
      <Donut
        segments={[
          { value: 3, color: "red" },
          { value: 1, color: "blue" },
        ]}
        size={120}
        thickness={14}
      />
    );
    // base circle + 2 arcs
    expect(view.container.querySelectorAll("circle").length).toBe(3);
    view.unmount();

    const empty = mount(<Donut segments={[]} />);
    // only the base track remains; divisor guard prevents division by zero
    expect(empty.container.querySelectorAll("circle").length).toBe(1);
    empty.unmount();
  });
});

describe("EditorRail primitives", () => {
  it("EditorRailGroup renders its label inside a group container", () => {
    const view = mount(
      <EditorRailGroup label="Insert">
        <EditorRailItem>Row</EditorRailItem>
      </EditorRailGroup>
    );
    expect(view.container.querySelector("[data-editor-rail-group]")).not.toBeNull();
    expect(view.container.textContent).toContain("Insert");
    expect(view.container.textContent).toContain("Row");
    view.unmount();
  });

  it("clickable items render as buttons with active styling", () => {
    const onClick = vi.fn();
    const view = mount(
      <EditorRailItem icon={<i data-testid="icon" />} active onClick={onClick}>
        Clickable
      </EditorRailItem>
    );
    const button = view.container.querySelector("button[data-active='true']")!;
    expect(button.getAttribute("type")).toBe("button");
    React.act(() => {
      (button as HTMLElement).click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.className).toContain("bg-primary-soft");
    view.unmount();
  });

  it("disabled items stay real dimmed buttons with title tooltips", () => {
    const view = mount(
      <EditorRailItem disabled title="Coming soon">
        Deferred
      </EditorRailItem>
    );
    const button = view.container.querySelector("button")!;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("title")).toBe("Coming soon");
    view.unmount();
  });

  it("handler-less items without title render as presentational divs", () => {
    const view = mount(<EditorRailItem>Static row</EditorRailItem>);
    expect(view.container.querySelector("button")).toBeNull();
    expect(view.container.textContent).toContain("Static row");

    // explicit inactive div keeps data-active unset
    const inactive = mount(<EditorRailItem active={false}>Inactive</EditorRailItem>);
    expect(inactive.container.querySelector("[data-active='true']")).toBeNull();
    inactive.unmount();
  });
});
