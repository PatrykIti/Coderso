import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  applyTemplateInstall,
  rollbackTemplateInstall,
} from "../../../core/services/templates/templateInstaller";
import {
  deleteWidgetTemplate,
  listWidgetTemplates,
} from "../../../core/services/widgets/widgetTemplateService";
import { hasTable } from "../../utils/db";

const kitId = "test-kit";
const markerPrefix = `[nextless-kit-template:${kitId}:`;

const hasDb =
  Boolean(process.env.DATABASE_URL) &&
  (await canConnect()) &&
  (await hasTable("widget_templates"));
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
  const rows = await listWidgetTemplates();
  const managed = rows.filter((item) => item.description?.includes(markerPrefix));
  for (const row of managed) {
    await deleteWidgetTemplate(row.id);
  }
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("applyTemplateInstall creates managed template and second run is idempotent", async () => {
  const key = `landing-${randomUUID().slice(0, 8)}`;

  const first = await applyTemplateInstall({
    kitId,
    continueOnError: false,
    seeds: [
      {
        key,
        name: "Landing Hero",
        category: "Layout",
        status: "draft",
        blocks: [],
      },
    ],
  });

  expect(first.summary.success).toBe(1);
  expect(first.summary.operations.create).toBe(1);
  expect(first.rollbackPlan.length).toBe(1);

  const second = await applyTemplateInstall({
    kitId,
    continueOnError: false,
    seeds: [
      {
        key,
        name: "Landing Hero",
        category: "Layout",
        status: "draft",
        blocks: [],
      },
    ],
  });

  expect(second.summary.failed).toBe(0);
  expect(second.summary.operations.noop + second.summary.operations.update).toBe(1);

  const rows = await listWidgetTemplates();
  const managed = rows.filter((item) => item.description?.includes(`${markerPrefix}${key}]`));
  expect(managed.length).toBe(1);
});

testIfDb("rollbackTemplateInstall removes templates created by kit install", async () => {
  const key = `footer-${randomUUID().slice(0, 8)}`;

  const install = await applyTemplateInstall({
    kitId,
    continueOnError: false,
    seeds: [
      {
        key,
        name: "Footer Blocks",
        category: "Layout",
        status: "published",
        blocks: [],
      },
    ],
  });

  const beforeRollback = await listWidgetTemplates();
  expect(
    beforeRollback.some((item) => item.description?.includes(`${markerPrefix}${key}]`))
  ).toBe(true);

  const rollback = await rollbackTemplateInstall({
    rollbackPlan: install.rollbackPlan,
    continueOnError: false,
  });

  expect(rollback.summary.failed).toBe(0);

  const afterRollback = await listWidgetTemplates();
  expect(
    afterRollback.some((item) => item.description?.includes(`${markerPrefix}${key}]`))
  ).toBe(false);
});
