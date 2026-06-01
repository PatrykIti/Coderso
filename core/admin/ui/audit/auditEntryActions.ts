import { toast } from "sonner";

import { redactAuditPayload } from "../../../services/audit/auditRedaction";

import type { AuditLog } from "./types";

export type AuditClipboard = {
  writeText: (value: string) => Promise<void>;
};

export type PublicAuditEntryPayload = {
  id: string;
  event: string;
  category: AuditLog["category"];
  actor: AuditLog["actor"];
  resource: string;
  resourceLabel: string;
  status: AuditLog["status"];
  severity: AuditLog["severity"];
  createdAt: string;
  timestamp: string;
  requestId: string;
  description: string;
  payload: Record<string, unknown>;
};

const copySuccessMessage = "Audit entry JSON copied.";
const copyFailureMessage = "Failed to copy audit entry JSON.";
const clipboardUnavailableMessage = "Clipboard is unavailable in this browser.";

const resolveClipboard = (): AuditClipboard | null => {
  if (typeof navigator === "undefined") return null;
  if (!navigator.clipboard?.writeText) return null;
  return navigator.clipboard;
};

export function buildPublicAuditEntryPayload(entry: AuditLog): PublicAuditEntryPayload {
  return {
    id: entry.id,
    event: entry.event,
    category: entry.category,
    actor: entry.actor,
    resource: entry.resource,
    resourceLabel: entry.resourceLabel,
    status: entry.status,
    severity: entry.severity,
    createdAt: entry.createdAt,
    timestamp: entry.timestampLabel,
    requestId: entry.requestId,
    description: entry.description,
    payload: redactAuditPayload(entry.payload),
  };
}

export function stringifyPublicAuditEntryPayload(entry: AuditLog) {
  return JSON.stringify(buildPublicAuditEntryPayload(entry), null, 2);
}

export async function copyAuditEntryJson(
  entry: AuditLog,
  options: { clipboard?: AuditClipboard | null } = {}
) {
  const clipboard = Object.prototype.hasOwnProperty.call(options, "clipboard")
    ? options.clipboard
    : resolveClipboard();
  if (!clipboard) {
    toast.error(clipboardUnavailableMessage);
    return { ok: false, message: clipboardUnavailableMessage };
  }

  try {
    await clipboard.writeText(stringifyPublicAuditEntryPayload(entry));
    toast.success(copySuccessMessage);
    return { ok: true, message: copySuccessMessage };
  } catch {
    toast.error(copyFailureMessage);
    return { ok: false, message: copyFailureMessage };
  }
}
