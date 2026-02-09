import { apiRequest } from "./apiClient";
import type { DashboardPayload } from "../../services/dashboard/dashboardTypes";

export async function getDashboardData() {
  return apiRequest<DashboardPayload>("/dashboard", {
    method: "GET",
  });
}
