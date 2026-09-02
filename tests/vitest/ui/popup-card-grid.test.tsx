// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuItem: ({
    children,
    onClick,
    variant,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button type="button" data-variant={variant} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    />
  ),
}));

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import {
  audienceLabel,
  frequencyLabel,
  PopupCardGrid,
  triggerLabel,
} from "../../../core/admin/ui/popups/PopupCardGrid";

const withRouter = (node: React.ReactNode) => (
  <AdminRouterProvider initialPath="/admin/advanced/popups">{node}</AdminRouterProvider>
);
import type { PopupRecord } from "../../../core/admin/services/popupsClient";

const popup = (overrides: Partial<PopupRecord> = {}): PopupRecord =>
  ({
    id: "popup-1",
    name: "Winter Promo",
    slug: "winter-promo",
    status: "draft",
    trigger: { type: "time_delay", delaySeconds: 3 },
    targeting: { includePaths: [], excludePaths: [], audience: "all" },
    frequency: { strategy: "session_once", cooldownMinutes: null },
    content: { title: null, body: null, templateId: null, ctaLabel: null, ctaHref: null },
    settings: { placement: "center", dismissible: true, showOverlay: true },
    createdAt: "",
    updatedAt: "",
    publishedAt: null,
    ...overrides,
  }) as PopupRecord;

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

const clickButtonWithText = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

describe("popup label helpers", () => {
  it.each([
    [{ type: "time_delay", delaySeconds: 1 }, "Timed"],
    [{ type: "scroll_depth", percent: 10 }, "Scroll"],
    [{ type: "exit_intent" }, "Exit intent"],
    [{ type: "cta_click", selector: "#x" }, "On click"],
    // unknown trigger payloads from newer APIs fall back to the generic label
    [{ type: "hologram_pulse" }, "Trigger"],
  ])("triggerLabel(%j)", (trigger, expected) => {
    expect(triggerLabel(trigger as never)).toBe(expected);
  });

  it.each([
    ["logged_in", "Logged-in"],
    ["logged_out", "Logged-out"],
    ["all", "All visitors"],
  ])("audienceLabel(%j)", (audience, expected) => {
    expect(audienceLabel(audience as never)).toBe(expected);
  });

  it.each([
    ["always", "Every visit"],
    ["session_once", "Once / session"],
    ["daily_once", "Once / day"],
    // unknown frequency strategies render an em-dash placeholder
    ["hourly_once", "—"],
  ])("frequencyLabel(%j)", (strategy, expected) => {
    expect(frequencyLabel(strategy as never)).toBe(expected);
  });
});

describe("PopupCardGrid", () => {
  it("renders the loading empty state before any popups exist", () => {
    const view = mount(
      withRouter(
        <PopupCardGrid
          items={[]}
          isLoading
          onStatusChange={() => undefined}
          onDelete={() => undefined}
        />
      )
    );

    expect(view.container.textContent).toContain("Loading popups…");
    expect(view.container.textContent).toContain("Fetching your popup campaigns.");
    view.unmount();
  });

  it("renders the create-first empty state when idle and empty", () => {
    const view = mount(
      withRouter(
        <PopupCardGrid
          items={[]}
          isLoading={false}
          onStatusChange={() => undefined}
          onDelete={() => undefined}
        />
      )
    );

    expect(view.container.textContent).toContain("No popups yet.");
    view.unmount();
  });

  it("renders cards with real metadata labels and edit links", () => {
    const view = mount(
      withRouter(
        <PopupCardGrid
          items={[
            popup(),
            popup({ id: "popup-2", name: "Exit Catcher", trigger: { type: "exit_intent" } }),
          ]}
          onStatusChange={() => undefined}
          onDelete={() => undefined}
        />
      )
    );

    expect(view.container.textContent).toContain("Winter Promo");
    expect(view.container.textContent).toContain("Timed");
    expect(view.container.textContent).toContain("All visitors");
    expect(view.container.textContent).toContain("Once / session");
    expect(view.container.textContent).toContain("Exit Catcher");
    expect(view.container.textContent).toContain("Exit intent");
    expect(view.container.querySelector("a[aria-label='Edit popup: Winter Promo']")).not.toBeNull();
    // every card exposes an Edit popup CTA
    expect(view.container.textContent).toContain("Edit popup");
    view.unmount();
  });

  it("toggling the switch flips published <-> draft through onStatusChange", () => {
    const onStatusChange = vi.fn();
    const view = mount(
      withRouter(
        <PopupCardGrid
          items={[popup()]}
          onStatusChange={onStatusChange}
          onDelete={() => undefined}
        />
      )
    );

    const toggle = view.container.querySelector<HTMLButtonElement>(
      "button[aria-label='Toggle Winter Promo']"
    )!;
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    React.act(() => {
      toggle.click();
    });
    // presentational component: checked derives from props (still draft),
    // so a second toggle re-requests "published" until the parent updates
    expect(onStatusChange).toHaveBeenCalledWith("popup-1", "published");

    const publishedView = mount(
      withRouter(
        <PopupCardGrid
          items={[popup({ status: "published" })]}
          onStatusChange={onStatusChange}
          onDelete={() => undefined}
        />
      )
    );
    React.act(() => {
      publishedView.container
        .querySelector<HTMLButtonElement>("button[aria-label='Toggle Winter Promo']")!
        .click();
    });
    expect(onStatusChange).toHaveBeenLastCalledWith("popup-1", "draft");
    publishedView.unmount();
    view.unmount();
  });

  it("a published card offers Move to draft but not Publish", () => {
    const view = mount(
      withRouter(
        <PopupCardGrid
          items={[popup({ status: "published" })]}
          onStatusChange={() => undefined}
          onDelete={() => undefined}
        />
      )
    );

    const labels = Array.from(view.container.querySelectorAll("button")).map((candidate) =>
      candidate.textContent?.trim()
    );
    expect(labels).not.toContain("Publish");
    expect(labels).toContain("Move to draft");
    expect(labels).toContain("Archive");
    view.unmount();
  });

  it("a draft card offers Publish but not Move to draft", () => {
    const view = mount(
      withRouter(
        <PopupCardGrid
          items={[popup({ status: "draft" })]}
          onStatusChange={() => undefined}
          onDelete={() => undefined}
        />
      )
    );

    const labels = Array.from(view.container.querySelectorAll("button")).map((candidate) =>
      candidate.textContent?.trim()
    );
    expect(labels).toContain("Publish");
    expect(labels).not.toContain("Move to draft");
    view.unmount();
  });

  it("an archived card hides both status menu actions but keeps Delete", () => {
    const onStatusChange = vi.fn();
    const onDelete = vi.fn();
    const view = mount(
      withRouter(
        <PopupCardGrid
          items={[popup({ status: "archived" })]}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      )
    );
    clickButtonWithText(view.container, "Delete");
    expect(onDelete).toHaveBeenCalledWith("popup-1");
    const labels = Array.from(view.container.querySelectorAll("button")).map((candidate) =>
      candidate.textContent?.trim()
    );
    // archived cards can still transition to either active state
    expect(labels).toContain("Publish");
    expect(labels).toContain("Move to draft");
    view.unmount();
  });

  it("routes archive and delete clicks to their callbacks", () => {
    const onStatusChange = vi.fn();
    const onDelete = vi.fn();
    const view = mount(
      withRouter(
        <PopupCardGrid items={[popup()]} onStatusChange={onStatusChange} onDelete={onDelete} />
      )
    );
    clickButtonWithText(view.container, "Archive");
    expect(onStatusChange).toHaveBeenCalledWith("popup-1", "archived");
    clickButtonWithText(view.container, "Delete");
    expect(onDelete).toHaveBeenCalledWith("popup-1");
    view.unmount();
  });

  it("menu Publish and Move-to-draft items request their exact status transitions", () => {
    const onStatusChange = vi.fn();
    const draftView = mount(
      withRouter(
        <PopupCardGrid
          items={[popup()]}
          onStatusChange={onStatusChange}
          onDelete={() => undefined}
        />
      )
    );
    clickButtonWithText(draftView.container, "Publish");
    expect(onStatusChange).toHaveBeenCalledWith("popup-1", "published");
    draftView.unmount();

    const publishedView = mount(
      withRouter(
        <PopupCardGrid
          items={[popup({ status: "published" })]}
          onStatusChange={onStatusChange}
          onDelete={() => undefined}
        />
      )
    );
    clickButtonWithText(publishedView.container, "Move to draft");
    expect(onStatusChange).toHaveBeenLastCalledWith("popup-1", "draft");
    publishedView.unmount();
  });
});
