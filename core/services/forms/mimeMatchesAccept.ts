/**
 * Dependency-free leaf predicate (TASK-516-07). Imports NOTHING — it takes only
 * `(mime, accept)` primitives. This is the SINGLE wildcard-matching authority shared
 * by BOTH the media-layer upload check (`mediaService.uploadMedia` field constraint)
 * AND the forms submission backstop (`formAttachment.verifyFileReferences`). Housing it
 * here (NOT in `formAttachment.ts`, which imports `getMediaById` from `mediaService`)
 * is what BREAKS the would-be `mediaService` <-> `formAttachment` cycle: both import
 * this leaf, and neither imports the other.
 *
 * Asymmetric by design: only the `accept` entries may be wildcards (`image/*`). It is
 * applied to the ACTUAL uploaded/resolved mime, never to intersect two allowlists.
 */
export function mimeMatchesAccept(mime: string, accept?: string[]): boolean {
  if (!accept || accept.length === 0) return true; // no field restriction
  const m = mime.trim().toLowerCase();
  if (!m) return false;
  return accept.some((entry) => {
    const a = entry.trim().toLowerCase();
    if (!a) return false;
    if (a.endsWith("/*")) return m.startsWith(a.slice(0, -1)); // "image/*" -> "image/"
    return a === m;
  });
}
