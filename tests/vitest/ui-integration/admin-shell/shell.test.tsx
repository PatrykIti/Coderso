// @vitest-environment happy-dom
//
// TASK-479-06-L07: full AdminShell render lane. The shell is a pure SSR snapshot
// here (renderToString via `renderAdminUi`) — interactive bits (mobile drawer,
// theme toggle) are covered in the dedicated happy-dom suites. We render under
// happy-dom only so the SSR-guarded `window`/`localStorage` reads in the shell's
// state initializers resolve; effects do not run during `renderToString`.

import { afterEach, beforeEach, expect, test } from "vitest";

import { AdminShell } from "@/ui/layouts/AdminShell";
import { AdminAssistantConfigProvider } from "@/ui/contexts/AdminAssistantConfigContext";

import { renderAdminUi } from "../../../utils/adminRouterRender";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // The shell's auth bootstrap shape; effects don't fire under renderToString,
  // but stub it anyway so nothing escapes to the network (matches the budget
  // suite's `/auth/me` shape).
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ user: { id: "u1", email: "admin@example.com", name: "Admin" } }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("renders sidebar + topbar + main with the centered content wrapper", () => {
  const html = renderAdminUi(
    <AdminShell>
      <div>page-body</div>
    </AdminShell>,
    { path: "/admin" }
  );

  // Centered comfortable column for normal (non-editor) routes.
  expect(html).toContain("max-w-[1280px]");
  expect(html).toContain("page-body");
  // Chrome surfaces present and reading the --admin-* tokens directly.
  expect(html).toContain("bg-[var(--admin-sidebar-bg)]"); // SidebarNav
  expect(html).toContain("bg-[var(--admin-topbar-bg)]"); // TopBar
});

test("omits the centered wrapper when content owns overflow (editor / full-bleed route)", () => {
  const html = renderAdminUi(
    <AdminShell contentClassName="overflow-hidden p-0">
      <div>page-body</div>
    </AdminShell>
  );

  expect(html).not.toContain("max-w-[1280px]");
  expect(html).toContain("page-body");
});

test("keeps the AssistantPanel mounted inside the shell", () => {
  const html = renderAdminUi(
    <AdminAssistantConfigProvider
      value={{ enabled: true, launcherAvatarEnabled: false, launcherAvatarAsset: null }}
    >
      <AdminShell>
        <div>page-body</div>
      </AdminShell>
    </AdminAssistantConfigProvider>,
    { path: "/admin" }
  );

  // The launcher host marker — proves the assistant survives the shell restyle.
  expect(html).toContain("Open assistant conversation");
});
