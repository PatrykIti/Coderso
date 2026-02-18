import { ApiError, toErrorResponse } from "./errorHandler";
import { checkRateLimit } from "./middleware/rateLimit";
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
  runtimeToken: string;
};

const normalizeSlotsQuery = (url: URL): BookingPublicSlotsQuery => ({
  serviceId: url.searchParams.get("serviceId") ?? "",
  resourceId: url.searchParams.get("resourceId") ?? "",
  date: url.searchParams.get("date") ?? "",
  runtimeToken: url.searchParams.get("runtimeToken") ?? "",
  timezone: url.searchParams.get("timezone") ?? undefined,
  intervalMinutes: parsePositiveInt(url.searchParams.get("intervalMinutes")),
});

type PublicReservationBody = BookingReservationInput & {
  formNonce: string;
  captchaToken?: string;
};

const readText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const normalizeReservationBody = (body: unknown): PublicReservationBody => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      serviceId: "",
      resourceId: "",
      startsAt: "",
      endsAt: "",
      customerName: "",
      formNonce: "",
    };
  }

  const payload = body as Record<string, unknown>;

  const formNonce =
    readText(payload.formNonce) ?? readText(payload.__nl_booking_nonce) ?? "";

  return {
    serviceId: readText(payload.serviceId) ?? "",
    resourceId: readText(payload.resourceId) ?? "",
    startsAt: readText(payload.startsAt) ?? "",
    endsAt: readText(payload.endsAt) ?? "",
    timezone: readText(payload.timezone),
    customerName: readText(payload.customerName) ?? "",
    customerEmail: readText(payload.customerEmail) ?? null,
    customerPhone: readText(payload.customerPhone) ?? null,
    notes: readText(payload.notes) ?? null,
    metadata:
      payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
        ? (payload.metadata as Record<string, unknown>)
        : {},
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
};

export async function handlePublicBookingApi(
  req: Request,
  ctx: PublicBookingApiContext
): Promise<Response | null> {
  const { url, ip, userAgent, security } = ctx;

  if (!url.pathname.startsWith("/api/booking")) return null;

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
      assertBookingSlotsToken(input.runtimeToken);
      const { runtimeToken: _runtimeToken, ...previewInput } = input;
      await ensureSlotRequestAllowed(previewInput);
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

      assertBookingSubmissionNonce(body.formNonce);
      await enforceBotProtection({
        token: body.captchaToken,
        action: "public_write",
        ip,
        settings: security.botProtection,
      });

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
        metadata: body.metadata,
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
