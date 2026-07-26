import {
  readBoundedFullSitePackage,
  runFullSiteCli,
  safeCliError,
} from "./projekty-domow/fullSiteCli";

try {
  await runFullSiteCli(process.argv.slice(2), {
    readPackage: readBoundedFullSitePackage,
    async apply(input) {
      const [
        { applyFullSitePackage },
        { defaultLegacyInstallLedger },
        { createFullSiteCurrentResourceResolver },
        { closeDatabase },
      ] = await Promise.all([
        import("../core/services/kits/fullSiteInstall/execute"),
        import("../core/services/kits/legacyInstallRunPersistence"),
        import("../core/services/kits/fullSiteInstall/currentResourceResolver"),
        import("../core/db/client"),
      ]);
      try {
        return await applyFullSitePackage(input, {
          ledger: defaultLegacyInstallLedger,
          resolveCurrentResource: createFullSiteCurrentResourceResolver(
            input.package.key,
            defaultLegacyInstallLedger
          ),
        });
      } finally {
        await closeDatabase();
      }
    },
    async rollback(input) {
      const [{ rollbackFullSiteInstall }, { defaultLegacyInstallLedger }, { closeDatabase }] =
        await Promise.all([
          import("../core/services/kits/fullSiteInstall/rollback"),
          import("../core/services/kits/legacyInstallRunPersistence"),
          import("../core/db/client"),
        ]);
      try {
        return await rollbackFullSiteInstall({
          ...input,
          ledger: defaultLegacyInstallLedger,
        });
      } finally {
        await closeDatabase();
      }
    },
    writeOutput: (value) => console.log(value),
  });
} catch (error) {
  console.error(safeCliError(error));
  process.exitCode = 1;
}
