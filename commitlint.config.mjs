const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
  helpUrl:
    "https://github.com/reopt-ai/reopt-data-sdk-example/blob/main/CONTRIBUTING.md#commit-messages",
  plugins: [
    {
      rules: {
        "header-english": ({ header }) => {
          const isAsciiEnglish = /^[\x20-\x7e]+$/.test(header ?? "");

          return [
            isAsciiEnglish,
            "commit headers must be written in English using ASCII characters",
          ];
        },
        "message-no-private-metadata": ({ raw }) => {
          const hasPrivateSession =
            /(?:^[A-Za-z]+-Session:\s*https?:|\/(?:code\/)?session_)/im.test(
              raw ?? "",
            );

          return [
            !hasPrivateSession,
            "commit messages must not contain private AI session metadata",
          ];
        },
      },
    },
  ],
  rules: {
    "header-max-length": [2, "always", 100],
    "header-english": [2, "always"],
    "message-no-private-metadata": [2, "always"],
  },
};

export default commitlintConfig;
