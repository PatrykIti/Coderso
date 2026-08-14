// TASK-543 smoke-failure-schema (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  COMMAND_TIMELINE_RECORD_SCHEMA,
  POST_PAYLOAD_SCHEMA,
  SAFE_SENTINEL_SCHEMA,
  SETUP_STATE_SCHEMA,
  SMOKE_KINDS,
  SMOKE_RECEIPT_REQUIRED,
  STRING_ARRAY_SCHEMA,
  THEME_RESTORE_STATE_SCHEMA,
  commandResultSchema,
} from "./task-543-smoke-schema.mjs";
import {
  SMOKE_SUCCESS_SCHEMA,
} from "./task-543-smoke-success-schema.mjs";

const ROOT = "/home/coder/project/Coderso";

export const SMOKE_FAILURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "serverUp",
    "errors",
    "failures",
    "failedAtSequence",
    "failedScope",
    "failurePhase",
    "commandTimeline",
    "acquired",
    "cleanup",
  ],
  properties: {
    pass: { const: false },
    serverUp: { type: "boolean" },
    errors: { type: "array", minItems: 1, items: { type: "string" } },
    failures: STRING_ARRAY_SCHEMA,
    failedAtSequence: { type: "integer", minimum: 1 },
    failedScope: { type: "string", minLength: 1 },
    failurePhase: {
      enum: [
        "bootstrap",
        "health",
        "browser",
        "fixture",
        "lifecycle",
        "scenario",
        "state",
        "helper",
        "cleanup",
      ],
    },
    commandTimeline: {
      type: "array",
      minItems: 1,
      items: COMMAND_TIMELINE_RECORD_SCHEMA,
    },
    acquired: {
      type: "object",
      additionalProperties: false,
      required: [
        "helper",
        "browserSession",
        "fixtures",
        "scenarios",
        "routes",
        "themeBefore",
        "setupBefore",
      ],
      properties: {
        helper: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              additionalProperties: false,
              required: [
                "identityComplete",
                "launchNonce",
                "rootPid",
                "ppid",
                "startTicks",
                "cmdline",
                "cmdlineSha256",
                "cwd",
                "ownedPids",
                "ownedPorts",
                "reason",
              ],
              properties: {
                identityComplete: { const: false },
                launchNonce: { type: "string", pattern: "^wf543-[a-f0-9]{32}$" },
                rootPid: { anyOf: [{ type: "null" }, { type: "integer", minimum: 2 }] },
                ppid: { anyOf: [{ type: "null" }, { type: "integer", minimum: 1 }] },
                startTicks: {
                  anyOf: [{ type: "null" }, { type: "string", pattern: "^[0-9]+$" }],
                },
                cmdline: { anyOf: [{ type: "null" }, { type: "string", minLength: 1 }] },
                cmdlineSha256: {
                  anyOf: [{ type: "null" }, { type: "string", pattern: "^[a-f0-9]{64}$" }],
                },
                cwd: { anyOf: [{ type: "null" }, { const: ROOT }] },
                ownedPids: {
                  type: "array",
                  maxItems: 1,
                  uniqueItems: true,
                  items: { type: "integer", minimum: 2 },
                },
                ownedPorts: {
                  type: "array",
                  minItems: 2,
                  maxItems: 2,
                  uniqueItems: true,
                  items: { type: "integer", minimum: 1, maximum: 65535 },
                },
                reason: { type: "string", minLength: 1 },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: [
                "identityComplete",
                "launchNonce",
                "rootPid",
                "ppid",
                "startTicks",
                "cmdline",
                "cmdlineSha256",
                "cwd",
                "ownedPids",
                "ownedPorts",
              ],
              properties: {
                identityComplete: { const: true },
                launchNonce: { type: "string", pattern: "^wf543-[a-f0-9]{32}$" },
                rootPid: { type: "integer", minimum: 2 },
                ppid: { type: "integer", minimum: 1 },
                startTicks: { type: "string", pattern: "^[0-9]+$" },
                cmdline: { type: "string", minLength: 1 },
                cmdlineSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
                cwd: { const: ROOT },
                ownedPids: {
                  type: "array",
                  minItems: 1,
                  uniqueItems: true,
                  items: { type: "integer", minimum: 2 },
                },
                ownedPorts: {
                  type: "array",
                  minItems: 2,
                  uniqueItems: true,
                  items: { type: "integer", minimum: 1, maximum: 65535 },
                },
              },
            },
          ],
        },
        browserSession: { type: "boolean" },
        fixtures: {
          type: "array",
          maxItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "title",
              "slug",
              "editorUrl",
              "openAfterCreateEnabled",
              "cleanPayload",
              "draftTitleA",
              "draftTitleB",
            ],
            properties: {
              id: { type: "string", minLength: 1 },
              title: SAFE_SENTINEL_SCHEMA,
              slug: { type: "string", pattern: "^[a-z0-9-]{1,120}$" },
              editorUrl: {
                type: "string",
                pattern: "^http://coderso-a\\.localhost:5173/admin/posts/[^/?#]+$",
              },
              openAfterCreateEnabled: { type: "boolean" },
              cleanPayload: POST_PAYLOAD_SCHEMA,
              draftTitleA: SAFE_SENTINEL_SCHEMA,
              draftTitleB: SAFE_SENTINEL_SCHEMA,
            },
          },
        },
        scenarios: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "fixtureId", "theme"],
            properties: {
              id: { type: "string", minLength: 1 },
              kind: { enum: SMOKE_KINDS },
              fixtureId: { type: "string", minLength: 1 },
              theme: { enum: ["light", "dark"] },
            },
          },
        },
        routes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["pattern", "mode"],
            properties: {
              pattern: { type: "string", minLength: 1 },
              mode: { enum: ["delay", "failure"] },
            },
          },
        },
        themeBefore: { anyOf: [{ type: "null" }, THEME_RESTORE_STATE_SCHEMA] },
        setupBefore: { anyOf: [{ type: "null" }, SETUP_STATE_SCHEMA] },
      },
    },
    cleanup: {
      type: "object",
      additionalProperties: false,
      required: ["attempted", "records", "remainingResources"],
      properties: {
        attempted: { const: true },
        records: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["sequence", "kind", "resourceId", ...SMOKE_RECEIPT_REQUIRED],
            properties: {
              sequence: { type: "integer", minimum: 1 },
              kind: {
                enum: [
                  "route",
                  "fixture-delete",
                  "fixture-absence",
                  "log",
                  "theme",
                  "setup",
                  "browser",
                  "helper",
                  "pid",
                  "port",
                ],
              },
              resourceId: { type: "string", minLength: 1 },
              ...commandResultSchema({ type: "string", minLength: 1 }).properties,
            },
          },
        },
        remainingResources: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "resourceId"],
            properties: {
              kind: { enum: ["route", "fixture", "theme", "setup", "browser", "helper"] },
              resourceId: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
  },
};

export const SMOKE_SCHEMA = { oneOf: [SMOKE_SUCCESS_SCHEMA, SMOKE_FAILURE_SCHEMA] };

