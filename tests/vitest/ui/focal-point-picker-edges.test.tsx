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

const stubRect = (surface: HTMLElement, width: number, height: number) => {
  surface.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;
};

test("FocalPointPicker drags the marker: pointerdown then pointermove updates the focal point", () => {
  const container = mount(<Harness x={0.5} y={0.5} />);
  const surface = container.querySelector('[role="slider"]') as HTMLElement;
  stubRect(surface, 200, 100);
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 50, clientY: 75, bubbles: true })
    );
  });
  expect(focalText(container)).toBe("0.25|0.75");
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 150, clientY: 25, bubbles: true })
    );
  });
  expect(focalText(container)).toBe("0.75|0.25");
});

test("FocalPointPicker ignores pointermove while not dragging", () => {
  const container = mount(<Harness x={0.5} y={0.5} />);
  const surface = container.querySelector('[role="slider"]') as HTMLElement;
  stubRect(surface, 200, 100);
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 150, clientY: 25, bubbles: true })
    );
  });
  expect(focalText(container)).toBe("0.5|0.5");
});

test("FocalPointPicker ends a drag on pointerup", () => {
  const container = mount(<Harness x={0.5} y={0.5} />);
  const surface = container.querySelector('[role="slider"]') as HTMLElement;
  stubRect(surface, 200, 100);
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 50, clientY: 75, bubbles: true })
    );
  });
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointerup", { clientX: 100, clientY: 50, bubbles: true })
    );
  });
  // After pointerup the drag stops; a following move must not change the value.
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 160, clientY: 20, bubbles: true })
    );
  });
  expect(focalText(container)).toBe("0.25|0.75");
});

test("FocalPointPicker clamps pointer coordinates into [0,1] and ignores zero-size surfaces", () => {
  const container = mount(<Harness x={0.5} y={0.5} />);
  const surface = container.querySelector('[role="slider"]') as HTMLElement;
  stubRect(surface, 200, 100);
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: -40, clientY: 300, bubbles: true })
    );
  });
  expect(focalText(container)).toBe("0|1");

  stubRect(surface, 0, 0);
  React.act(() => {
    surface.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 100, clientY: 50, bubbles: true })
    );
  });
  expect(focalText(container)).toBe("0|1");
});

test("FocalPointPicker arrow keys nudge each direction and shift uses a larger step", () => {
  const container = mount(<Harness x={0.5} y={0.5} />);
  const surface = container.querySelector('[role="slider"]') as HTMLElement;

  const press = (key: string, shiftKey = false) => {
    React.act(() => {
      surface.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }));
    });
  };

  press("ArrowLeft");
  expect(focalText(container)).toBe("0.48|0.5");
  press("ArrowUp");
  expect(focalText(container)).toBe("0.48|0.48");
  press("ArrowDown");
  expect(focalText(container)).toBe("0.48|0.5");
  press("ArrowRight", true);
  expect(focalText(container)).toBe("0.58|0.5");
});

test("FocalPointPicker clamps arrow nudges and ignores unrelated keys", () => {
  const container = mount(<Harness x={0.02} y={0.98} />);
  const surface = container.querySelector('[role="slider"]') as HTMLElement;

  React.act(() => {
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  });
  expect(focalText(container)).toBe("0|0.98");

  React.act(() => {
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  });
  expect(focalText(container)).toBe("0|1");

  // Escape is not an arrow key: the value must remain untouched.
  React.act(() => {
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  expect(focalText(container)).toBe("0|1");
});

test("FocalPointPicker reset button centers the focal point", () => {
  const container = mount(<Harness x={0.8} y={0.2} />);
  const reset = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Reset to center")
  );
  if (!reset) throw new Error("reset button missing");
  React.act(() => {
    reset.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  expect(focalText(container)).toBe("0.5|0.5");
});
