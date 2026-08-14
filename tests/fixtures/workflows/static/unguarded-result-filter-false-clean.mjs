// FALSE-CLEAN negative fixture: agent results are Boolean-filtered and
// every()-classified BEFORE any identity validation, so a missing or nullish
// envelope silently disappears and the audit reads as clean. The static gate
// must reject this shape.
async function runAudit(jobs) {
  const results = await parallel(
    jobs.map((job) => async () => ({ identity: job.identity, value: await job.run() }))
  );
  // BUG: .filter(Boolean) before requireAllResults turns a missing result
  // into an invisible clean pass.
  const clean = results.filter(Boolean).every((result) => result.value.pass);
  if (clean) return { pass: true, summary: "clean", findings: [] };
  return { pass: false, summary: "blocked" };
}

export { runAudit };
