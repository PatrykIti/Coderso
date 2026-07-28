#!/usr/bin/env bash
#
# Publish gate for the coderso-core release image: proves that what reached the
# registry is what the boot gate actually started.
#
# WHY THIS EXISTS
# The boot gate has to RUN the image, so the verification build exports through
# the docker exporter (`load: true`), and that exporter cannot write a
# provenance attestation — hence `provenance: false` on it. The published image
# must keep its attestation, so it is exported a second time, by the image
# exporter, straight to the registry. Two exports mean two artifacts, and "they
# came out of the same builder, in the same job, off a warm cache" is an
# argument, not a check. This is the check.
#
# WHAT IS COMPARED
# The filesystem and the runtime configuration:
#   * rootfs diff IDs — the uncompressed digest of every layer, in order;
#   * Env, Cmd, Entrypoint, User, WorkingDir.
# NOT the manifest digest, and NOT the image config digest. Those two
# legitimately differ between exports of an identical image: the exporters
# compress layers independently, and the config carries a creation timestamp.
# Diff IDs cannot differ — they are the content of the layers. Equal diff IDs
# mean the published image has exactly the filesystem the container booted from,
# and equal Cmd/Env/User mean it gets started the same way.
#
# It also refuses a published image that carries no provenance attestation,
# which is precisely what regresses if the publishing build is ever handed
# `provenance: false` to make some future `load` work.
#
# WHAT IT CANNOT DO
# It reads the published artifact out of the registry, so it necessarily runs
# AFTER the push. A mismatch is a red release holding an already-published tag,
# not a push that was prevented. It is a detector, not an interlock.
#
# REQUIRED ENVIRONMENT
#   LOCAL_IMAGE_REF  tag the boot gate started; must be in the local docker daemon
#   PUBLISHED_REFS   newline-separated registry refs that must match it

set -Eeuo pipefail

LOCAL_IMAGE_REF="${LOCAL_IMAGE_REF:-}"
PUBLISHED_REFS="${PUBLISHED_REFS:-}"

fail() {
  echo "::error::$*" >&2
  exit 1
}

log_section() {
  echo "----- $* -----"
}

[ -n "${LOCAL_IMAGE_REF}" ] || fail "LOCAL_IMAGE_REF is required; there is no verified image to compare the published one against."
[ -n "${PUBLISHED_REFS//[[:space:]]/}" ] || fail "PUBLISHED_REFS is required; this gate will not report success without inspecting a published reference."
command -v jq >/dev/null 2>&1 || fail "jq is required to read image configuration; refusing to skip the comparison."

# Diff IDs plus the fields that decide how the container starts, canonicalised
# so the two sources are directly comparable. Field names differ between the
# docker daemon's view and the OCI image config; the shape here does not.
booted_fingerprint() {
  docker image inspect "${LOCAL_IMAGE_REF}" | jq -S -c '
    .[0]
    | {
        diff_ids: (.RootFS.Layers // []),
        env: (.Config.Env // []),
        cmd: (.Config.Cmd // []),
        entrypoint: (.Config.Entrypoint // []),
        user: (.Config.User // ""),
        working_dir: (.Config.WorkingDir // "")
      }'
}

# `.Image` is the OCI image config for a single-platform result and a map keyed
# by platform once attestations turn the result into an index, so both shapes
# are accepted and anything else is an error rather than an empty comparison.
published_fingerprint() {
  local ref="$1"
  docker buildx imagetools inspect "${ref}" --format '{{json .Image}}' | jq -S -c '
    (if type == "object" and has("rootfs") then .
     elif type == "object" then ([.[] | select(type == "object" and has("rootfs"))] | first)
     else null end)
    | if . == null then error("no image config in imagetools output") else . end
    | {
        diff_ids: (.rootfs.diff_ids // []),
        env: (.config.Env // []),
        cmd: (.config.Cmd // []),
        entrypoint: (.config.Entrypoint // []),
        user: (.config.User // ""),
        working_dir: (.config.WorkingDir // "")
      }'
}

published_has_provenance() {
  local ref="$1"
  docker buildx imagetools inspect "${ref}" --raw | jq -e '
    [(.manifests // [])[]
      | select((.annotations["vnd.docker.reference.type"] // "") == "attestation-manifest")]
    | length > 0' >/dev/null
}

if ! booted="$(booted_fingerprint)"; then
  fail "Could not read ${LOCAL_IMAGE_REF} out of the local docker daemon; the boot gate's image is gone, so nothing can be compared to it."
fi
[ -n "${booted}" ] || fail "The local docker daemon returned no image configuration for ${LOCAL_IMAGE_REF}."

log_section "verified image (booted)"
echo "ref: ${LOCAL_IMAGE_REF}"
printf '%s\n' "${booted}"

mismatches=0
inspected=0

while IFS= read -r ref; do
  ref="${ref#"${ref%%[![:space:]]*}"}"
  ref="${ref%"${ref##*[![:space:]]}"}"
  [ -n "${ref}" ] || continue
  inspected=$((inspected + 1))

  log_section "published image (${ref})"

  if ! published="$(published_fingerprint "${ref}")"; then
    echo "::error::Could not read the published image configuration for ${ref}."
    mismatches=$((mismatches + 1))
    continue
  fi
  printf '%s\n' "${published}"

  if [ "${published}" != "${booted}" ]; then
    echo "::error::PUBLISHED IMAGE IS NOT THE IMAGE THAT BOOTED — ${ref} does not have the filesystem and startup configuration of ${LOCAL_IMAGE_REF}. The boot verification therefore does not cover what was published. Re-run this job; if it differs again, the build is not reproducing from cache and the two-build shape in release.yml is unsafe as written."
    mismatches=$((mismatches + 1))
    continue
  fi

  if ! published_has_provenance "${ref}"; then
    echo "::error::PUBLISHED IMAGE HAS NO PROVENANCE ATTESTATION — ${ref} shipped without the SLSA provenance consumers use to trace it back to this build. The publishing build must keep provenance enabled; only the boot-verification build may disable it, because the docker exporter behind 'load' cannot carry one."
    mismatches=$((mismatches + 1))
    continue
  fi

  echo "${ref} matches the booted image and carries a provenance attestation"
done <<EOF
${PUBLISHED_REFS}
EOF

[ "${inspected}" -gt 0 ] || fail "PUBLISHED_REFS named no reference to inspect; this gate will not report success on an empty list."
[ "${mismatches}" -eq 0 ] || fail "${mismatches} of ${inspected} published reference(s) failed the comparison against the booted image."

echo "Published image verified: ${inspected} reference(s) carry the filesystem that booted, with provenance intact"
exit 0
