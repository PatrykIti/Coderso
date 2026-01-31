import { expect, test } from "bun:test";
import { registerAccessLogRoutes } from "../../../core/server/routes/accessLogRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
    },
  };
};

test("registerAccessLogRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerAccessLogRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  expect(routes).toEqual([{ method: "GET", path: "/access-logs" }]);
});
