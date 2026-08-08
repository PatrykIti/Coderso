import {
  readBoundedFullSitePackage,
  runFullSiteCli,
  safeCliError,
  type FullSiteCliDeps,
} from "./projekty-domow/fullSiteCli";

type FullSiteLoaderModules = {
  database: Pick<typeof import("../core/db/client"), "closeDatabase">;
  apply: Pick<
    typeof import("../core/services/kits/fullSiteInstall/execute"),
    "applyFullSitePackage"
  >;
  ledger: Pick<
    typeof import("../core/services/kits/legacyInstallRunPersistence"),
    "defaultLegacyInstallLedger"
  >;
  resolver: Pick<
    typeof import("../core/services/kits/fullSiteInstall/currentResourceResolver"),
    "createFullSiteCurrentResourceResolver"
  >;
  rollback: Pick<
    typeof import("../core/services/kits/fullSiteInstall/rollback"),
    "rollbackFullSiteInstall"
  >;
};

export type FullSiteLoaderImporter = <K extends keyof FullSiteLoaderModules>(
  key: K
) => Promise<FullSiteLoaderModules[K]>;

type FullSiteLoaderModuleFactories = {
  [K in keyof FullSiteLoaderModules]: () => Promise<FullSiteLoaderModules[K]>;
};

export type FullSiteLoaderSinks = Readonly<{
  readPackage: FullSiteCliDeps["readPackage"];
  writeOutput: FullSiteCliDeps["writeOutput"];
  writeError(line: string): void;
}>;

export type FullSiteLoaderDeps = FullSiteCliDeps & Readonly<{ writeError(line: string): void }>;

function createTypedImporter(factories: FullSiteLoaderModuleFactories): FullSiteLoaderImporter {
  return <K extends keyof FullSiteLoaderModules>(key: K): Promise<FullSiteLoaderModules[K]> =>
    factories[key]() as Promise<FullSiteLoaderModules[K]>;
}

type LoadedModuleTuple<K extends readonly (keyof FullSiteLoaderModules)[]> = {
  [I in keyof K]: K[I] extends keyof FullSiteLoaderModules ? FullSiteLoaderModules[K[I]] : never;
};

async function importModulesSettled<const K extends readonly (keyof FullSiteLoaderModules)[]>(
  importModule: FullSiteLoaderImporter,
  keys: K
): Promise<LoadedModuleTuple<K>> {
  const launched = keys.map((key) => Promise.resolve().then(() => importModule(key)));
  const settled = await Promise.allSettled(launched);
  const firstFailure = settled.find((result) => result.status === "rejected");
  if (firstFailure) throw firstFailure.reason;
  return settled.map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  }) as LoadedModuleTuple<K>;
}

async function withLoadedDatabase<T>(
  importModule: FullSiteLoaderImporter,
  execute: () => Promise<T>
): Promise<T> {
  const { closeDatabase } = await importModule("database");
  let outcome: Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: unknown }>;
  try {
    outcome = Object.freeze({ ok: true, value: await execute() });
  } catch (error) {
    outcome = Object.freeze({ ok: false, error });
  }
  let closeFailed = false;
  try {
    await closeDatabase();
  } catch {
    closeFailed = true;
  }
  if (!outcome.ok) throw outcome.error;
  if (closeFailed) throw new Error("site_package_cli_failed");
  return outcome.value;
}

async function applyWithImports(
  input: Parameters<FullSiteCliDeps["apply"]>[0],
  importModule: FullSiteLoaderImporter
): ReturnType<FullSiteCliDeps["apply"]> {
  return withLoadedDatabase(importModule, async () => {
    const [{ applyFullSitePackage }, { defaultLegacyInstallLedger }, resolver] =
      await importModulesSettled(importModule, ["apply", "ledger", "resolver"] as const);
    return applyFullSitePackage(input, {
      ledger: defaultLegacyInstallLedger,
      resolveCurrentResource: resolver.createFullSiteCurrentResourceResolver(
        input.package.key,
        defaultLegacyInstallLedger
      ),
    });
  });
}

async function rollbackWithImports(
  input: Parameters<FullSiteCliDeps["rollback"]>[0],
  importModule: FullSiteLoaderImporter
): ReturnType<FullSiteCliDeps["rollback"]> {
  return withLoadedDatabase(importModule, async () => {
    const [{ rollbackFullSiteInstall }, { defaultLegacyInstallLedger }] =
      await importModulesSettled(importModule, ["rollback", "ledger"] as const);
    return rollbackFullSiteInstall({
      sourceRunId: input.sourceRunId,
      actorId: input.actorId,
      ledger: defaultLegacyInstallLedger,
    });
  });
}

export function createFullSiteLoaderDeps(
  importModule: FullSiteLoaderImporter,
  sinks: FullSiteLoaderSinks
): FullSiteLoaderDeps {
  return Object.freeze({
    ...sinks,
    apply: (input) => applyWithImports(input, importModule),
    rollback: (input) => rollbackWithImports(input, importModule),
  });
}

export async function runLoadProjektyDomowMain(
  argv: readonly string[],
  deps: FullSiteLoaderDeps
): Promise<number> {
  try {
    await runFullSiteCli(argv, deps);
    return 0;
  } catch (error) {
    deps.writeError(safeCliError(error));
    return 1;
  }
}

const PRODUCTION_IMPORTER = createTypedImporter({
  database: () => import("../core/db/client"),
  apply: () => import("../core/services/kits/fullSiteInstall/execute"),
  ledger: () => import("../core/services/kits/legacyInstallRunPersistence"),
  resolver: () => import("../core/services/kits/fullSiteInstall/currentResourceResolver"),
  rollback: () => import("../core/services/kits/fullSiteInstall/rollback"),
});

const PRODUCTION_SINKS: FullSiteLoaderSinks = Object.freeze({
  readPackage: readBoundedFullSitePackage,
  writeOutput: (line) => console.log(line),
  writeError: (line) => console.error(line),
});

if (import.meta.main) {
  const deps = createFullSiteLoaderDeps(PRODUCTION_IMPORTER, PRODUCTION_SINKS);
  process.exitCode = await runLoadProjektyDomowMain(process.argv.slice(2), deps);
}
