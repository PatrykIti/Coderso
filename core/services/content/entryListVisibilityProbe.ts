// core/services/content/entryListVisibilityProbe.ts
// TASK-572: narrow authoritative visibility signature for auto entry-LIST routes.
//
// A list route is cacheable for ANONYMOUS visitors only (the shared body is the
// public-only render). The cache key carries a visibility signature derived from
// the content type's CURRENT published restricted (private|password) entry set:
//   - when the restricted set is stable, the signature is stable, so anonymous
//     list caching keeps working exactly as TASK-517-03 requires (a public list
//     alongside visibility-stable restricted siblings still caches);
//   - the signature changes the instant the restricted set changes — a
//     public→restricted (or restricted→public) transition lands on a NEW cache
//     key, so the stale anonymous body is never served and no TTL invalidation
//     is relied upon (fail-closed transition fence).
//
// The signature is a digest over the SORTED restricted published entry ids, so
// it is deterministic across requests and changes on any membership change of
// that set. A content type with more than ENTRY_LIST_VISIBILITY_SIGNATURE_CAP
// restricted entries returns the GATED sentinel instead: the shared list body
// cache is disabled entirely for it (the digest could not be trusted as exact,
// so caching is the fail-closed choice). Unpublish/publish or title edits of
// public entries do not change the restricted set — those stay normal
// TTL-bounded public-content staleness, exactly like TASK-517-03's rename test.
//
// Deliberately memoization-FREE and auth-independent, mirroring the gated-detail
// probe (`entryRouteIsGated`): a memoized "all public" verdict would go stale on
// a visibility mutation → fail-open.
import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { contentEntries } from "../../db/schema";
import { isPostContentTypeSlug } from "../posts/runtime/postBlockRuntimeMapper";
import type { ContentRouteMatch } from "../../site/contentRouteMatcher";
import { getContentTypeBySlug } from "./typeService";

/**
 * Sentinel returned when the restricted published set exceeds the bounded
 * signature cap: the shared list body cache is disabled for that content type
 * (the exact digest cannot be computed from a bounded read, so caching would
 * risk serving a body whose visibility state is unknowable).
 */
export const ENTRY_LIST_CACHE_GATED = "__entry_list_cache_gated__";

/** Hard cap so the signature read stays bounded even on pathological content. */
export const ENTRY_LIST_VISIBILITY_SIGNATURE_CAP = 100;

/**
 * Returns the visibility signature segment for the list route's cache key.
 * "" when the route is not a list / is a post slug / has no content type /
 * currently holds NO published restricted entries (stable all-public state —
 * key stays byte-identical to the pre-fence format). A digest over the sorted
 * restricted published entry ids otherwise; ENTRY_LIST_CACHE_GATED when the
 * restricted set is too large to trust an exact digest.
 *
 * Bounded single indexed read over the (type_id, status) index prefix; never
 * selects entry data, author, or accessPassword columns.
 */
export const entryListVisibilitySignature = async (match: ContentRouteMatch): Promise<string> => {
  if (match.mode !== "list") return "";
  if (isPostContentTypeSlug(match.type)) return "";
  const contentType = await getContentTypeBySlug(match.type);
  if (!contentType) return "";

  const rows = await db
    .select({ id: contentEntries.id })
    .from(contentEntries)
    .where(
      and(
        eq(contentEntries.typeId, contentType.id),
        eq(contentEntries.status, "published"),
        inArray(contentEntries.visibility, ["private", "password"])
      )
    )
    .orderBy(contentEntries.id)
    .limit(ENTRY_LIST_VISIBILITY_SIGNATURE_CAP + 1);

  if (rows.length === 0) return "";
  if (rows.length > ENTRY_LIST_VISIBILITY_SIGNATURE_CAP) return ENTRY_LIST_CACHE_GATED;
  const digest = createHash("sha256")
    .update(rows.map((row) => row.id).join(","))
    .digest("hex");
  return `v1:${digest}`;
};
