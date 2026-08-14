// FALSE-CLEAN negative fixture: an agent-result collection is flattened and
// counted BEFORE any identity validation, so a partial or wrong-identity
// result set is classified clean. The static gate must reject this shape.
async function runPostAudit(lenses) {
  const results = await Promise.all(
    lenses.map((lens) => async () => ({ identity: `lens:${lens.key}`, value: await lens.run() }))
  );
  // BUG: flatMap + length before requireAllResults: a missing lens result
  // silently vanishes from the findings list.
  const findings = results.flatMap((result) => result.value.findings ?? []);
  if (findings.length === 0) return { pass: true, summary: "clean" };
  return { pass: false, summary: "blocked", findings };
}

export { runPostAudit };
