import { deepFreezeExact, exactOwnKeys, invariant } from "./foundation.mjs";
import { assertPlainJsonValue } from "./json-schema.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";

const BOOTSTRAP_RAW_USER_ROW_KEYS = Object.freeze([
  "id",
  "email",
  "emailHash",
  "emailEncrypted",
  "passwordHash",
  "name",
  "status",
  "createdAt",
  "updatedAt",
  "lastLoginAt",
]);

const BOOTSTRAP_ROLE_TUPLE_KEYS = Object.freeze([
  "userId",
  "roleId",
  "roleName",
  "roleDescription",
  "rolePermissions",
  "roleCreatedAt",
]);

function isNullableIsoTimestamp(value) {
  return value === null || (typeof value === "string" && new Date(value).toISOString() === value);
}

function validateBootstrapPrivateBaseline(bootstrap, label = "bootstrap private baseline") {
  exactOwnKeys(
    bootstrap,
    [
      "id",
      "lastLoginAt",
      "updatedAt",
      "normalizedEmailProof",
      "emailHashProof",
      "encryptedEmailProof",
      "decryptEmailProof",
      "rawUserRow",
      "roleTuples",
    ],
    label,
    { plain: true }
  );
  exactOwnKeys(bootstrap.rawUserRow, BOOTSTRAP_RAW_USER_ROW_KEYS, label + " raw user row", {
    plain: true,
  });
  invariant(
    typeof bootstrap.id === "string" &&
      /^[0-9a-f-]{36}$/u.test(bootstrap.id) &&
      bootstrap.rawUserRow.id === bootstrap.id &&
      bootstrap.rawUserRow.lastLoginAt === bootstrap.lastLoginAt &&
      bootstrap.rawUserRow.updatedAt === bootstrap.updatedAt &&
      isNullableIsoTimestamp(bootstrap.lastLoginAt) &&
      isNullableIsoTimestamp(bootstrap.updatedAt) &&
      isNullableIsoTimestamp(bootstrap.rawUserRow.createdAt) &&
      bootstrap.rawUserRow.status === "active" &&
      [
        bootstrap.normalizedEmailProof,
        bootstrap.emailHashProof,
        bootstrap.encryptedEmailProof,
        bootstrap.decryptEmailProof,
      ].every((value) => value === true),
    label + " canonical Admin identity drift"
  );
  invariant(
    Array.isArray(bootstrap.roleTuples) && bootstrap.roleTuples.length === 1,
    label + " role tuple cardinality drift"
  );
  const role = bootstrap.roleTuples[0];
  exactOwnKeys(role, BOOTSTRAP_ROLE_TUPLE_KEYS, label + " role tuple", { plain: true });
  invariant(
    role.userId === bootstrap.id &&
      typeof role.roleId === "string" &&
      /^[0-9a-f-]{36}$/u.test(role.roleId) &&
      role.roleName === "admin" &&
      Array.isArray(role.rolePermissions) &&
      deepEqualJson([...new Set(role.rolePermissions)].sort(), ["*"]) &&
      isNullableIsoTimestamp(role.roleCreatedAt),
    label + " canonical Admin role drift"
  );
  assertPlainJsonValue(bootstrap.rawUserRow, label + " raw user row");
  assertPlainJsonValue(bootstrap.roleTuples, label + " role tuples");
  return true;
}

function bootstrapTimestampPair(observation) {
  return deepFreezeExact({
    lastLoginAt: observation.lastLoginAt,
    updatedAt: observation.updatedAt,
  });
}

function bootstrapUnchangedProjection(observation) {
  const {
    lastLoginAt: ignoredLastLoginAt,
    updatedAt: ignoredUpdatedAt,
    ...unchangedRow
  } = observation.rawUserRow;
  void ignoredLastLoginAt;
  void ignoredUpdatedAt;
  return deepFreezeExact({ rawUserRow: unchangedRow, roleTuples: observation.roleTuples });
}

export {
  BOOTSTRAP_RAW_USER_ROW_KEYS,
  BOOTSTRAP_ROLE_TUPLE_KEYS,
  bootstrapTimestampPair,
  bootstrapUnchangedProjection,
  isNullableIsoTimestamp,
  validateBootstrapPrivateBaseline,
};
