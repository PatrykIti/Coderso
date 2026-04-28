import { expect, test } from "bun:test";

import { enforceIpAllowlist } from "../../../core/server/middleware/ipAllowlist";
import type { IpAllowlistEntry } from "../../../core/services/security/ipAllowlistService";

const sampleEntry: IpAllowlistEntry = {
  id: "entry-1",
  cidr: "192.168.1.0/24",
  label: "Office",
  description: null,
  createdAt: new Date(),
};

test("enforceIpAllowlist allows when list is empty", async () => {
  await expect(enforceIpAllowlist("10.0.0.1", [])).resolves.toBeUndefined();
});

test("enforceIpAllowlist blocks when ip missing", async () => {
  await expect(enforceIpAllowlist(undefined, [sampleEntry])).rejects.toThrow(
    "Forbidden"
  );
});

test("enforceIpAllowlist blocks when ip not in range", async () => {
  await expect(enforceIpAllowlist("10.0.0.1", [sampleEntry])).rejects.toThrow(
    "Forbidden"
  );
});

test("enforceIpAllowlist allows matching ip", async () => {
  await expect(enforceIpAllowlist("192.168.1.25", [sampleEntry])).resolves.toBeUndefined();
});
