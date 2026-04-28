import { expect, test } from "vitest";

import {
  buildAbsolutePublicUrl,
  resolvePublicBaseUrlFromSources,
} from "../../../core/server/utils/baseUrl";

test("resolvePublicBaseUrlFromSources prefers settings over env and request", () => {
  const result = resolvePublicBaseUrlFromSources({
    settingValue: "https://settings.example.com",
    envValue: "https://env.example.com",
    context: {
      host: "fallback.example.com",
      forwardedProto: "http",
    },
  });

  expect(result).toBe("https://settings.example.com/");
});

test("resolvePublicBaseUrlFromSources uses env fallback when setting is missing", () => {
  const result = resolvePublicBaseUrlFromSources({
    settingValue: null,
    envValue: "https://env.example.com",
    context: {
      host: "fallback.example.com",
      forwardedProto: "http",
    },
  });

  expect(result).toBe("https://env.example.com/");
});

test("resolvePublicBaseUrlFromSources builds URL from forwarded host/proto", () => {
  const result = resolvePublicBaseUrlFromSources({
    settingValue: null,
    envValue: "",
    context: {
      host: "localhost:3000",
      forwardedHost: "public.example.com, proxy.example.com",
      forwardedProto: "http,https",
    },
  });

  expect(result).toBe("http://public.example.com/");
});

test("resolvePublicBaseUrlFromSources defaults to http for localhost when proto is missing", () => {
  const result = resolvePublicBaseUrlFromSources({
    settingValue: null,
    envValue: "",
    context: {
      host: "localhost:3000",
      forwardedHost: null,
      forwardedProto: null,
    },
  });

  expect(result).toBe("http://localhost:3000/");
});

test("resolvePublicBaseUrlFromSources defaults to https for non-localhost when proto is missing", () => {
  const result = resolvePublicBaseUrlFromSources({
    settingValue: null,
    envValue: "",
    context: {
      host: "public.example.com",
      forwardedHost: null,
      forwardedProto: null,
    },
  });

  expect(result).toBe("https://public.example.com/");
});

test("resolvePublicBaseUrlFromSources rejects invalid request host/proto", () => {
  const invalidHost = resolvePublicBaseUrlFromSources({
    settingValue: null,
    envValue: "",
    context: {
      host: "https://bad-host.example.com/path",
      forwardedProto: "https",
    },
  });

  const invalidProto = resolvePublicBaseUrlFromSources({
    settingValue: null,
    envValue: "",
    context: {
      host: "public.example.com",
      forwardedProto: "ftp",
    },
  });

  expect(invalidHost).toBeNull();
  expect(invalidProto).toBeNull();
});

test("buildAbsolutePublicUrl joins path with base URL", () => {
  const absolute = buildAbsolutePublicUrl(
    "https://www.example.com/",
    "/preview?type=page&token=abc"
  );
  const relative = buildAbsolutePublicUrl(null, "/preview?type=page&token=abc");

  expect(absolute).toBe("https://www.example.com/preview?type=page&token=abc");
  expect(relative).toBe("/preview?type=page&token=abc");
});
