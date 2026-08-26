# Security Policy

## Reporting a vulnerability

Do not disclose security vulnerabilities in a public issue, discussion, pull
request, or commit.

Use GitHub's **Report a vulnerability** flow for this repository when it is
available. If private vulnerability reporting is unavailable, contact the
Reopt maintainers through a private channel listed on the
[`reopt-ai` organization profile](https://github.com/reopt-ai) and include the
repository name in the subject.

Please provide:

- a concise description of the issue and its impact;
- reproduction steps or a minimal proof of concept;
- the affected SDK package names and exact versions;
- the affected route, runtime, and deployment mode;
- any suggested mitigation, if known.

Do not include live credentials or personal data. If a secret was exposed,
revoke it first and report only a redacted identifier.

## Scope

This repository is an example application and does not publish a versioned
runtime artifact. Reports about code in this repository are handled here.
Reports that reproduce in `@reopt-ai/data-sdk-client`,
`@reopt-ai/data-sdk-server`, `data.reopt.ai`, or an upstream dependency may be
redirected to the owning project so the fix can be released at the correct
boundary.

The demo accounts, in-memory commerce data, and local development authentication
flow are intentionally non-production. Their presence is not itself a
vulnerability unless they can affect a real deployment or expose non-demo data.

## Credential handling

- Never commit `.env`, `.env.local`, `.reopt-local.json`, or `.sdk-local/`.
- A Reopt write key is public by design; a Reopt client secret is not.
- Keep `REOPT_CLIENT_ID`, `REOPT_CLIENT_SECRET`, and authentication secrets in a
  server-side secret store.
- Never add `NEXT_PUBLIC_` to server credentials.
- Sanitize captured analytics payloads before sharing logs or screenshots.
- Keep `REOPT_EXAMPLE_DIAGNOSTICS` disabled in production unless the deployment
  is an isolated, controlled demo.
- Run `pnpm public:safety` before publishing. The pre-commit hook applies the
  same checks to staged files.
