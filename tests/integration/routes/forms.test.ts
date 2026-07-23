import { randomUUID } from "node:crypto";
import { afterEach, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { forms } from "../../../core/db/schema";
import { mapFormError, registerFormsRoutes } from "../../../core/server/routes/formsRoutes";
import {
  formAttachmentUploadSchema,
  formCreateSchema,
  formFieldsSchema,
  formSubmissionSchema,
  formUpdateSchema,
} from "../../../core/server/validation/formSchemas";
import { ApiError } from "../../../core/server/errorHandler";
import { validate as validateSchema } from "../../../core/server/validation/schemaValidator";
import {
  createForm,
  deleteForm,
  getForm,
  getFormWriteState,
  listFormFields,
  setFormFields,
} from "../../../core/services/forms/formsService";
import { formSettingsSchema, FORM_SCHEMA_LIMITS } from "../../../core/services/forms/formSettings";
import { CSS_COLOR_SCHEMA_PATTERNS } from "../../../core/services/theme/cssColorContract";
import {
  FORM_COLOR_CONSUMER_CASES,
  buildFormColorTheme,
} from "../../vitest/forms/formColorConsumerTable";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readSchemaAnyOf = (groups: unknown, group: string, key: string): readonly unknown[] => {
  if (!isUnknownRecord(groups)) throw new Error("form_theme_groups_schema_missing");
  const groupSchema = groups[group];
  if (!isUnknownRecord(groupSchema) || !isUnknownRecord(groupSchema.properties)) {
    throw new Error(`form_theme_group_schema_missing:${group}`);
  }
  const colorSchema = groupSchema.properties[key];
  if (!isUnknownRecord(colorSchema) || !Array.isArray(colorSchema.anyOf)) {
    throw new Error(`form_theme_color_schema_missing:${group}.${key}`);
  }
  return colorSchema.anyOf;
};

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
      patch: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PATCH", path, handlers }),
      put: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "PUT", path, handlers }),
      delete: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "DELETE", path, handlers }),
    },
  };
};

const ownedFormIds: string[] = [];

afterEach(async () => {
  for (const id of ownedFormIds.splice(0).reverse()) {
    await deleteForm(id);
  }
});

const createOwnedForm = async () => {
  const suffix = randomUUID();
  const form = await createForm({ name: `TASK 536 ${suffix}`, slug: `task-536-${suffix}` });
  if (!form) throw new Error("form_fixture_create_failed");
  ownedFormIds.push(form.id);
  return form;
};

const registerExecutableFormsRouter = () => {
  const { router, routes } = makeRouter();
  registerFormsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: validateSchema,
  });
  return routes;
};

const executeRoute = async (routes: Route[], method: string, path: string, ctx: RouteContext) => {
  const route = routes.find((entry) => entry.method === method && entry.path === path);
  if (!route) throw new Error(`route_missing:${method}:${path}`);
  let result: unknown;
  for (const handler of route.handlers) {
    result = await handler(ctx);
  }
  return result;
};

test("registerFormsRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerFormsRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);
  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /forms",
      "POST /forms",
      "GET /forms/:id",
      "PATCH /forms/:id",
      "DELETE /forms/:id",
      "GET /forms/:id/fields",
      "PUT /forms/:id/fields",
      "GET /forms/:id/submissions",
      "POST /forms/:id/uploads",
      "POST /forms/:id/submissions",
    ])
  );
});

test("Form create/update routes retain forms:write and the shared nested theme schema", () => {
  const { router, routes } = makeRouter();
  const permissionByHandler = new Map<RouteHandler, string>();
  registerFormsRoutes(router, {
    requirePermission: (permission) => {
      const handler: RouteHandler = async () => undefined;
      permissionByHandler.set(handler, permission);
      return handler;
    },
    validate: () => undefined,
  });

  for (const [method, path] of [
    ["POST", "/forms"],
    ["PATCH", "/forms/:id"],
  ] as const) {
    const route = routes.find((entry) => entry.method === method && entry.path === path);
    expect(route).toBeDefined();
    expect(permissionByHandler.get(route!.handlers[0]!)).toBe("forms:write");
  }

  for (const schema of [formCreateSchema, formUpdateSchema]) {
    expect(schema.properties.settings).toBe(formSettingsSchema);
    const settings = schema.properties.settings as typeof formSettingsSchema;
    expect(settings.additionalProperties).toBe(false);
    expect(settings.properties.theme.additionalProperties).toBe(false);
    for (const group of ["layout", "surface", "typography", "input", "submit"] as const) {
      expect(settings.properties.theme.properties[group].additionalProperties).toBe(false);
    }
    const groups: unknown = settings.properties.theme.properties;
    for (const entry of FORM_COLOR_CONSUMER_CASES) {
      expect(readSchemaAnyOf(groups, entry.group, entry.key)).toEqual([
        { const: "" },
        {
          type: "string",
          maxLength: FORM_SCHEMA_LIMITS.themeColor,
          pattern: CSS_COLOR_SCHEMA_PATTERNS["inherited-render"],
        },
      ]);
    }
  }
  expect(() =>
    validateSchema(formCreateSchema, {
      name: "Color schema table",
      settings: { theme: buildFormColorTheme("raw") },
    })
  ).not.toThrow();
  expect(() =>
    validateSchema(formUpdateSchema, { settings: { theme: buildFormColorTheme("raw") } })
  ).not.toThrow();
});

test("mapFormError returns stable API errors for known form domain failures", () => {
  const cases: Array<[string, string, number]> = [
    ["form_invalid", "form_invalid", 400],
    ["form_name_required", "form_name_required", 400],
    ["form_slug_exists", "form_slug_exists", 409],
    ["form_not_found", "form_not_found", 404],
    ["form_delete_restricted", "form_delete_restricted", 409],
    ["form_fields_invalid", "form_fields_invalid", 400],
    ["form_field_invalid", "form_field_invalid", 400],
    ["form_field_label_required", "form_field_label_required", 400],
    ["form_field_id_duplicate", "form_field_id_duplicate", 400],
    ["form_field_name_duplicate", "form_field_name_duplicate", 400],
    ["form_payload_invalid", "form_payload_invalid", 400],
    ["form_payload_unknown_field", "form_payload_unknown_field", 400],
    ["form_payload_required", "form_payload_required", 400],
    ["form_success_redirect_url_invalid", "form_success_redirect_url_invalid", 400],
  ];

  for (const [message, code, status] of cases) {
    const mapped = mapFormError(new Error(message));
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped?.code).toBe(code);
    expect(mapped?.status).toBe(status);
  }

  expect(mapFormError(new Error("unrelated"))).toBeNull();
});

test("forms schemas strictly own status enums and full field discriminants", () => {
  expect(formCreateSchema.properties.status).toEqual({
    enum: ["draft", "published", "archived"],
  });
  expect(formUpdateSchema.properties.status).toEqual({
    enum: ["draft", "published", "archived"],
  });
  expect(formFieldsSchema.maxItems).toBe(100);
  expect(formFieldsSchema.items.oneOf).toHaveLength(14);
  for (const branch of formFieldsSchema.items.oneOf) {
    expect(branch.additionalProperties).toBe(false);
    expect(branch.properties.settings.additionalProperties).toBe(false);
  }
});

test("getFormWriteState returns only an immutable canonical status/access projection", async () => {
  const form = await createOwnedForm();
  await db
    .update(forms)
    .set({ status: "published", submissionAccess: "internal" })
    .where(eq(forms.id, form.id));

  const state = await getFormWriteState(form.id);
  expect(state).toEqual({ status: "published", submissionAccess: "internal" });
  expect(Object.keys(state ?? {})).toEqual(["status", "submissionAccess"]);
  expect(Object.isFrozen(state)).toBe(true);
  expect(await getFormWriteState(randomUUID())).toBeNull();

  await db
    .update(forms)
    .set({ status: "PUBLISHED", submissionAccess: "public" })
    .where(eq(forms.id, form.id));
  expect(await getFormWriteState(form.id)).toBeNull();

  await db
    .update(forms)
    .set({ status: "published", submissionAccess: "private" })
    .where(eq(forms.id, form.id));
  expect(await getFormWriteState(form.id)).toBeNull();
});

test("PUT /forms/:id/fields rejects mismatched, unknown, and malformed-id writes without replacing rows", async () => {
  const form = await createOwnedForm();
  await setFormFields(form.id, [
    {
      id: "11111111-2222-3333-4444-555555555555",
      type: "text",
      label: "Sentinel",
      name: "sentinel",
    },
  ]);
  const routes = registerExecutableFormsRouter();
  const invalidFields: unknown[] = [
    [{ type: "text", label: "Mismatch", settings: { options: ["No"] } }],
    [{ type: "text", label: "Outer", unknown: true }],
    [{ type: "text", label: "Nested", settings: { unknown: true } }],
    [{ type: "text", label: "Bad id", id: "not-a-uuid" }],
    [{ type: "text", label: "Padded id", id: " 11111111-2222-3333-4444-555555555555" }],
    [{ type: "text", label: "Long id", id: "1".repeat(37) }],
  ];

  for (const body of invalidFields) {
    await expect(
      executeRoute(routes, "PUT", "/forms/:id/fields", {
        params: { id: form.id },
        query: {},
        body,
      })
    ).rejects.toMatchObject({ code: "validation_error", status: 400 });
    const rows = await listFormFields(form.id);
    expect(rows.map((row) => row.name)).toEqual(["sentinel"]);
  }
});

test("PUT /forms/:id/fields canonicalizes UUID/MIME and preserves duplicate failures before replacement", async () => {
  const form = await createOwnedForm();
  const routes = registerExecutableFormsRouter();
  const upperId = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";

  const inserted = (await executeRoute(routes, "PUT", "/forms/:id/fields", {
    params: { id: form.id },
    query: {},
    body: [
      {
        id: upperId,
        type: "file",
        label: "Attachment",
        name: "attachment",
        settings: { accept: ["IMAGE/PNG", "Application/PDF"], maxSizeMb: 10, multiple: true },
      },
      { type: "text", label: "Generated id", name: "generated" },
      { type: "text", label: "d".repeat(140) },
      { type: "text", label: `${"t".repeat(119)} z` },
    ],
  })) as Array<{ id: string; name: string; settings: { accept?: string[] } }>;

  expect(inserted[0]?.id).toBe(upperId.toLowerCase());
  expect(inserted[0]?.settings.accept).toEqual(["image/png", "application/pdf"]);
  expect(inserted[1]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  expect(inserted[2]?.name).toBe("d".repeat(120));
  expect(inserted[3]?.name).toBe("t".repeat(119));
  expect(() =>
    validateSchema(formSubmissionSchema, {
      data: { [inserted[2]!.name]: "value", [inserted[3]!.name]: "value" },
    })
  ).not.toThrow();
  expect(() =>
    validateSchema(formAttachmentUploadSchema, { fieldName: inserted[2]!.name, file: {} })
  ).not.toThrow();

  await expect(
    executeRoute(routes, "PUT", "/forms/:id/fields", {
      params: { id: form.id },
      query: {},
      body: [
        { id: upperId, type: "text", label: "One", name: "one" },
        { id: upperId.toLowerCase(), type: "text", label: "Two", name: "two" },
      ],
    })
  ).rejects.toMatchObject({ code: "form_field_id_duplicate", status: 400 });

  const afterFailure = await listFormFields(form.id);
  expect(afterFailure.map((row) => row.name)).toEqual([
    "attachment",
    "generated",
    "d".repeat(120),
    "t".repeat(119),
  ]);
});

test("direct setFormFields rejects structural bypasses before form lookup", async () => {
  const missingFormId = randomUUID();
  const invalidInputs: unknown[] = [
    [{ id: "bad", type: "text", label: "Bad" }],
    [{ type: "text", label: "Outer", unknown: true }],
    [{ type: "text", label: "Nested", settings: { unknown: true } }],
  ];
  for (const input of invalidInputs) {
    await expect(
      setFormFields(missingFormId, input as Parameters<typeof setFormFields>[1])
    ).rejects.toThrow("form_field_invalid");
  }
  await expect(
    setFormFields(missingFormId, [
      { type: "range", label: "Cross invariant", settings: { min: 10, max: 5 } },
    ])
  ).rejects.toThrow("form_not_found");
});

test("setFormFields persists its synchronous detached snapshot across the first await", async () => {
  const form = await createOwnedForm();
  const fieldId = "11111111-2222-3333-4444-555555555555";
  const input: Parameters<typeof setFormFields>[1] = [
    {
      id: fieldId,
      type: "text",
      label: "Original label",
      name: "original_name",
      required: true,
      settings: { placeholder: " Original placeholder " },
    },
  ];

  const pendingWrite = setFormFields(form.id, input);
  Object.assign(input[0] as unknown as Record<string, unknown>, {
    id: "schema-forbidden",
    type: "schema-forbidden",
    label: "Mutated label",
    name: "mutated_name",
    settings: { unknown: true },
  });
  input.push({ type: "text", label: "Late field", name: "late_field" });

  const returned = await pendingWrite;
  expect(returned).toHaveLength(1);
  expect(returned[0]).toMatchObject({
    id: fieldId,
    type: "text",
    label: "Original label",
    name: "original_name",
    required: true,
    settings: { placeholder: "Original placeholder" },
  });

  const persisted = await listFormFields(form.id);
  expect(persisted).toHaveLength(1);
  expect(persisted[0]).toMatchObject({
    id: fieldId,
    type: "text",
    label: "Original label",
    name: "original_name",
    required: true,
    settings: { placeholder: "Original placeholder" },
  });
});

test("real create/update routes accept empty/null strings and retain service canonicalization", async () => {
  const routes = registerExecutableFormsRouter();
  const unique = randomUUID();
  const created = (await executeRoute(routes, "POST", "/forms", {
    params: {},
    query: {},
    body: {
      name: `Canonical ${unique}`,
      slug: "",
      description: "   ",
      successMessage: "",
      successRedirectUrl: null,
      settings: {},
    },
  })) as {
    id: string;
    slug: string;
    description: string | null;
    successMessage: string | null;
    successRedirectUrl: string | null;
  };
  ownedFormIds.push(created.id);

  expect(created.slug).toBe(`canonical-${unique}`);
  expect(created.description).toBeNull();
  expect(created.successMessage).toBeNull();
  expect(created.successRedirectUrl).toBeNull();

  const updated = (await executeRoute(routes, "PATCH", "/forms/:id", {
    params: { id: created.id },
    query: {},
    body: {
      name: `Renamed ${unique}`,
      slug: null,
      description: "",
      successMessage: "   ",
      successRedirectUrl: "   ",
    },
  })) as typeof created;
  expect(updated.slug).toBe(`renamed-${unique}`);
  expect(updated.description).toBeNull();
  expect(updated.successMessage).toBeNull();
  expect(updated.successRedirectUrl).toBeNull();
});

test("real create/update routes persist canonical inherited Form theme colors", async () => {
  const routes = registerExecutableFormsRouter();
  const unique = randomUUID();
  const created = (await executeRoute(routes, "POST", "/forms", {
    params: {},
    query: {},
    body: {
      name: `Color contract ${unique}`,
      slug: `color-contract-${unique}`,
      settings: { theme: buildFormColorTheme("raw") },
    },
  })) as { id: string; settings: Record<string, unknown> };
  ownedFormIds.push(created.id);
  expect(created.settings).toMatchObject({ theme: buildFormColorTheme("canonical") });
  expect((await getForm(created.id))?.settings).toMatchObject({
    theme: buildFormColorTheme("canonical"),
  });
  const createdRead = (await executeRoute(routes, "GET", "/forms/:id", {
    params: { id: created.id },
    query: {},
    body: undefined,
  })) as { settings: Record<string, unknown> };
  expect(createdRead.settings).toMatchObject({ theme: buildFormColorTheme("canonical") });

  const updated = (await executeRoute(routes, "PATCH", "/forms/:id", {
    params: { id: created.id },
    query: {},
    body: {
      settings: { theme: buildFormColorTheme("updateRaw") },
    },
  })) as { settings: Record<string, unknown> };
  expect(updated.settings).toMatchObject({ theme: buildFormColorTheme("updateCanonical") });
  expect((await getForm(created.id))?.settings).toMatchObject({
    theme: buildFormColorTheme("updateCanonical"),
  });
  const updatedRead = (await executeRoute(routes, "GET", "/forms/:id", {
    params: { id: created.id },
    query: {},
    body: undefined,
  })) as { settings: Record<string, unknown> };
  expect(updatedRead.settings).toMatchObject({ theme: buildFormColorTheme("updateCanonical") });
});

test("Form theme route validation rejects structure before mutation and omits semantic range failures", async () => {
  const routes = registerExecutableFormsRouter();
  const form = await createOwnedForm();
  const sentinelSettings = form.settings;
  const exactCap = `${" ".repeat(FORM_SCHEMA_LIMITS.themeColor - 4)}#abc`;

  for (const settings of [
    { theme: { surface: { unknownColor: "#fff" } } },
    { theme: { surface: { background: ` ${exactCap}` } } },
  ]) {
    await expect(
      executeRoute(routes, "PATCH", "/forms/:id", {
        params: { id: form.id },
        query: {},
        body: { settings },
      })
    ).rejects.toMatchObject({ code: "validation_error", status: 400 });
    expect((await getForm(form.id))?.settings).toEqual(sentinelSettings);
  }

  const rangeInvalid = (await executeRoute(routes, "PATCH", "/forms/:id", {
    params: { id: form.id },
    query: {},
    body: {
      settings: {
        theme: { surface: { background: "rgb(256, 0, 0)" } },
      },
    },
  })) as { settings: { theme?: unknown } };
  expect(rangeInvalid.settings.theme).toBeUndefined();
  expect(JSON.stringify(rangeInvalid.settings)).not.toContain("rgb(256, 0, 0)");
});

test("real create/update routes pin every slug form and form-string maximum", async () => {
  const routes = registerExecutableFormsRouter();
  const suffix = randomUUID();
  const maxCreateSlug = `${"s".repeat(163)}-${suffix}`;
  const maxUpdateSlug = `${"u".repeat(163)}-${suffix}`;
  expect(maxCreateSlug).toHaveLength(200);
  expect(maxUpdateSlug).toHaveLength(200);
  const slugCases: Array<[string, string | null, string]> = [
    ["Null", null, `null-${suffix}`],
    ["Empty", "", `empty-${suffix}`],
    ["Whitespace", "   ", `whitespace-${suffix}`],
    ["Explicit", `owned-${suffix}`, `owned-${suffix}`],
    ["Maximum", maxCreateSlug, maxCreateSlug],
  ];

  for (const [label, slug, expectedSlug] of slugCases) {
    const created = (await executeRoute(routes, "POST", "/forms", {
      params: {},
      query: {},
      body: { name: `${label} ${suffix}`, slug },
    })) as { id: string; slug: string };
    ownedFormIds.push(created.id);
    expect(created.slug).toBe(expectedSlug);
  }

  await expect(
    executeRoute(routes, "POST", "/forms", {
      params: {},
      query: {},
      body: { name: `Rejected ${suffix}`, slug: "s".repeat(201) },
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 });

  const targetId = ownedFormIds[0]!;
  for (const [slug, expectedSlug] of [
    [null, `null-${suffix}`],
    ["", `null-${suffix}`],
    ["   ", `null-${suffix}`],
    [`updated-${suffix}`, `updated-${suffix}`],
    [maxUpdateSlug, maxUpdateSlug],
  ] as const) {
    const updated = (await executeRoute(routes, "PATCH", "/forms/:id", {
      params: { id: targetId },
      query: {},
      body: { slug },
    })) as { slug: string };
    expect(updated.slug).toBe(expectedSlug);
  }
  await expect(
    executeRoute(routes, "PATCH", "/forms/:id", {
      params: { id: targetId },
      query: {},
      body: { slug: `${maxUpdateSlug}x` },
    })
  ).rejects.toMatchObject({ code: "validation_error", status: 400 });

  const maximumStrings = (await executeRoute(routes, "PATCH", "/forms/:id", {
    params: { id: targetId },
    query: {},
    body: {
      description: "d".repeat(10_000),
      successMessage: "m".repeat(2_000),
      successRedirectUrl: `/${"r".repeat(2_047)}`,
    },
  })) as {
    description: string;
    successMessage: string;
    successRedirectUrl: string;
  };
  expect(maximumStrings.description).toHaveLength(10_000);
  expect(maximumStrings.successMessage).toHaveLength(2_000);
  expect(maximumStrings.successRedirectUrl).toHaveLength(2_048);

  for (const body of [
    { description: "d".repeat(10_001) },
    { successMessage: "m".repeat(2_001) },
    { successRedirectUrl: `/${"r".repeat(2_048)}` },
  ]) {
    await expect(
      executeRoute(routes, "PATCH", "/forms/:id", {
        params: { id: targetId },
        query: {},
        body,
      })
    ).rejects.toMatchObject({ code: "validation_error", status: 400 });
  }
});

test("real fields route maps a schema-valid domain cross-invariant to the named form error", async () => {
  const form = await createOwnedForm();
  const routes = registerExecutableFormsRouter();
  await expect(
    executeRoute(routes, "PUT", "/forms/:id/fields", {
      params: { id: form.id },
      query: {},
      body: [{ type: "range", label: "Range", settings: { min: 10, max: 5, inputStep: 1 } }],
    })
  ).rejects.toMatchObject({ code: "form_field_invalid", status: 400 });
  expect(await listFormFields(form.id)).toEqual([]);
});
