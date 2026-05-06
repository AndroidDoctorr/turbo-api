# Authentication

## Firebase (default)

File: `src/authServices/firebaseAuthService.js`.

`createAuthenticationMiddleware` returns an Express middleware factory:

```javascript
createAuthenticationMiddleware(dataService) => (req, res, next) => { ... }
```

`buildApp` registers:

```javascript
app.use(authMiddleware(dataService))
```

with `authMiddleware` resolved from the service registry (see [Configuration](configuration.md) for how the service key is chosen).

### Authorization header

- If **`Authorization` is missing**, the request continues with **`req.user` unset** (anonymous).
- If present, it must be: **`Bearer <firebase-id-token>`**.
- Malformed headers → **400** `{ error: 'Invalid Authorization Header' }`.
- Invalid or expired token → **403** `{ error: 'Invalid Token' }`.
- Firebase user with **`disabled: true`** → **403** `{ error: 'Account is suspended' }`.

### `req.user`

On success, `req.user` is the Firebase Admin **`decodedIdToken`** object (`verifyIdToken`). Custom claims you set on the token (for example `admin: true`) appear as properties on this object and drive `ControllerBase.isUserAdmin`.

### Relationship to controller options

- **`isPublicGet` / `isPublicPost`** allow some operations without a user where the controller explicitly permits it.
- Otherwise, document methods throw **`AuthError`** when a user is required.

## AWS stub

`src/authServices/awsAuthService.js` is fully commented out in the repository; it sketches Lambda-style middleware and is not active in the published flow. See [Extending Turbo-API](extending.md).
