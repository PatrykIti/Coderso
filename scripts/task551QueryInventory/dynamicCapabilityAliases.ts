/** Declaration-kind labels for fail-closed dynamic capability alias collisions. */
import type { ClientKind, ConstructorKind } from "./clientExpressions";

export type DynamicCapabilityAliasKind =
  | ClientKind
  | ConstructorKind
  | "client-namespace"
  | "session-namespace"
  | "session-wrapper"
  | "postgres-namespace"
  | "drizzle-namespace";

/** Returns the classifier kind currently associated with one dynamic-derived name. */
export function dynamicCapabilityAliasKind(
  name: string,
  bindings: ReadonlyMap<string, ClientKind>,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  sessionWrappers: ReadonlySet<string>,
  sessionWrapperNamespaces: ReadonlySet<string>,
  clientNamespaces: ReadonlyMap<string, ClientKind>
): DynamicCapabilityAliasKind | null {
  const client = bindings.get(name);
  if (client !== undefined) return client;
  const constructor = constructors.get(name);
  if (constructor !== undefined) return constructor;
  if (sessionWrappers.has(name)) return "session-wrapper";
  if (clientNamespaces.has(name)) return "client-namespace";
  if (sessionWrapperNamespaces.has(name)) return "session-namespace";
  const namespace = constructorNamespaces.get(name);
  return namespace === undefined ? null : `${namespace}-namespace`;
}
