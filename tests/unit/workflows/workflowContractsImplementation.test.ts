import { describe, expect, test } from "bun:test";

import {
  TASK551_DURABLE_EVIDENCE_MANIFEST,
  TASK551_PHASE_CLOSED_ALLOWLIST,
  buildTask55105L02PromotionAtNamedSeam,
  requireTask551L02CodeTestMaterializationClosureV1,
  requireTask551RecordedL02MaterializationForWorkflow,
  writeTask551EvidenceFileIfAbsent,
} from "../../../_docs/_workflows/lib/task-551-contract.mjs";
import {
  deriveTask551ImplementLandOrder,
  runTask551ImplementWorkflow,
  runTask551ImplementWorkflowForTests,
} from "../../../_docs/_workflows/task-551-implement.mjs";
import {
  type Worktree,
  clearEvidencePreflight,
  evidenceDigest,
  freezeTestValue,
  sha,
  shaBytes,
  worktree,
} from "./task551WorkflowContractsFixtures.js";
import {
  executionFixture,
  l02ExecutionFixture,
  l02ProcessReceipt,
  l03CheckEvidence,
  readyTask489Fixture,
  task489CommitA,
  task489DeferredFiles,
  task489Handoff,
  task489Temporary,
  task489TerminalOutcome,
  task489Worktrees,
  withTask489Temporary,
} from "./task551WorkflowExecutionFixtures.js";

describe("TASK-551 implementation workflow", () => {
  test("disposes every L03 source before child await with no post-disposal access", async () => {
    const fixture = await executionFixture("TASK-551-01-L03:single"),
      [node] = deriveTask551ImplementLandOrder(fixture.dispatch, ["TASK-551-01-L03:single"]);
    const closed = TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!,
      bundle = l03CheckEvidence();
    const before = worktree({ taskFileDigests: fixture.snapshot.taskFileDigests, absent: closed }),
      after = worktree({ taskFileDigests: fixture.snapshot.taskFileDigests, deltaPaths: closed });
    let current = before,
      sourceAccessCount = 0,
      sourceDisposed = false,
      postDisposeViolations = 0,
      supplierCalls = 0,
      disposalCalls = 0,
      sourceGateAwaits = 0;
    const disposed = new WeakSet<object>();
    const sourceFor = (operation: string) => {
      const source = {};
      Object.defineProperty(source, "snapshot", {
        enumerable: true,
        get: () => {
          sourceAccessCount += 1;
          if (disposed.has(source)) {
            postDisposeViolations += 1;
            throw new Error("source-disposed");
          }
          return operation;
        },
      });
      return Object.freeze(source);
    };
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [node!.id],
      phase: "l03",
      testExecutionSession: fixture.session,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = after;
        return { changedPaths: closed };
      },
      phaseSourceProvider: async ({ operation }: { operation: string }) => {
        supplierCalls += 1;
        return sourceFor(operation);
      },
      phaseChildStarter: ({
        operation,
        source,
      }: {
        operation: string;
        source: { snapshot: string };
      }) => {
        expect(source.snapshot).toBe(operation);
        return Object.freeze({});
      },
      phaseResourceDisposer: ({ source }: { source: object }) => {
        disposed.add(source);
        disposalCalls += 1;
        sourceDisposed = true;
      },
      gateRunner: async ({ gate }: { gate: { kind: string; requiresSource?: boolean } }) => {
        if (gate.requiresSource) {
          const expected = sourceGateAwaits + 1;
          expect(disposalCalls).toBe(expected);
          expect(sourceDisposed).toBe(true);
          await Promise.resolve();
          sourceGateAwaits = expected;
          expect(disposalCalls).toBe(expected);
        }
        return {
          exitCode: 0,
          signalCode: null,
          timedOut: false,
          overflowed: false,
          discoveredTestCount: gate.kind === "test" ? 1 : null,
        };
      },
      evidenceByPhase: {
        l03: [
          {
            manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[0]!,
            value: {
              schema: TASK551_DURABLE_EVIDENCE_MANIFEST[0]!.schema,
              taskId: "TASK-551-01-L03",
              phase: "l03-initialize",
              pass: true,
              noLeak: true,
              commandReceipt: l02ProcessReceipt(),
            },
          },
          { manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[1]!, value: bundle.value },
        ],
      },
      evidenceWriter: async ({
        manifestRow,
        value,
      }: {
        manifestRow: { path: string; phase: string };
        value: unknown;
      }) => {
        const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
        return Object.freeze({
          path: manifestRow.path,
          phase: manifestRow.phase,
          digest: `sha256:${shaBytes(bytes)}`,
          bytes: bytes.byteLength,
          action: "committed_no_replace",
        });
      },
    });
    expect(result.pass).toBe(true);
    expect({ sourceAccessCount, sourceDisposed, postDisposeViolations }).toEqual({
      sourceAccessCount: 2,
      sourceDisposed: true,
      postDisposeViolations: 0,
    });
    expect({ supplierCalls, disposalCalls, sourceGateAwaits }).toEqual({
      supplierCalls: 2,
      disposalCalls: 2,
      sourceGateAwaits: 2,
    });
  });

  test("preflights the generic fixer immediately before its injected invocation", async () => {
    const fixture = await executionFixture("TASK-551-01-L03:single"),
      closed = TASK551_PHASE_CLOSED_ALLOWLIST.get("l03")!;
    let current = worktree({ taskFileDigests: fixture.snapshot.taskFileDigests, absent: closed });
    let preflightCount = 0,
      preflightCountAtFix = 0;
    const result = await runTask551ImplementWorkflowForTests({
      authorAuditDispatch: fixture.dispatch,
      scheduledOccurrenceIds: [fixture.node.id],
      phase: "l03",
      testExecutionSession: fixture.session,
      maxFixRounds: 1,
      currentWorktreeSnapshotProvider: async () => current,
      leafDispatcher: async () => {
        current = worktree({
          taskFileDigests: fixture.snapshot.taskFileDigests,
          deltaPaths: closed,
        });
        return { changedPaths: closed };
      },
      phaseSourceProvider: async () => Object.freeze({}),
      phaseChildStarter: () => Object.freeze({}),
      phaseResourceDisposer: () => undefined,
      gateRunner: async ({ gate }: { gate: { kind: string } }) => ({
        exitCode: 1,
        signalCode: null,
        timedOut: false,
        overflowed: false,
        discoveredTestCount: gate.kind === "test" ? 1 : null,
      }),
      evidencePreflight: async () => {
        preflightCount += 1;
        return clearEvidencePreflight;
      },
      fixAgent: async () => {
        preflightCountAtFix = preflightCount;
        return { status: "error" };
      },
      evidenceByPhase: {
        l03: [
          {
            manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[0]!,
            value: {
              schema: TASK551_DURABLE_EVIDENCE_MANIFEST[0]!.schema,
              taskId: "TASK-551-01-L03",
              phase: "l03-initialize",
              pass: true,
              noLeak: true,
              commandReceipt: l02ProcessReceipt(),
            },
          },
          { manifestRow: TASK551_DURABLE_EVIDENCE_MANIFEST[1]!, value: l03CheckEvidence().value },
        ],
      },
      evidenceWriter: async ({
        manifestRow,
        value,
      }: {
        manifestRow: { path: string; phase: string };
        value: unknown;
      }) => {
        const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
        return Object.freeze({
          path: manifestRow.path,
          phase: manifestRow.phase,
          digest: `sha256:${shaBytes(bytes)}`,
          bytes: bytes.byteLength,
          action: "committed_no_replace",
        });
      },
    });
    expect(result.pass).toBe(false);
    expect(preflightCountAtFix).toBe(3);
  });

  test("keeps the public executor closed to a test-only audit permit", async () => {
    const fixture = await l02ExecutionFixture();
    await expect(
      runTask551ImplementWorkflow({
        authorAuditDispatch: fixture.dispatch,
        scheduledOccurrenceIds: [fixture.node.id],
      })
    ).rejects.toThrow(/author_audit_dispatch_untrusted/);
  });

  test("rejects injected terminal evidence before the 05-L02 producer can write", async () => {
    const fixture = await readyTask489Fixture();
    let writes = 0;
    await expect(
      runTask551ImplementWorkflowForTests({
        authorAuditDispatch: fixture.dispatch,
        scheduledOccurrenceIds: [fixture.node.id],
        phase: "05-l02",
        testExecutionSession: fixture.session,
        currentWorktreeSnapshotProvider: async () =>
          worktree({
            taskFileDigests: fixture.snapshot.taskFileDigests,
            extra: task489DeferredFiles(),
          }),
        leafDispatcher: async () => ({ changedPaths: [task489Temporary] }),
        gateRunner: async () => ({
          exitCode: 0,
          signalCode: null,
          timedOut: false,
          overflowed: false,
          discoveredTestCount: 1,
        }),
        runtimeOutputObserver: async () => [task489Temporary],
        evidenceByPhase: { "05-l02": [] },
        evidenceWriter: async () => {
          writes += 1;
          return {} as never;
        },
        commitAObserver: async () => task489CommitA("c".repeat(40)),
        terminalFenceObserver: async () => ({}),
      })
    ).rejects.toThrow(/terminal_evidence_injected/);
    expect(writes).toBe(0);
  });

  test("runs the four 05-L02 outcomes, then parses once and writes row ten before row eleven", async () => {
    await withTask489Temporary(async (sourceBytes) => {
      const fixture = await readyTask489Fixture(),
        { before, after } = task489Worktrees(fixture, sourceBytes),
        writes: Array<{ path: string; bytes: Uint8Array }> = [],
        values: unknown[] = [],
        events: string[] = [];
      let current: Worktree = before,
        terminalCalls = 0;
      expect(() =>
        requireTask551L02CodeTestMaterializationClosureV1(
          requireTask551RecordedL02MaterializationForWorkflow(
            fixture.dispatch,
            fixture.snapshot.taskGraphDigest
          ),
          after
        )
      ).not.toThrow();
      const result = await runTask551ImplementWorkflowForTests({
        authorAuditDispatch: fixture.dispatch,
        scheduledOccurrenceIds: [fixture.node.id],
        phase: "05-l02",
        testExecutionSession: fixture.session,
        currentWorktreeSnapshotProvider: async () => current,
        leafDispatcher: async () => {
          events.push("leaf");
          current = after;
          return { changedPaths: [task489Temporary] };
        },
        gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) => {
          events.push(gate.operation);
          return task489TerminalOutcome(fixture.node.id, gate);
        },
        runtimeOutputObserver: async ({ operation }: { operation: string }) => {
          events.push(`runtime:${operation}`);
          return [task489Temporary];
        },
        evidenceWriter: async ({
          manifestRow,
          value,
        }: {
          manifestRow: { path: string; phase: string };
          value: unknown;
        }) => {
          const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
          writes.push({ path: manifestRow.path, bytes });
          values.push(value);
          events.push(`write:${manifestRow.phase}`);
          return freezeTestValue({
            path: manifestRow.path,
            phase: manifestRow.phase,
            digest: `sha256:${shaBytes(bytes)}`,
            bytes: bytes.byteLength,
            action: "committed_no_replace",
          });
        },
        commitAObserver: async () => {
          events.push("commit-a");
          return task489CommitA("c".repeat(40));
        },
        terminalFenceObserver: async (input: { sourceHead: string }) => {
          terminalCalls += 1;
          events.push("terminal");
          return task489Handoff(input.sourceHead, writes);
        },
      });
      expect(result.pass).toBe(true);
      expect(terminalCalls).toBe(1);
      expect(events.slice(0, 6)).toEqual([
        "commit-a",
        "leaf",
        "database-explain-plans-test",
        "task489-predecessor-plans-test",
        "explain-plan-small-check",
        "explain-plan-large-check",
      ]);
      expect(events.indexOf("write:task489-predecessor")).toBeLessThan(
        events.indexOf("write:task489-predecessor-promotion")
      );
      expect(events.at(-1)).toBe("terminal");
      expect(writes).toHaveLength(2);
      const promotion = JSON.parse(new TextDecoder().decode(writes[1]!.bytes));
      expect(promotion.sourceDigest).toBe(shaBytes(sourceBytes));
      expect(promotion.predecessor.digest).toBe(shaBytes(writes[0]!.bytes));
      const clone = freezeTestValue(JSON.parse(JSON.stringify(values[0])));
      const forged = freezeTestValue({
        predecessorValue: clone,
        digest: shaBytes(sourceBytes),
        token: Object.freeze({}),
      });
      expect(() =>
        buildTask55105L02PromotionAtNamedSeam(
          forged,
          task489CommitA("c".repeat(40)),
          freezeTestValue({
            path: writes[0]!.path,
            digest: `sha256:${shaBytes(writes[0]!.bytes)}`,
            action: "committed_no_replace",
          })
        )
      ).toThrow(/predecessor_seam_invalid/);
      await expect(writeTask551EvidenceFileIfAbsent("task489Predecessor", clone)).rejects.toThrow(
        /canonical_predecessor_value_invalid/
      );
    });
  });

  test("rejects missing, reordered, duplicate, and failed outcomes before parser or durable writes", async () => {
    await withTask489Temporary(async (sourceBytes) => {
      for (const mode of ["missing", "reordered", "duplicate", "failed"] as const) {
        const fixture = await readyTask489Fixture(),
          { before, after } = task489Worktrees(fixture, sourceBytes);
        let current: Worktree = before,
          writes = 0,
          terminals = 0;
        await expect(
          runTask551ImplementWorkflowForTests({
            authorAuditDispatch: fixture.dispatch,
            scheduledOccurrenceIds: [fixture.node.id],
            phase: "05-l02",
            testExecutionSession: fixture.session,
            currentWorktreeSnapshotProvider: async () => current,
            leafDispatcher: async () => {
              current = after;
              return { changedPaths: [task489Temporary] };
            },
            gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) => {
              if (mode === "missing" && gate.operation === "database-explain-plans-test")
                return freezeTestValue({
                  gateResult: {
                    exitCode: 0,
                    signalCode: null,
                    timedOut: false,
                    overflowed: false,
                    discoveredTestCount: 1,
                  },
                }) as never;
              if (mode === "reordered" && gate.operation === "database-explain-plans-test")
                return task489TerminalOutcome(
                  fixture.node.id,
                  gate,
                  "task489-predecessor-plans-test"
                );
              if (mode === "duplicate" && gate.operation === "task489-predecessor-plans-test")
                return task489TerminalOutcome(fixture.node.id, gate, "database-explain-plans-test");
              return task489TerminalOutcome(
                fixture.node.id,
                gate,
                gate.operation,
                mode === "failed"
              );
            },
            runtimeOutputObserver: async () => [task489Temporary],
            evidenceWriter: async () => {
              writes += 1;
              return {} as never;
            },
            commitAObserver: async () => task489CommitA("c".repeat(40)),
            terminalFenceObserver: async () => {
              terminals += 1;
              return {};
            },
          })
        ).rejects.toThrow(/05_l02_post_cleanup_target_proof_invalid/);
        expect({ writes, terminals }).toEqual({ writes: 0, terminals: 0 });
      }
    });
  });

  test("rejects a row-ten receipt digest before row eleven and a mismatched terminal handoff after both writes", async () => {
    await withTask489Temporary(async (sourceBytes) => {
      const fixture = await readyTask489Fixture(),
        states = task489Worktrees(fixture, sourceBytes);
      let current: Worktree = states.before,
        writes = 0,
        terminals = 0;
      await expect(
        runTask551ImplementWorkflowForTests({
          authorAuditDispatch: fixture.dispatch,
          scheduledOccurrenceIds: [fixture.node.id],
          phase: "05-l02",
          testExecutionSession: fixture.session,
          currentWorktreeSnapshotProvider: async () => current,
          leafDispatcher: async () => {
            current = states.after;
            return { changedPaths: [task489Temporary] };
          },
          gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) =>
            task489TerminalOutcome(fixture.node.id, gate),
          runtimeOutputObserver: async () => [task489Temporary],
          evidenceWriter: async ({
            manifestRow,
          }: {
            manifestRow: { path: string; phase: string };
          }) => {
            writes += 1;
            return freezeTestValue({
              path: manifestRow.path,
              phase: manifestRow.phase,
              digest: evidenceDigest("wrong-row-ten"),
              bytes: 1,
              action: "committed_no_replace",
            });
          },
          commitAObserver: async () => task489CommitA("c".repeat(40)),
          terminalFenceObserver: async () => {
            terminals += 1;
            return {};
          },
        })
      ).rejects.toThrow(/evidence_receipt_digest_mismatch/);
      expect({ writes, terminals }).toEqual({ writes: 1, terminals: 0 });

      const next = await readyTask489Fixture(),
        nextStates = task489Worktrees(next, sourceBytes),
        evidence: Array<{ path: string; bytes: Uint8Array }> = [];
      current = nextStates.before;
      await expect(
        runTask551ImplementWorkflowForTests({
          authorAuditDispatch: next.dispatch,
          scheduledOccurrenceIds: [next.node.id],
          phase: "05-l02",
          testExecutionSession: next.session,
          currentWorktreeSnapshotProvider: async () => current,
          leafDispatcher: async () => {
            current = nextStates.after;
            return { changedPaths: [task489Temporary] };
          },
          gateRunner: async ({ gate }: { gate: { operation: string; kind: string } }) =>
            task489TerminalOutcome(next.node.id, gate),
          runtimeOutputObserver: async () => [task489Temporary],
          evidenceWriter: async ({
            manifestRow,
            value,
          }: {
            manifestRow: { path: string; phase: string };
            value: unknown;
          }) => {
            const bytes = new TextEncoder().encode(`${JSON.stringify(value)}\n`);
            evidence.push({ path: manifestRow.path, bytes });
            return freezeTestValue({
              path: manifestRow.path,
              phase: manifestRow.phase,
              digest: `sha256:${shaBytes(bytes)}`,
              bytes: bytes.byteLength,
              action: "committed_no_replace",
            });
          },
          commitAObserver: async () => task489CommitA("c".repeat(40)),
          terminalFenceObserver: async (input: { sourceHead: string }) => {
            const predecessor = JSON.parse(new TextDecoder().decode(evidence[0]!.bytes));
            predecessor.statementReceipts[0].profileResults[0].planDigest = sha(
              "different-terminal-predecessor"
            );
            const predecessorBytes = new TextEncoder().encode(`${JSON.stringify(predecessor)}\n`),
              promotion = JSON.parse(new TextDecoder().decode(evidence[1]!.bytes));
            promotion.predecessor.digest = shaBytes(predecessorBytes);
            return task489Handoff(input.sourceHead, [
              { path: evidence[0]!.path, bytes: predecessorBytes },
              {
                path: evidence[1]!.path,
                bytes: new TextEncoder().encode(`${JSON.stringify(promotion)}\n`),
              },
            ]);
          },
        })
      ).rejects.toThrow(/terminal_handoff_mismatch/);
      expect(evidence).toHaveLength(2);
    });
  });
});
