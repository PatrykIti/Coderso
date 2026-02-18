import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  createBookingBlackout,
  createBookingReservation,
  createBookingResource,
  createBookingService,
  deleteBookingBlackout,
  deleteBookingResource,
  deleteBookingService,
  getBookingResource,
  getBookingService,
  listBookingBlackouts,
  listBookingResources,
  listBookings,
  listBookingSchedules,
  listBookingServiceResources,
  listBookingServices,
  previewBookingSlots,
  setBookingSchedules,
  setBookingServiceResources,
  updateBookingReservationStatus,
  updateBookingResource,
  updateBookingService,
  type BookingBlackoutInput,
  type BookingReservationInput,
  type BookingReservationStatus,
  type BookingResourceInput,
  type BookingScheduleInput,
  type BookingServiceInput,
  type BookingServiceResourceInput,
  type BookingSlotPreviewInput,
} from "../../services/booking/bookingService";
import {
  bookingBlackoutCreateSchema,
  bookingReservationCreateSchema,
  bookingReservationStatusSchema,
  bookingResourceCreateSchema,
  bookingResourceUpdateSchema,
  bookingSchedulesSchema,
  bookingServiceCreateSchema,
  bookingServiceResourcesSchema,
  bookingServiceUpdateSchema,
  bookingSlotPreviewSchema,
} from "../validation/bookingSchemas";

export type BookingRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type BookingRouteDeps = {
  requirePermission: (permission: string) => BookingRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: BookingRouteHandler[]) => void;
  post: (path: string, ...handlers: BookingRouteHandler[]) => void;
  patch: (path: string, ...handlers: BookingRouteHandler[]) => void;
  put: (path: string, ...handlers: BookingRouteHandler[]) => void;
  delete: (path: string, ...handlers: BookingRouteHandler[]) => void;
};

const mapBookingError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "booking_resource_not_found":
      return new ApiError("booking_resource_not_found", "Booking resource not found", 404);
    case "booking_service_not_found":
      return new ApiError("booking_service_not_found", "Booking service not found", 404);
    case "booking_blackout_not_found":
      return new ApiError("booking_blackout_not_found", "Booking blackout not found", 404);
    case "booking_reservation_not_found":
      return new ApiError("booking_reservation_not_found", "Booking reservation not found", 404);
    case "booking_resource_slug_exists":
      return new ApiError("booking_resource_slug_exists", "Booking resource slug already exists", 409);
    case "booking_service_slug_exists":
      return new ApiError("booking_service_slug_exists", "Booking service slug already exists", 409);
    case "booking_slot_unavailable":
      return new ApiError("booking_slot_unavailable", "Selected slot is not available", 409);
    case "booking_blackout_conflict":
      return new ApiError("booking_blackout_conflict", "Selected slot overlaps a blackout window", 409);
    case "booking_service_resource_not_allowed":
      return new ApiError(
        "booking_service_resource_not_allowed",
        "Resource is not allowed for this service",
        400
      );
    case "booking_service_inactive":
      return new ApiError("booking_service_inactive", "Service is inactive", 400);
    case "booking_resource_inactive":
      return new ApiError("booking_resource_inactive", "Resource is inactive", 400);
    case "booking_slot_date_invalid":
      return new ApiError("booking_slot_date_invalid", "Slot date is invalid", 400);
    default:
      if (error.message.startsWith("booking_")) {
        return new ApiError(error.message, "Invalid booking payload", 400);
      }
      return null;
  }
};

const withBookingErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapBookingError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerBookingRoutes(router: Router, deps: BookingRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/booking/resources", requirePermission("booking:read"), async () => {
    return withBookingErrors(async () => {
      const items = await listBookingResources();
      return { items };
    });
  });

  router.post("/booking/resources", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      validate(bookingResourceCreateSchema, ctx.body ?? {});
      return createBookingResource((ctx.body ?? {}) as BookingResourceInput);
    });
  });

  router.get("/booking/resources/:id", requirePermission("booking:read"), async (ctx) => {
    return withBookingErrors(async () => {
      const item = await getBookingResource(ctx.params.id);
      if (!item) throw new Error("booking_resource_not_found");
      return item;
    });
  });

  router.patch("/booking/resources/:id", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      validate(bookingResourceUpdateSchema, ctx.body ?? {});
      const updated = await updateBookingResource(
        ctx.params.id,
        (ctx.body ?? {}) as Partial<BookingResourceInput>
      );
      if (!updated) throw new Error("booking_resource_not_found");
      return updated;
    });
  });

  router.delete("/booking/resources/:id", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      const removed = await deleteBookingResource(ctx.params.id);
      if (!removed) throw new Error("booking_resource_not_found");
      return { ok: true };
    });
  });

  router.get("/booking/services", requirePermission("booking:read"), async () => {
    return withBookingErrors(async () => {
      const items = await listBookingServices();
      return { items };
    });
  });

  router.post("/booking/services", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      validate(bookingServiceCreateSchema, ctx.body ?? {});
      return createBookingService((ctx.body ?? {}) as BookingServiceInput);
    });
  });

  router.get("/booking/services/:id", requirePermission("booking:read"), async (ctx) => {
    return withBookingErrors(async () => {
      const item = await getBookingService(ctx.params.id);
      if (!item) throw new Error("booking_service_not_found");
      return item;
    });
  });

  router.patch("/booking/services/:id", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      validate(bookingServiceUpdateSchema, ctx.body ?? {});
      const updated = await updateBookingService(
        ctx.params.id,
        (ctx.body ?? {}) as Partial<BookingServiceInput>
      );
      if (!updated) throw new Error("booking_service_not_found");
      return updated;
    });
  });

  router.delete("/booking/services/:id", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      const removed = await deleteBookingService(ctx.params.id);
      if (!removed) throw new Error("booking_service_not_found");
      return { ok: true };
    });
  });

  router.get(
    "/booking/services/:id/resources",
    requirePermission("booking:read"),
    async (ctx) => {
      return withBookingErrors(async () => {
        const items = await listBookingServiceResources(ctx.params.id);
        return { items };
      });
    }
  );

  router.put(
    "/booking/services/:id/resources",
    requirePermission("booking:write"),
    async (ctx) => {
      return withBookingErrors(async () => {
        validate(bookingServiceResourcesSchema, ctx.body ?? []);
        const items = await setBookingServiceResources(
          ctx.params.id,
          (ctx.body ?? []) as BookingServiceResourceInput[]
        );
        return { items };
      });
    }
  );

  router.get(
    "/booking/resources/:id/schedules",
    requirePermission("booking:read"),
    async (ctx) => {
      return withBookingErrors(async () => {
        const items = await listBookingSchedules(ctx.params.id);
        return { items };
      });
    }
  );

  router.put(
    "/booking/resources/:id/schedules",
    requirePermission("booking:write"),
    async (ctx) => {
      return withBookingErrors(async () => {
        validate(bookingSchedulesSchema, ctx.body ?? []);
        const items = await setBookingSchedules(ctx.params.id, (ctx.body ?? []) as BookingScheduleInput[]);
        return { items };
      });
    }
  );

  router.get("/booking/blackouts", requirePermission("booking:read"), async (ctx) => {
    return withBookingErrors(async () => {
      const items = await listBookingBlackouts({
        resourceId: ctx.query.resourceId,
      });
      return { items };
    });
  });

  router.post("/booking/blackouts", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      validate(bookingBlackoutCreateSchema, ctx.body ?? {});
      return createBookingBlackout((ctx.body ?? {}) as BookingBlackoutInput);
    });
  });

  router.delete("/booking/blackouts/:id", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      const deleted = await deleteBookingBlackout(ctx.params.id);
      if (!deleted) throw new Error("booking_blackout_not_found");
      return { ok: true };
    });
  });

  router.post("/booking/slots/preview", requirePermission("booking:read"), async (ctx) => {
    return withBookingErrors(async () => {
      validate(bookingSlotPreviewSchema, ctx.body ?? {});
      const items = await previewBookingSlots((ctx.body ?? {}) as BookingSlotPreviewInput);
      return { items };
    });
  });

  router.get("/booking/reservations", requirePermission("booking:read"), async (ctx) => {
    return withBookingErrors(async () => {
      const status = (ctx.query.status ?? undefined) as BookingReservationStatus | undefined;
      const items = await listBookings({
        resourceId: ctx.query.resourceId,
        serviceId: ctx.query.serviceId,
        status,
        from: ctx.query.from,
        to: ctx.query.to,
      });
      return { items };
    });
  });

  router.post("/booking/reservations", requirePermission("booking:write"), async (ctx) => {
    return withBookingErrors(async () => {
      validate(bookingReservationCreateSchema, ctx.body ?? {});
      return createBookingReservation((ctx.body ?? {}) as BookingReservationInput);
    });
  });

  router.patch(
    "/booking/reservations/:id/status",
    requirePermission("booking:write"),
    async (ctx) => {
      return withBookingErrors(async () => {
        validate(bookingReservationStatusSchema, ctx.body ?? {});
        const payload = (ctx.body ?? {}) as { status: BookingReservationStatus };
        const updated = await updateBookingReservationStatus(ctx.params.id, payload.status);
        if (!updated) throw new Error("booking_reservation_not_found");
        return updated;
      });
    }
  );
}
