import { ApiError, toErrorResponse } from "./errorHandler";
import { checkRateLimit } from "./middleware/rateLimit";
import { attachUserFromSession } from "./middleware/auth";
import { requirePermission } from "./middleware/rbac";
import { parseRequestBody } from "./requestBody";
import type { SecuritySettings } from "../services/settings/securitySettings";
import { validate } from "./validation/schemaValidator";
import {
  bookingPublicReservationSchema,
  bookingPublicSlotQuerySchema,
} from "./validation/bookingSchemas";
import {
  createBookingReservation,
  getBookingResource,
  getBookingService,
  listBookingServiceResources,
  previewBookingSlots,
  type BookingReservationInput,
  type BookingSlotPreviewInput,
} from "../services/booking/bookingService";
import { enforceBotProtection } from "../services/security/botProtection";
import { assertBookingSubmissionNonce } from "../services/booking/bookingSubmissionNonce";
import { assertBookingSlotsToken } from "../services/booking/bookingSlotsToken";
import {
  evaluateBookingAccess,
  resolveBookingAccessModeFromSettings,
} from "../services/booking/bookingAccess";
import { authenticateApiKey } from "../services/security/apiKeyAuth";
import { mapBookingError } from "./routes/bookingRoutes";

export type PublicBookingApiContext = {
  url: URL;
  ip?: string;
  userAgent?: string;
  security: SecuritySettings;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorResponse = (error: unknown) => {
  if (error instanceof ApiError) {
    return jsonResponse(toErrorResponse(error), error.status);
  }
  const mapped = mapBookingError(error);
  if (mapped) {
    return jsonResponse(toErrorResponse(mapped), mapped.status);
  }
  return jsonResponse(toErrorResponse(error), 500);
};

const parsePositiveInt = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.floor(parsed);
};

type BookingPublicSlotsQuery = BookingSlotPreviewInput & {
  runtimeToken?: string;
};

const normalizeSlotsQuery = (url: URL): BookingPublicSlotsQuery => ({
  serviceId: url.searchParams.get("serviceId") ?? "",
  resourceId: url.searchParams.get("resourceId") ?? "",
  date: url.searchParams.get("date") ?? "",
  runtimeToken: url.searchParams.get("runtimeToken") ?? undefined,
  timezone: url.searchParams.get("timezone") ?? undefined,
  intervalMinutes: parsePositiveInt(url.searchParams.get("intervalMinutes")),
});

type PublicReservationBody = Omit<BookingReservationInput, "metadata"> & {
  metadata: unknown;
  formNonce?: string;
  captchaToken?: string;
};

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const readOptionalText = (value: unknown) => {
  if (value === null) return null;
  return readText(value);
};

const normalizeReservationMetadataConsent = (value: unknown): unknown => {
  if (!isPlainObject(value)) return value;
  return {
    ...value,
    ...(hasOwn(value, "accepted") ? { accepted: value.accepted } : {}),
    ...(hasOwn(value, "label") ? { label: readText(value.label) } : {}),
  };
};

const normalizeReservationMetadataCustomField = (value: unknown): unknown => {
  if (!isPlainObject(value)) return value;
  return {
    ...value,
    ...(hasOwn(value, "id") ? { id: readText(value.id) } : {}),
    ...(hasOwn(value, "label") ? { label: readText(value.label) } : {}),
    ...(hasOwn(value, "type") ? { type: readText(value.type) } : {}),
    ...(hasOwn(value, "value") ? { value: readOptionalText(value.value) } : {}),
    ...(hasOwn(value, "checked") ? { checked: value.checked } : {}),
  };
};

const normalizeReservationMetadata = (value: unknown): unknown => {
  if (value === undefined) return {};
  if (!isPlainObject(value)) return value;

  return {
    ...value,
    ...(hasOwn(value, "flowId") ? { flowId: readText(value.flowId) } : {}),
    ...(hasOwn(value, "pathname") ? { pathname: readText(value.pathname) } : {}),
    ...(hasOwn(value, "consent")
      ? { consent: normalizeReservationMetadataConsent(value.consent) }
      : {}),
    ...(hasOwn(value, "customFields")
      ? {
          customFields: Array.isArray(value.customFields)
            ? value.customFields.map(normalizeReservationMetadataCustomField)
            : value.customFields,
        }
      : {}),
  };
};

const normalizeReservationBody = (body: unknown): PublicReservationBody => {
  if (!isPlainObject(body)) {
    return {
      serviceId: "",
      resourceId: "",
      startsAt: "",
      endsAt: "",
      customerName: "",
      metadata: {},
    };
  }

  const payload = body;

  const formNonce =
    readText(payload.formNonce) ?? readText(payload.__nl_booking_nonce) ?? undefined;

  const normalized: Record<string, unknown> = { ...payload };
  delete normalized.__nl_booking_nonce;

  return {
    ...normalized,
    serviceId: readText(payload.serviceId) ?? "",
    resourceId: readText(payload.resourceId) ?? "",
    startsAt: readText(payload.startsAt) ?? "",
    endsAt: readText(payload.endsAt) ?? "",
    timezone: readText(payload.timezone),
    customerName: readText(payload.customerName) ?? "",
    customerEmail: readText(payload.customerEmail) ?? null,
    customerPhone: readText(payload.customerPhone) ?? null,
    notes: readText(payload.notes) ?? null,
    metadata: normalizeReservationMetadata(payload.metadata),
    formNonce,
    captchaToken: readText(payload.captchaToken),
  };
};

const ensureSlotRequestAllowed = async (input: BookingSlotPreviewInput) => {
  const service = await getBookingService(input.serviceId);
  if (!service) throw new Error("booking_service_not_found");
  if (service.status !== "active") throw new Error("booking_service_inactive");

  const resource = await getBookingResource(input.resourceId);
  if (!resource) throw new Error("booking_resource_not_found");
  if (resource.status !== "active") throw new Error("booking_resource_inactive");

  const allowedResources = await listBookingServiceResources(service.id);
  const isAllowed = allowedResources.some((item) => item.resourceId === resource.id);
  if (!isAllowed) throw new Error("booking_service_resource_not_allowed");

  return { service, resource };
};

const parseCookies = (header: string | null) => {
  if (!header) return {} as Record<string, string>;
  const cookies: Record<string, string> = {};
  for (const entry of header.split(";")) {
    const chunk = entry.trim();
    if (!chunk) continue;
    const splitIndex = chunk.indexOf("=");
    if (splitIndex <= 0) continue;
    const key = chunk.slice(0, splitIndex).trim();
    const value = chunk.slice(splitIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
};

const buildHeadersRecord = (req: Request) => {
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
};

const resolveSessionUser = async (req: Request) => {
  const authContext: {
    headers?: Record<string, string | undefined>;
    cookies?: Record<string, string | undefined>;
    user?: { id: string; email?: string; name?: string | null };
  } = {
    headers: buildHeadersRecord(req),
    cookies: parseCookies(req.headers.get("cookie")),
  };
  await attachUserFromSession(authContext);
  return authContext.user;
};

const enforceBookingRuntimeAccess = async (params: {
  mode: "public" | "internal";
  user?: { id: string; email?: string; name?: string | null };
  authorizationHeader?: string | null;
  requiredPermission: "booking:read" | "booking:write";
}) => {
  const apiKey = params.user ? null : await authenticateApiKey(params.authorizationHeader ?? null);
  const access = evaluateBookingAccess({
    mode: params.mode,
    isAuthenticated: Boolean(params.user),
    apiKeyScopes: apiKey?.scopes,
  });

  if (!access.allow) {
    if (access.reason === "forbidden") {
      throw new ApiError("forbidden", "Forbidden", 403);
    }
    throw new ApiError("auth_required", "Not authenticated", 401);
  }

  if (params.user) {
    try {
      await requirePermission(params.requiredPermission)({ user: params.user });
    } catch (error) {
      if (error instanceof Error && error.message === "auth_required") {
        throw new ApiError("auth_required", "Not authenticated", 401);
      }
      throw new ApiError("forbidden", "Forbidden", 403);
    }
  }

  return access;
};

export async function handlePublicBookingApi(
  req: Request,
  ctx: PublicBookingApiContext
): Promise<Response | null> {
  const { url, ip, userAgent, security } = ctx;

  if (!url.pathname.startsWith("/api/booking")) return null;

  const sessionUser = await resolveSessionUser(req);
  const authorizationHeader = req.headers.get("authorization");

  if (req.method === "GET" && url.pathname === "/api/booking/slots") {
    checkRateLimit(
      "public_read",
      {
        ip,
        userAgent,
      },
      security.rateLimit
    );

    try {
      const input = normalizeSlotsQuery(url);
      validate(bookingPublicSlotQuerySchema, input);
      const { runtimeToken, ...previewInput } = input;
      const { service } = await ensureSlotRequestAllowed(previewInput);

      const accessMode = resolveBookingAccessModeFromSettings(service.settings, "public");
      const access = await enforceBookingRuntimeAccess({
        mode: accessMode,
        user: sessionUser,
        authorizationHeader,
        requiredPermission: "booking:read",
      });

      if (access.requireCaptcha) {
        assertBookingSlotsToken(runtimeToken);
      }

      const items = await previewBookingSlots(previewInput);
      return jsonResponse({ items });
    } catch (error) {
      return errorResponse(error);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/booking/reservations") {
    try {
      checkRateLimit(
        "public_write",
        {
          ip,
          userAgent,
        },
        security.rateLimit
      );

      const raw = await parseRequestBody(req);
      const body = normalizeReservationBody(raw);
      validate(bookingPublicReservationSchema, body);

      const service = await getBookingService(body.serviceId);
      if (!service) throw new Error("booking_service_not_found");

      const accessMode = resolveBookingAccessModeFromSettings(service.settings, "public");
      const access = await enforceBookingRuntimeAccess({
        mode: accessMode,
        user: sessionUser,
        authorizationHeader,
        requiredPermission: "booking:write",
      });

      if (access.requireCaptcha) {
        assertBookingSubmissionNonce(body.formNonce);
        await enforceBotProtection({
          token: body.captchaToken,
          action: "public_write",
          ip,
          settings: security.botProtection,
        });
      }

      const created = await createBookingReservation({
        serviceId: body.serviceId,
        resourceId: body.resourceId,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        timezone: body.timezone,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        notes: body.notes,
        metadata: body.metadata as Record<string, unknown>,
      });

      if (!created) {
        throw new ApiError("booking_reservation_failed", "Reservation failed", 500);
      }

      return jsonResponse({
        ...created,
        runtime: {
          successMessage: "Appointment booked successfully.",
        },
      });
    } catch (error) {
      return errorResponse(error);
    }
  }

  return jsonResponse(
    {
      error: {
        code: "not_found",
        message: "Not found",
      },
    },
    404
  );
}
