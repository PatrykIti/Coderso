// @vitest-environment happy-dom
//
// TASK-105-08-09 (L09) shared-a: `shared/AdminLink` behavioral coverage.
// The SSR tests below pin href resolution (canonical aliases, external passthrough);
// the happy-dom suite drives real click/hover/focus events to pin the SPA
// navigation contract: internal links prevent default and navigate via the router,
// modifier/right-button/prevented/external/_blank/download/no-SPA clicks are left
// to the browser, and prefetch fires only for internal links that opt in.

import React from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AdminLink } from "../../../core/admin/ui/shared/AdminLink";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("AdminLink renders canonical advanced href for legacy paths", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin">
      <AdminBasePathProvider value="/admin">
        <AdminLink href="/admin/content-types">Engine</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain('href="/admin/advanced/engine"');
});

test("AdminLink keeps external href untouched", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin">
      <AdminBasePathProvider value="/admin">
        <AdminLink href="https://coderso.dev/docs">Docs</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain('href="https://coderso.dev/docs"');
});

// The interaction suite observes the router calls without touching window.history,
// so the router context is the only mocked seam here; href resolution stays on the
// real canonical helpers (`resolveAdminHref`), and tests assert the hrefs AdminLink
// hands to the router rather than hand-building them.
const linkRouter = vi.hoisted(() => ({
  navigate: vi.fn<(href: string, options?: { replace?: boolean }) => void>(),
  prefetch: vi.fn<(href: string) => void>(),
}));

vi.mock("@/ui/contexts/AdminRouterContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui/contexts/AdminRouterContext")>();
  return {
    ...actual,
    useAdminRouter: () => ({
      navigate: linkRouter.navigate,
      prefetch: linkRouter.prefetch,
    }),
  };
});

beforeEach(() => {
  linkRouter.navigate.mockReset();
  linkRouter.prefetch.mockReset();
  document.body.innerHTML = "";
});

type MountLinkOptions = React.ComponentProps<typeof AdminLink> & {
  basePath?: string;
};

const mountLink = (props: MountLinkOptions) => {
  const { basePath = "/admin", children, ...linkProps } = props;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminBasePathProvider value={basePath}>
        <AdminLink {...linkProps}>{children ?? "Label"}</AdminLink>
      </AdminBasePathProvider>
    );
  });

  const anchor = () => container.querySelector<HTMLAnchorElement>("a");

  const dispatch = (event: Event) => {
    const node = anchor();
    if (!node) throw new Error("Missing anchor");
    React.act(() => {
      node.dispatchEvent(event);
    });
  };

  // happy-dom auto-preventDefaults every cancelable click on an anchor (its
  // navigation hook), which would short-circuit AdminLink's shouldIgnoreClick
  // check before the handler ever decides. Dispatch non-cancelable clicks so the
  // events reach the handler's own defaultPrevented/modifier/button logic; the
  // default-prevented case is exercised separately with an explicit cancelable
  // event below.
  return {
    container,
    anchor,
    click: (init: MouseEventInit = {}) =>
      dispatch(new MouseEvent("click", { bubbles: true, cancelable: false, ...init })),
    // React delegates onMouseEnter from `mouseover` and onFocus from `focusin`;
    // dispatching the raw mouseenter/focus events would bypass the delegation.
    hover: () => dispatch(new MouseEvent("mouseover", { bubbles: true })),
    focus: () => dispatch(new FocusEvent("focusin", { bubbles: true })),
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
      document.body.innerHTML = "";
    },
  };
};

test("internal clicks are hijacked into SPA navigation with the resolved canonical href", () => {
  const view = mountLink({ href: "/content-types", children: "Content types" });
  try {
    // The href is resolved through the canonical helpers, aliases included.
    expect(view.anchor()?.getAttribute("href")).toBe("/admin/advanced/engine");

    view.click();
    expect(linkRouter.navigate).toHaveBeenCalledTimes(1);
    expect(linkRouter.navigate).toHaveBeenCalledWith("/admin/advanced/engine", {
      replace: false,
    });
  } finally {
    view.cleanup();
  }
});

test("the replace prop opts the navigation into history replacement", () => {
  const view = mountLink({ href: "/pages", replace: true });
  try {
    view.click();
    expect(linkRouter.navigate).toHaveBeenCalledWith("/admin/pages", { replace: true });
  } finally {
    view.cleanup();
  }
});

test("the caller onClick still fires before an internal navigation", () => {
  const onClick = vi.fn<(event: React.MouseEvent<HTMLAnchorElement>) => void>();
  const view = mountLink({ href: "/pages", onClick });
  try {
    view.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(linkRouter.navigate).toHaveBeenCalledWith("/admin/pages", { replace: false });
  } finally {
    view.cleanup();
  }
});

test("modifier-key and non-left-button clicks never navigate", () => {
  const onClick = vi.fn();
  const view = mountLink({ href: "/pages", onClick });
  try {
    // `button: 1` (middle click) covers the non-primary-button branch; happy-dom
    // does not surface button-2 "clicks" as click events at all.
    for (const init of [
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      view.click(init);
    }
    // The caller handler still observes the gesture, but SPA navigation is skipped.
    expect(onClick).toHaveBeenCalledTimes(5);
    expect(linkRouter.navigate).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("a default-prevented click is left to the browser", () => {
  const onClick = vi.fn();
  const view = mountLink({ href: "/pages", onClick });
  try {
    const node = view.anchor();
    if (!node) throw new Error("Missing anchor");
    // A cancelable event so the external preventDefault actually registers; the
    // handler must observe it and skip SPA navigation.
    node.addEventListener("click", (event) => event.preventDefault());
    React.act(() => {
      node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(linkRouter.navigate).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("external, _blank, download, and no-SPA anchors are never hijacked", () => {
  const external = mountLink({ href: "https://coderso.dev/docs" });
  const blank = mountLink({ href: "/pages", target: "_blank" });
  const download = mountLink({ href: "/pages", download: "records.csv" });
  const noSpa = mountLink({ href: "/pages" });

  try {
    // Mark the anchor as opting out of SPA interception at click time (the branch
    // reads the live dataset, so this is the exact production seam).
    noSpa.anchor()?.setAttribute("data-admin-no-spa", "true");

    external.click();
    blank.click();
    download.click();
    noSpa.click();

    expect(linkRouter.navigate).not.toHaveBeenCalled();

    // Native attributes stay on the anchor for the browser to follow.
    expect(external.anchor()?.getAttribute("href")).toBe("https://coderso.dev/docs");
    expect(blank.anchor()?.getAttribute("target")).toBe("_blank");
    expect(download.anchor()?.getAttribute("download")).toBe("records.csv");
    expect(noSpa.anchor()?.getAttribute("data-admin-no-spa")).toBe("true");
  } finally {
    external.cleanup();
    blank.cleanup();
    download.cleanup();
    noSpa.cleanup();
  }
});

test("prefetch fires on hover and focus only for opted-in internal links", () => {
  const onHover = mountLink({ href: "/pages", prefetch: true });
  const onFocus = mountLink({ href: "/settings", prefetch: true });
  const optedOut = mountLink({ href: "/pages" });

  try {
    onHover.hover();
    expect(linkRouter.prefetch).toHaveBeenCalledWith("/admin/pages");

    onFocus.focus();
    expect(linkRouter.prefetch).toHaveBeenCalledWith("/admin/settings");
    expect(linkRouter.prefetch).toHaveBeenCalledTimes(2);

    // Without `prefetch`, hovering must not touch the router.
    optedOut.hover();
    expect(linkRouter.prefetch).toHaveBeenCalledTimes(2);
  } finally {
    onHover.cleanup();
    onFocus.cleanup();
    optedOut.cleanup();
  }
});

test("prefetch skips external hrefs even when opted in", () => {
  const view = mountLink({ href: "https://coderso.dev/docs", prefetch: true });
  try {
    view.hover();
    view.focus();
    expect(linkRouter.prefetch).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
