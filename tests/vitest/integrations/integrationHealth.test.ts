// TASK-491-04-L01: pure integration health evaluator matrix. Bun-free: imports
// only the evaluator + registry, no `db/client` coupling.
import { describe, expect, test } from "vitest";

import { evaluateIntegrationHealth } from "../../../core/services/integrations/healthEvaluator";
import { getIntegrationDefinition } from "../../../core/services/integrations/registry";

const definition = (id: string) => {
  const found = getIntegrationDefinition(id);
  if (!found) throw new Error(`missing definition ${id}`);
  return found;
};

describe("evaluateIntegrationHealth", () => {
  test("missing required field -> unknown, no lastError", () => {
    expect(evaluateIntegrationHealth(definition("slack"), {}, null)).toEqual({
      status: "unknown",
      lastError: null,
    });
    expect(evaluateIntegrationHealth(definition("sentry"), { dsn: "" }, null)).toEqual({
      status: "unknown",
      lastError: null,
    });
  });

  test("google-analytics with a valid measurement id -> healthy", () => {
    expect(
      evaluateIntegrationHealth(definition("google-analytics"), { measurementId: "G-ABC123" }, null)
    ).toEqual({ status: "healthy", lastError: null });
  });

  test("google-analytics with an invalid id -> issue with machine code", () => {
    expect(
      evaluateIntegrationHealth(definition("google-analytics"), { measurementId: "UA-12345" }, null)
    ).toEqual({ status: "issue", lastError: "measurement_id_invalid" });
    expect(
      evaluateIntegrationHealth(
        definition("google-analytics"),
        { measurementId: "<script>alert(1)</script>" },
        null
      )
    ).toEqual({ status: "issue", lastError: "measurement_id_invalid" });
  });

  test("sentry with a parseable dsn -> healthy", () => {
    expect(
      evaluateIntegrationHealth(
        definition("sentry"),
        { dsn: "https://public@o0.ingest.sentry.io/0" },
        null
      )
    ).toEqual({ status: "healthy", lastError: null });
  });

  test("sentry with an unparseable dsn -> issue with machine code", () => {
    expect(evaluateIntegrationHealth(definition("sentry"), { dsn: "not-a-dsn" }, null)).toEqual({
      status: "issue",
      lastError: "dsn_invalid",
    });
  });

  test("slack/zapier reflect the last real delivery outcome", () => {
    const slack = definition("slack");
    expect(
      evaluateIntegrationHealth(slack, { webhookUrl: "https://hooks.slack.com/x" }, null)
    ).toEqual({
      status: "healthy",
      lastError: null,
    });
    expect(
      evaluateIntegrationHealth(
        slack,
        { webhookUrl: "https://hooks.slack.com/x" },
        "webhook_http_429"
      )
    ).toEqual({ status: "issue", lastError: "webhook_http_429" });

    const zapier = definition("zapier");
    expect(
      evaluateIntegrationHealth(
        zapier,
        { hookUrl: "https://hooks.zapier.com/x" },
        "dispatch_failed"
      )
    ).toEqual({ status: "issue", lastError: "dispatch_failed" });
  });

  test("other integrations baseline healthy when required fields are present", () => {
    const resend = definition("resend");
    expect(evaluateIntegrationHealth(resend, { apiKey: "re_abc" }, null)).toEqual({
      status: "healthy",
      lastError: null,
    });
  });
});
