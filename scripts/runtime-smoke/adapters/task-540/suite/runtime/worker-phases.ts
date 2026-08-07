import { WorkerProtocolError } from "../../../../workers/contracts";
import type { WorkerClient } from "../../../../workers/client";
import type { WorkerPool } from "../../../../workers/pool";

export async function closeTask540PrivilegedPhase(
  pool: WorkerPool,
  phaseClients: readonly WorkerClient[]
): Promise<void> {
  const uniqueClients = new Set(phaseClients);
  if (uniqueClients.size !== phaseClients.length) {
    throw new WorkerProtocolError("TASK-540 privileged phase client is duplicated");
  }
  const startsBeforeBoundary = pool.counters().starts;
  await pool.closePrivilegedProfiles();
  const absence = await Promise.all(phaseClients.map((client) => client.proveAbsent()));
  if (absence.some((proved) => !proved) || pool.counters().starts !== startsBeforeBoundary) {
    throw new WorkerProtocolError("TASK-540 privileged phase absence proof failed");
  }
}
