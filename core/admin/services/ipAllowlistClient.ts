import { apiRequest } from "./apiClient";

export type IpAllowlistEntry = {
  id: string;
  cidr: string;
  label: string | null;
  description: string | null;
  createdAt: string;
};

export async function listIpAllowlist() {
  const response = await apiRequest<{ items: IpAllowlistEntry[] }>(
    "/ip-allowlist",
    { method: "GET" }
  );
  return response.items ?? [];
}

export async function addIpAllowlistEntry(payload: {
  cidr: string;
  label?: string;
  description?: string;
}) {
  return apiRequest<IpAllowlistEntry>(
    "/ip-allowlist",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function removeIpAllowlistEntry(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/ip-allowlist/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
