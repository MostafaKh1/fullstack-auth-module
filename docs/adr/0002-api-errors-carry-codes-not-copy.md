# API errors carry codes, the front end owns the copy

Every API error is one JSON body, `{ code, status, traceId, retryable, issues?, message? }`, where `code` is a stable, closed set (`auth.invalid_credentials`, `user.email_taken`, `request.validation_failed`, ...).
A body the API cannot read as JSON (another content type, an unsupported charset or encoding, broken JSON) answers `400 request.malformed`, and one over the size limit `413 request.too_large`; neither is a server error.
The front end turns a `code` into the sentence the User reads, and maps each entry of `issues` (`{ path, code }`, where `path` is the array of keys from the body down to the field, such as `["password"]`, and `code` is a rule id such as `password.missing_number`) onto the form field it names.
`message` is a developer hint and is omitted in production; `traceId` matches the request id in the server logs.

Branching on message text breaks the first time the wording changes, and keeping user-facing copy on the server splits it across two codebases.
The cost is that a new error condition needs a code on both sides.
