import { expect, test } from "bun:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

type IpAddressInstance = {
  isHostInSubnet(address: IpAddressInstance): boolean;
  isLinkLocal(): boolean;
  isLoopback(): boolean;
  isPrivate(): boolean;
  toByteArray(): number[];
};

type IpAddressConstructor = {
  new (address: string): IpAddressInstance;
  isValid(address: string): boolean;
};

type IpAddressModule = {
  Address4: IpAddressConstructor;
  Address6: IpAddressConstructor & {
    fromURL(url: string): {
      address: IpAddressInstance | null;
      error?: string;
      port: number | null;
    };
  };
};

const root = path.resolve(import.meta.dir, "../../..");
const nestedPackageRoot = path.join(root, "node_modules/npm/node_modules/ip-address");
const requireFromTest = createRequire(import.meta.url);

test("the patched npm bundle materializes the ip-address 10.3.1 security fix", () => {
  const rootPackage = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    patchedDependencies?: Record<string, string>;
  };
  const nestedPackage = JSON.parse(
    readFileSync(path.join(nestedPackageRoot, "package.json"), "utf8")
  ) as { version?: string };
  const { Address4, Address6 } = requireFromTest(nestedPackageRoot) as IpAddressModule;

  expect(rootPackage.patchedDependencies?.["npm@11.18.0"]).toBe("patches/npm@11.18.0.patch");
  expect(nestedPackage.version).toBe("10.3.1");

  expect(new Address6("::ffff:127.0.0.1").isLoopback()).toBe(true);
  expect(new Address6("::ffff:10.0.0.1").isPrivate()).toBe(true);
  expect(new Address6("::ffff:169.254.169.254").isLinkLocal()).toBe(true);
  expect(new Address6("64:ff9b::7f00:1").isLoopback()).toBe(true);
  expect(new Address6("64:ff9b::a9fe:a9fe").isLinkLocal()).toBe(true);

  expect(new Address4("127.0.0.1/0").isLoopback()).toBe(true);
  expect(new Address4("10.0.0.5/7").isPrivate()).toBe(true);
  expect(new Address4("169.254.169.254/0").isLinkLocal()).toBe(true);
  expect(new Address6("::1/0").isLoopback()).toBe(true);
  expect(new Address6("::ffff:127.0.0.1/0").isLoopback()).toBe(true);
  expect(new Address6("64:ff9b::7f00:1/0").isLoopback()).toBe(true);

  expect(Address4.isValid("012.0.0.1")).toBe(false);
  expect(() => new Address4("012.0.0.1")).toThrow("IPv4 addresses can't have leading zeroes.");
  expect(Address4.isValid("0.0.0.1")).toBe(true);

  expect(Address6.isValid("::ffff:012.0.0.1")).toBe(false);
  expect(() => new Address6("::ffff:012.0.0.1")).toThrow(
    "IPv4 addresses can't have leading zeroes."
  );
  expect(Address6.isValid("::/0/1")).toBe(false);
  expect(() => new Address6("::/0/1")).toThrow("Invalid subnet mask.");

  const address6 = new Address6("ffff::");
  expect(typeof address6.isHostInSubnet).toBe("function");
  expect(address6.toByteArray()).toHaveLength(16);
  const parsedUrl = Address6.fromURL("http://[ffff::]:65536/path");
  expect(parsedUrl.error).toBeUndefined();
  expect(parsedUrl.address).not.toBeNull();
  expect(parsedUrl.port).toBeNull();
});
