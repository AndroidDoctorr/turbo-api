# HTTP helpers and errors

File: `src/http.js`. Exported as `require('turbo-api').httpHelpers`.

## `handleRoute(req, res, action)`

`action` is an `async (req) => result` function.

- On success: responds with **JSON** and status **201** for `POST`, **200** for other methods.
- On failure: delegates to `handleErrors`.

Use this wrapper for custom routes so thrown validation/auth errors become consistent API responses.

Example:

```javascript
const { handleRoute } = require('turbo-api').httpHelpers

this.router.get('/stats', (req, res) =>
  handleRoute(req, res, async (req) => {
    const user = req.user
    if (!user) throw new AuthError('Login required')
    return { count: 42 }
  })
)
```

## `handleErrors(res, error)`

Maps error types to HTTP status and `{ error: message }` body (except `NoContentError` → **204** with `{}`).

| Error type | Status |
|------------|--------|
| `NoContentError` | 204 |
| `ValidationError` | 400 |
| `AuthError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `LogicError` | 418 |
| `DependencyError` | 424 |
| `ServiceError` | 503 |
| `InternalError` | 500 |
| Other | 500 (unknown internal error) |

You can call `handleErrors` directly if you are not using `handleRoute`.

## String helpers

File: `src/string.js`. Exported as **`stringHelpers`**.

- **`objectToString(document, maxStringLength?, depth?)`** — multi-line stringify for logs; truncates long strings.
- **`getDiffString(oldData, newData)`** — textual diff of keys removed or changed (used in update logging).

`validation.js` imports `ObjectToString` from `./string` for one message; the main export uses `objectToString` / `getDiffString`.
