#!/usr/bin/env bash
#
# Pre-promotion gate for the coderso-core release image: proves that the staged
# registry candidate is what the boot gate actually started.
#
# WHY THIS EXISTS
# The boot gate has to RUN the image, so the verification build exports through
# the docker exporter (`load: true`), and that exporter cannot write a
# provenance attestation — hence `provenance: false` on it. The staged candidate
# must keep its attestation, so it is exported a second time, by the image
# exporter, straight to the registry. Two exports mean two artifacts, and "they
# came out of the same builder, in the same job, off a warm cache" is an
# argument, not a check. This is the interlock before the stable tags move.
#
# WHAT IS COMPARED
# The filesystem and the runtime configuration:
#   * rootfs diff IDs — the uncompressed digest of every layer, in order;
#   * Env, Cmd, Entrypoint, User, WorkingDir.
# NOT the manifest digest, and NOT the image config digest. Those two
# legitimately differ between exports of an identical image: the exporters
# compress layers independently, and the config carries a creation timestamp.
# Diff IDs cannot differ — they are the content of the layers. Equal diff IDs
# mean the staged candidate has exactly the filesystem the container booted from,
# and equal Cmd/Env/User mean it gets started the same way.
#
# It also refuses a staged candidate unless its exact single-platform index has
# one OCI attestation manifest bound to the runnable image by both the index
# reference annotation and the attestation subject. That manifest must contain
# one in-toto Statement v1 carrying a SLSA v0.2 predicate for the runnable
# manifest, and Buildx must decode the same predicate with the expected GitHub
# Actions run as builder. An SBOM by itself is not provenance.
#
# RELEASE-SAFETY BOUNDARY
# It reads only a run-scoped candidate pinned to the immutable digest returned
# by build-push-action. The version and latest tags are promoted from that same
# digest only after this script exits 0. A mismatch therefore leaves both final
# tags untouched instead of merely detecting a bad release after publication.
#
# REQUIRED ENVIRONMENT
#   LOCAL_IMAGE_REF  tag the boot gate started; must be in the local docker daemon
#   CANDIDATE_REF    registry candidate pinned as <name>:<tag>@sha256:<64 hex>
#   EXPECTED_PROVENANCE_BUILDER_ID
#                    GitHub Actions run URL configured as BuildKit's builder id
#   GHCR_USERNAME    GitHub actor used to request a repository-scoped pull token
#   GHCR_TOKEN       workflow token used only to request that pull token

set -Eeuo pipefail

LOCAL_IMAGE_REF="${LOCAL_IMAGE_REF:-}"
CANDIDATE_REF="${CANDIDATE_REF:-}"
EXPECTED_PROVENANCE_BUILDER_ID="${EXPECTED_PROVENANCE_BUILDER_ID:-}"
GHCR_USERNAME="${GHCR_USERNAME:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"
temporary_directory=""

fail() {
  echo "::error::$*" >&2
  exit 1
}

log_section() {
  echo "----- $* -----"
}

cleanup() {
  if [ -n "${temporary_directory}" ] && [ -d "${temporary_directory}" ]; then
    rm -f -- \
      "${temporary_directory}/ghcr-token.json" \
      "${temporary_directory}/provenance.json" 2>/dev/null || true
    rmdir -- "${temporary_directory}" 2>/dev/null || true
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' HUP TERM

curl_config_value_is_safe() {
  local value="$1"

  case "${value}" in
    *$'\r'*|*$'\n'*|*\"*|*\\*) return 1 ;;
    *) return 0 ;;
  esac
}

[ -n "${LOCAL_IMAGE_REF}" ] || fail "LOCAL_IMAGE_REF is required; there is no verified image to compare the staged candidate against."
[ -n "${CANDIDATE_REF}" ] || fail "CANDIDATE_REF is required; this gate will not report success without inspecting the staged image."
[ -n "${EXPECTED_PROVENANCE_BUILDER_ID}" ] || fail "EXPECTED_PROVENANCE_BUILDER_ID is required; provenance from an unidentified builder cannot be promoted."
[[ ! "${CANDIDATE_REF}" =~ [[:space:]] ]] || fail "CANDIDATE_REF must be one registry reference without whitespace."
[[ "${CANDIDATE_REF}" =~ ^[^@]+@sha256:[0-9a-f]{64}$ ]] || fail "CANDIDATE_REF must be pinned to an immutable sha256 digest."
candidate_named_ref="${CANDIDATE_REF%@*}"
candidate_digest="${CANDIDATE_REF##*@}"
candidate_last_component="${candidate_named_ref##*/}"
[[ "${candidate_last_component}" == *:* ]] || fail "CANDIDATE_REF must include the run-scoped candidate tag."
candidate_tag="${candidate_named_ref##*:}"
[[ "${candidate_tag}" == candidate-* ]] || fail "CANDIDATE_REF must use a candidate-* staging tag."
candidate_repository="${candidate_named_ref%:*}"
[ -n "${candidate_repository}" ] || fail "CANDIDATE_REF must include a repository before its staging tag."
[[ "${candidate_repository}" == ghcr.io/* ]] || fail "CANDIDATE_REF must use ghcr.io so the provenance blob is read from the authenticated registry API."
ghcr_repository_path="${candidate_repository#ghcr.io/}"
[[ "${ghcr_repository_path}" =~ ^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)*$ ]] || fail "CANDIDATE_REF contains an invalid GHCR repository path."
[ -n "${GHCR_USERNAME}" ] || fail "GHCR_USERNAME is required to authenticate the provenance blob read."
[ -n "${GHCR_TOKEN}" ] || fail "GHCR_TOKEN is required to authenticate the provenance blob read."
curl_config_value_is_safe "${GHCR_USERNAME}" || fail "GHCR_USERNAME contains characters that cannot be passed safely to curl."
curl_config_value_is_safe "${GHCR_TOKEN}" || fail "GHCR_TOKEN contains characters that cannot be passed safely to curl."
[[ "${GHCR_USERNAME}" != *:* ]] || fail "GHCR_USERNAME must not contain a colon."
command -v docker >/dev/null 2>&1 || fail "docker is required to inspect the staged candidate."
command -v jq >/dev/null 2>&1 || fail "jq is required to read image configuration; refusing to skip the comparison."
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required to verify immutable registry content."
command -v curl >/dev/null 2>&1 || fail "curl is required to fetch the exact provenance blob from GHCR."
command -v mktemp >/dev/null 2>&1 || fail "mktemp is required to protect temporary registry credentials and provenance."

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

content_digest() {
  local content="$1"
  local checksum

  checksum="$(printf '%s' "${content}" | sha256sum)"
  printf 'sha256:%s' "${checksum%% *}"
}

# Request a repository-scoped bearer, then fetch the descriptor's exact blob.
# Credentials are supplied through curl's stdin config rather than command-line
# arguments, keeping both the workflow token and bearer out of process listings
# and command logs. The caller verifies the returned bytes before parsing them.
fetch_ghcr_blob() {
  local blob_digest="$1"
  local destination="$2"
  local token_response_file="${temporary_directory}/ghcr-token.json"
  local bearer

  if ! printf 'user = "%s:%s"\nbasic\n' "${GHCR_USERNAME}" "${GHCR_TOKEN}" |
    curl --config - --fail --silent --show-error --get \
      --proto '=https' --proto-redir '=https' \
      --connect-timeout 10 --max-time 60 \
      --data-urlencode "service=ghcr.io" \
      --data-urlencode "scope=repository:${ghcr_repository_path}:pull" \
      --output "${token_response_file}" \
      "https://ghcr.io/token"; then
    fail "Could not obtain a repository-scoped GHCR pull token for provenance verification."
  fi

  if ! bearer="$(jq -er '(.token // .access_token) | select(type == "string" and length > 0)' "${token_response_file}")"; then
    fail "GHCR returned no usable repository-scoped pull token."
  fi
  curl_config_value_is_safe "${bearer}" || fail "GHCR returned a bearer token that cannot be passed safely to curl."

  if ! printf 'header = "Authorization: Bearer %s"\n' "${bearer}" |
    curl --config - --fail --silent --show-error --location \
      --proto '=https' --proto-redir '=https' \
      --connect-timeout 10 --max-time 60 \
      --output "${destination}" \
      "https://ghcr.io/v2/${ghcr_repository_path}/blobs/${blob_digest}"; then
    fail "Could not fetch immutable provenance blob ${blob_digest} from GHCR."
  fi
}

# Docker stores attestations as manifests in the image index. This release is
# intentionally single-platform, so accepting any wider or ambiguous topology
# would make it unclear which runnable image was booted and which was attested.
verify_published_provenance() {
  local ref="$1"
  local candidate_index actual_candidate_digest topology
  local runnable_digest runnable_media_type runnable_size
  local attestation_digest attestation_size attestation_ref
  local attestation_manifest actual_attestation_digest actual_attestation_size
  local provenance_descriptor
  local provenance_layer_digest provenance_layer_size provenance_blob_file
  local actual_provenance_size provenance_checksum actual_provenance_digest
  local provenance envelope_predicate decoded_predicate

  if ! candidate_index="$(docker buildx imagetools inspect "${ref}" --raw)"; then
    fail "Could not read the immutable candidate index for ${ref}."
  fi
  actual_candidate_digest="$(content_digest "${candidate_index}")"
  [ "${actual_candidate_digest}" = "${candidate_digest}" ] || fail "Candidate index content digest ${actual_candidate_digest} does not match CANDIDATE_REF digest ${candidate_digest}."

  if ! topology="$(printf '%s' "${candidate_index}" | jq -er '
    def valid_digest:
      type == "string" and test("^sha256:[0-9a-f]{64}$");
    def image_manifest_media_type:
      . == "application/vnd.oci.image.manifest.v1+json"
      or . == "application/vnd.docker.distribution.manifest.v2+json";

    if (.schemaVersion == 2)
      and (.mediaType == "application/vnd.oci.image.index.v1+json"
        or .mediaType == "application/vnd.docker.distribution.manifest.list.v2+json")
      and ((.manifests | type) == "array")
    then .
    else error("candidate is not an OCI image index")
    end
    | [
        .manifests[]
        | select((.annotations["vnd.docker.reference.type"] // "") == "attestation-manifest")
      ] as $attestations
    | [
        .manifests[]
        | select((.annotations["vnd.docker.reference.type"] // "") != "attestation-manifest")
      ] as $images
    | if (.manifests | length) == 2
        and ($images | length) == 1
        and ($attestations | length) == 1
      then .
      else error("candidate must have exactly one runnable manifest and one attestation manifest")
      end
    | ($images[0]) as $image
    | ($attestations[0]) as $attestation
    | if ($image.mediaType | image_manifest_media_type)
        and ($image.digest | valid_digest)
        and (($image.size | type) == "number" and $image.size > 0 and ($image.size | floor) == $image.size)
        and $image.platform.os == "linux"
        and $image.platform.architecture == "amd64"
        and ($attestation.mediaType | image_manifest_media_type)
        and ($attestation.digest | valid_digest)
        and (($attestation.size | type) == "number" and $attestation.size > 0 and ($attestation.size | floor) == $attestation.size)
        and $attestation.platform.os == "unknown"
        and $attestation.platform.architecture == "unknown"
        and $attestation.annotations["vnd.docker.reference.digest"] == $image.digest
      then [$image.digest, $image.mediaType, ($image.size | tostring), $attestation.digest, ($attestation.size | tostring)] | @tsv
      else error("candidate image/attestation descriptors are malformed or not bound")
      end
  ')"; then
    fail "Candidate index must contain exactly one linux/amd64 image manifest and one bound attestation manifest."
  fi

  IFS=$'\t' read -r runnable_digest runnable_media_type runnable_size attestation_digest attestation_size <<<"${topology}"
  [ -n "${runnable_digest}" ] && [ -n "${runnable_size}" ] && [ -n "${attestation_digest}" ] && [ -n "${attestation_size}" ] || fail "Candidate index topology produced no immutable image/attestation descriptor."

  attestation_ref="${candidate_repository}@${attestation_digest}"
  if ! attestation_manifest="$(docker buildx imagetools inspect "${attestation_ref}" --raw)"; then
    fail "Could not read attestation manifest ${attestation_ref}."
  fi
  actual_attestation_digest="$(content_digest "${attestation_manifest}")"
  [ "${actual_attestation_digest}" = "${attestation_digest}" ] || fail "Attestation manifest content digest ${actual_attestation_digest} does not match its candidate index descriptor ${attestation_digest}."
  actual_attestation_size="$(printf '%s' "${attestation_manifest}" | wc -c)"
  actual_attestation_size="${actual_attestation_size//[[:space:]]/}"
  [ "${actual_attestation_size}" = "${attestation_size}" ] || fail "Attestation manifest size ${actual_attestation_size} does not match its candidate index descriptor size ${attestation_size}."

  if ! provenance_descriptor="$(printf '%s' "${attestation_manifest}" | jq -er \
    --arg runnable_digest "${runnable_digest}" \
    --arg runnable_media_type "${runnable_media_type}" \
    --argjson runnable_size "${runnable_size}" '
      def valid_digest:
        type == "string" and test("^sha256:[0-9a-f]{64}$");

      . as $manifest
      | (.schemaVersion == 2)
      and (.mediaType == "application/vnd.oci.image.manifest.v1+json")
      and (.artifactType == "application/vnd.docker.attestation.manifest.v1+json")
      and ((.config | type) == "object")
      and (.config.mediaType == "application/vnd.oci.empty.v1+json")
      and (.config.digest == "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a")
      and (.config.size == 2)
      and ((.config | has("data") | not) or .config.data == "e30=")
      and (.subject.digest == $runnable_digest)
      and (.subject.mediaType == $runnable_media_type)
      and (.subject.size == $runnable_size)
      and ((.layers | type) == "array")
      and ((.layers | length) == 1)
      and (.layers[0].mediaType == "application/vnd.in-toto+json")
      and (.layers[0].digest | valid_digest)
      and ((.layers[0].size | type) == "number" and .layers[0].size > 0)
      and (.layers[0].annotations["in-toto.io/predicate-type"] == "https://slsa.dev/provenance/v0.2")
      | if . then [$manifest.layers[0].digest, ($manifest.layers[0].size | tostring)] | @tsv
        else error("invalid provenance descriptor")
        end
    ')"; then
    fail "Attestation manifest must be one OCI artifact bound to the runnable image with exactly one in-toto SLSA v0.2 provenance layer."
  fi

  IFS=$'\t' read -r provenance_layer_digest provenance_layer_size <<<"${provenance_descriptor}"
  [ -n "${provenance_layer_digest}" ] && [ -n "${provenance_layer_size}" ] || fail "Attestation manifest produced no immutable provenance blob descriptor."

  if [ -z "${temporary_directory}" ]; then
    temporary_directory="$(mktemp -d)" || fail "Could not create a private temporary directory for provenance verification."
    chmod 700 "${temporary_directory}" || fail "Could not protect the temporary provenance directory."
  fi
  provenance_blob_file="${temporary_directory}/provenance.json"
  (umask 077 && : >"${temporary_directory}/ghcr-token.json" && : >"${provenance_blob_file}") || fail "Could not create private temporary files for provenance verification."
  chmod 600 "${temporary_directory}/ghcr-token.json" "${provenance_blob_file}" || fail "Could not protect temporary registry credentials and provenance."

  fetch_ghcr_blob "${provenance_layer_digest}" "${provenance_blob_file}"

  actual_provenance_size="$(wc -c <"${provenance_blob_file}")"
  actual_provenance_size="${actual_provenance_size//[[:space:]]/}"
  [ "${actual_provenance_size}" = "${provenance_layer_size}" ] || fail "Provenance blob size ${actual_provenance_size} does not match its descriptor size ${provenance_layer_size}."
  provenance_checksum="$(sha256sum "${provenance_blob_file}")"
  actual_provenance_digest="sha256:${provenance_checksum%% *}"
  [ "${actual_provenance_digest}" = "${provenance_layer_digest}" ] || fail "Provenance blob digest ${actual_provenance_digest} does not match its descriptor digest ${provenance_layer_digest}."

  if ! jq -e \
    --arg runnable_sha256 "${runnable_digest#sha256:}" \
    --arg expected_builder "${EXPECTED_PROVENANCE_BUILDER_ID}" '
      (type == "object")
      and (._type == "https://in-toto.io/Statement/v1")
      and (.predicateType == "https://slsa.dev/provenance/v0.2")
      and ((.subject | type) == "array")
      and ((.subject | length) == 1)
      and ((.subject[0] | type) == "object")
      and ((.subject[0].name | type) == "string")
      and ((.subject[0].name | length) > 0)
      and ((.subject[0].digest | type) == "object")
      and ((.subject[0].digest | keys) == ["sha256"])
      and (.subject[0].digest.sha256 == $runnable_sha256)
      and ((.predicate | type) == "object")
      and (.predicate.builder.id == $expected_builder)
      and (.predicate.buildType == "https://mobyproject.org/buildkit@v1")
      and ((.predicate.materials | type) == "array")
      and ((.predicate.invocation | type) == "object")
      and ((.predicate.metadata | type) == "object")
    ' "${provenance_blob_file}" >/dev/null; then
    fail "Provenance blob is not an in-toto Statement v1 with the expected runnable subject and BuildKit SLSA v0.2 predicate."
  fi

  # Buildx exposes only the decoded predicate, dropping the envelope type,
  # predicate type, and subject. The authenticated blob above owns those checks;
  # this decoded view must still be the exact same predicate Buildx presents to
  # users and tooling.
  if ! provenance="$(docker buildx imagetools inspect "${ref}" --format '{{json .Provenance.SLSA}}')"; then
    fail "Could not decode the SLSA provenance attached to ${ref}."
  fi
  if ! printf '%s' "${provenance}" | jq -e \
    --arg expected_builder "${EXPECTED_PROVENANCE_BUILDER_ID}" '
      (type == "object")
      and (.builder.id == $expected_builder)
      and (.buildType == "https://mobyproject.org/buildkit@v1")
      and ((.materials | type) == "array")
      and ((.invocation | type) == "object")
      and ((.metadata | type) == "object")
    ' >/dev/null; then
    fail "Decoded provenance is not the expected BuildKit SLSA v0.2 predicate for builder ${EXPECTED_PROVENANCE_BUILDER_ID}."
  fi
  if ! envelope_predicate="$(jq -S -c '.predicate' "${provenance_blob_file}")" ||
    ! decoded_predicate="$(printf '%s' "${provenance}" | jq -S -c '.')"; then
    fail "Could not canonicalize the provenance predicate for identity comparison."
  fi
  [ "${envelope_predicate}" = "${decoded_predicate}" ] || fail "Buildx decoded a provenance predicate different from the verified in-toto envelope."
}

if ! booted="$(booted_fingerprint)"; then
  fail "Could not read ${LOCAL_IMAGE_REF} out of the local docker daemon; the boot gate's image is gone, so nothing can be compared to it."
fi
[ -n "${booted}" ] || fail "The local docker daemon returned no image configuration for ${LOCAL_IMAGE_REF}."

log_section "verified image (booted)"
echo "ref: ${LOCAL_IMAGE_REF}"
printf '%s\n' "${booted}"

verify_published_provenance "${CANDIDATE_REF}"

log_section "staged candidate (${CANDIDATE_REF})"
if ! candidate="$(published_fingerprint "${CANDIDATE_REF}")"; then
  fail "Could not read the staged candidate configuration for ${CANDIDATE_REF}."
fi
printf '%s\n' "${candidate}"

if [ "${candidate}" != "${booted}" ]; then
  fail "STAGED CANDIDATE IS NOT THE IMAGE THAT BOOTED — ${CANDIDATE_REF} does not have the filesystem and startup configuration of ${LOCAL_IMAGE_REF}. Neither final release tag was changed. Re-run this job; if it differs again, the build is not reproducing from cache and the two-build shape in release.yml is unsafe as written."
fi

echo "Staged candidate verified: ${CANDIDATE_REF} matches the image that booted and carries bound SLSA provenance"
exit 0
