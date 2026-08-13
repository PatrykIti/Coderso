import { expect, test } from "bun:test";

import {
  applySolutionKitInstall,
  appendInstallItem,
  buildManagedResourceEvidenceBatchQuery,
  buildManagedResourceEvidenceQuery,
  buildSummary,
  createInstallRun,
  createLegacyInstallLedger,
  defaultLegacyInstallLedger,
  finalizeInstallRun,
  findManagedResourceEvidence,
  findManagedResourceEvidenceBatch,
  getSolutionKitInstallRun,
  listSolutionKitInstallItems,
  listSolutionKitInstallRuns,
  MANAGED_EVIDENCE_LATERAL_REQUEST_LIMIT,
  normalizeItemRow,
  normalizeRunRow,
  resolveKitDefinition,
  resolveRollbackSourceRun,
  rollbackSolutionKitInstall,
  runFullSiteInstallTransactionLockLifecycle,
  withFullSiteInstallLocks,
  type FullSiteInstallLedgerPort,
  type FullSiteInstallResourceKind,
  type FullSiteInstallTransactionLock,
  type FullSiteInstallTransactionLockRuntime,
} from "../../../core/services/kits/legacyInstallRunPersistence";
import {
  FULL_SITE_PACKAGE_LOCK_NAMESPACE,
  withFullSiteInstallLocks as locksWithFullSiteInstallLocks,
} from "../../../core/services/kits/legacyInstallRunLocks";

const runtimeExports = [
  resolveKitDefinition,
  createInstallRun,
  appendInstallItem,
  listSolutionKitInstallRuns,
  getSolutionKitInstallRun,
  applySolutionKitInstall,
  resolveRollbackSourceRun,
  rollbackSolutionKitInstall,
  runFullSiteInstallTransactionLockLifecycle,
  withFullSiteInstallLocks,
  createLegacyInstallLedger,
  defaultLegacyInstallLedger,
  buildManagedResourceEvidenceBatchQuery,
  buildManagedResourceEvidenceQuery,
  buildSummary,
  findManagedResourceEvidence,
  findManagedResourceEvidenceBatch,
  listSolutionKitInstallItems,
  MANAGED_EVIDENCE_LATERAL_REQUEST_LIMIT,
  normalizeItemRow,
  normalizeRunRow,
  finalizeInstallRun,
] as const;

test("every pre-split runtime export is still importable from legacyInstallRunPersistence", () => {
  for (const exported of runtimeExports) {
    expect(exported, "export must be defined").toBeDefined();
  }
});

test("withFullSiteInstallLocks is re-exported from the extracted locks module", () => {
  expect(withFullSiteInstallLocks).toBe(locksWithFullSiteInstallLocks);
  expect(FULL_SITE_PACKAGE_LOCK_NAMESPACE).toBe(547);
});

test("ledger composition binds the re-exported lock holder", async () => {
  const ledger = createLegacyInstallLedger();
  expect(ledger.withPackageLock).toBe(withFullSiteInstallLocks);
});

test("pre-split type exports remain available", () => {
  const types: readonly unknown[] = [
    undefined as unknown as FullSiteInstallLedgerPort | undefined,
    undefined as unknown as FullSiteInstallResourceKind | undefined,
    undefined as unknown as FullSiteInstallTransactionLock | undefined,
    undefined as unknown as FullSiteInstallTransactionLockRuntime | undefined,
  ];
  expect(types).toHaveLength(4);
});
