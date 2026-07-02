import { expect, test } from "vitest";

import {
  normalizeMenuItemSettings,
  resolveMenuItemSettings,
} from "../../../core/services/menus/menuItemSettings";
import { mapMenuNodesToNavigationItems } from "../../../core/services/navigation/navigationMenuMapping";

test("normalizeMenuItemSettings keeps openInNewTab/variant only when valid + non-default", () => {
  expect(normalizeMenuItemSettings({ openInNewTab: true, variant: "button" })).toEqual({
    openInNewTab: true,
    variant: "button",
  });

  // Defaults are NOT persisted (byte-shape preserved for legacy items).
  expect(normalizeMenuItemSettings({ openInNewTab: false, variant: "link" })).toEqual({});

  // Malformed values are dropped (fail-soft).
  expect(normalizeMenuItemSettings({ openInNewTab: "yes", variant: "weird" } as unknown)).toEqual(
    {}
  );
});

test("resolveMenuItemSettings fills openInNewTab/variant defaults", () => {
  const resolved = resolveMenuItemSettings({});
  expect(resolved.openInNewTab).toBe(false);
  expect(resolved.variant).toBe("link");

  const custom = resolveMenuItemSettings({ openInNewTab: true, variant: "button" });
  expect(custom.openInNewTab).toBe(true);
  expect(custom.variant).toBe("button");
});

test("mapMenuNodesToNavigationItems threads target blank + meta.variant for button items", () => {
  const [linkItem, buttonItem] = mapMenuNodesToNavigationItems([
    { label: "Home", href: "/", settings: {}, children: [] },
    {
      label: "Sign up",
      href: "/signup",
      settings: { openInNewTab: true, variant: "button" },
      children: [],
    },
  ]);

  // Default link item: no target (no includeDefaultTarget), no variant key.
  expect(linkItem.target).toBeUndefined();
  expect(linkItem.meta).toEqual({
    visibility: "all",
    badge: null,
    description: null,
    icon: null,
  });
  expect("variant" in (linkItem.meta ?? {})).toBe(false);

  // Button item: openInNewTab -> target blank, variant carried on meta.
  expect(buttonItem.target).toBe("blank");
  expect(buttonItem.meta?.variant).toBe("button");
});
