// @vitest-environment happy-dom

// TASK-479-20-L03: locks the Popup EDITOR restyle (three-region frame: content rail
// + live centered popup preview + grouped trigger/targeting/frequency/content/display
// inspector) while proving the draft binding (onPatch), dirty-state, cache no-clobber,
// and save payload (toPopupInput) are presentation only. Static cases use the SSR-only
// `renderAdminUi`; interactive cases mount the REAL PopupEditorPage and stub fetch.
// The trigger/audience/frequency/placement/status controls are Radix `Select` (not
// native <select>), so a conditional swap is proved by SEEDING two triggerType states.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearPopupsCache } from "../../../core/admin/services/popupsClient";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { PopupEditorPage } from "../../../core/admin/ui/popups/PopupEditorPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const popup = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Newsletter signup",
  slug: "newsletter-signup",
  status: "published",
  trigger: { type: "time_delay", delaySeconds: 3 },
  targeting: { includePaths: [], excludePaths: [], audience: "all" },
  frequency: { strategy: "session_once", cooldownMinutes: null },
  content: { title: "Join us", body: "Subscribe", templateId: null, ctaLabel: null, ctaHref: null },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  createdAt: "2026-02-19T00:00:00.000Z",
  updatedAt: "2026-02-19T00:00:00.000Z",
  publishedAt: null,
  ...over,
});

const seedDetail = (record: ReturnType<typeof popup>) =>
  localStorage.setItem(
    cacheKeys.popupDetail(record.id),
    JSON.stringify({ value: record, savedAt: Date.now() })
  );

const mount = (node: React.ReactNode, path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const stubFetch = (handlers: (url: string, init?: RequestInit) => unknown | undefined) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return new Response(JSON.stringify({ user: { id: "u1", email: "a@b.c", name: "A" } }), {
        status: 200,
      });
    }
    const handled = handlers(url, init);
    return new Response(JSON.stringify(handled ?? {}), { status: 200 });
  }) as typeof globalThis.fetch;
  return () => {
    globalThis.fetch = original;
  };
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  React.act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

beforeEach(() => {
  localStorage.clear();
  clearPopupsCache();
});

afterEach(() => {
  document.body.innerHTML = "";
});

// STATIC (SSR): three-region frame + live preview reflect the seeded draft.
test("renders the three-region frame + live preview from the draft", () => {
  seedDetail(
    popup({
      id: "p1",
      content: {
        title: "Join us",
        body: "Subscribe",
        templateId: null,
        ctaLabel: null,
        ctaHref: null,
      },
    })
  );
  const html = renderAdminUi(<PopupEditorPage />, { path: "/admin/advanced/popups/p1" });
  expect(html).toContain("Join us"); // preview reflects draft.title
  expect(html).toContain("Popup editor"); // editor frame header
  expect(html).toContain("Save"); // header Save action
});

// STATIC: conditional trigger field tracks the SEEDED triggerType (Radix Select — no selectOptions).
test("conditional trigger field matches the seeded triggerType", () => {
  seedDetail(popup({ id: "p1", trigger: { type: "scroll_depth", percent: 40 } }));
  const html = renderAdminUi(<PopupEditorPage />, { path: "/admin/advanced/popups/p1" });
  expect(html).toContain("Scroll depth"); // scroll_depth → percent field present
  expect(html).not.toContain("Delay (seconds)"); // time_delay field absent
});

// INTERACTIVE: typing the title updates the preview; Save sends toPopupInput(draft).
test("typing a title updates the preview; Save sends toPopupInput(draft)", async () => {
  seedDetail(popup({ id: "p1" }));
  const saved: { body: { content?: { title?: string } } | null } = { body: null };
  const restore = stubFetch((url, init) => {
    if (url.endsWith("/popups/p1") && init?.method === "GET") return popup({ id: "p1" });
    if (url.endsWith("/popups/p1") && init?.method === "PATCH") {
      saved.body = JSON.parse(String(init.body));
      return popup({ id: "p1" });
    }
    return undefined;
  });
  const view = mount(<PopupEditorPage />, "/admin/advanced/popups/p1");
  await flush();
  try {
    const title = view.container.querySelector(
      'input[placeholder="Get 10% off your first order"]'
    ) as HTMLInputElement;
    expect(title).toBeTruthy();
    setInputValue(title, "Hello");
    expect(view.container.textContent).toContain("Hello"); // live preview reflects the draft
    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((b) => /save changes/i.test(b.textContent ?? ""))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(saved.body?.content?.title).toContain("Hello"); // toPopupInput nests title under content
  } finally {
    view.cleanup();
    restore();
  }
});

// INTERACTIVE: a background cacheBus event must NOT clobber a dirty draft.
test("does not overwrite the draft while dirty", async () => {
  seedDetail(popup({ id: "p1" }));
  const restore = stubFetch((url, init) =>
    url.endsWith("/popups/p1") && init?.method === "GET" ? popup({ id: "p1" }) : undefined
  );
  const view = mount(<PopupEditorPage />, "/admin/advanced/popups/p1");
  await flush();
  try {
    const name = view.container.querySelector(
      'input[placeholder="Winter Promo Popup"]'
    ) as HTMLInputElement;
    expect(name).toBeTruthy();
    setInputValue(name, "WIP"); // hasUnsavedChanges = true
    React.act(() => broadcastCacheEvent({ key: cacheKeys.popupsList, action: "update" })); // background revalidation
    const after = view.container.querySelector(
      'input[placeholder="Winter Promo Popup"]'
    ) as HTMLInputElement;
    expect(after.value).toContain("WIP"); // dirty-guarded subscription left the draft intact
  } finally {
    view.cleanup();
    restore();
  }
});
