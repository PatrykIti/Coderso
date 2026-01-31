import {
  createForm,
  deleteForm,
  getForm,
  listFormFields,
  listForms,
  setFormFields,
  updateForm,
} from "../../services/forms/formsService";
import {
  listSubmissions,
  submitForm,
} from "../../services/forms/submissionService";
import {
  formCreateSchema,
  formFieldsSchema,
  formSubmissionSchema,
  formUpdateSchema,
} from "../validation/formSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  ip?: string;
  userAgent?: string;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
  put: (path: string, ...handlers: RouteHandler[]) => void;
};

export type FormsRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

type SubmissionBody = { data: Record<string, unknown> };

export function registerFormsRoutes(router: Router, deps: FormsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/forms", requirePermission("forms:read"), async () => {
    return listForms();
  });

  router.post("/forms", requirePermission("forms:write"), async (ctx) => {
    validate(formCreateSchema, ctx.body);
    return createForm(ctx.body as Parameters<typeof createForm>[0]);
  });

  router.get("/forms/:id", requirePermission("forms:read"), async (ctx) => {
    const form = await getForm(ctx.params.id);
    if (!form) throw new Error("form_not_found");
    return form;
  });

  router.patch("/forms/:id", requirePermission("forms:write"), async (ctx) => {
    validate(formUpdateSchema, ctx.body);
    const updated = await updateForm(ctx.params.id, ctx.body as Parameters<typeof updateForm>[1]);
    if (!updated) throw new Error("form_not_found");
    return updated;
  });

  router.delete("/forms/:id", requirePermission("forms:write"), async (ctx) => {
    const deleted = await deleteForm(ctx.params.id);
    if (!deleted) throw new Error("form_not_found");
    return { ok: true };
  });

  router.get("/forms/:id/fields", requirePermission("forms:read"), async (ctx) => {
    return listFormFields(ctx.params.id);
  });

  router.put("/forms/:id/fields", requirePermission("forms:write"), async (ctx) => {
    validate(formFieldsSchema, ctx.body);
    return setFormFields(ctx.params.id, ctx.body as Parameters<typeof setFormFields>[1]);
  });

  router.get(
    "/forms/:id/submissions",
    requirePermission("forms:read"),
    async (ctx) => {
      return listSubmissions(ctx.params.id);
    }
  );

  router.post("/forms/:id/submissions", async (ctx) => {
    validate(formSubmissionSchema, ctx.body);
    const body = ctx.body as SubmissionBody;
    return submitForm(ctx.params.id, body.data, {
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  });
}
