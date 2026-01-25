# Kanban Tasks - CronMind

Task board for project work. Keep task files and this board in sync.

## Workflow
1. Create a task file in `_docs/_TASKS/` using the format below.
2. Add the task to the **To Do** table and update **Statistics**.
3. Move to **In Progress** when work starts; update the task file status.
4. When complete, move to **Done**, update the task file status, and add a changelog entry.
5. Update any impacted docs after each task.

## Task file format
- File name: `TASK-XXX_Short_Title.md` (see `EXAMPLE_TASK.md`).
- Header lines:
  - `# TASK-XXX: Title`
  - `# FileName: TASK-XXX_Short_Title.md`
- Required fields: Priority, Category, Estimated Effort, Dependencies, Status.
- Required sections: Overview, Sub-Tasks, Testing Requirements, Documentation Updates Required.
- Optional sections: Architecture, Implementation Order, New Files to Create.

## Spec Coverage Checklist
- [ ] Idempotency (central): allowlist `/v1/cron/explain`, `/v1/cron/generate`, `/v1/cron/validate`; exclude `/v1/anon/session` and non-POST; cache bypass on idempotency.
- [ ] Request validation: timezone checks and `INVALID_TIMEZONE` mapping.
- [ ] NL parsing: unsupported input language -> translate to EN + `INPUT_TRANSLATED_TO_EN`.
- [ ] Overload logic: check `queue_depth`, `queue_wait_est`, and `cost_score`.
- [ ] Request limits: Content-Length, Content-Type, binary payloads, suspicious encodings.
- [ ] Observability: log fields (`request_id`, `job_id`, `plan`, `endpoint`, `lang`, `flavor`, `cache_hit`, `timings`, `error.code`) + metrics (queue depth/wait, cache hit ratio, model load time, translation success).

## Spec Coverage Examples
- Idempotency: allowlist configured in middleware/service; tests confirm `/v1/anon/session` is excluded and cache is bypassed on idempotency hit.
- Timezone validation: reject invalid IANA TZ with `INVALID_TIMEZONE`; unit test covers invalid input.
- NL fallback: when `lang` unsupported, translate to EN and add `INPUT_TRANSLATED_TO_EN` warning; test asserts warning.
- Overload: three independent checks for `queue_depth`, `queue_wait_est`, `cost_score`; tests cover each trigger.
- Request limits: reject binary payloads and suspicious encodings; tests send non-UTF8 bytes and expect 4xx.
- Observability: logs include required fields; metrics include queue depth/wait, cache hit ratio, model load time, translation success.

## Status rules
- Use: To Do, In Progress, Done.
- Include dates for In Progress/Done in the task file.
- Update **Statistics** and the appropriate table on every status change.

## Changelog link
- Every completed task must have a matching entry in `_docs/_CHANGELOG/` and list the task ID there.

## Statistics
- **To Do:** 0 tasks
- **In Progress:** 0
- **Done:** 0 tasks

---

## To Do

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|

---

## In Progress

*No tasks currently in progress*

---

## Done

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
