import { afterAll, beforeAll, expect, test } from "bun:test";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { settings } from "../../../core/db/schema";
import {
  applyFullSiteSettingsBatchAtomic,
  captureFullSiteSettingsBatchRaw,
  restoreFullSiteSettingsBatchRawAtomic,
  type FullSiteRawSettingState,
} from "../../../core/services/settings/fullSiteSettingsAtomicService";

const KEYS = ["site.locale", "site.name"] as const;
const dbTestTimeoutMs = 360_000;

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

type SettingRow = typeof settings.$inferSelect;
let rowsBeforeSuite: SettingRow[] = [];

beforeAll(async () => {
  if (!hasDb) return;
  rowsBeforeSuite = (
    await db
      .select()
      .from(settings)
      .where(inArray(settings.key, [...KEYS]))
  ).map((row) => ({
    ...row,
    value: structuredClone(row.value),
    updatedAt: new Date(row.updatedAt.getTime()),
  }));
}, dbTestTimeoutMs);

afterAll(async () => {
  if (!hasDb) return;
  await db.transaction(async (tx) => {
    await tx.delete(settings).where(inArray(settings.key, [...KEYS]));
    if (rowsBeforeSuite.length > 0) await tx.insert(settings).values(rowsBeforeSuite);
  });
}, dbTestTimeoutMs);

const present = (key: (typeof KEYS)[number], value: string): FullSiteRawSettingState => ({
  key,
  present: true,
  value,
});

testIfDb(
  "applies and restores one raw presence-aware batch with exact CAS",
  async () => {
    const before = await captureFullSiteSettingsBatchRaw(KEYS);
    const target = [
      present("site.locale", "  pl-PL  "),
      present("site.name", `Atomic-${crypto.randomUUID()}`),
    ] as const;

    await applyFullSiteSettingsBatchAtomic({ expectedCurrent: before, target });
    expect(await captureFullSiteSettingsBatchRaw(KEYS)).toEqual(target);

    await expect(
      applyFullSiteSettingsBatchAtomic({ expectedCurrent: before, target })
    ).rejects.toThrow("site_package_state_changed");
    expect(await captureFullSiteSettingsBatchRaw(KEYS)).toEqual(target);

    await restoreFullSiteSettingsBatchRawAtomic({
      expectedCurrent: target,
      target: before,
    });
    expect(await captureFullSiteSettingsBatchRaw(KEYS)).toEqual(before);
  },
  dbTestTimeoutMs
);

testIfDb(
  "rejects key-set drift and unsorted input before changing rows",
  async () => {
    const before = await captureFullSiteSettingsBatchRaw(KEYS);
    const reversed = [...before].reverse();
    await expect(
      restoreFullSiteSettingsBatchRawAtomic({
        expectedCurrent: reversed,
        target: reversed,
      })
    ).rejects.toThrow("settings_payload_invalid");
    await expect(
      restoreFullSiteSettingsBatchRawAtomic({
        expectedCurrent: before,
        target: [before[0]!],
      })
    ).rejects.toThrow("settings_payload_invalid");
    expect(await captureFullSiteSettingsBatchRaw(KEYS)).toEqual(before);
  },
  dbTestTimeoutMs
);

testIfDb(
  "trusted restore preserves an absent row without synthesizing its default",
  async () => {
    const before = await captureFullSiteSettingsBatchRaw(KEYS);
    const currentLocale = before[0]!;
    const absentLocale: FullSiteRawSettingState = {
      key: "site.locale",
      present: false,
    };
    await restoreFullSiteSettingsBatchRawAtomic({
      expectedCurrent: [currentLocale],
      target: [absentLocale],
    });
    expect(await captureFullSiteSettingsBatchRaw(["site.locale"])).toEqual([absentLocale]);
    await restoreFullSiteSettingsBatchRawAtomic({
      expectedCurrent: [absentLocale],
      target: [currentLocale],
    });
  },
  dbTestTimeoutMs
);
