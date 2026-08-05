import { afterEach, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dir, "../../../");
const identityScript = path.join(root, ".github/scripts/verify-published-image.sh");
const promotionScript = path.join(root, ".github/scripts/promote-release-image.sh");
const digest = `sha256:${"a".repeat(64)}`;
const candidateRef = `ghcr.io/example/coderso-core:candidate-123-1@${digest}`;
const versionRef = "ghcr.io/example/coderso-core:1.2.3";
const latestRef = "ghcr.io/example/coderso-core:latest";
const expectedBuilder = "https://github.com/example/coderso/actions/runs/123";
const imageManifestMediaType = "application/vnd.oci.image.manifest.v1+json";
const imageIndexMediaType = "application/vnd.oci.image.index.v1+json";
const attestationArtifactType = "application/vnd.docker.attestation.manifest.v1+json";
const inTotoMediaType = "application/vnd.in-toto+json";
const inTotoStatementType = "https://in-toto.io/Statement/v1";
const provenancePredicateType = "https://slsa.dev/provenance/v0.2";
const sbomPredicateType = "https://spdx.dev/Document";
const emptyConfigDigest = "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const digestOf = (content: string) =>
  `sha256:${createHash("sha256").update(content).digest("hex")}`;

type PromotionOptions = {
  candidateVersion?: string;
  dockerFailureTag?: string;
  environment?: Partial<NodeJS.ProcessEnv>;
  gitFailure?: boolean;
  registry?: Record<string, string>;
  recoveryDigest?: string;
  recoveryOnly?: boolean;
  remoteRaw?: string;
  remoteTags?: string[];
  statusOverrides?: Record<string, string>;
};

const fakePromotionGit = `#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' 'git ls-remote --tags --refs origin' >> "\${EVENTS_FILE}"
[ "\${FAKE_GIT_FAILURE:-0}" != 1 ] || exit 70
[ "\${*}" = 'ls-remote --tags --refs origin' ] || exit 71
/bin/cat "\${REMOTE_TAGS_FILE}"
`;

const fakePromotionCurl = `#!/usr/bin/env bash
set -Eeuo pipefail
config="$(/bin/cat)"
output=""
headers=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --config) shift 2 ;;
    --output) output="\${2:-}"; shift 2 ;;
    --dump-header) headers="\${2:-}"; shift 2 ;;
    --write-out) shift 2 ;;
    *) shift ;;
  esac
done
url="$(printf '%s\n' "\${config}" | sed -n 's/^url = "\\(.*\\)"$/\\1/p')"
[ -n "\${output}" ] || exit 72
[ "$(stat -c '%a' "\${output}")" = 600 ] || exit 73
[[ "\${config}" == *'connect-timeout = 10'* ]] || exit 84
[[ "\${config}" == *'max-time = 30'* ]] || exit 85
case "\${url}" in
  https://ghcr.io/token?*)
    [[ "\${config}" == *"user = \\\"\${EXPECTED_BASIC}\\\""* ]] || exit 74
    printf '%s\n' 'token' >> "\${EVENTS_FILE}"
    printf '%s' '{"token":"fake-promotion-bearer"}' > "\${output}"
    ;;
  https://ghcr.io/v2/example/coderso-core/manifests/*)
    [[ $'\n'"\${config}"$'\n' == *$'\nhead\n'* ]] || exit 75
    [[ "\${config}" != *'request = "HEAD"'* ]] || exit 86
    [[ "\${config}" == *'application/vnd.oci.image.index.v1+json'* ]] || exit 76
    [[ "\${config}" == *'application/vnd.docker.distribution.manifest.v2+json'* ]] || exit 77
    [[ "\${config}" == *'header = "Authorization: Bearer fake-promotion-bearer"'* ]] || exit 78
    tag="\${url##*/}"
    printf 'head %s\n' "\${tag}" >> "\${EVENTS_FILE}"
    status_file="\${REGISTRY_STATUS_PREFIX}\${tag}"
    state_file="\${REGISTRY_STATE_PREFIX}\${tag}"
    if [ -f "\${status_file}" ]; then
      status="$(/bin/cat "\${status_file}")"
    elif [ -f "\${state_file}" ]; then
      status=200
    else
      status=404
    fi
    : > "\${headers}"
    if [ "\${status}" = 200 ]; then
      printf 'HTTP/1.1 200 OK\r\nDocker-Content-Digest: %s\r\n\r\n' "$(/bin/cat "\${state_file}")" > "\${headers}"
    else
      printf 'HTTP/1.1 %s Test\r\n\r\n' "\${status}" > "\${headers}"
    fi
    printf '%s' "\${status}"
    ;;
  *) exit 79 ;;
esac
`;

const fakePromotionDocker = `#!/usr/bin/env bash
set -Eeuo pipefail
[ "\${1:-}" = buildx ] && [ "\${2:-}" = imagetools ] && [ "\${3:-}" = create ] || exit 80
[ "\${4:-}" = --tag ] || exit 81
tag_ref="\${5:-}"
[ "\${6:-}" = "\${EXPECTED_CANDIDATE_REF}" ] || exit 82
tag="\${tag_ref##*:}"
printf 'docker %s\n' "\${tag}" >> "\${EVENTS_FILE}"
printf '%s\n' "$*" >> "\${DOCKER_ARGS_FILE}"
[ "\${FAKE_DOCKER_FAILURE_TAG:-}" != "\${tag}" ] || exit 83
printf '%s' "\${EXPECTED_CANDIDATE_DIGEST}" > "\${REGISTRY_STATE_PREFIX}\${tag}"
`;

const runPromotion = (options: PromotionOptions = {}) => {
  const directory = mkdtempSync(path.join(tmpdir(), "coderso-image-promotion-"));
  temporaryDirectories.push(directory);
  const dockerArgsFile = path.join(directory, "docker-args.txt");
  const eventsFile = path.join(directory, "events.txt");
  const remoteTagsFile = path.join(directory, "remote-tags.txt");
  const registryStatePrefix = path.join(directory, "registry-state-");
  const registryStatusPrefix = path.join(directory, "registry-status-");
  const fakeDocker = path.join(directory, "docker");
  const fakeCurl = path.join(directory, "curl");
  const fakeGit = path.join(directory, "git");
  const candidateVersion = options.candidateVersion ?? "1.2.3";
  const resolvedVersionRef = `ghcr.io/example/coderso-core:${candidateVersion}`;
  const recoveryDigest = options.recoveryDigest ?? digestOf("original-verified-release");
  const expectedSource = options.recoveryOnly
    ? `${resolvedVersionRef}@${recoveryDigest}`
    : candidateRef;
  const remoteRaw =
    options.remoteRaw ??
    (options.remoteTags ?? [candidateVersion])
      .map((tag, index) => `${String(index + 1).repeat(40)}\trefs/tags/${tag}`)
      .join("\n");

  writeFileSync(fakeDocker, fakePromotionDocker, { mode: 0o755 });
  writeFileSync(fakeCurl, fakePromotionCurl, { mode: 0o755 });
  writeFileSync(fakeGit, fakePromotionGit, { mode: 0o755 });
  writeFileSync(remoteTagsFile, `${remoteRaw}\n`);
  for (const [tag, tagDigest] of Object.entries(options.registry ?? {})) {
    writeFileSync(`${registryStatePrefix}${tag}`, tagDigest);
  }
  for (const [tag, status] of Object.entries(options.statusOverrides ?? {})) {
    writeFileSync(`${registryStatusPrefix}${tag}`, status);
  }

  const result = spawnSync(promotionScript, [], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH ?? ""}`,
      EVENTS_FILE: eventsFile,
      DOCKER_ARGS_FILE: dockerArgsFile,
      CANDIDATE_REF: options.recoveryOnly ? "" : candidateRef,
      VERSION_REF: resolvedVersionRef,
      LATEST_REF: latestRef,
      GHCR_USERNAME: "example",
      GHCR_TOKEN: "promotion-secret-token",
      EXPECTED_BASIC: "example:promotion-secret-token",
      EXPECTED_CANDIDATE_REF: expectedSource,
      EXPECTED_CANDIDATE_DIGEST: options.recoveryOnly ? recoveryDigest : digest,
      FAKE_DOCKER_FAILURE_TAG: options.dockerFailureTag ?? "",
      FAKE_GIT_FAILURE: options.gitFailure ? "1" : "0",
      REMOTE_TAGS_FILE: remoteTagsFile,
      REGISTRY_STATE_PREFIX: registryStatePrefix,
      REGISTRY_STATUS_PREFIX: registryStatusPrefix,
      RECOVERY_VERSION_DIGEST: options.recoveryOnly ? recoveryDigest : "",
      TMPDIR: directory,
      ...options.environment,
    },
  });

  const events = existsSync(eventsFile)
    ? readFileSync(eventsFile, "utf8").trim().split("\n").filter(Boolean)
    : [];
  const registryDigest = (tag: string) =>
    existsSync(`${registryStatePrefix}${tag}`)
      ? readFileSync(`${registryStatePrefix}${tag}`, "utf8")
      : null;

  return { result, directory, dockerArgsFile, events, registryDigest };
};

type IdentityFixtureOptions = {
  attestationDescriptorSize?: number;
  attestationPredicateType?: string;
  attestationRaw?: string;
  attestationSubjectSize?: number;
  candidateDigest?: string;
  configData?: string | null;
  configDigest?: string;
  configSize?: number;
  envelopePredicate?: unknown;
  extraRunnableManifest?: boolean;
  innerPredicateType?: string;
  innerStatementType?: string;
  innerSubjectDigest?: string;
  layerDescriptorDigest?: string;
  layerDescriptorSize?: number;
  omitAttestationManifest?: boolean;
  provenance?: unknown;
  provenanceBlobRaw?: string;
  referenceDigest?: string;
  subjectDigest?: string;
};

const localImage = JSON.stringify([
  {
    RootFS: { Layers: [digestOf("uncompressed-layer")] },
    Config: {
      Env: ["CORE_VERSION=1.2.3"],
      Cmd: ["bun", "run", "core/server/dockerStart.ts"],
      Entrypoint: [],
      User: "bun",
      WorkingDir: "/app",
    },
  },
]);

const publishedImage = JSON.stringify({
  rootfs: { diff_ids: [digestOf("uncompressed-layer")] },
  config: {
    Env: ["CORE_VERSION=1.2.3"],
    Cmd: ["bun", "run", "core/server/dockerStart.ts"],
    Entrypoint: [],
    User: "bun",
    WorkingDir: "/app",
  },
});

const validProvenance = (builderId = expectedBuilder) => ({
  builder: { id: builderId },
  buildType: "https://mobyproject.org/buildkit@v1",
  materials: [],
  invocation: {
    configSource: { entryPoint: "Dockerfile" },
    parameters: { frontend: "dockerfile.v0" },
    environment: { platform: "linux/amd64" },
  },
  metadata: {
    buildInvocationID: "build-123",
    completeness: { parameters: false, environment: true, materials: false },
  },
});

const createIdentityFixture = (options: IdentityFixtureOptions = {}) => {
  const runnableDigest = digestOf("runnable-image-manifest");
  const otherDigest = digestOf("a-different-image-manifest");
  const envelopePredicate =
    options.envelopePredicate === undefined ? validProvenance() : options.envelopePredicate;
  const provenanceBlob =
    options.provenanceBlobRaw ??
    JSON.stringify({
      _type: options.innerStatementType ?? inTotoStatementType,
      predicateType: options.innerPredicateType ?? provenancePredicateType,
      subject: [
        {
          name: "pkg:docker/coderso-core@1.2.3",
          digest: {
            sha256: (options.innerSubjectDigest ?? runnableDigest).replace(/^sha256:/, ""),
          },
        },
      ],
      predicate: envelopePredicate,
    });
  const layerDigest = options.layerDescriptorDigest ?? digestOf(provenanceBlob);
  const layerSize = options.layerDescriptorSize ?? Buffer.byteLength(provenanceBlob);
  const annotationPredicateType = options.attestationPredicateType ?? provenancePredicateType;
  const attestationManifest =
    options.attestationRaw ??
    JSON.stringify({
      schemaVersion: 2,
      mediaType: imageManifestMediaType,
      artifactType: attestationArtifactType,
      config: {
        mediaType: "application/vnd.oci.empty.v1+json",
        digest: options.configDigest ?? emptyConfigDigest,
        size: options.configSize ?? 2,
        ...(options.configData === null ? {} : { data: options.configData ?? "e30=" }),
      },
      layers: [
        {
          mediaType: inTotoMediaType,
          digest: layerDigest,
          size: layerSize,
          annotations: { "in-toto.io/predicate-type": annotationPredicateType },
        },
      ],
      subject: {
        mediaType: imageManifestMediaType,
        digest: options.subjectDigest ?? runnableDigest,
        size: options.attestationSubjectSize ?? 1_024,
      },
    });
  const attestationDigest = digestOf(attestationManifest);

  const manifests: Array<Record<string, unknown>> = [
    {
      mediaType: imageManifestMediaType,
      digest: runnableDigest,
      size: 1_024,
      platform: { os: "linux", architecture: "amd64" },
    },
  ];
  if (options.extraRunnableManifest) {
    manifests.push({
      mediaType: imageManifestMediaType,
      digest: otherDigest,
      size: 1_024,
      platform: { os: "linux", architecture: "arm64" },
    });
  }
  if (!options.omitAttestationManifest) {
    manifests.push({
      mediaType: imageManifestMediaType,
      digest: attestationDigest,
      size: options.attestationDescriptorSize ?? Buffer.byteLength(attestationManifest),
      annotations: {
        "vnd.docker.reference.digest": options.referenceDigest ?? runnableDigest,
        "vnd.docker.reference.type": "attestation-manifest",
      },
      platform: { os: "unknown", architecture: "unknown" },
    });
  }

  const candidateIndex = JSON.stringify({
    schemaVersion: 2,
    mediaType: imageIndexMediaType,
    manifests,
  });
  const immutableCandidateDigest = options.candidateDigest ?? digestOf(candidateIndex);
  const immutableCandidateRef = `ghcr.io/example/coderso-core:candidate-123-1@${immutableCandidateDigest}`;

  return {
    attestationDigest,
    attestationManifest,
    attestationRef: `ghcr.io/example/coderso-core@${attestationDigest}`,
    candidateIndex,
    immutableCandidateRef,
    layerDigest,
    provenanceBlob,
    provenance: options.provenance === undefined ? validProvenance() : options.provenance,
  };
};

const fakeIdentityDocker = `#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\\n' "$*" >> "\${DOCKER_CALLS_FILE}"

if [ "\${1:-}" = "image" ] && [ "\${2:-}" = "inspect" ]; then
  /bin/cat "\${LOCAL_IMAGE_FILE}"
  exit 0
fi

if [ "\${1:-}" = "buildx" ] && [ "\${2:-}" = "imagetools" ] && [ "\${3:-}" = "inspect" ]; then
  inspected_ref="\${4:-}"
  option="\${5:-}"
  template="\${6:-}"

  if [ "\${inspected_ref}" = "\${FAKE_CANDIDATE_REF}" ] && [ "\${option}" = "--raw" ]; then
    /bin/cat "\${CANDIDATE_INDEX_FILE}"
    exit 0
  fi
  if [ "\${inspected_ref}" = "\${FAKE_ATTESTATION_REF}" ] && [ "\${option}" = "--raw" ]; then
    /bin/cat "\${ATTESTATION_MANIFEST_FILE}"
    exit 0
  fi
  if [ "\${inspected_ref}" = "\${FAKE_CANDIDATE_REF}" ] && [ "\${option}" = "--format" ]; then
    case "\${template}" in
      *Provenance.SLSA*) /bin/cat "\${PROVENANCE_FILE}" ;;
      *.Image*) /bin/cat "\${PUBLISHED_IMAGE_FILE}" ;;
      *) exit 97 ;;
    esac
    exit 0
  fi
fi

echo "unexpected fake docker invocation: $*" >&2
exit 97
`;

const fakeGhcrCurl = `#!/usr/bin/env bash
set -Eeuo pipefail
config="$(/bin/cat)"
output=""
url=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --output)
      output="\${2:-}"
      shift 2
      ;;
    https://*)
      url="$1"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

[ -n "\${output}" ] || { echo "fake curl received no output path" >&2; exit 98; }
[ "$(stat -c '%a' "\${output}")" = "600" ] || { echo "curl output is not mode 0600" >&2; exit 98; }
printf '%s\\n' "\${url}" >> "\${CURL_CALLS_FILE}"

case "\${url}" in
  https://ghcr.io/token)
    [[ "\${config}" == *'user = "example:test-ghcr-token"'* ]] || { echo "missing stdin Basic config" >&2; exit 98; }
    [[ "\${config}" == *basic* ]] || { echo "missing forced Basic auth" >&2; exit 98; }
    printf '%s' '{"token":"fake-registry-bearer"}' >"\${output}"
    ;;
  https://ghcr.io/v2/example/coderso-core/blobs/sha256:*)
    [[ "\${config}" == *'header = "Authorization: Bearer fake-registry-bearer"'* ]] || { echo "missing stdin bearer config" >&2; exit 98; }
    /bin/cat "\${PROVENANCE_BLOB_FILE}" >"\${output}"
    ;;
  *)
    echo "unexpected fake curl URL: \${url}" >&2
    exit 98
    ;;
esac
`;

const runIdentity = (
  options: IdentityFixtureOptions = {},
  environmentOverrides: Partial<NodeJS.ProcessEnv> = {}
) => {
  const directory = mkdtempSync(path.join(tmpdir(), "coderso-image-identity-"));
  temporaryDirectories.push(directory);
  const fixture = createIdentityFixture(options);
  const dockerCallsFile = path.join(directory, "docker-calls.txt");
  const curlCallsFile = path.join(directory, "curl-calls.txt");
  const fakeDocker = path.join(directory, "docker");
  const fakeCurl = path.join(directory, "curl");
  const localImageFile = path.join(directory, "local-image.json");
  const publishedImageFile = path.join(directory, "published-image.json");
  const candidateIndexFile = path.join(directory, "candidate-index.json");
  const attestationManifestFile = path.join(directory, "attestation-manifest.json");
  const provenanceFile = path.join(directory, "provenance.json");
  const provenanceBlobFile = path.join(directory, "provenance-blob.json");

  writeFileSync(fakeDocker, fakeIdentityDocker, { mode: 0o755 });
  writeFileSync(fakeCurl, fakeGhcrCurl, { mode: 0o755 });
  writeFileSync(localImageFile, localImage);
  writeFileSync(publishedImageFile, publishedImage);
  writeFileSync(candidateIndexFile, fixture.candidateIndex);
  writeFileSync(attestationManifestFile, fixture.attestationManifest);
  writeFileSync(provenanceFile, JSON.stringify(fixture.provenance));
  writeFileSync(provenanceBlobFile, fixture.provenanceBlob);

  const result = spawnSync(identityScript, [], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH ?? ""}`,
      LOCAL_IMAGE_REF: "coderso-core:booted",
      CANDIDATE_REF: fixture.immutableCandidateRef,
      EXPECTED_PROVENANCE_BUILDER_ID: expectedBuilder,
      GHCR_USERNAME: "example",
      GHCR_TOKEN: "test-ghcr-token",
      DOCKER_CALLS_FILE: dockerCallsFile,
      CURL_CALLS_FILE: curlCallsFile,
      FAKE_CANDIDATE_REF: fixture.immutableCandidateRef,
      FAKE_ATTESTATION_REF: fixture.attestationRef,
      LOCAL_IMAGE_FILE: localImageFile,
      PUBLISHED_IMAGE_FILE: publishedImageFile,
      CANDIDATE_INDEX_FILE: candidateIndexFile,
      ATTESTATION_MANIFEST_FILE: attestationManifestFile,
      PROVENANCE_FILE: provenanceFile,
      PROVENANCE_BLOB_FILE: provenanceBlobFile,
      TMPDIR: directory,
      ...environmentOverrides,
    },
  });

  return { result, curlCallsFile, directory, dockerCallsFile, fixture };
};

test("current release creates and verifies the immutable version before latest", () => {
  const { result, directory, dockerArgsFile, events, registryDigest } = runPromotion();

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(events).toEqual([
    "git ls-remote --tags --refs origin",
    "token",
    "head 1.2.3",
    "head 1.2.3",
    "git ls-remote --tags --refs origin",
    "docker 1.2.3",
    "head 1.2.3",
    "git ls-remote --tags --refs origin",
    "docker latest",
    "head latest",
  ]);
  expect(readFileSync(dockerArgsFile, "utf8").trim().split("\n")).toEqual([
    `buildx imagetools create --tag ${versionRef} ${candidateRef}`,
    `buildx imagetools create --tag ${latestRef} ${candidateRef}`,
  ]);
  expect(registryDigest("1.2.3")).toBe(digest);
  expect(registryDigest("latest")).toBe(digest);
  expect(`${result.stdout}${result.stderr}${events.join("\n")}`).not.toContain(
    "promotion-secret-token"
  );
  expect(
    readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  ).toEqual([]);
});

test("a stale rerun may fill its missing version but never moves latest", () => {
  const newerDigest = digestOf("newer-release");
  const { result, events, registryDigest } = runPromotion({
    remoteTags: ["1.2.3", "999999999999999999999999999999.0.0"],
    registry: { latest: newerDigest },
  });

  expect(result.status).toBe(0);
  expect(events.filter((event) => event.startsWith("docker "))).toEqual(["docker 1.2.3"]);
  expect(registryDigest("1.2.3")).toBe(digest);
  expect(registryDigest("latest")).toBe(newerDigest);
  expect(result.stdout).toContain("leaving :latest untouched");
});

test("re-invoking promotion with the exact original candidate may complete latest", () => {
  const { result, events } = runPromotion({
    registry: { "1.2.3": digest, latest: digestOf("old-latest") },
  });

  expect(result.status).toBe(0);
  expect(events.filter((event) => event.startsWith("docker "))).toEqual(["docker latest"]);
  expect(result.stdout).toContain("already matches the verified candidate");
});

test("a real workflow rerun with a newly attested digest fails before a write", () => {
  const originalDigest = digestOf("original-provenance-index");
  const previousLatest = digestOf("previous-latest");
  const { result, events, registryDigest } = runPromotion({
    registry: { "1.2.3": originalDigest, latest: previousLatest },
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("a rebuilt rerun cannot replace it");
  expect(events.some((event) => event.startsWith("docker "))).toBe(false);
  expect(registryDigest("latest")).toBe(previousLatest);
});

test("explicit operator recovery copies only the authenticated original version digest", () => {
  const originalDigest = digestOf("original-provenance-index");
  const { result, dockerArgsFile, events, registryDigest } = runPromotion({
    recoveryOnly: true,
    recoveryDigest: originalDigest,
    registry: { "1.2.3": originalDigest, latest: digestOf("previous-latest") },
  });

  expect(result.status).toBe(0);
  expect(events).toEqual([
    "git ls-remote --tags --refs origin",
    "token",
    "head 1.2.3",
    "git ls-remote --tags --refs origin",
    "docker latest",
    "head latest",
  ]);
  expect(readFileSync(dockerArgsFile, "utf8").trim()).toBe(
    `buildx imagetools create --tag ${latestRef} ${versionRef}@${originalDigest}`
  );
  expect(registryDigest("1.2.3")).toBe(originalDigest);
  expect(registryDigest("latest")).toBe(originalDigest);
  expect(result.stdout).toContain("Recovered :latest from explicit immutable version digest");
});

test("operator recovery rejects a mismatched or historical version without a write", () => {
  const originalDigest = digestOf("original-provenance-index");
  for (const options of [
    {
      recoveryOnly: true,
      recoveryDigest: originalDigest,
      registry: { "1.2.3": digestOf("other-version-index") },
    },
    {
      recoveryOnly: true,
      recoveryDigest: originalDigest,
      registry: { "1.2.3": originalDigest },
      remoteTags: ["1.2.3", "1.2.4"],
    },
  ] satisfies PromotionOptions[]) {
    const { result, events } = runPromotion(options);
    expect(result.status).not.toBe(0);
    expect(events.some((event) => event.startsWith("docker "))).toBe(false);
  }
});

test("operator recovery requires an exact digest and forbids a new candidate", () => {
  const originalDigest = digestOf("original-provenance-index");
  for (const options of [
    { recoveryOnly: true, recoveryDigest: "sha256:not-a-digest" },
    { environment: { RECOVERY_VERSION_DIGEST: originalDigest } },
  ] satisfies PromotionOptions[]) {
    const { result, events } = runPromotion(options);
    expect(result.status).not.toBe(0);
    expect(events).toEqual([]);
  }
});

test("promotion fails closed when origin tag enumeration fails", () => {
  const { result, events } = runPromotion({ gitFailure: true });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Unable to enumerate stable release tags from origin");
  expect(events).toEqual(["git ls-remote --tags --refs origin"]);
});

test("promotion requires its exact candidate version tag on origin", () => {
  const { result, events } = runPromotion({ remoteTags: ["1.2.2", "1.2.4"] });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("does not have an exact stable tag on origin");
  expect(events.some((event) => event.startsWith("head "))).toBe(false);
  expect(events.some((event) => event.startsWith("docker "))).toBe(false);
});

test("remote ordering ignores non-stable and leading-zero tag names", () => {
  const { result, events } = runPromotion({
    remoteTags: ["v999.0.0", "01.0.0", "1.2", "1.2.3+build", "1.2.3", "not-semver"],
  });

  expect(result.status).toBe(0);
  expect(events.filter((event) => event === "docker latest")).toHaveLength(1);
});

test("promotion rejects malformed origin enumeration instead of using partial state", () => {
  const { result, events } = runPromotion({
    remoteRaw: `${"a".repeat(39)}\trefs/tags/1.2.3`,
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("malformed tag enumeration data");
  expect(events.some((event) => event.startsWith("docker "))).toBe(false);
});

test("GHCR exact 404 and 200 states are accepted but any other status fails closed", () => {
  const absent = runPromotion();
  expect(absent.result.status).toBe(0);

  const present = runPromotion({ registry: { "1.2.3": digest } });
  expect(present.result.status).toBe(0);

  const unexpected = runPromotion({ statusOverrides: { "1.2.3": "401" } });
  expect(unexpected.result.status).not.toBe(0);
  expect(unexpected.result.stderr).toContain("unexpected HTTP status 401");
  expect(unexpected.events.some((event) => event.startsWith("docker "))).toBe(false);
});

test("GHCR 200 responses require one exact sha256 digest", () => {
  const { result, events } = runPromotion({ registry: { "1.2.3": "sha256:not-a-digest" } });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("malformed Docker-Content-Digest header");
  expect(events.some((event) => event.startsWith("docker "))).toBe(false);
});

test("unsafe references and GHCR usernames are rejected before tools run", () => {
  for (const environment of [
    { CANDIDATE_REF: "ghcr.io/example/coderso-core:candidate-123-1" },
    { VERSION_REF: "ghcr.io/attacker/coderso-core:1.2.3" },
    { GHCR_USERNAME: "example:injected-password" },
  ]) {
    const { result, events } = runPromotion({ environment });
    expect(result.status).not.toBe(0);
    expect(events).toEqual([]);
  }
});

test("identity verification rejects mutable candidates before registry inspection", () => {
  const result = spawnSync(identityScript, [], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      LOCAL_IMAGE_REF: "coderso-core:booted",
      CANDIDATE_REF: "ghcr.io/example/coderso-core:candidate-123-1",
      EXPECTED_PROVENANCE_BUILDER_ID: expectedBuilder,
    },
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("CANDIDATE_REF must be pinned to an immutable sha256 digest");
});

test("identity verification rejects candidates outside GHCR before registry inspection", () => {
  const { result, curlCallsFile } = runIdentity(
    {},
    {
      CANDIDATE_REF: `registry.example.com/example/coderso-core:candidate-123-1@${digest}`,
    }
  );

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("CANDIDATE_REF must use ghcr.io");
  expect(existsSync(curlCallsFile)).toBe(false);
});

test("identity verification accepts one digest-bound SLSA provenance for the booted image", () => {
  const { result, curlCallsFile, directory, dockerCallsFile, fixture } = runIdentity();

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toContain(
    "matches the image that booted and carries bound SLSA provenance"
  );
  expect(readFileSync(dockerCallsFile, "utf8")).toContain(
    `buildx imagetools inspect ${fixture.attestationRef} --raw`
  );
  expect(readFileSync(dockerCallsFile, "utf8")).toContain(
    `buildx imagetools inspect ${fixture.immutableCandidateRef} --format {{json .Provenance.SLSA}}`
  );
  const curlCalls = readFileSync(curlCallsFile, "utf8");
  expect(curlCalls.trim().split("\n")).toEqual([
    "https://ghcr.io/token",
    `https://ghcr.io/v2/example/coderso-core/blobs/${fixture.layerDigest}`,
  ]);
  expect(curlCalls).not.toContain("test-ghcr-token");
  expect(curlCalls).not.toContain("fake-registry-bearer");
  expect(
    readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  ).toEqual([]);
});

test("identity verification rejects an SBOM-only attestation manifest", () => {
  const { result } = runIdentity({
    attestationPredicateType: sbomPredicateType,
    provenance: null,
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("exactly one in-toto SLSA v0.2 provenance layer");
});

test("identity verification rejects an SBOM envelope behind a lying SLSA annotation", () => {
  const { result } = runIdentity({
    innerPredicateType: sbomPredicateType,
    envelopePredicate: { SPDXID: "SPDXRef-DOCUMENT", spdxVersion: "SPDX-2.3" },
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("not an in-toto Statement v1");
});

test("identity verification pins the in-toto statement and SLSA predicate versions", () => {
  for (const options of [
    { innerStatementType: "https://in-toto.io/Statement/v0.1" },
    { innerPredicateType: "https://slsa.dev/provenance/v1" },
  ] satisfies IdentityFixtureOptions[]) {
    const { result } = runIdentity(options);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("not an in-toto Statement v1");
  }
});

test("identity verification rejects an envelope subject bound to another image", () => {
  const { result } = runIdentity({ innerSubjectDigest: digestOf("another-inner-subject") });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("expected runnable subject");
});

test("identity verification rejects malformed provenance blob bytes", () => {
  const { result } = runIdentity({ provenanceBlobRaw: '{"_type":' });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("not an in-toto Statement v1");
});

test("identity verification checks provenance blob size before parsing", () => {
  const validBlob = JSON.stringify({ note: "descriptor size is deliberately wrong" });
  const { result } = runIdentity({
    provenanceBlobRaw: validBlob,
    layerDescriptorSize: Buffer.byteLength(validBlob) + 1,
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("does not match its descriptor size");
});

test("identity verification checks provenance blob digest before parsing", () => {
  const { result } = runIdentity({
    layerDescriptorDigest: digestOf("untampered-provenance-bytes"),
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("does not match its descriptor digest");
});

test("identity verification requires Buildx to decode the verified envelope predicate", () => {
  const decodedPredicate = validProvenance();
  decodedPredicate.metadata.buildInvocationID = "a-different-build";
  const { result } = runIdentity({ provenance: decodedPredicate });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("different from the verified in-toto envelope");
});

test("identity verification rejects a malformed immutable attestation manifest", () => {
  const { result } = runIdentity({ attestationRaw: '{"schemaVersion":2' });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("exactly one in-toto SLSA v0.2 provenance layer");
});

test("identity verification pins the OCI empty JSON config descriptor", () => {
  for (const options of [
    { configDigest: digestOf("") },
    { configSize: 0 },
    { configData: "not-base64-empty-json" },
  ] satisfies IdentityFixtureOptions[]) {
    const { result } = runIdentity(options);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("exactly one in-toto SLSA v0.2 provenance layer");
  }
});

test("identity verification accepts the canonical empty config without optional inline data", () => {
  const { result } = runIdentity({ configData: null });

  expect(result.status).toBe(0);
});

test("identity verification checks the attestation manifest descriptor size", () => {
  const { result } = runIdentity({ attestationDescriptorSize: 1 });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("does not match its candidate index descriptor size");
});

test("identity verification binds the attestation subject size to the runnable descriptor", () => {
  const { result } = runIdentity({ attestationSubjectSize: 2_048 });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("exactly one in-toto SLSA v0.2 provenance layer");
});

test("identity verification rejects an attestation subject bound to another image", () => {
  const { result } = runIdentity({ subjectDigest: digestOf("another-subject") });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("bound to the runnable image");
});

test("identity verification rejects an index reference bound to another image", () => {
  const { result } = runIdentity({ referenceDigest: digestOf("another-reference") });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("one bound attestation manifest");
});

test("identity verification rejects missing or ambiguous attestation topology", () => {
  for (const options of [
    { omitAttestationManifest: true },
    { extraRunnableManifest: true },
  ] satisfies IdentityFixtureOptions[]) {
    const { result } = runIdentity(options);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "exactly one linux/amd64 image manifest and one bound attestation manifest"
    );
  }
});

test("identity verification checks the raw candidate bytes against the immutable digest", () => {
  const { result } = runIdentity({ candidateDigest: digestOf("not-the-candidate-index") });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("does not match CANDIDATE_REF digest");
});

test("identity verification rejects provenance from a different builder", () => {
  const { result } = runIdentity({
    provenance: validProvenance("https://github.com/attacker/repository/actions/runs/999"),
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("not the expected BuildKit SLSA v0.2 predicate");
});

test("identity verification rejects malformed decoded provenance content", () => {
  const { result } = runIdentity({
    provenance: { builder: { id: expectedBuilder }, SPDXID: "SPDXRef-DOCUMENT" },
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("not the expected BuildKit SLSA v0.2 predicate");
});
