import {
  deepFreezeExact,
  invariant,
} from "./foundation.mjs";

const PRIVATE_CAPTURES = new WeakMap();

class SingleAssignmentCaptureMap {
  constructor() {
    PRIVATE_CAPTURES.set(this, new Map());
  }

  bind(name, value) {
    const values = PRIVATE_CAPTURES.get(this);
    invariant(typeof name === "string" && name.length > 0, "capture name must be non-empty");
    invariant(!values.has(name), "capture may be bound only once: " + name);
    invariant(
      typeof value === "string" && value.length > 0 && value.length <= 2048,
      "capture value must be bounded"
    );
    values.set(name, value);
  }

  get(name) {
    const values = PRIVATE_CAPTURES.get(this);
    invariant(values.has(name), "capture is unbound: " + name);
    return values.get(name);
  }

  has(name) {
    return PRIVATE_CAPTURES.get(this).has(name);
  }

  safeProjection(names) {
    const values = PRIVATE_CAPTURES.get(this);
    return names.map((name) => {
      invariant(values.has(name), "canonical capture is unbound: " + name);
      return deepFreezeExact({ name, value: values.get(name) });
    });
  }
}

export { SingleAssignmentCaptureMap };
