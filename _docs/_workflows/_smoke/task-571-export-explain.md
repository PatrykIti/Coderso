# TASK-571 EXPLAIN evidence: bounded export keyset scan

- Query: `SELECT id, created_at, status, payload FROM form_submissions WHERE form_id = $1 ... ORDER BY created_at DESC, id DESC LIMIT $2`
- Serving index: `form_submissions_export_cursor_idx (form_id, created_at DESC, id DESC)` (migration 0075)
- Data: SYNTHETIC fixtures only (no real submissions). Cleaned up after capture.
- Date: 2026-08-18T01:08:11.357Z

## small (2,000 rows) - first page

- Index scan used: YES
- Execution time: 0.858 ms

```
Limit  (cost=0.42..2.64 rows=1 width=130) (actual time=0.017..0.752 rows=2000.00 loops=1)
  Buffers: shared hit=79
  ->  Index Scan using form_submissions_export_cursor_idx on form_submissions  (cost=0.42..2.64 rows=1 width=130) (actual time=0.016..0.563 rows=2000.00 loops=1)
        Index Cond: (form_id = 'fe0c4be1-3130-4179-b9b3-ec709273c764'::uuid)
        Index Searches: 1
        Buffers: shared hit=79
Planning:
  Buffers: shared hit=6
Planning Time: 0.197 ms
Execution Time: 0.858 ms
```

## large (100,000 rows) - first page

- Index scan used: YES
- Execution time: 1.601 ms

```
Limit  (cost=0.42..2.64 rows=1 width=130) (actual time=0.025..1.382 rows=5000.00 loops=1)
  Buffers: shared hit=197
  ->  Index Scan using form_submissions_export_cursor_idx on form_submissions  (cost=0.42..2.64 rows=1 width=130) (actual time=0.024..1.012 rows=5000.00 loops=1)
        Index Cond: (form_id = 'dd446397-85ac-4208-838e-62b6e954904f'::uuid)
        Index Searches: 1
        Buffers: shared hit=197
Planning Time: 0.148 ms
Execution Time: 1.601 ms
```

## large (100,000 rows) - deep cursor page (created_at=2026-01-01 11:06:39, id=d195f55f-dd26-4663-99d4-443a59851327)

- Index scan used: YES
- Execution time: 10.649 ms

```
Limit  (cost=0.42..2.65 rows=1 width=130) (actual time=8.985..10.409 rows=5000.00 loops=1)
  Buffers: shared hit=2508
  ->  Index Scan using form_submissions_export_cursor_idx on form_submissions  (cost=0.42..2.65 rows=1 width=130) (actual time=8.984..10.052 rows=5000.00 loops=1)
        Index Cond: (form_id = 'dd446397-85ac-4208-838e-62b6e954904f'::uuid)
        Filter: ((created_at < '2026-01-01 11:06:39'::timestamp without time zone) OR ((created_at = '2026-01-01 11:06:39'::timestamp without time zone) AND (id < 'd195f55f-dd26-4663-99d4-443a59851327'::uuid)))
        Rows Removed by Filter: 60001
        Index Searches: 1
        Buffers: shared hit=2508
Planning Time: 0.138 ms
Execution Time: 10.649 ms
```
