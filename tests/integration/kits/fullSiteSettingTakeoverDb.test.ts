import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "../../../core/db/client";
import { forms, settings } from "../../../core/db/schema";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import {
  captureSetting,
  CLEANUP_FAILURE,
  cleanupOwnedIds,
  createOwnedIds,
  ownId,
  packageFixture,
  planPackage,
  restoreSetting,
  type PriorSetting,
} from "./fullSiteManagedOwnershipSupport";
const runSettingOwnershipCleanup = async (input: {
  owned: ReturnType<typeof createOwnedIds>;
  settingWriteStarted: boolean;
  settingKey: string;
  priorSetting: PriorSetting | null;
}): Promise<void> => {
  let cleanupFailed = false;
  try {
    await cleanupOwnedIds(input.owned);
  } catch {
    cleanupFailed = true;
  }
  if (input.settingWriteStarted) {
    try {
      await restoreSetting(input.settingKey, input.priorSetting);
    } catch {
      cleanupFailed = true;
    }
  }
  if (cleanupFailed) throw new Error(CLEANUP_FAILURE);
};
test("setting takeover is explicit and remains isolated from non-setting ownership", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-setting-${scope}`;
  const settingKey = "site.name";
  const slug = `ownership-setting-form-${scope}`;
  const owned = createOwnedIds();
  {
    const priorSetting = await captureSetting(settingKey);
    let settingWriteStarted = false;
    try {
      const formId = ownId(owned.forms);
      await db.insert(forms).values({
        id: formId,
        name: `Setting isolation ${scope}`,
        slug,
        status: "draft",
        settings: {},
      });
      settingWriteStarted = true;
      await db
        .insert(settings)
        .values({ key: settingKey, value: `Before ${scope}`, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: `Before ${scope}`, updatedAt: new Date() },
        });
      const ledger = createLegacyInstallLedger();
      const resolver = createFullSiteCurrentResourceResolver(packageKey, ledger);
      const settingOnly = packageFixture(packageKey, (resources) => {
        resources.settings.push({ key: settingKey, desired: { value: `After ${scope}` } });
      });
      await expect(planPackage(settingOnly, ledger, resolver)).rejects.toMatchObject({
        code: "site_package_conflict",
        identity: `setting:${settingKey}`,
      });
      const takeoverPlan = await planPackage(settingOnly, ledger, resolver, true);
      expect(takeoverPlan.operations[0]).toMatchObject({
        operation: "update",
        managedRunId: null,
        currentDesired: { value: `Before ${scope}` },
      });
      const mixed = packageFixture(packageKey, (resources) => {
        resources.forms.push({ key: "brief", desired: { slug } });
        resources.settings.push({ key: settingKey, desired: { value: `After ${scope}` } });
      });
      await expect(planPackage(mixed, ledger, resolver, true)).rejects.toMatchObject({
        code: "site_package_conflict",
        identity: "form:brief",
      });
    } finally {
      await runSettingOwnershipCleanup({
        owned,
        settingWriteStarted,
        settingKey,
        priorSetting,
      });
    }
  }
});
