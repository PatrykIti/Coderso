/**
 * Public site render context (V2).
 *
 * TASK-580-04: the v1 per-type block hydration kernel (`hydrateRuntimeBlocks`,
 * `hydrateRuntimeBlock`, and every v1 `normalize*Data` branch) was deleted
 * together with `core/widgets/**`. The public entry-detail path renders
 * exclusively through Page V2, which prepares its own runtime data via
 * `pageRuntimeDataPreparation.ts` (S3-owned). This module keeps only the
 * shared helpers the V2 render chain still consumes.
 */
export { buildPublicDocumentShell, escapeHtmlAttribute } from "../site/publicDocumentShell";

export const ensureRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};
