// TASK-486-01-L02 — DB-backed coverage for resolvePublicPopups.
//
// Shared-DB isolation: the popups table lives on the shared remote Postgres, so
// this suite never asserts global row counts and never truncates the table. All
// fixtures use a per-run unique prefix (slug has a unique index) and cleanup
// deletes ONLY the rows this suite created. The resolver is exercised through
// its real query path (status = "published", desc updatedAt, limit 200), so
// assertions are scoped to this suite's slugs, never to the whole table.

import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { popups } from "../../../core/db/schema";
import { createPopup, resolvePublicPopups } from "../../../core/services/popups/popupService";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const SUITE = `l02-resolver-${randomUUID()}`;
const createdIds: string[] = [];

const baseFields = {
  trigger: { type: "exit_intent" },
  frequency: { strategy: "always", cooldownMinutes: null },
  content: { title: "Title", body: "Body", templateId: null },
  settings: { placement: "center", dismissible: true, showOverlay: true },
};

async function seedPopup(name: string, overrides: Record<string, unknown> = {}) {
  const popup = await createPopup({
    name: `${SUITE}:${name}`,
    slug: `${SUITE}-${name}-${randomUUID().slice(0, 8)}`,
    status: "draft",
    targeting: { includePaths: [], excludePaths: [], audience: "all" },
    ...baseFields,
    ...overrides,
  });
  if (popup) createdIds.push(popup.id);
  return popup;
}

afterAll(async () => {
  if (!hasDb || createdIds.length === 0) return;
  // Delete only this suite's rows; never a whole-table sweep.
  await db.delete(popups).where(inArray(popups.id, createdIds));
});

testIfDb("returns only published popups; draft and archived are excluded", async () => {
  const published = await seedPopup("published", {
    status: "published",
    targeting: { includePaths: [], excludePaths: [], audience: "all" },
  });
  const draft = await seedPopup("draft");
  const archived = await seedPopup("archived", { status: "archived" });

  const items = await resolvePublicPopups({ path: "/", isLoggedIn: false });
  const slugs = new Set(items.map((item) => item.slug));

  expect(slugs.has(published!.slug)).toBe(true);
  expect(slugs.has(draft!.slug)).toBe(false);
  expect(slugs.has(archived!.slug)).toBe(false);
});

testIfDb("applies server-side include/exclude path targeting", async () => {
  const blogOnly = await seedPopup("blog-only", {
    status: "published",
    targeting: {
      includePaths: ["/blog/*"],
      excludePaths: ["/blog/private"],
      audience: "all",
    },
  });
  const allPaths = await seedPopup("all-paths", {
    status: "published",
    targeting: { includePaths: [], excludePaths: [], audience: "all" },
  });

  const onBlog = await resolvePublicPopups({ path: "/blog/post-1", isLoggedIn: false });
  expect(onBlog.some((item) => item.slug === blogOnly!.slug)).toBe(true);

  const onPrivate = await resolvePublicPopups({ path: "/blog/private", isLoggedIn: false });
  expect(onPrivate.some((item) => item.slug === blogOnly!.slug)).toBe(false);

  const onShop = await resolvePublicPopups({ path: "/shop", isLoggedIn: false });
  expect(onShop.some((item) => item.slug === blogOnly!.slug)).toBe(false);
  expect(onShop.some((item) => item.slug === allPaths!.slug)).toBe(true);
});

testIfDb("applies server-side audience targeting", async () => {
  const loggedIn = await seedPopup("aud-logged-in", {
    status: "published",
    targeting: { includePaths: [], excludePaths: [], audience: "logged_in" },
  });
  const loggedOut = await seedPopup("aud-logged-out", {
    status: "published",
    targeting: { includePaths: [], excludePaths: [], audience: "logged_out" },
  });

  const asLoggedIn = await resolvePublicPopups({ path: "/", isLoggedIn: true });
  expect(asLoggedIn.some((item) => item.slug === loggedIn!.slug)).toBe(true);
  expect(asLoggedIn.some((item) => item.slug === loggedOut!.slug)).toBe(false);

  const asGuest = await resolvePublicPopups({ path: "/", isLoggedIn: false });
  expect(asGuest.some((item) => item.slug === loggedIn!.slug)).toBe(false);
  expect(asGuest.some((item) => item.slug === loggedOut!.slug)).toBe(true);
});

testIfDb("projects PublicPopup shape without name/status/targeting/timestamps", async () => {
  const popup = await seedPopup("shape", {
    status: "published",
    targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
  });

  const items = await resolvePublicPopups({ path: "/", isLoggedIn: false });
  const found = items.find((item) => item.slug === popup!.slug);
  expect(found).toBeDefined();

  const keys = Object.keys(found!).sort();
  expect(keys).toEqual(["content", "frequency", "id", "settings", "slug", "trigger"]);
  expect(found!.content).not.toHaveProperty("templateId");
  expect(found).not.toHaveProperty("name");
  expect(found).not.toHaveProperty("status");
  expect(found).not.toHaveProperty("targeting");
  expect(found).not.toHaveProperty("createdAt");
  expect(found).not.toHaveProperty("updatedAt");
  expect(found).not.toHaveProperty("publishedAt");
});

testIfDb("defensively coerces malformed request input", async () => {
  const home = await seedPopup("coerce", {
    status: "published",
    targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
  });

  // path null coerces to "/", isLoggedIn 0 coerces to false (Boolean()).
  const items = await resolvePublicPopups({
    path: null as unknown as string,
    isLoggedIn: 0 as unknown as boolean,
  });
  expect(items.some((item) => item.slug === home!.slug)).toBe(true);
});

testIfDb("returns popups ordered by updatedAt descending", async () => {
  const older = await seedPopup("older", {
    status: "published",
    targeting: { includePaths: [], excludePaths: [], audience: "all" },
  });
  const newer = await seedPopup("newer", {
    status: "published",
    targeting: { includePaths: [], excludePaths: [], audience: "all" },
  });
  // Force a distinct later timestamp so the ordering assertion is deterministic
  // even when both inserts land in the same millisecond.
  await db
    .update(popups)
    .set({ updatedAt: new Date(Date.now() + 60_000) })
    .where(eq(popups.id, newer!.id));

  const items = await resolvePublicPopups({ path: "/", isLoggedIn: false });
  const ours = items.filter((item) => item.slug === older!.slug || item.slug === newer!.slug);
  expect(ours.map((item) => item.slug)).toEqual([newer!.slug, older!.slug]);
});
