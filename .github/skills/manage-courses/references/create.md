# Create a Course

Use the existing course creation API. Treat creation as a side effect.

## Workflow

1. Extract `title` and `description` from the user's request.
2. If either value is missing, ask only for the missing value before sending a
   request. Do not infer or generate it unless the user asks for a draft.
3. Confirm that the request contains the intended title and description, then
   send the request once:
   - Method and URL: `POST {baseUrl}/api/courses`
   - Header: `Content-Type: application/json`
   - Body: `{ "title": "...", "description": "..." }`
4. Do not add undocumented fields.
5. Let the server perform final trimming and validation. `title` must be 2–80
   characters and `description` must be 2–500 characters after trimming.

## Results

- On `200`, parse `{ "data": Course }` and report the created course's `id`,
  `title`, and `description`.
- On `400`, report the safe `VALIDATION_FAILED` message and ask the user to
  correct the rejected input. Do not retry with modified content without
  permission.
- On `500`, report that creation failed and include the response request ID
  when available.
- On another non-2xx status or a network failure, report the status and a safe
  error summary. Do not claim that the course was created.
- Never retry a creation request unless the user explicitly asks to retry.
