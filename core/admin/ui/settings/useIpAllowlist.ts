import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import {
  addIpAllowlistEntry,
  listIpAllowlist,
  removeIpAllowlistEntry,
  type IpAllowlistEntry,
} from "@/services/ipAllowlistClient";

export type IpAllowlistFormPayload = {
  cidr: string;
  label?: string;
  description?: string;
};

export function useIpAllowlist() {
  const [entries, setEntries] = useState<IpAllowlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await listIpAllowlist();
      setEntries(items);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load IP allowlist.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEntry = useCallback(
    async (payload: IpAllowlistFormPayload) => {
      setError(null);
      try {
        await addIpAllowlistEntry(payload);
        await refresh();
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to add IP range.");
        }
        throw err;
      }
    },
    [refresh]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await removeIpAllowlistEntry(id);
        await refresh();
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to remove IP range.");
        }
        throw err;
      }
    },
    [refresh]
  );

  return {
    entries,
    isLoading,
    error,
    refresh,
    addEntry,
    removeEntry,
  };
}
