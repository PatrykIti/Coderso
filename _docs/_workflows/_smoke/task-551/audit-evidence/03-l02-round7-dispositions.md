# TASK-551-03-L02 — Round-7 dispositions (orchestrator record, 2026-09-26)

Source: Round-6 auditors (S1-A 0/0/2, S1-B 0/1/2, S2-A 1/5/4, S2-B 1/3/5, S3-A 0/2/3; S3-B died on
the session limit and was re-run as part of the same pair). Every anchor below was verified by the
orchestrator: `git diff -U0 HEAD` shows exactly one hunk `@@ -6985,0 +6986,751 @@` (fence
byte-identical), `wc -c` = 573,282; `git ls-files 11-reopen/` is empty (so the V7-1 ".gitignore is
tracked" sentence is superseded by 11 V8-1 and the S3-A LOW about an exact path is NOT adopted);
postsClient.ts:293 is the only advancer of `postsCacheAuthorityEpoch` and :334 broadcasts
`postsList` inside settle; pagesClient.ts:340-341 patches then broadcasts; cacheBus.ts:151-153
delivers local handlers synchronously; the R5 layout effect at :6782 has deps `[o.fetchPage]`.

R7-01 (HIGH S2-A/S2-B) Posts subscription vs TASK-554. The posts lazy subscription NEVER calls
`clearPostsCache` and never advances `postsCacheAuthorityEpoch`. Posts cursor/hook pages get their
own list-only `postsInvalidationEpoch` (advanced by the subscription's `invalidate` and by
`clearPostsCache`); memory entries are marked stale and `readPostsListPage` resolves `superseded`;
the TASK-554 ticket/epoch paths and `listPostsCached` stay byte-identical. Pinned test: with the
subscription installed by a prior `readPostsListPage`, `postsClientCacheAuthority.test.ts`
:725-750 and :769-781 pass unmodified. The posts registered reset (calls `clearPostsCache`) also
clears the posts per-key maps and unsubscribes; `clearPostsCache` alone leaves the per-key maps.
R7-02 (MED S2-A; LOW S2-B) Self-emitted events. A client's `invalidate` IGNORES the event it emits
itself right after patching (module-local `emitting` flag set around `broadcastCacheEvent`, or the
cacheBus operation token — writer picks one and pins it); the patched slot and memory stay; only
foreign/remote events clear the slot. List the affected getCached*/hydration pins (mediaClient
:498-516, pagesClient merge, entries/forms/booking suites) and state they stay green.
R7-03 (MED S2-A/S2-B; security row) One layout effect
`useLayoutEffect(() => { io.current = o.fetchPage; mapItemsRef.current = o.mapItems;
listKeyRef.current = o.listKey; }, [o.fetchPage, o.mapItems, o.listKey])`; `const fetchKey =
o.listKey.fetchKey`; `keyRef = useRef(o.listKey.fetchKey)`; quote :6782-6784 as superseded; H19
variant with a stable module-level `fetchPage` whose `listKey` changes (two custom screens over one
content type never exchange `fieldFilter.*`).
R7-04 (MED S2-A/S3-A) Superseded quotes added verbatim with anchors: :6724, :6728 (→ R6-03
`stale`/`slotKey`), :6754 (→ R6-03 `loaded` row, "other entries are kept"), :6766 and :6769-6773
(→ R6-04 runRequest over the discriminated type), :6782-6784 (→ R7-03), :6816-6817 (→ per-instance
slotKey map), :5256 (→ `CachedAdminListPage` with `fetchedAtEpoch`), :5303 + the 3-argument
`readVerifiedAdminListPage` at :3954/:5315 (→ 4-argument form; every getCached*/hydrate call
passes `"hydrate"`, network-path hits pass the client's `invalidationEpoch`), :2760-2762 F-40
(→ R7-06), R5 H9 :6841 "independent of N" (→ R7-07), R5-12 :6937-6938 and :6946 (→ R7-08).
R7-05 (MED S2-A) Test applicability matrix (test × client: pages, posts cursor pages, entries,
forms, media, booking per family, users, detail pages) with a per-cell expected outcome or
"n/a (reason)" replaces "test.each over the seven client rows"; posts: `clearPostsCache` clears
memory pages (not stale) and its page maps survive; users: no slot, no subscription.
R7-06 (MED S2-A; LOW S2-B) F-40's media subscription is SUBSUMED by the single R6 media lazy
subscription (folder events run `invalidateMediaList`, which clears summary/facet families AND
advances `mediaInvalidationEpoch`); re-pin "folder rename then facet refresh" under the two-counter
model.
R7-07 (MED S2-B) Bound per mode. Paged: ≤ 2 forced reads per event. Append: one `superseded` page
does NOT restart the chain immediately — it sets `revalidateQueued`; the chain ends at that page
(rows kept), and ONE re-run from `null` at depth d follows when the chain settles, so a storm of N
invalidations during a depth-d chain costs ≤ 2 × d fetches (independent of N). H9 stays valid under
this rule (its "independent of N" sentence is restated, not withdrawn, once the rule is written);
add a storm row with real client invalidations during a depth-3 chain.
R7-08 (MED S3-A) The INITIAL/FINAL root-tsc baselines move out of `audit-evidence/` to
`_docs/_workflows/_smoke/task-551/03-l02-baselines/03-l02-root-tsc-baseline{,-final}.txt`; R5-12
`FAMILY_RECEIPT_EXACT_PATHS` entries updated (owner 03-L02); Handoffs row "TASK-551-11. Nothing
owed." replaced by: (a) the 11 V7-1 relocation obligation for the orchestrator's
`audit-evidence/03-l02-round{2..7}-dispositions.md` files before 10-L02 closure (owner: orchestrator
follow-up, cited from 03-L02), (b) the V11-2 `./`-prefixed argv rule adopted for every Round-6/7 gate
that names `tests/unit/workflows/*.test.ts`.
R7-09 (MED S1-B) RUN shape pinned: `const RUN = randomUUID();` (bare lowercase UUID) and a separate
`const MARKER = \`t551-03l02-write-${RUN}\`` for slugs/emails; overrides the prefixed `:118` idiom
(:2944) for this suite only; `bookingLegWindows` throws `Error("booking_leg_run_invalid")` unless
`run` matches `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`; DB-free vector
`bookingLegWindows("task551-x")` throws.
R7-10 (LOW S1-A/S1-B) R3-03 citations → R4-01 "What stands" (`:5959-5962`) / "(R5-02 stands)" /
comment "(R4-01, R5-02)"; leg (a)/(b) written as `[reactivation.from, reactivation.from + 1 h)` and
`[reactivation.from + 2 h, reactivation.from + 3 h)`; DB-free test adds "every leg timestamp lies
inside its declared window"; heading "Five pairwise-disjoint booking windows (four + the R4-01
lock-wait window)"; bounded precondition read for global blackouts overlapping `blackout` (fails
with an explicit message); "owner DB" → "the suite's `db` client (`<db-env>` `DATABASE_URL`)".
R7-11 (LOW S3-A) R6-08 state refreshed: column "Today (step 4 in flight, sha_3 `420bb24a`)";
`task551WorkflowContracts.test.ts:126-131`; `task-551-phase-provenance.mjs:116-121`; "steps 1-3
committed (`03d42b90`, `66203e22`, `420bb24a`); step 4 in flight; 5-7 pending; receipt absent";
S3-A LOW about `11-reopen/.gitignore` NOT adopted (V8-1 supersedes V7-1; `git ls-files` empty).
R7-12 (LOW S2-A/S2-B) Detail pages: unconditional eighth row (`clearDetailPagesCache()` :188,
`clearDetailPageListCache(contentTypeId?)` :176, predicate `.startsWith(cacheKeys.detailPagesList)`,
own generation + epoch) and matrix column. H21 rewritten: one event first (familyEpoch 1), record
257 slots with `next`, no further event, walk back with `previous`: retained slots `force: false`,
the evicted oldest `force: true`; 256-slot control. Private-state pins restated as observables
(overtaken read resolves through the newer result, never `admin_list_overtake_invariant`; H20 via
`force: true` on a pre-event slot). Event-order "view-first gives two" names its harness (a
pre-registered subscriber that calls `list<X>PageCached(..., { force: true })` synchronously) and
pins that the superseded re-run is `issue(...)` after `familyEpoch + 1` (pending.epoch = new
familyEpoch). Own-mutation slot clearing is closed by R7-02.
R7-13 (INFO) Quote 1 label → C8; V3-5 range → `:1103-1106`; one Envelope-record sentence that the
R6-08 paths are TASK-551-11-owned and outside this envelope. R6-06 figure 573,282 confirmed.

Envelope: no fence edit expected. `03-l02-baselines/` files are orchestrator evidence (not
allowlisted paths); if the writer finds a NEW allowlisted path is needed, report it — do not edit.

## Addendum (2026-09-26, after the Round-7 write): the resumed S3-B Round-6 result (agent ab3f219fcc80f79d9)
Missed at dispatch time (the first S3-B died on the session limit; the resumed one returned after the Round-7 dispositions were written). Its 2 MEDIUM + 3 LOW are dispositioned into Round 8 (with whatever the Round-7 audit adds): R8-a the Round-6/7 handoffs heading becomes a `C17 v5` heading (10-L02's copy authority greps `C17 v`, 10-L02 :1628-1633) with "C17 v4 stands except where quoted"; R8-b R6-05 FINAL precondition: the owner commits the INITIAL closure state before FINAL's `preWaveCommit`; a non-empty allowlist status STOPs (never captures); "meets the same rule by construction" corrected; R8-c C17 v4 :6570-6573 (TASK-551-11 owed; ≤ 1,300; ≤ 999) quoted as superseded (11 now `NR > 2000` + frozen ceilings); R8-d an informational 09-L04 handoff row. The Round-7 writer's own refinements (self-emit guard `createAdminListSelfEmitGuard`/`ownMutationEpoch()`; `readPostsListPage` via `listPostsCached(filters, { force: true })` + `postFirstPageEpochs`, memory entries from the TASK-554 path `fetchedAtEpoch: 0`; append `superseded` folded into ONE chain of depth min(stack+1, 20); `03-l02-faza0-dispositions.md` added to the relocation obligation; the `owned-module-consumers-bun` bare path handled by an orchestrator `find` precondition) go to the Round-7 auditors as items to verify.
