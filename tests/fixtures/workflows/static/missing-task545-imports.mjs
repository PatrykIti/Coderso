// REJECTED live-tree fixture: an implement workflow that dispatches agents
// with zero canonical TASK-545 driver imports (workflow-contracts,
// audit-rounds, post-audit) and no exact-identity legacy guard. It cannot be
// repaired by comments or by a numeric safety marker: the static gate only
// accepts a real import + call or the exact identity-guarded machinery.
async function runWorkflow() {
  const gate = await agent("gate", { schema: RESULT_SCHEMA });
  if (!gate.pass || gate.errors.length > 0) throw new Error("task_gate_failed");
  const lensChecks = await parallel(
    LENSES.map((lens) => async () => ({
      identity: lens,
      value: await agent(lens, { schema: RESULT_SCHEMA }),
    }))
  );
  // Unguarded: a nullish check disappears before any identity validation.
  if (lensChecks.filter((check) => check && check.value.pass).length !== LENSES.length) {
    throw new Error("task_post_audit_not_clean");
  }
  return { pass: false, ownerActionRequired: "owner_review" };
}

export { runWorkflow };
