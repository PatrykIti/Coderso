import { getMediaById } from "../media/mediaService";
import { mimeMatchesAccept } from "./mimeMatchesAccept";
import type { NormalizedFormField } from "./validation";

/**
 * DB-backed security backstop (TASK-516-07). Runs AFTER the sync
 * `validateSubmissionPayload` (which only structurally normalizes the value into an
 * owned-media-id reference). For every `file` field it:
 *   - resolves each stored id against the media table via `getMediaById`,
 *   - rejects unknown/cross-origin ids (missing row) as `form_payload_invalid`,
 *   - re-checks the resolved row's `mimeType` against the field `accept` (shared
 *     `mimeMatchesAccept` predicate) and `size` against `maxSizeMb`.
 *
 * This is defence-in-depth: per-field limits hold even if the upload path was bypassed.
 * Kept out of `validateSubmissionPayload` so that function stays SYNC (it has many
 * callers); the `await getMediaById(...)` work lives here, invoked by `submitForm`.
 */
export async function verifyFileReferences(
  fields: NormalizedFormField[],
  payload: Record<string, unknown>
): Promise<void> {
  for (const field of fields) {
    if (field.type !== "file") continue;
    const value = payload[field.name];
    if (value === undefined) continue; // optional & absent (validation already skipped it)

    const ids = Array.isArray(value) ? (value as string[]) : [value as string];
    for (const id of ids) {
      const row = await getMediaById(id);
      if (!row) throw new Error("form_payload_invalid"); // unknown / cross-origin id
      if (!mimeMatchesAccept(row.mimeType, field.settings.accept)) {
        throw new Error("form_payload_invalid");
      }
      if (
        field.settings.maxSizeMb !== undefined &&
        row.size > field.settings.maxSizeMb * 1024 * 1024
      ) {
        throw new Error("form_payload_invalid");
      }
    }
  }
}
