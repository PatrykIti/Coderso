import { afterAll, beforeEach, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { popups } from "../../../core/db/schema";
import {
  createPopup,
  listPopups,
  setPopupStatus,
} from "../../../core/services/popups/popupService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(popups);
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("createPopup stores normalized payload and sets publishedAt for published status", async () => {
  const popup = await createPopup({
    name: "Welcome Banner",
    slug: "welcome-banner",
    status: "published",
    trigger: { type: "time_delay", delaySeconds: 7 },
    targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
    frequency: { strategy: "session_once", cooldownMinutes: null },
    content: { title: "Welcome", body: "Check our offer", templateId: null },
    settings: { placement: "center", dismissible: true, showOverlay: true },
  });

  expect(popup?.status).toBe("published");
  expect(popup?.publishedAt).not.toBeNull();
});

testIfDb("listPopups supports status filtering", async () => {
  await createPopup({
    name: "Draft Popup",
    trigger: { type: "exit_intent" },
    targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
    frequency: { strategy: "always", cooldownMinutes: null },
    content: { title: "Draft", body: null, templateId: null },
    settings: { placement: "center", dismissible: true, showOverlay: true },
  });
  await createPopup({
    name: "Published Popup",
    status: "published",
    trigger: { type: "scroll_depth", percent: 50 },
    targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
    frequency: { strategy: "daily_once", cooldownMinutes: 120 },
    content: { title: "Published", body: null, templateId: null },
    settings: { placement: "bottom_right", dismissible: true, showOverlay: false },
  });

  const published = await listPopups({ status: "published" });
  expect(published.length).toBe(1);
  expect(published[0]?.status).toBe("published");
});

testIfDb("setPopupStatus clears publishedAt when leaving published state", async () => {
  const popup = await createPopup({
    name: "Published Popup",
    status: "published",
    trigger: { type: "exit_intent" },
    targeting: { includePaths: ["/"], excludePaths: [], audience: "all" },
    frequency: { strategy: "always", cooldownMinutes: null },
    content: { title: "Published", body: null, templateId: null },
    settings: { placement: "center", dismissible: true, showOverlay: true },
  });

  const archived = await setPopupStatus(popup!.id, "archived");
  expect(archived?.status).toBe("archived");
  expect(archived?.publishedAt).toBeNull();
});
