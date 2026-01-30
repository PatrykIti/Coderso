import { randomUUID } from "node:crypto";

import type { SecuritySettings } from "../../services/settings/securitySettings";

export type RequestIdContext = {
  requestId: string;
  requestStart: number;
  headerName: string;
};

export function createRequestIdContext(
  config: SecuritySettings["requestId"]
): RequestIdContext | null {
  if (!config.enabled) return null;
  return {
    requestId: randomUUID(),
    requestStart: Date.now(),
    headerName: config.headerName,
  };
}
