# Repository guide for coding agents

## Scope

This repository is a teaching monorepo. Prefer small, readable changes that can be explained to learners. Keep frontend, backend, and API contract changes synchronized.
Explain non-obvious tradeoffs when they matter for learners.

## Delivery flow

1. Read the affected feature spec and project context before editing code.
2. Create or update a spec before changing user-visible behavior, business rules, data semantics, permissions, or concurrency behavior. Follow `specs/README.md`.
3. Update `contracts/openapi.yaml` before implementation when any observable HTTP behavior changes. This includes paths, methods, parameters, headers, bodies, schemas, status codes, errors, authentication, sorting, or pagination. Follow `contracts/README.md`.
4. Implement the smallest vertical slice and map automated tests or manual checks back to the acceptance criteria.
5. Run the affected workspace checks, then `npm run check` before handoff.

Pure documentation, formatting, or behavior-preserving refactors do not require a new spec or contract change. State that the external behavior is unchanged in the handoff.

## Commands

- Install dependencies with `npm install` at the repository root.
- Run all checks with `npm run check`; it verifies formatting, linting, types, tests, and builds for both workspaces.
- Run a single workspace command with `npm run <script> --workspace <frontend|backend>`.
- Run formatting commands from the repository root: `npm run format` to write changes or `npm run format:check` to verify them.

## Conventions

- Use TypeScript for application code.
- Use two-space indentation and run the root-level `npm run format` before handing off changes.
- Keep secrets and generated SQLite files out of version control.
- Never commit `.env`, credentials, generated databases, or build output.
- Treat `contracts/openapi.yaml` as the source of truth for the HTTP boundary; database tables and duplicated TypeScript types are not API contracts.
- Keep each acceptance criterion observable and reproducible; do not use a code location as the expected outcome.
- Avoid introducing a dependency when the platform already provides a clear equivalent.

## Football API operations

When asked to list, browse, find, create, edit, delete, predict, favorite, comment, moderate, or record football match data, use the documented REST API as the only business boundary. Do not write directly to the database, copy server business rules into scripts, invent unsupported operations, or bypass authentication, permissions, validation, prediction locks, concurrency rules, or persistence rules.

- Determine the requested football operation from the user's message before making API calls.
- If the user requests multiple supported operations, perform them in the requested order and apply each operation's guardrails separately.
- Default `baseUrl` to `http://localhost:7001` unless the user specifies another host.
- Use only paths, parameters, headers, bodies, statuses, authentication, sorting, and pagination documented in `contracts/openapi.yaml`.
- Forward a user-provided `X-Request-Id` when supplied; otherwise let the server generate one.
- Check the HTTP status, response JSON when present, and `X-Request-Id` response header.
- Report failures with a safe summary and the response request ID when available. Never expose stack traces, SQL, database paths, secrets, cookies, password hashes, or other internal diagnostics.
- Treat Competition → Stage → Match as the only supported match model. Prediction, Favorite, and Comment operations must target Match resources.
- Treat score prediction as a side effect. Send create or update requests once unless the user explicitly asks to retry.
- Never create or modify predictions after the server reports that the match is locked or already started.
- Never simulate administrator privileges. Match result entry, comment moderation, and admin data management require authenticated administrator access.
- If the user requests an unsupported operation or field, explain that the current API contract does not provide it. Do not simulate success or bypass the API.
