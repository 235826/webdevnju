# List and Search Courses

Use the existing course list API and its optional `keyword` query parameter.

## Workflow

1. Extract an optional keyword from the user's message. Do not invent one.
2. Send one of these requests:
   - Without a keyword: `GET {baseUrl}/api/courses`
   - With a keyword: `GET {baseUrl}/api/courses?keyword={trimmedKeyword}`
3. Do not append any query parameter other than `keyword`.
4. Let the server normalize, validate, and match the keyword. Empty-after-trim
   behaves like an omitted keyword; title or description matches count; ASCII
   letters are case-insensitive.
5. Parse a successful response as `{ "data": Course[] }`.

## Results

- On `200` with matches, report each course's `id`, `title`, and `description`.
- On `200` with `data: []`, report that there are no matching courses. Do not
  treat an empty list as a failure.
- On `400`, report a safe validation summary for unsupported keyword input.
- On another non-2xx status or a network failure, report the status and a safe
  error summary. Do not claim that results were returned.
