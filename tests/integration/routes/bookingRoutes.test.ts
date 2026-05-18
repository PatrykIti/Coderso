import { expect, test } from "bun:test";

import { mapBookingError, registerBookingRoutes } from "../../../core/server/routes/bookingRoutes";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

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

test("registerBookingRoutes wires booking endpoints", () => {
  const { router, routes } = makeRouter();

  registerBookingRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /booking/resources",
      "POST /booking/resources",
      "GET /booking/resources/:id",
      "PATCH /booking/resources/:id",
      "DELETE /booking/resources/:id",
      "GET /booking/services",
      "POST /booking/services",
      "GET /booking/services/:id",
      "PATCH /booking/services/:id",
      "DELETE /booking/services/:id",
      "GET /booking/services/:id/resources",
      "PUT /booking/services/:id/resources",
      "GET /booking/resources/:id/schedules",
      "PUT /booking/resources/:id/schedules",
      "GET /booking/blackouts",
      "POST /booking/blackouts",
      "DELETE /booking/blackouts/:id",
      "POST /booking/slots/preview",
      "GET /booking/reservations",
      "POST /booking/reservations",
      "PATCH /booking/reservations/:id/status",
    ])
  );
});

test("mapBookingError exposes booking date policy codes", () => {
  expect(mapBookingError(new Error("booking_slot_date_in_past"))?.code).toBe(
    "booking_slot_date_in_past"
  );
  expect(mapBookingError(new Error("booking_slot_date_out_of_range"))?.code).toBe(
    "booking_slot_date_out_of_range"
  );
});
