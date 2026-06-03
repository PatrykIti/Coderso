// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import type { RoleSummary } from "../../../core/admin/ui/roles/types";
import { InviteUserDialog } from "../../../core/admin/ui/users/InviteUserDialog";

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <button type="button" id={id}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

const roles: RoleSummary[] = [
  {
    id: "editor",
    name: "Editor",
    description: "Content and media management permissions.",
    permissions: ["content:write", "content:publish", "media:write"],
  },
];

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
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

const setInputValue = (input: Element | null, value: string) => {
  if (!(input instanceof HTMLInputElement)) throw new Error("Missing input");
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button: ${text}`);
  React.act(() => {
    button.click();
  });
  return button;
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("InviteUserDialog renders form fields and preview", () => {
  const html = renderAdminUi(
    <InviteUserDialog open roles={roles} onOpenChange={() => undefined} />
  );

  expect(html).toContain("Invite User");
  expect(html).toContain("User Details");
  expect(html).toContain("Workspace Role");
  expect(html).toContain("Permissions Preview");
  expect(html).toContain("Send Invitation");
});

test("InviteUserDialog keeps delivery errors open and closes on success", async () => {
  const onOpenChange = vi.fn();
  const failingInvite = vi.fn(async () => {
    throw new Error("Email delivery is not configured");
  });

  const failed = mount(
    <InviteUserDialog open roles={roles} onOpenChange={onOpenChange} onInvite={failingInvite} />
  );

  try {
    React.act(() => {
      setInputValue(failed.container.querySelector("#invite-user-name"), "Ada Lovelace");
      setInputValue(failed.container.querySelector("#invite-user-email"), "ada@example.com");
    });
    await flush();
    clickByText(failed.container, "Send Invitation");
    await flush();

    expect(failingInvite).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      roleId: "editor",
    });
    expect(failed.container.textContent).toContain("Email delivery is not configured");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  } finally {
    failed.cleanup();
  }

  const successfulInvite = vi.fn(async () => undefined);
  const succeeded = mount(
    <InviteUserDialog open roles={roles} onOpenChange={onOpenChange} onInvite={successfulInvite} />
  );

  try {
    React.act(() => {
      setInputValue(succeeded.container.querySelector("#invite-user-name"), "Grace Hopper");
      setInputValue(succeeded.container.querySelector("#invite-user-email"), "grace@example.com");
    });
    await flush();
    clickByText(succeeded.container, "Send Invitation");
    await flush();

    expect(successfulInvite).toHaveBeenCalledWith({
      name: "Grace Hopper",
      email: "grace@example.com",
      roleId: "editor",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    succeeded.cleanup();
  }
});
