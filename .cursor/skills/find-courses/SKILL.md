---
name: find-courses
description: >-
  List Midway courses via GET /api/courses; optionally filter the returned
  data by keyword in title or description. Use when the user asks to list,
  browse, find, search, or filter courses in this course-demo project.
---

# Find Courses

Guide the agent to use the **existing** course list API. Do not invent query
parameters the OpenAPI contract does not define.

## Workflow

1. Match a list / browse / find / filter courses request.
2. Extract an optional keyword from the user message only. If none is given,
   do not invent one.
3. Call an HTTP tool:
   - `GET {baseUrl}/api/courses`
   - Default `baseUrl` is `http://localhost:7001` unless the user specifies
     another host.
   - **Never** append `?keyword=` or any other undeclared query parameter.
4. Check the HTTP status and parse `{ "data": Course[] }`.
5. If a keyword was provided, filter `data` locally (Agent-side):
   - Match when `title` or `description` contains the keyword.
   - ASCII letters `A-Z` are case-insensitive.
   - Trim the keyword before matching; if it is empty after trim, treat as
     no keyword (return the full list).
6. Interpret results per the rules below.

## Course shape

Each item in `data` has:

- `id` (integer)
- `title` (string)
- `description` (string)
- `createdAt` (ISO 8601 string)

## Results

- `200` with non-empty matches: return `id`, `title`, and `description`.
  If you filtered locally, state clearly that the current API has no
  server-side search and filtering was applied to the list response.
- `200` with `data: []`, or no local matches: report “no matching courses”.
  This is not a failure.
- Non-2xx or network failure: report status and a safe error summary.
  Do not expose stack traces, database paths, SQL, or secrets.

## Guardrails

- Do not bypass authentication or elevate privileges.
- Do not copy business rules into a parallel implementation; reuse the REST API.
- Do not present Agent-side filtering as if `keyword` were a supported API parameter.
- Redact secrets and internal diagnostics in any failure report.

## Examples

**List all courses**

User: “有哪些课程？”  
Action: `GET http://localhost:7001/api/courses`  
Reply: summarize every item in `data`.

**Find by keyword (Agent-side)**

User: “帮我找和 React 相关的课程”  
Action: `GET http://localhost:7001/api/courses`  
Then keep courses whose `title` or `description` contains `react` (case-insensitive).  
Reply: matching courses, plus one sentence that filtering was local.
