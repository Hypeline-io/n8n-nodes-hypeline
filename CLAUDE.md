# CLAUDE.md, @hypeline-io/n8n-nodes-hypeline

Guidance for Claude Code and other agents working in this repository.

For how n8n community nodes are structured and built, read `@AGENTS.md` and the
files under `.agents/`. This file adds the conventions and hard-won findings
specific to this project. Follow it exactly; it encodes the n8n verification bar.

## What this is

`@hypeline-io/n8n-nodes-hypeline` (repo `Hypeline-io/n8n-nodes-hypeline`) is the
official [Hypeline](https://hypeline.io) community
node for [n8n](https://n8n.io). It gives a workflow (or an AI agent driving n8n)
eyes on the web: watch any feed, streaming source, or web page, and act on
genuinely new content.

The package ships:

- **Hypeline Trigger** node: registers a signed webhook destination on activate,
  fires the workflow on each new-content event, verifies every delivery with
  HMAC, and tears down only what it created on deactivate.
- **Hypeline** action node: sources, alerts, and destinations CRUD over the
  public REST API.
- **Hypeline API** credential: a `hype_` bearer key with a live test request.

## Hard rules (the n8n verification bar)

These are gates, not preferences. n8n's automated verification (the
`@n8n/scan-community-package` scanner, which lints the published tarball with the
community-node ESLint ruleset) rejects a package that breaks them.

- **Zero runtime dependencies.** `package.json` `dependencies` must stay empty.
  The webhook HMAC check is reimplemented with `node:crypto`
  (`utils/verifySignature.ts`), never the `standardwebhooks` library. Anything a
  node needs at runtime is provided by n8n (`n8n-workflow` is a peer dependency).
  A single runtime dep fails the whole package on n8n Cloud.
- **Even the tests have no dependencies.** Unit tests use the built-in
  `node:test` runner and run against the compiled `dist/` output
  (`test/*.test.js`). Do not add vitest/jest. This also keeps the strict ESLint
  config unmodified (see below).
- **MIT licensed**, the `n8n-community-node-package` keyword stays in `keywords`,
  and the `author` field must include a non-empty `email`.
- **Verify webhook signatures on the raw body, before `JSON.parse`.** The signed
  string is `${id}.${timestamp}.${rawBody}`; never verify a re-serialized body.
  n8n exposes the raw bytes as `this.getRequestObject().rawBody` (a Buffer).
- **Only tear down what the node created.** The Trigger deletes its own
  destination always, but deletes an alert only when it created that alert. A
  user's pre-existing alert (Attach Existing mode) is never deleted. The
  `alertId` is stored in workflow static data only when node-created.

## Lint conventions (write it right the first time)

`npm run lint` runs `n8n-node lint` (the community-node ESLint ruleset, strict
cloud-support mode). It enforces, among others:

- **`eslint.config.mjs` must stay the default** (`export default config`). Strict
  mode compares it byte for byte; any local override (even adding `ignores`)
  fails as a strict-mode violation. Scope concerns another way instead.
- Descriptions end with a period, spell **`ID`** not `id`/`Id`, and write
  **`comma-separated`** not `comma separated`. Most of these are `--fix`-able:
  run `npm run lint:fix`.
- **Collection option lists must be alphabetized by `displayName`.** Not
  autofixable, order them by hand.
- Every node and credential needs an **icon**. Provide both themed variants:
  `icon: { light: 'file:hypeline.svg', dark: 'file:hypeline.dark.svg' }`, with
  the SVGs sitting next to the class file (they are `file:`-relative). Credentials
  need the icon too (`icon: Icon = { light, dark }`).
- Every node class needs a **`usableAsTool`** property (set `true` here; it is
  the AI-agent story).

## Build and test toolchain (gotchas)

- `npm run build` runs `n8n-node build`, which is `rimraf dist` then `tsc` then a
  copy of `*.svg`/`*.png` static files into `dist/`. Because it cleans `dist`
  every time, **do not enable `incremental`/`tsBuildInfoFile` in `tsconfig.json`**:
  a build-info cache that outlives the rimraf makes tsc skip emit and produces an
  empty `dist`. Keep the build non-incremental.
- `tsconfig.json` `include` lists `nodes/**/*.json` so the `*.node.json` codex
  files reach `dist`. Do **not** add `package.json` to `include`; it makes tsc
  emit a stray `dist/package.json`.
- `npm test` builds first, then runs `node --test`. Tests import from `../dist`.
- `npm pack --dry-run` should show only `dist/**` plus `package.json`, `README.md`,
  `LICENSE`. If a `tsbuildinfo` or `dist/package.json` appears, fix `tsconfig.json`
  as above before publishing.

## Coding style

- Match the surrounding style and the n8n conventions in `.agents/`. Tabs,
  single quotes, semicolons, trailing commas, 100 column width (`.prettierrc.js`).
- Always run `npm run lint` and fix every warning. Do not disable a lint rule
  without a specific, commented reason.
- Copy a user reads (node descriptions, credential fields, README): no em
  dashes, do not name the streaming push source by brand (say "streaming
  source"), use "event stream" for delivery targets, and lead with the agent
  story. No "not X, it is Y" antithesis phrasing.

## Git and releases (definition of done)

- **Small, focused commits** with [Conventional Commits](https://www.conventionalcommits.org)
  messages (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`).
- **No Claude/AI co-author trailer** on commits.
- **Prefer a branch and a pull request.** CI (`.github/workflows/ci.yml`) runs
  lint + build on every PR and must be green before merge.
- A change is not done until: lint clean, `npm test` green, the build produces a
  clean tarball, and, when behavior or the public surface changed, **the version
  is bumped (semver) and `CHANGELOG.md` has an entry in the same change.**
- **Releases are driven by the version in `package.json`, no git tags** (same
  mechanism as the Hypeline SDK, `@hypeline-io/sdk`). To release: bump the
  `version` (and update `CHANGELOG.md`), commit, and push to `main`.
  `.github/workflows/publish.yml` then publishes to npm ONLY if that exact
  version is not already there, so a docs-only push never re-publishes. A version
  bump is the entire release ritual.
- Auth is **npm OIDC trusted publishing** (`id-token: write`, no token, no secret
  in the repo). **Provenance is attached automatically** via
  `publishConfig.provenance` in `package.json`, which satisfies n8n's
  post-2026-05-01 provenance requirement. Never `npm publish` a release from a
  laptop; let CI do it.
- **First publish (one-time bootstrap).** npm trusted publishing cannot attach to
  a package name that does not exist yet. Create `@hypeline-io/n8n-nodes-hypeline`
  once: `npm login` (an `@hypeline-io` org member) then `npm publish` from a clean
  build, or use a temporary granular automation token for a single CI run. Then on
  npmjs.com add the Trusted Publisher (repo `Hypeline-io/n8n-nodes-hypeline`,
  workflow `publish.yml`). Every later version bump publishes via OIDC with no
  token. This is how `@hypeline-io/sdk` was bootstrapped.

## Keep in sync with the Hypeline API

This node talks to Hypeline's public REST API (`https://api.hypeline.io/v1`).
When that public surface changes (an endpoint, a request or response shape, the
webhook signing scheme, a new destination kind), reconcile this node in the same
release: the action-node endpoint map, the credential, `utils/verifySignature.ts`,
and the README. A stale node is worse than none. The daily
`.github/workflows/smoke.yml` job exercises the live endpoints the node depends
on (once the `HYPELINE_SMOKE_TOKEN` repo secret is set) so a drift is caught here.

## Commands

- `npm run build` compiles TypeScript and copies icons into `dist/`.
- `npm run lint` / `npm run lint:fix` run the n8n community-node ESLint config.
- `npm test` builds, then runs the `node:test` suite (HMAC vectors + package
  compliance).
- `npm run dev` runs the node in a local n8n for manual testing.
