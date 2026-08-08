import { getMediaById } from "../media/mediaService";
import { mimeMatchesAccept } from "./mimeMatchesAccept";
import type { NormalizedFormField } from "./validation";

export type FormAttachmentMediaReference = Readonly<{
  id: string;
  mimeType: string;
  size: number;
}>;

export type FormAttachmentVerificationDeps = Readonly<{
  loadMediaByIds(ids: readonly string[]): Promise<readonly FormAttachmentMediaReference[]>;
}>;

const defaultVerificationDeps: FormAttachmentVerificationDeps = {
  loadMediaByIds: async (ids) => {
    const rows = await Promise.all(ids.map((id) => getMediaById(id)));
    return rows.flatMap((row) =>
      row ? [{ id: row.id, mimeType: row.mimeType, size: row.size }] : []
    );
  },
};

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
  payload: Record<string, unknown>,
  deps: FormAttachmentVerificationDeps = defaultVerificationDeps
): Promise<void> {
  const referencedIds = new Set<string>();
  for (const field of fields) {
    if (field.type !== "file" || !Object.hasOwn(payload, field.name)) continue;
    const value = payload[field.name];
    if (value === undefined) continue;
    for (const id of Array.isArray(value) ? (value as string[]) : [value as string]) {
      referencedIds.add(id);
    }
  }
  const mediaById = new Map(
    (await deps.loadMediaByIds([...referencedIds].sort())).map((row) => [row.id, row])
  );
  for (const field of fields) {
    if (field.type !== "file") continue;
    if (!Object.hasOwn(payload, field.name)) continue;
    const value = payload[field.name];
    if (value === undefined) continue; // optional & absent (validation already skipped it)

    const ids = Array.isArray(value) ? (value as string[]) : [value as string];
    for (const id of ids) {
      const row = mediaById.get(id);
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
