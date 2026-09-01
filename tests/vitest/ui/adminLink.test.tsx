// @vitest-environment happy-dom
//
// TASK-105-08-09 (L09) shared-a: `shared/AdminLink` alias/suffix resolution and
// the real-router prefetch wiring. The SSR cases pin how the canonical helpers
// rewrite legacy paths and keep hash/query suffixes; the happy-dom case drives a
// real focus through the real `AdminRouterProvider` to confirm the prefetch
// reaches the router-level prefetcher with the resolved href.

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AdminLink } from "../../../core/admin/ui/shared/AdminLink";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routerPrefetch = vi.hoisted(() => ({
  prefetchAdminRoute:
    vi.fn<(href: string, basePath?: string, options?: { activeHref?: string }) => void>(),
}));

// The real router delegates to `prefetchAdminRoute`; stubbing that single seam
// keeps the prefetch observation local without warming any data caches.
vi.mock("@/utils/adminPrefetch", () => ({
  prefetchAdminRoute: routerPrefetch.prefetchAdminRoute,
}));

beforeEach(() => {
  routerPrefetch.prefetchAdminRoute.mockReset();
  document.body.innerHTML = "";
});

const renderLink = (href: string, basePath = "/admin") =>
  renderToString(
    <AdminRouterProvider initialPath={basePath}>
      <AdminBasePathProvider value={basePath}>
        <AdminLink href={href}>Link</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

test("AdminLink resolves admin base path", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/panel/pages">
      <AdminBasePathProvider value="/panel">
        <AdminLink href="/pages">Pages</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain('href="/panel/pages"');
});

test("AdminLink preserves external href", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin">
      <AdminBasePathProvider value="/admin">
        <AdminLink href="https://example.com">External</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain('href="https://example.com"');
});

test("AdminLink rewrites the /coderso/posts alias to the canonical posts route", () => {
  expect(renderLink("/admin/coderso/posts")).toContain('href="/admin/posts"');
});

test("AdminLink rewrites the /entries alias to the advanced engine workspace", () => {
  expect(renderLink("/admin/entries")).toContain('href="/admin/advanced/entries"');
});

test("AdminLink keeps hash and query suffixes on canonicalized hrefs", () => {
  const html = renderLink("/admin/content-types?tab=fields#schema");
  expect(html).toContain('href="/admin/advanced/engine?tab=fields#schema"');
});

test("AdminLink leaves mailto hrefs untouched", () => {
  expect(renderLink("mailto:support@coderso.dev")).toContain('href="mailto:support@coderso.dev"');
});

test("hovering a prefetch link routes through the real router prefetcher", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <AdminBasePathProvider value="/admin">
          <AdminLink href="/pages" prefetch>
            Pages
          </AdminLink>
        </AdminBasePathProvider>
      </AdminRouterProvider>
    );
  });

  try {
    const anchor = container.querySelector<HTMLAnchorElement>("a");
    if (!anchor) throw new Error("Missing anchor");
    React.act(() => {
      anchor.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(routerPrefetch.prefetchAdminRoute).toHaveBeenCalledTimes(1);
    // The router receives the already-resolved href as its first argument.
    expect(routerPrefetch.prefetchAdminRoute).toHaveBeenCalledWith(
      "/admin/pages",
      expect.any(String),
      expect.objectContaining({ activeHref: "/admin" })
    );
  } finally {
    React.act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
  }
});

test("a non-prefetch link never reaches the router prefetcher", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <AdminBasePathProvider value="/admin">
          <AdminLink href="/pages">Pages</AdminLink>
        </AdminBasePathProvider>
      </AdminRouterProvider>
    );
  });

  try {
    const anchor = container.querySelector<HTMLAnchorElement>("a");
    if (!anchor) throw new Error("Missing anchor");
    React.act(() => {
      anchor.dispatchEvent(new MouseEvent("focusin", { bubbles: true }));
    });

    expect(routerPrefetch.prefetchAdminRoute).not.toHaveBeenCalled();
  } finally {
    React.act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
  }
});
