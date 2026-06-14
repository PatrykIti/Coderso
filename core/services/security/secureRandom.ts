const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export const createSecureRandomHexFragment = (hexLength: number): string | null => {
  if (!Number.isSafeInteger(hexLength) || hexLength < 1) {
    throw new RangeError("hexLength must be a positive safe integer");
  }

  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").toLowerCase().slice(0, hexLength);
  }
  if (typeof crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(Math.ceil(hexLength / 2));
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes).slice(0, hexLength);
  }
  return null;
};
