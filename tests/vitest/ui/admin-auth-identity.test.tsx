// @vitest-environment happy-dom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import {
  getAdminAuthIdentity,
  subscribeAdminAuthIdentity,
  type AdminAuthIdentitySnapshot,
} from "../../../core/admin/services/adminAuthIdentity";
import type { AuthUser } from "../../../core/admin/services/authClient";
import { AdminAuthProvider } from "../../../core/admin/ui/contexts/AdminAuthContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Root[] = [];

const makeUser = (id: string, name = id): AuthUser => ({
  id,
  email: `${id}@example.test`,
  name,
  permissionSnapshot: null,
});

const mountProvider = (user: AuthUser | null) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  let mounted = true;
  const render = (nextUser: AuthUser | null) => {
    React.act(() => {
      root.render(
        <AdminAuthProvider user={nextUser}>
          <span>child</span>
        </AdminAuthProvider>
      );
    });
  };
  render(user);
  return {
    render,
    unmount: () => {
      if (!mounted) return;
      mounted = false;
      const index = mountedRoots.indexOf(root);
      if (index !== -1) mountedRoots.splice(index, 1);
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    React.act(() => root.unmount());
  }
  document.body.innerHTML = "";
});

test("AdminAuthProvider publishes one identity epoch per real identity change", () => {
  const events: AdminAuthIdentitySnapshot[] = [];
  const unsubscribe = subscribeAdminAuthIdentity((next) => events.push(next));
  const initialEpoch = getAdminAuthIdentity().epoch;
  const provider = mountProvider(makeUser("user-a"));

  try {
    expect(events).toEqual([{ userId: "user-a", epoch: initialEpoch + 1 }]);

    provider.render(makeUser("user-a", "renamed"));
    expect(events).toHaveLength(1);
    expect(getAdminAuthIdentity()).toEqual({
      userId: "user-a",
      epoch: initialEpoch + 1,
    });

    provider.render(makeUser("user-b"));
    expect(events.slice(1)).toEqual([{ userId: "user-b", epoch: initialEpoch + 2 }]);
    expect(events.some(({ userId }) => userId === null)).toBe(false);

    provider.render(null);
    expect(events.at(-1)).toEqual({ userId: null, epoch: initialEpoch + 3 });
  } finally {
    provider.unmount();
    unsubscribe();
  }
});

test("provider unmount clears authority while stale cleanup cannot clear a newer provider", () => {
  const events: AdminAuthIdentitySnapshot[] = [];
  const unsubscribe = subscribeAdminAuthIdentity((next) => events.push(next));
  const older = mountProvider(makeUser("older"));
  const newer = mountProvider(makeUser("newer"));

  try {
    const beforeStaleUnmount = getAdminAuthIdentity();
    older.unmount();
    expect(getAdminAuthIdentity()).toBe(beforeStaleUnmount);
    expect(events.at(-1)).toBe(beforeStaleUnmount);

    newer.unmount();
    expect(getAdminAuthIdentity()).toEqual({
      userId: null,
      epoch: beforeStaleUnmount.epoch + 1,
    });
  } finally {
    older.unmount();
    newer.unmount();
    unsubscribe();
  }
});
