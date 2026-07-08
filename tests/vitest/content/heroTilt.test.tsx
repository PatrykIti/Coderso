// @vitest-environment happy-dom
import React from "react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { heroDefaults, HeroBlock, type HeroData } from "../../../core/widgets/core/hero";
import type { WidgetRenderContext } from "../../../core/widgets/types";

// The tilt runtime is a module-local static IIFE string. We capture its source
// via a fake runtime-scripts registry (the same emit path the front render uses)
// and execute it against a happy-dom document to assert the pointer behavior.
function captureTiltScript(): string {
  let captured = "";
  const renderContext: WidgetRenderContext = {
    mode: "public",
    runtimeScripts: {
      registerScript: (_id, source) => {
        captured = source;
      },
      renderScripts: () => [],
    },
  };
  renderToString(
    <HeroBlock
      data={{ ...heroDefaults, style: { tilt: "subtle" } } as HeroData}
      variant="centered"
      renderContext={renderContext}
    />
  );
  return captured;
}

function setMatchMedia(options: { reduce: boolean; fine: boolean }): void {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion")
      ? options.reduce
      : query.includes("pointer:fine")
        ? options.fine
        : false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  })) as never;
}

function mountHero(max: number): { host: HTMLElement; inner: HTMLElement } {
  document.body.innerHTML = `<div data-hero-tilt="subtle" data-hero-tilt-max="${max}"><div data-hero-tilt-inner></div></div>`;
  const host = document.querySelector("[data-hero-tilt]") as HTMLElement;
  const inner = document.querySelector("[data-hero-tilt-inner]") as HTMLElement;
  host.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;
  return { host, inner };
}

function pointerMove(host: HTMLElement, clientX: number, clientY: number): void {
  const event = new window.MouseEvent("pointermove", { clientX, clientY, bubbles: true });
  host.dispatchEvent(event);
}

beforeEach(() => {
  (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = ((
    cb: FrameRequestCallback
  ) => {
    cb(0);
    return 0;
  }) as never;
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("pointermove applies a clamped rotateX/rotateY transform", () => {
  setMatchMedia({ reduce: false, fine: true });
  const script = captureTiltScript();
  const { host, inner } = mountHero(5);

  new Function(script)();
  pointerMove(host, 150, 25);

  expect(inner.style.transform).toContain("rotateX");
  expect(inner.style.transform).toContain("rotateY");

  // max=5 => rotation magnitude bounded by max*2 = 10deg; extremes stay within clamp.
  pointerMove(host, 0, 0); // px=-0.5, py=-0.5 => ry=-5, rx=5
  const match = inner.style.transform.match(
    /rotateX\((-?\d+(?:\.\d+)?)deg\) rotateY\((-?\d+(?:\.\d+)?)deg\)/
  );
  expect(match).not.toBeNull();
  const rx = Math.abs(parseFloat(match![1]));
  const ry = Math.abs(parseFloat(match![2]));
  expect(rx).toBeLessThanOrEqual(10);
  expect(ry).toBeLessThanOrEqual(10);
  expect(rx).toBeGreaterThan(0);
});

test("pointerleave resets the transform to zero rotation", () => {
  setMatchMedia({ reduce: false, fine: true });
  const script = captureTiltScript();
  const { host, inner } = mountHero(5);

  new Function(script)();
  pointerMove(host, 150, 25);
  expect(inner.style.transform).not.toBe("");

  host.dispatchEvent(new window.Event("pointerleave"));
  expect(inner.style.transform).toBe("rotateX(0.00deg) rotateY(0.00deg)");
});

test("prefers-reduced-motion: reduce => no transform (runtime early-return)", () => {
  setMatchMedia({ reduce: true, fine: true });
  const script = captureTiltScript();
  const { host, inner } = mountHero(5);

  new Function(script)();
  pointerMove(host, 150, 25);

  expect(inner.style.transform).toBe("");
});

test("coarse pointer (pointer:fine=false) => no transform", () => {
  setMatchMedia({ reduce: false, fine: false });
  const script = captureTiltScript();
  const { host, inner } = mountHero(5);

  new Function(script)();
  pointerMove(host, 150, 25);

  expect(inner.style.transform).toBe("");
});
