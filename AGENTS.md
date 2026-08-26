<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reopt Data SDK Example — repository instructions

This application is the public, production-shaped reference for
`@reopt-ai/data-sdk-client` and `@reopt-ai/data-sdk-server`. The storefront
exists to make integration patterns observable; SDK boundaries are the product.

## Rules

- Preserve fail-open analytics behavior without weakening application security.
- If an SDK regression is suspected, record a minimal reproduction before
  adding a workaround. Document the affected version beside any temporary
  workaround and remove it when the fixed release is adopted.
- Add every SDK capability to `lib/reopt/feature-map.ts` and the matching README
  table. `/guide` renders the source map.
- Keep public documentation, UI copy, issues, pull requests, and commit messages
  in English.
- Use one logical change per Conventional Commit (`type(scope): subject`). The
  commitlint hook enforces an ASCII English header; see `CONTRIBUTING.md`.
- Do not use GitHub Actions. Validate locally with `pnpm check && pnpm e2e`.
- Work on `staging`. The user opens the pull request to `main`.
- Never create a remote or push unless the user explicitly asks.
- Never expose diagnostic surfaces in production unless
  `REOPT_EXAMPLE_DIAGNOSTICS=true` was an explicit deployment decision.

## Validation

```bash
pnpm check
pnpm e2e
```

Without `.reopt-local.json`, real round-trip specs skip themselves and the
fail-open contract still runs.

## Project-specific integration notes

- When observing `config.fetch` batches, use SPA navigation through `navigate()`
  in `e2e/fixtures.ts`. `page.goto()` creates a new JavaScript context and
  discards the recorder state. Produce `$pageleave` through a route change.
- Call `waitForHydration()` before clicking Server Action controls.
- `instrumentation.ts` is a separate bundle. Module state created there is not
  visible to the application bundle; see `lib/auth.ts`.
- Route Handlers and Server Components may also use separate module instances.
  Process-wide demo state belongs on `globalThis`.
- `NextResponse.cookies.set()` encodes values. Decode an already encoded SDK
  cookie value once before passing it to Next.js; see `app/api/consent/route.ts`.
- `DrawerRoot` uses `onOpenChange` and `animated={false}`. Import
  `createThemeBootScript` from `@reopt-ai/opt-ui/theme/server` in Server
  Components.
