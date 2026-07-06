// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { FocalPointPicker } from "../../../core/admin/ui/media/FocalPointPicker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

function Harness({ x = null, y = null }: { x?: number | null; y?: number | null }) {
  const [focal, setFocal] = React.useState<{ x: number | null; y: number | null }>({ x, y });
  return (
    <div>
      <FocalPointPicker
        src="/media/photo.jpg"
        focalX={focal.x}
        focalY={focal.y}
        onChange={(nx, ny) => setFocal({ x: nx, y: ny })}
      />
      <output data-testid="focal">{`${focal.x}|${focal.y}`}</output>
    </div>
  );
}

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

const focalText = (c: ParentNode) => c.querySelector('[data-testid="focal"]')?.textContent ?? "";

test("FocalPointPicker defaults to center object-position when focal is unset", () => {
  const container = mount(<Harness />);
  const img = container.querySelector("img") as HTMLImageElement;
  expect(img.style.objectPosition).toBe("50% 50%");
});

test("FocalPointPicker reflects a set focal point via object-position", () => {
  const container = mount(<Harness x={0.25} y={0.75} />);
  const img = container.querySelector("img") as HTMLImageElement;
  expect(img.style.objectPosition).toBe("25% 75%");
});

test("FocalPointPicker nudges the focal point with arrow keys", () => {
  const container = mount(<Harness x={0.5} y={0.5} />);
  const surface = container.querySelector('[role="slider"]') as HTMLElement;
  React.act(() => {
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  });
  expect(focalText(container)).toBe("0.52|0.5");
});

test("FocalPointPicker reset button recenters the focal point", () => {
  const container = mount(<Harness x={0.1} y={0.9} />);
  const resetButton = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Reset to center")
  ) as HTMLButtonElement;
  React.act(() => {
    resetButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(focalText(container)).toBe("0.5|0.5");
});

test("FocalPointPicker maps a pointer position to normalized [0,1] coords", () => {
  const container = mount(<Harness x={0.5} y={0.5} />);
  const surface = container.querySelector('[role="slider"]') as HTMLElement;
  surface.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0 }) as DOMRect;
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 50, clientY: 75, bubbles: true })
    );
  });
  expect(focalText(container)).toBe("0.25|0.75");
});
