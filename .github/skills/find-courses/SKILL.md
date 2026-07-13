---
name: find-courses
description: >-
  List Midway courses via GET /api/courses and use the optional keyword query
  when the user is searching. Use when the user asks to list,
  browse, find, search, or filter courses in this course-demo project.
---

# Find Courses

Guide the agent to use the **existing** course list API and its documented
`keyword` query parameter.

## Workflow

1. Match a list / browse / find / filter courses request.
2. Extract an optional keyword from the user message only. If none is given,
   do not invent one.
3. Call an HTTP tool:

- No keyword: `GET {baseUrl}/api/courses`
- With keyword: `GET {baseUrl}/api/courses?keyword={trimmedKeyword}`
- Default `baseUrl` is `http://localhost:7001` unless the user specifies
  another host.
- Do not append any query parameter other than the documented `keyword`.

4. Check the HTTP status and parse `{ "data": Course[] }`.
5. Let the server apply keyword normalization, validation, and matching.

- `keyword` is trimmed on the server.
- Empty-after-trim behaves like omitting the keyword.
- Title or description matches count.
- ASCII letters `A-Z` are case-insensitive.

6. Interpret results per the rules below.

## Course shape

Each item in `data` has:

- `id` (integer)
- `title` (string)
- `description` (string)
- `createdAt` (ISO 8601 string)

## Results

- `200` with non-empty matches: return `id`, `title`, and `description`.
- `200` with `data: []`: report “no matching courses”.
  This is not a failure.
- `400`: report a safe validation summary for unsupported keyword input.
- Non-2xx or network failure: report status and a safe error summary.
  Do not expose stack traces, database paths, SQL, or secrets.

## Guardrails

- Do not bypass authentication or elevate privileges.
- Do not copy business rules into a parallel implementation; reuse the REST API.
- Redact secrets and internal diagnostics in any failure report.

## Examples

**List all courses**

User: “有哪些课程？”  
Action: `GET http://localhost:7001/api/courses`  
Reply: summarize every item in `data`.

**Find by keyword**

User: “帮我找和 React 相关的课程”  
Action: `GET http://localhost:7001/api/courses?keyword=React`  
Reply: matching courses from the server response.
