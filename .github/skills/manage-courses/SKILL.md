---
name: manage-courses
description: >-
  Manage Midway courses through the existing course-demo REST API. Use when the
  user asks to list, browse, find, search, or filter courses, or to create, add,
  publish, or save a course in this project. Currently supports listing,
  keyword search, and creation.
---

# Manage Courses

Use the documented REST API as the only course-management boundary. Do not
write directly to the database, copy server business rules, or invent
unsupported operations.

## Route the request

1. Determine the requested operation from the user's message.
2. For listing, browsing, finding, searching, or filtering courses, read and
   follow [references/list-and-search.md](references/list-and-search.md).
3. For creating, adding, publishing, or saving a course, read and follow
   [references/create.md](references/create.md).
4. If the user requests multiple supported operations, perform them in the
   requested order and apply each operation's guardrails separately.
5. If the user requests an unsupported operation such as update or delete,
   explain that the current API contract does not provide it. Do not simulate
   success or bypass the API.

## Common boundary

- Default `baseUrl` to `http://localhost:7001` unless the user specifies
  another host.
- Use only paths, parameters, headers, bodies, and statuses documented in
  `contracts/openapi.yaml`.
- Forward a user-provided `X-Request-Id` when supplied; otherwise let the
  server generate one.
- Check the HTTP status, response JSON, and `X-Request-Id` response header.
- Treat `Course` as containing `id`, `title`, `description`, and ISO 8601
  `createdAt`.
- Report failures with a safe summary and the response request ID when
  available. Never expose stack traces, SQL, database paths, secrets, or other
  internal diagnostics.
- Do not bypass authentication, permissions, validation, or persistence rules.
