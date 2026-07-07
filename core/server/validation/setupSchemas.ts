// TASK-482-06-L02: schema-owner module for the internal starter-content
// endpoints. `starterContentSchema` is strict (`additionalProperties: false`)
// so a blueprint-shaped body is rejected at the boundary — the client may only
// send an id/key (string), never a `SolutionKitDefinition`. Exactly-one of
// `kitId`/`blueprintKey` is enforced by `toChoice` in `setupRoutes.ts`
// (`starter_choice_invalid`) so the caller gets that specific domain code rather
// than a generic schema `oneOf` failure. An unknown id/key is intentionally
// NOT rejected here — the service resolves it and throws `starter_kit_unknown`.

export const starterContentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kitId: { type: "string", minLength: 1, maxLength: 64 },
    blueprintKey: { type: "string", minLength: 1, maxLength: 64 },
    dryRun: { type: "boolean" },
  },
} as const;
