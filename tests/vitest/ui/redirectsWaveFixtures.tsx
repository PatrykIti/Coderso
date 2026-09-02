// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export type RedirectFixtureItem = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302 | 307 | 308;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export const mount = (node: React.ReactNode) => {
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

export const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

export const clickButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

export const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

export const baseRedirects = (): RedirectFixtureItem[] => [
  {
    id: "redirect-1",
    fromPath: "/old-home",
    toPath: "/home",
    statusCode: 301,
    enabled: true,
    createdAt: "2026-03-06",
    updatedAt: "2026-03-06",
  },
  {
    id: "redirect-2",
    fromPath: "/shop-old",
    toPath: "/shop",
    statusCode: 302,
    enabled: false,
    createdAt: "2026-03-06",
    updatedAt: "2026-03-06",
  },
];
