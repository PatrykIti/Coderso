const versionFiles = [
  "package.json",
  "core/package.json",
  "store/package.json",
  "packages/sdk/package.json",
];

module.exports = {
  branches: ["main"],
  tagFormat: "${version}",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "angular",
        releaseRules: [
          { type: "build", release: "patch" },
          { type: "ci", release: "patch" },
          { type: "docs", scope: "release", release: "patch" },
        ],
      },
    ],
    [
      "./scripts/semantic-release-pr-notes.cjs",
      {
        changelogFile: "CHANGELOG.md",
        outputFile: ".tmp/semantic-release.env",
        versionFiles,
        textVersionFiles: [
          {
            path: "core/plugins/compat.ts",
            pattern: '(CORE_VERSION\\s*\\?\\?\\s*")[^"]+(")',
          },
        ],
        lockfileCommand: ["bun", "install", "--lockfile-only", "--ignore-scripts"],
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: [
          "CHANGELOG.md",
          "bun.lock",
          ...versionFiles,
          "core/plugins/compat.ts",
        ],
        message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    [
      "@semantic-release/github",
      {
        successComment: false,
        failComment: false,
      },
    ],
  ],
};
