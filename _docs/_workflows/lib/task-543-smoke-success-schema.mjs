// TASK-543 smoke-success-schema (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  ADMIN_HEALTH_COMMAND,
  COMMAND_TIMELINE_RECORD_SCHEMA,
  FRONT_HEALTH_COMMAND,
  LOG_READ_SET_SCHEMA,
  NONCE_GENERATION_COMMAND,
  OPTIONAL_LOG_READ_SET_SCHEMA,
  POSTS_LIST_URL,
  POST_PAYLOAD_SCHEMA,
  SAFE_SENTINEL_SCHEMA,
  SETUP_STATE_SCHEMA,
  SMOKE_CLI_COMMAND_SCHEMA,
  SMOKE_CONSOLE_ERROR_READ,
  SMOKE_CONSOLE_WARNING_READ,
  SMOKE_KINDS,
  SMOKE_LOGIN_SUBMIT,
  SMOKE_LOG_OBSERVATION_START,
  SMOKE_LOG_RESET,
  SMOKE_PAGE_ERROR_READ,
  SMOKE_PASSWORD_FILL_COMMAND,
  SMOKE_RECEIPT_REQUIRED,
  SMOKE_RUN_CODE_COMMAND_SCHEMA,
  STRING_ARRAY_SCHEMA,
  THEME_APPLIED_STATE_SCHEMA,
  THEME_RESTORE_STATE_SCHEMA,
  commandResultSchema,
} from "./task-543-smoke-schema.mjs";
import {
  KIND_EVIDENCE_SCHEMAS,
} from "./task-543-smoke-kind-evidence-schemas.mjs";
import {
  RESPONSIVE_OUTPUT_SCHEMA,
} from "./task-543-smoke-evidence-schemas.mjs";

const ROOT = "/home/coder/project/Coderso";

export const SMOKE_SUCCESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "serverUp",
    "errors",
    "commands",
    "bootstrap",
    "preflightSessionList",
    "health",
    "helper",
    "state",
    "fixtures",
    "scenarios",
    "lifecycleLogReads",
    "consoleErrors",
    "consoleWarnings",
    "pageErrors",
    "screenshots",
    "commandTimeline",
    "cleanup",
    "failures",
  ],
  properties: {
    pass: { const: true },
    serverUp: { const: true },
    errors: STRING_ARRAY_SCHEMA,
    commands: {
      type: "object",
      additionalProperties: false,
      required: [
        "helper",
        "nonceGeneration",
        "adminProbe",
        "frontProbe",
        "sessionPrefix",
        "browserOpen",
        "emailFill",
        "passwordFill",
        "loginSubmit",
        "consoleObservationStart",
        "finalRouteList",
        "browserClose",
        "sessionList",
        "helperStop",
      ],
      properties: {
        helper: {
          type: "string",
          pattern:
            '^bash -lc \'CODERSO_WF543_LAUNCH_NONCE=wf543-[a-f0-9]{32} coderso-dev-core-host /home/coder/project/Coderso >/dev/null 2>&1 & printf "%s\\\\n" "\\$!"\'$',
        },
        nonceGeneration: { const: NONCE_GENERATION_COMMAND },
        adminProbe: { const: ADMIN_HEALTH_COMMAND },
        frontProbe: { const: FRONT_HEALTH_COMMAND },
        sessionPrefix: { const: "playwright-cli -s=wf543smoke --raw" },
        browserOpen: {
          const: "playwright-cli -s=wf543smoke --raw open http://coderso-a.localhost:5173/admin/",
        },
        emailFill: {
          const:
            'playwright-cli -s=wf543smoke --raw fill \'input[type="email"]\' "$ADMIN_EMAIL" >/dev/null',
        },
        passwordFill: {
          const: SMOKE_PASSWORD_FILL_COMMAND,
        },
        loginSubmit: { const: SMOKE_LOGIN_SUBMIT },
        consoleObservationStart: { const: SMOKE_LOG_OBSERVATION_START },
        finalRouteList: { const: "playwright-cli -s=wf543smoke --raw route-list" },
        browserClose: { const: "playwright-cli -s=wf543smoke --raw close" },
        sessionList: { const: "playwright-cli --raw list" },
        helperStop: { type: "string", minLength: 1 },
      },
    },
    bootstrap: {
      type: "object",
      additionalProperties: false,
      required: [
        "helperStart",
        "nonceGeneration",
        "preLaunchPortChecks",
        "browserOpen",
        "emailFill",
        "passwordFill",
        "loginSubmit",
        "consoleObservationStart",
      ],
      properties: {
        nonceGeneration: commandResultSchema(
          { const: NONCE_GENERATION_COMMAND },
          { type: "string", pattern: "^wf543-[a-f0-9]{32}$" }
        ),
        helperStart: commandResultSchema(
          { type: "string", minLength: 1 },
          { type: "string", pattern: "^[0-9]+\\n?$" }
        ),
        preLaunchPortChecks: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["port", "absent", ...SMOKE_RECEIPT_REQUIRED],
            properties: {
              port: { enum: [3000, 5173] },
              absent: { type: "boolean" },
              ...commandResultSchema(
                { type: "string" },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["absent"],
                  properties: { absent: { type: "boolean" } },
                }
              ).properties,
            },
          },
        },
        browserOpen: commandResultSchema(),
        emailFill: commandResultSchema(),
        passwordFill: commandResultSchema(),
        loginSubmit: commandResultSchema(
          { const: SMOKE_LOGIN_SUBMIT },
          {
            type: "object",
            additionalProperties: false,
            required: ["signedIn", "url"],
            properties: {
              signedIn: { const: true },
              url: { type: "string", pattern: "^http://coderso-a\\.localhost:5173/admin/" },
            },
          }
        ),
        consoleObservationStart: commandResultSchema(
          { const: SMOKE_LOG_OBSERVATION_START },
          { const: true }
        ),
      },
    },
    preflightSessionList: commandResultSchema({ const: "playwright-cli --raw list" }),
    health: {
      type: "object",
      additionalProperties: false,
      required: ["admin", "front"],
      properties: {
        admin: commandResultSchema({ const: ADMIN_HEALTH_COMMAND }),
        front: commandResultSchema({ const: FRONT_HEALTH_COMMAND }),
      },
    },
    helper: {
      type: "object",
      additionalProperties: false,
      required: [
        "serverStartedAtEpochMs",
        "serverStartTimestampReceipt",
        "launchNonce",
        "rootPid",
        "ppid",
        "startTicks",
        "cmdline",
        "cwd",
        "cmdlineSha256",
        "identityReceipts",
        "childPids",
        "ownedPorts",
        "pidTreeDiscovery",
        "portOwnershipDiscovery",
      ],
      properties: {
        serverStartedAtEpochMs: { type: "integer", minimum: 1 },
        serverStartTimestampReceipt: commandResultSchema(
          { const: "/usr/bin/date +%s%3N" },
          {
            type: "object",
            additionalProperties: false,
            required: ["epochMs"],
            properties: { epochMs: { type: "integer", minimum: 1 } },
          }
        ),
        launchNonce: { type: "string", pattern: "^wf543-[a-f0-9]{32}$" },
        rootPid: { type: "integer", minimum: 2 },
        ppid: { type: "integer", minimum: 1 },
        startTicks: { type: "string", pattern: "^[0-9]+$" },
        cmdline: { type: "string", minLength: 1 },
        cwd: { const: ROOT },
        cmdlineSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        identityReceipts: {
          type: "object",
          additionalProperties: false,
          required: ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"],
          properties: Object.fromEntries(
            ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"].map((key) => [
              key,
              commandResultSchema({ type: "string", minLength: 1 }),
            ])
          ),
        },
        childPids: {
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
        pidTreeDiscovery: {
          type: "object",
          additionalProperties: false,
          required: ["discoveredPids", ...SMOKE_RECEIPT_REQUIRED],
          properties: {
            discoveredPids: {
              type: "array",
              minItems: 2,
              uniqueItems: true,
              items: { type: "integer", minimum: 2 },
            },
            ...commandResultSchema(
              { type: "string", minLength: 1 },
              {
                type: "object",
                additionalProperties: false,
                required: ["discoveredPids"],
                properties: {
                  discoveredPids: {
                    type: "array",
                    minItems: 2,
                    uniqueItems: true,
                    items: { type: "integer", minimum: 2 },
                  },
                },
              }
            ).properties,
          },
        },
        portOwnershipDiscovery: {
          type: "object",
          additionalProperties: false,
          required: ["mappings", ...SMOKE_RECEIPT_REQUIRED],
          properties: {
            mappings: {
              type: "array",
              minItems: 2,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["port", "ownerPids"],
                properties: {
                  port: { type: "integer", minimum: 1, maximum: 65535 },
                  ownerPids: {
                    type: "array",
                    minItems: 1,
                    uniqueItems: true,
                    items: { type: "integer", minimum: 2 },
                  },
                },
              },
            },
            ...commandResultSchema(
              { type: "string", minLength: 1 },
              {
                type: "object",
                additionalProperties: false,
                required: ["mappings"],
                properties: {
                  mappings: {
                    type: "array",
                    minItems: 2,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["port", "ownerPids"],
                      properties: {
                        port: { type: "integer", minimum: 1, maximum: 65535 },
                        ownerPids: {
                          type: "array",
                          minItems: 1,
                          uniqueItems: true,
                          items: { type: "integer", minimum: 2 },
                        },
                      },
                    },
                  },
                },
              }
            ).properties,
          },
        },
      },
    },
    state: {
      type: "object",
      additionalProperties: false,
      required: ["theme", "setup"],
      properties: {
        theme: {
          type: "object",
          additionalProperties: false,
          required: ["before", "restore", "after"],
          properties: {
            before: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, THEME_RESTORE_STATE_SCHEMA),
            restore: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, THEME_RESTORE_STATE_SCHEMA),
            after: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, THEME_RESTORE_STATE_SCHEMA),
          },
        },
        setup: {
          type: "object",
          additionalProperties: false,
          required: ["before", "restore", "after"],
          properties: {
            before: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, SETUP_STATE_SCHEMA),
            restore: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, SETUP_STATE_SCHEMA),
            after: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, SETUP_STATE_SCHEMA),
          },
        },
      },
    },
    fixtures: {
      type: "array",
      minItems: 1,
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
          "createPayload",
          "cleanPayload",
          "draftTitleA",
          "draftTitleB",
          "createCommand",
          "createStatus",
          "createStdout",
          "createStderr",
          "createStdoutSha256",
          "createStderrSha256",
          "createParsedOutput",
          "createdId",
          "provenanceCommand",
          "provenanceStatus",
          "provenanceStdout",
          "provenanceStderr",
          "provenanceStdoutSha256",
          "provenanceStderrSha256",
          "provenanceParsedOutput",
          "provenanceId",
          "deleteCommand",
          "deleteStatus",
          "deleteStdout",
          "deleteStderr",
          "deleteStdoutSha256",
          "deleteStderrSha256",
          "deleteParsedOutput",
          "deletedId",
          "absenceCommand",
          "absenceStatus",
          "absenceStdout",
          "absenceStderr",
          "absenceStdoutSha256",
          "absenceStderrSha256",
          "absenceParsedOutput",
          "absenceId",
          "absent",
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
          createPayload: POST_PAYLOAD_SCHEMA,
          cleanPayload: POST_PAYLOAD_SCHEMA,
          draftTitleA: SAFE_SENTINEL_SCHEMA,
          draftTitleB: SAFE_SENTINEL_SCHEMA,
          createCommand: SMOKE_RUN_CODE_COMMAND_SCHEMA,
          createStatus: { type: "integer" },
          createStdout: { type: "string" },
          createStderr: { type: "string" },
          createStdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          createStderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          createParsedOutput: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "responsePostId",
              "title",
              "slug",
              "cleanPayload",
              "newPostControlName",
              "drawerTitle",
              "createButtonName",
              "openAfterCreateEnabled",
              "createRequestPayload",
              "createResponseStatus",
              "createResponseUrl",
            ],
            properties: {
              id: { type: "string" },
              responsePostId: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              cleanPayload: POST_PAYLOAD_SCHEMA,
              newPostControlName: { const: "New post" },
              drawerTitle: { const: "Create New Post" },
              createButtonName: { const: "Create Post" },
              openAfterCreateEnabled: { type: "boolean" },
              createRequestPayload: POST_PAYLOAD_SCHEMA,
              createResponseStatus: { type: "integer" },
              createResponseUrl: { type: "string" },
            },
          },
          createdId: { type: "string" },
          provenanceCommand: SMOKE_RUN_CODE_COMMAND_SCHEMA,
          provenanceStatus: { type: "integer" },
          provenanceStdout: { type: "string" },
          provenanceStderr: { type: "string" },
          provenanceStdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          provenanceStderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          provenanceParsedOutput: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "responsePostId",
              "postCreateUrl",
              "postCreateRouteId",
              "editorUrl",
              "editorUrlId",
              "editorTitle",
              "domTitleAccessibleName",
              "domHref",
              "domHrefId",
            ],
            properties: {
              id: { type: "string" },
              responsePostId: { type: "string" },
              postCreateUrl: { type: "string" },
              postCreateRouteId: { type: "string" },
              editorUrl: {
                type: "string",
                pattern: "^http://coderso-a\\.localhost:5173/admin/posts/[^/?#]+$",
              },
              editorUrlId: { type: "string" },
              editorTitle: { type: "string" },
              domTitleAccessibleName: { type: "string" },
              domHref: { type: "string" },
              domHrefId: { type: "string" },
            },
          },
          provenanceId: { type: "string" },
          deleteCommand: SMOKE_RUN_CODE_COMMAND_SCHEMA,
          deleteStatus: { type: "integer" },
          deleteStdout: { type: "string" },
          deleteStderr: { type: "string" },
          deleteStdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          deleteStderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          deleteParsedOutput: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "deleted",
              "responseStatus",
              "responseUrl",
              "rowTitleAccessibleName",
              "domHref",
              "actionAccessibleName",
              "menuItemName",
              "dialogTitle",
              "confirmButtonName",
              "domLinkCount",
            ],
            properties: {
              id: { type: "string" },
              deleted: { type: "boolean" },
              responseStatus: { type: "integer" },
              responseUrl: { type: "string" },
              rowTitleAccessibleName: { type: "string" },
              domHref: { type: "string" },
              actionAccessibleName: { type: "string" },
              menuItemName: { const: "Delete" },
              dialogTitle: { const: "Delete post?" },
              confirmButtonName: { const: "Delete post" },
              domLinkCount: { type: "integer", minimum: 0 },
            },
          },
          deletedId: { type: "string" },
          absenceCommand: SMOKE_RUN_CODE_COMMAND_SCHEMA,
          absenceStatus: { type: "integer" },
          absenceStdout: { type: "string" },
          absenceStderr: { type: "string" },
          absenceStdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          absenceStderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          absenceParsedOutput: {
            type: "object",
            additionalProperties: false,
            required: ["id", "absent", "listUrl", "reloaded", "domLinkCount"],
            properties: {
              id: { type: "string" },
              absent: { type: "boolean" },
              listUrl: { const: POSTS_LIST_URL },
              reloaded: { const: true },
              domLinkCount: { type: "integer", minimum: 0 },
            },
          },
          absenceId: { type: "string" },
          absent: { type: "boolean" },
        },
      },
    },
    scenarios: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "kind",
          "fixtureId",
          "pass",
          "errors",
          "theme",
          "commands",
          "commandResults",
          "routes",
          "evidence",
          "responsive",
          "screenshotPaths",
        ],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { enum: SMOKE_KINDS },
          fixtureId: { type: "string", minLength: 1 },
          pass: { type: "boolean" },
          errors: STRING_ARRAY_SCHEMA,
          theme: { enum: ["light", "dark"] },
          commands: {
            type: "object",
            additionalProperties: false,
            required: [
              "logReset",
              "theme",
              "setup",
              "action",
              "transientAssertion",
              "assertion",
              "consoleErrorRead",
              "consoleWarningRead",
              "pageErrorRead",
              "reset",
            ],
            properties: {
              logReset: { const: SMOKE_LOG_RESET },
              theme: SMOKE_RUN_CODE_COMMAND_SCHEMA,
              setup: { type: "array", minItems: 1, items: SMOKE_CLI_COMMAND_SCHEMA },
              action: { type: "array", minItems: 1, items: SMOKE_CLI_COMMAND_SCHEMA },
              transientAssertion: {
                type: "array",
                items: SMOKE_RUN_CODE_COMMAND_SCHEMA,
              },
              assertion: {
                type: "array",
                minItems: 1,
                items: SMOKE_RUN_CODE_COMMAND_SCHEMA,
              },
              consoleErrorRead: { const: SMOKE_CONSOLE_ERROR_READ },
              consoleWarningRead: { const: SMOKE_CONSOLE_WARNING_READ },
              pageErrorRead: { const: SMOKE_PAGE_ERROR_READ },
              reset: { type: "array", minItems: 1, items: SMOKE_CLI_COMMAND_SCHEMA },
            },
          },
          commandResults: {
            type: "object",
            additionalProperties: false,
            required: [
              "logReset",
              "theme",
              "setup",
              "action",
              "transientAssertion",
              "assertion",
              "logReads",
              "boundaryLogReads",
              "reset",
            ],
            properties: {
              logReset: commandResultSchema({ const: SMOKE_LOG_RESET }),
              theme: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, THEME_APPLIED_STATE_SCHEMA),
              setup: { type: "array", minItems: 1, items: commandResultSchema() },
              action: { type: "array", minItems: 1, items: commandResultSchema() },
              transientAssertion: {
                type: "array",
                items: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA),
              },
              assertion: {
                type: "array",
                minItems: 1,
                items: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA),
              },
              logReads: LOG_READ_SET_SCHEMA,
              boundaryLogReads: {
                type: "object",
                additionalProperties: false,
                required: ["afterUnroute", "afterReset"],
                properties: {
                  afterUnroute: OPTIONAL_LOG_READ_SET_SCHEMA,
                  afterReset: LOG_READ_SET_SCHEMA,
                },
              },
              reset: { type: "array", minItems: 1, items: commandResultSchema() },
            },
          },
          routes: {
            type: "object",
            additionalProperties: false,
            required: ["installed", "removed"],
            properties: {
              installed: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["pattern", ...SMOKE_RECEIPT_REQUIRED],
                  properties: {
                    pattern: { type: "string", minLength: 1 },
                    ...commandResultSchema(SMOKE_CLI_COMMAND_SCHEMA, {
                      type: "object",
                      additionalProperties: false,
                      required: ["pattern", "installed", "mode"],
                      properties: {
                        pattern: { type: "string" },
                        installed: { type: "boolean" },
                        mode: { enum: ["delay", "failure"] },
                      },
                    }).properties,
                  },
                },
              },
              removed: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["pattern", ...SMOKE_RECEIPT_REQUIRED],
                  properties: {
                    pattern: { type: "string", minLength: 1 },
                    ...commandResultSchema(SMOKE_CLI_COMMAND_SCHEMA, {
                      type: "object",
                      additionalProperties: false,
                      required: ["pattern", "removed", "releasedPending"],
                      properties: {
                        pattern: { type: "string" },
                        removed: { type: "boolean" },
                        releasedPending: { type: "integer", minimum: 0 },
                      },
                    }).properties,
                  },
                },
              },
            },
          },
          evidence: { oneOf: KIND_EVIDENCE_SCHEMAS },
          responsive: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["widths"],
                properties: {
                  widths: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["width", "resizeReceipt", "probeReceipt"],
                      properties: {
                        width: { type: "integer" },
                        resizeReceipt: commandResultSchema(SMOKE_CLI_COMMAND_SCHEMA, {
                          type: "null",
                        }),
                        probeReceipt: commandResultSchema(
                          SMOKE_RUN_CODE_COMMAND_SCHEMA,
                          RESPONSIVE_OUTPUT_SCHEMA
                        ),
                      },
                    },
                  },
                },
              },
            ],
          },
          screenshotPaths: {
            type: "object",
            additionalProperties: false,
            required: ["transient", "final"],
            properties: {
              transient: {
                anyOf: [
                  { type: "null" },
                  {
                    type: "string",
                    pattern:
                      "^/home/coder/project/Coderso/_docs/_workflows/_smoke/task-543-wf543smoke-[A-Za-z0-9._-]+-transient\\.png$",
                  },
                ],
              },
              final: {
                type: "string",
                pattern:
                  "^/home/coder/project/Coderso/_docs/_workflows/_smoke/task-543-wf543smoke-[A-Za-z0-9._-]+-final\\.png$",
              },
            },
          },
        },
      },
    },
    lifecycleLogReads: {
      type: "object",
      additionalProperties: false,
      required: ["afterCreate", "afterProvenance", "afterDelete", "afterAbsence", "final"],
      properties: {
        afterCreate: LOG_READ_SET_SCHEMA,
        afterProvenance: LOG_READ_SET_SCHEMA,
        afterDelete: LOG_READ_SET_SCHEMA,
        afterAbsence: LOG_READ_SET_SCHEMA,
        final: LOG_READ_SET_SCHEMA,
      },
    },
    consoleErrors: STRING_ARRAY_SCHEMA,
    consoleWarnings: STRING_ARRAY_SCHEMA,
    pageErrors: STRING_ARRAY_SCHEMA,
    screenshots: {
      type: "array",
      minItems: 11,
      maxItems: 11,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "scenarioId",
          "phase",
          "captureReceipt",
          "path",
          "size",
          "inode",
          "sha256",
          "mtimeEpochMs",
          "signatureHex",
          "statReceipt",
          "hashReceipt",
          "signatureReceipt",
        ],
        properties: {
          scenarioId: { type: "string", minLength: 1 },
          phase: { enum: ["transient", "final"] },
          captureReceipt: commandResultSchema(SMOKE_CLI_COMMAND_SCHEMA, {
            type: "object",
            additionalProperties: false,
            required: ["reportedPath"],
            properties: {
              reportedPath: {
                type: "string",
                pattern: "^_docs/_workflows/_smoke/task-543-wf543smoke-[A-Za-z0-9._-]+\\.png$",
              },
            },
          }),
          path: {
            type: "string",
            pattern:
              "^/home/coder/project/Coderso/_docs/_workflows/_smoke/task-543-wf543smoke-[A-Za-z0-9._-]+\\.png$",
          },
          size: { type: "integer", minimum: 1 },
          inode: { type: "string", minLength: 1 },
          sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          mtimeEpochMs: { type: "number", minimum: 1 },
          signatureHex: { type: "string", pattern: "^[a-f0-9]{16}$" },
          statReceipt: commandResultSchema(
            { type: "string", minLength: 1 },
            {
              type: "object",
              additionalProperties: false,
              required: ["size", "inode", "mtimeEpochMs"],
              properties: {
                size: { type: "integer", minimum: 1 },
                inode: { type: "string", minLength: 1 },
                mtimeEpochMs: { type: "number", minimum: 1 },
              },
            }
          ),
          hashReceipt: commandResultSchema(
            { type: "string", minLength: 1 },
            {
              type: "object",
              additionalProperties: false,
              required: ["sha256", "path"],
              properties: {
                sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
                path: { type: "string", minLength: 1 },
              },
            }
          ),
          signatureReceipt: commandResultSchema(
            { type: "string", minLength: 1 },
            {
              type: "object",
              additionalProperties: false,
              required: ["signatureHex"],
              properties: {
                signatureHex: { type: "string", pattern: "^[a-f0-9]{16}$" },
              },
            }
          ),
        },
      },
    },
    commandTimeline: {
      type: "array",
      minItems: 1,
      items: COMMAND_TIMELINE_RECORD_SCHEMA,
    },
    cleanup: {
      type: "object",
      additionalProperties: false,
      required: [
        "routeList",
        "browserClose",
        "sessionList",
        "helperStop",
        "processChecks",
        "portChecks",
      ],
      properties: {
        routeList: commandResultSchema({ const: "playwright-cli -s=wf543smoke --raw route-list" }),
        browserClose: commandResultSchema({ const: "playwright-cli -s=wf543smoke --raw close" }),
        sessionList: commandResultSchema({ const: "playwright-cli --raw list" }),
        helperStop: commandResultSchema({ type: "string", minLength: 1 }),
        processChecks: {
          type: "array",
          minItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["pid", "absent", ...SMOKE_RECEIPT_REQUIRED],
            properties: {
              pid: { type: "integer", minimum: 2 },
              absent: { type: "boolean" },
              ...commandResultSchema(
                { type: "string", minLength: 1 },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["absent"],
                  properties: { absent: { type: "boolean" } },
                }
              ).properties,
            },
          },
        },
        portChecks: {
          type: "array",
          minItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["port", "absent", ...SMOKE_RECEIPT_REQUIRED],
            properties: {
              port: { type: "integer", minimum: 1, maximum: 65535 },
              absent: { type: "boolean" },
              ...commandResultSchema(
                { type: "string", minLength: 1 },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["absent"],
                  properties: { absent: { type: "boolean" } },
                }
              ).properties,
            },
          },
        },
      },
    },
    failures: STRING_ARRAY_SCHEMA,
  },
};

