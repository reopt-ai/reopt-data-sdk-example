# SDK feature adoption checklist

Use this checklist whenever the example adopts or changes an SDK capability.

- [ ] Add a stable scenario to `lib/reopt/scenarios.ts` when the feature needs shared event names or properties.
- [ ] Exercise the public API in a visible route; keep SDK-specific behavior out of unrelated commerce code.
- [ ] Add or update the row in `lib/reopt/feature-map.ts` and the relevant README section.
- [ ] Add a focused regression test for payload, identity, consent, proxy, or server behavior.
- [ ] For data-producing features, tag one event with a unique run id and verify browser → ingest → materialization → Query API.
- [ ] Confirm ingest and query request ids are available for failure correlation without logging credentials.
- [ ] Run `pnpm verify:quick` during implementation.
- [ ] Run `pnpm verify:full` before handoff in the intended npm/local/tarball mode; Docker and the sibling Data checkout provide a disposable project.
- [ ] Verify the public demo vocabulary, PII filtering, quotas, rate limit, and retention still fit the new events.
- [ ] Record the isolated roundtrip run, ingest, and query request ids. Run staging/deployed checks only when explicitly requested.
- [ ] Restore `pnpm sdk:npm` and confirm the original lockfile is preserved before handoff.

Do not copy local environment files, client secrets, write keys, or captured personal data into issues, logs, fixtures, or commits.
