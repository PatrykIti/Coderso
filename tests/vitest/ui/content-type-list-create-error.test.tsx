// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { ContentTypeList } from "../../../core/admin/ui/content-types/ContentTypeList";
import { flush, setInputValue } from "./contentListWaveTestUtils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({
  createContentType: vi.fn(),
  getCachedContentTypes: vi.fn(),
  listContentTypesCached: vi.fn(),
}));

vi.mock("@/services/contentTypesClient", () => ({
  createContentType: state.createContentType,
  getCachedContentTypes: state.getCachedContentTypes,
  listContentTypesCached: state.listContentTypesCached,
  deleteContentType: vi.fn(),
  duplicateContentType: vi.fn(),
  updateContentType: vi.fn(),
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: { contentTypesList: "contentTypesList" },
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("@/utils/adminPaths", () => ({
  resolveAdminBasePath: () => "/admin",
  resolveAdminRoutePath: (path: string) => path,
  withAdminBasePath: (_basePath: string, path: string) => `/admin${path}`,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: vi.fn() }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({ ConfirmActionDialog: () => null }));
vi.mock("@/ui/shared/EmptyState", () => ({
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: React.ReactNode;
  }) => (
    <section data-slot="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  ),
}));
vi.mock("@/ui/shared/ListPaginationFooter", () => ({ ListPaginationFooter: () => null }));
vi.mock("@/ui/shared/ListSkeleton", () => ({ ListSkeleton: () => <div>Loading</div> }));
vi.mock("@/ui/shared/StatCard", () => ({ StatCard: () => null }));
vi.mock("@/ui/shared/StatusBadge", () => ({ StatusBadge: () => null }));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    type = "button",
    ...props
  }: {
    children?: React.ReactNode;
    type?: "button" | "submit" | "reset";
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: () => <button type="button">checkbox</button>,
}));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  DropdownMenuSeparator: () => null,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
}));
vi.mock("@/components/ui/separator", () => ({ Separator: () => <hr /> }));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  state.getCachedContentTypes.mockReset();
  state.listContentTypesCached.mockReset();
  state.createContentType.mockReset();
  state.getCachedContentTypes.mockReturnValue([]);
  state.listContentTypesCached.mockResolvedValue([]);
  state.createContentType.mockRejectedValue(
    new ApiClientError("content_type_conflict", "Collection name is already used.", 409)
  );
});

afterEach(() => {
  React.act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

test("shows a real create failure toast after submitting the real collection drawer", async () => {
  root = createRoot(container!);
  React.act(() => {
    root!.render(
      <>
        <ContentTypeList />
        <Toaster />
      </>
    );
  });
  await flush();

  const newType = Array.from(
    container!.querySelectorAll<HTMLButtonElement>('[data-slot="empty-state"] button')
  ).find((button) => button.textContent === "New type");
  expect(newType).toBeDefined();
  React.act(() => {
    newType!.click();
  });
  const name = container!.querySelector<HTMLInputElement>('input[placeholder="Blog Post"]');
  expect(name).not.toBeNull();
  React.act(() => {
    setInputValue(name, "News Article");
  });
  const create = Array.from(container!.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent === "Create Collection"
  );
  expect(create).toBeDefined();
  React.act(() => {
    create!.click();
  });
  await flush();

  expect(state.createContentType).toHaveBeenCalledWith({
    name: "News Article",
    slug: "news-article",
    schema: { type: "object", additionalProperties: false, properties: {} },
    status: "draft",
  });
  expect(container!.querySelector("[data-sonner-toaster]")?.textContent).toContain(
    "Collection name is already used."
  );
});
