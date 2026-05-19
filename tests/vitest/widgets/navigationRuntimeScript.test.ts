// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  NavigationBlock,
  navigationDefaults,
  type NavigationData,
} from "../../../core/widgets/core/navigation";

const installNavigationRuntime = (data: NavigationData, variant = "with-cta") => {
  document.body.innerHTML = renderToString(
    React.createElement(NavigationBlock, {
      data,
      variant,
      blockId: "nav-runtime",
    })
  );
  const script = document.querySelector("script");
  if (script?.textContent) {
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  }

  const root = document.querySelector('nav[data-navigation-widget="1"]');
  if (!(root instanceof HTMLElement)) {
    throw new Error("Missing navigation root");
  }
  return root;
};

const setScrollY = (value: number) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("navigation runtime drawer updates labels, focus, and close state", () => {
  const root = installNavigationRuntime({
    ...navigationDefaults,
    items: [
      { label: "Home", href: "/" },
      {
        label: "Docs",
        href: "/docs",
        children: [{ label: "API", href: "/docs/api" }],
      },
    ],
    behavior: {
      ...navigationDefaults.behavior,
      mobileMode: "drawer",
    },
  });

  const trigger = root.querySelector("[data-navigation-mobile-toggle]");
  const panel = root.querySelector("[data-navigation-mobile-panel]");
  if (!(trigger instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) {
    throw new Error("Missing mobile drawer parts");
  }

  trigger.click();

  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(trigger.getAttribute("aria-label")).toBe("Close navigation menu");
  expect(trigger.textContent).toContain("Close");
  expect(panel.hidden).toBe(false);
  expect(panel.getAttribute("aria-hidden")).toBe("false");
  expect(document.activeElement?.textContent).toContain("Home");

  const focusables = [
    trigger,
    ...Array.from(panel.querySelectorAll<HTMLElement>("a[href],button")),
  ];
  focusables[focusables.length - 1]?.focus();
  document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }));
  expect(document.activeElement).toBe(trigger);

  trigger.focus();
  document.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, key: "Tab", shiftKey: true })
  );
  expect(document.activeElement).toBe(focusables[focusables.length - 1]);

  document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(trigger);
});

test("navigation runtime toggles submenus, closes siblings, and clears on outside click", () => {
  const root = installNavigationRuntime({
    ...navigationDefaults,
    items: [
      {
        label: "Docs",
        href: "/docs",
        children: [{ label: "API", href: "/docs/api" }],
      },
      {
        label: "Products",
        href: "/products",
        children: [{ label: "CMS", href: "/products/cms" }],
      },
    ],
    behavior: {
      ...navigationDefaults.behavior,
      mobileMode: "expanded",
    },
  });

  const toggles = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-navigation-submenu-toggle="1"]')
  );
  const panels = toggles.map((toggle) =>
    document.getElementById(String(toggle.getAttribute("aria-controls")))
  );

  toggles[0]?.click();
  expect(toggles[0]?.getAttribute("aria-expanded")).toBe("true");
  expect((panels[0] as HTMLElement | null)?.hidden).toBe(false);
  expect((panels[0] as HTMLElement | null)?.getAttribute("aria-hidden")).toBe("false");

  toggles[1]?.click();
  expect(toggles[1]?.getAttribute("aria-expanded")).toBe("true");
  expect((panels[1] as HTMLElement | null)?.hidden).toBe(false);
  expect(toggles[0]?.getAttribute("aria-expanded")).toBe("false");
  expect((panels[0] as HTMLElement | null)?.hidden).toBe(true);
  expect((panels[0] as HTMLElement | null)?.getAttribute("aria-hidden")).toBe("true");

  document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(toggles[1]?.getAttribute("aria-expanded")).toBe("false");
  expect((panels[1] as HTMLElement | null)?.hidden).toBe(true);
  expect((panels[1] as HTMLElement | null)?.getAttribute("aria-hidden")).toBe("true");
});

test("navigation runtime updates active links and collapse state safely", () => {
  setScrollY(0);
  const root = installNavigationRuntime({
    ...navigationDefaults,
    items: [
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs", target: "blank" },
    ],
    behavior: {
      ...navigationDefaults.behavior,
      collapseOnScroll: true,
      activeLinkMode: "pathname",
      mobileMode: "expanded",
    },
  });

  const anchors = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('[data-navigation-link="1"]')
  );
  expect(anchors[0]?.getAttribute("aria-current")).toBe("page");
  expect(anchors[1]?.getAttribute("aria-current")).toBeNull();
  expect(anchors[1]?.getAttribute("target")).toBe("_blank");
  expect(anchors[1]?.getAttribute("rel")).toBe("noopener noreferrer");

  setScrollY(60);
  window.dispatchEvent(new Event("scroll"));
  expect(root.dataset.navigationCollapsed).toBe("true");

  setScrollY(10);
  window.dispatchEvent(new Event("scroll"));
  expect(root.dataset.navigationCollapsed).toBe("false");
});
