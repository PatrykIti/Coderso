import { expect, test } from "bun:test";
import { registerIpAllowlistRoutes } from "../../../core/server/routes/ipAllowlistRoutes";

type Route = { method: string; path: string };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string) => routes.push({ method: "GET", path }),
      post: (path: string) => routes.push({ method: "POST", path }),
      delete: (path: string) => routes.push({ method: "DELETE", path }),
    },
  };
};

test("registerIpAllowlistRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();

  registerIpAllowlistRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  expect(routes).toEqual(
    expect.arrayContaining([
      { method: "GET", path: "/ip-allowlist" },
      { method: "POST", path: "/ip-allowlist" },
      { method: "DELETE", path: "/ip-allowlist/:id" },
    ])
  );
});
