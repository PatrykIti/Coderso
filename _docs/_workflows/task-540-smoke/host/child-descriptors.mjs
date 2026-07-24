import path from "node:path";

import {
  deepFreezeExact,
  exactDenseArray,
  exactOrderedDataObject,
  invariant,
} from "./validation.mjs";

export function parseCliArgs(args) {
  invariant(
    Array.isArray(args) && args.every((value) => typeof value === "string"),
    "CLI args drift"
  );
  if (args.length === 1 && args[0] === "--self-test") {
    return deepFreezeExact({ mode: "self-test", root: null });
  }
  if (args.length === 2 && args[0] === "--serve") {
    invariant(
      path.isAbsolute(args[1]) && path.resolve(args[1]) === args[1] && !args[1].includes("\0"),
      "serve root must be canonical lexical absolute"
    );
    return deepFreezeExact({ mode: "serve", root: args[1] });
  }
  invariant(false, "expected exactly --self-test or --serve <canonical-root>");
}

export function createChildDescriptorContract(sources) {
  exactOrderedDataObject(
    sources,
    ["BACKEND_SOURCE", "ADMIN_VITE_SOURCE", "SITE_VITE_SOURCE", "CHILD_SOURCE_BYTE_PINS"],
    "child source contract"
  );
  invariant(Object.isFrozen(sources), "child source contract must be frozen");
  exactOrderedDataObject(
    sources.CHILD_SOURCE_BYTE_PINS,
    ["backend", "admin", "site"],
    "child source byte pins"
  );
  invariant(
    Object.isFrozen(sources.CHILD_SOURCE_BYTE_PINS) &&
      [sources.BACKEND_SOURCE, sources.ADMIN_VITE_SOURCE, sources.SITE_VITE_SOURCE].every(
        (source) => typeof source === "string" && source.length > 0
      ),
    "child source contract value drift"
  );

  function childDescriptors(root) {
    const coreRoot = path.join(root, "core");
    return deepFreezeExact([
      {
        kind: "backend",
        file: "bun",
        args: ["--no-env-file", "--cwd", coreRoot, "--eval", sources.BACKEND_SOURCE],
        cwd: root,
      },
      {
        kind: "admin",
        file: "bun",
        args: ["--no-env-file", "--cwd", coreRoot, "--eval", sources.ADMIN_VITE_SOURCE],
        cwd: root,
      },
      {
        kind: "site",
        file: "bun",
        args: ["--no-env-file", "--cwd", coreRoot, "--eval", sources.SITE_VITE_SOURCE],
        cwd: root,
      },
    ]);
  }

  function validateChildDescriptors(descriptors, root) {
    exactDenseArray(descriptors, "host descriptors");
    invariant(
      Array.isArray(descriptors) && descriptors.length === 3,
      "host descriptor cardinality drift"
    );
    const expectedKinds = ["backend", "admin", "site"];
    for (const [index, descriptor] of descriptors.entries()) {
      const kind = expectedKinds[index];
      exactOrderedDataObject(descriptor, ["kind", "file", "args", "cwd"], kind + " descriptor");
      invariant(descriptor.kind === kind, "host descriptor order drift");
      invariant(
        descriptor.file === "bun" && descriptor.cwd === root,
        kind + " descriptor executable drift"
      );
      invariant(
        Array.isArray(descriptor.args) &&
          Object.getPrototypeOf(descriptor.args) === Array.prototype &&
          Reflect.ownKeys(descriptor.args).length === 6 &&
          Reflect.ownKeys(descriptor.args).every(
            (key, keyIndex) => key === (keyIndex === 5 ? "length" : String(keyIndex))
          ),
        kind + " descriptor argv shape drift"
      );
      const expectedArgs = [
        "--no-env-file",
        "--cwd",
        path.join(root, "core"),
        "--eval",
        sources.CHILD_SOURCE_BYTE_PINS[kind],
      ];
      invariant(
        descriptor.args.every((value, argIndex) => value === expectedArgs[argIndex]),
        kind + " descriptor argv/source byte drift"
      );
    }
    invariant(
      sources.BACKEND_SOURCE === sources.CHILD_SOURCE_BYTE_PINS.backend,
      "backend source byte pin drift"
    );
    invariant(
      sources.ADMIN_VITE_SOURCE === sources.CHILD_SOURCE_BYTE_PINS.admin,
      "Admin source byte pin drift"
    );
    invariant(
      sources.SITE_VITE_SOURCE === sources.CHILD_SOURCE_BYTE_PINS.site,
      "site source byte pin drift"
    );
  }

  return Object.freeze({ childDescriptors, validateChildDescriptors });
}
