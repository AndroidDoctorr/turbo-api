# Controllers and routes

## `ControllerBase`

Location: `src/controllerBase.js`.

Constructor:

```javascript
class MyController extends ControllerBase {
  constructor() {
    super(collectionName, validationRules, propNames)
  }

  configureRoutes() {
    // call this.basicCRUD(...), this.fullCRUD(...), and/or add custom routes
  }
}
```

- **`collectionName`** — Firestore collection name (or logical table name for other backends).
- **`validationRules`** — object passed to `validation.validateData` / helpers (see [Validation](validation.md)).
- **`propNames`** — whitelist of property names accepted on create/update (`filterObjectByProps`).

`configureRoutes()` runs from the constructor, so subclasses override it to register routes.

## Built-in CRUD helpers

### `basicCRUD(options)`

Registers:

| Method | Path | Handler |
|--------|------|---------|
| POST | `/` | `createDocument` |
| GET | `/:id` | `getDocumentById` |
| GET | `/` | `getActiveDocuments` |
| PUT | `/:id` | `updateDocument` |
| DELETE | `/:id` | `deleteDocument` |

### `fullCRUD(options)`

Everything in `basicCRUD`, plus:

| Method | Path | Notes |
|--------|------|--------|
| GET | `/my` | Current user’s documents (`getMyDocuments`) — skipped if `options.noMetaData` |
| GET | `/recent` | Recent documents (`getRecentDocuments`) — query `?limit=` and optional `?startAtIndex=`; skipped if `options.noMetaData` |
| GET | `/includeInactive` | All documents including inactive — **admin only** |
| GET | `/:id` | Same as basic |
| GET | `/:id/full` | Same as `/:id` but expands foreign-key fields inline |
| PUT | `/:id/archive` | Soft-delete (`isActive: false`) |
| PUT | `/:id/dearchive` | Restore (`isActive: true`) |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Hard delete |

Route registration order in `fullCRUD` places static segments like `/includeInactive` before `/:id` so they are not swallowed by the id parameter.

### Options (both CRUD helpers)

These flags are read from `this.options` inside document methods:

| Option | Effect |
|--------|--------|
| `isPublicGet` | Allow unauthenticated GET when `true`. |
| `isPublicPost` | With **`noMetaData`**, allows anonymous POST. |
| `noMetaData` | Skip created/modified metadata in data service; relaxes some archive/dearchive checks. |
| `isAdminOnly` | Restrict operations to users with `user.admin` truthy. |
| `allowUserDelete` | Non-admin owners (`createdBy`) may DELETE when `true`. |

## Document metadata (Firestore)

When **`noMetaData`** is falsy, `firestoreDataService.createDocument` adds:

- `created`, `createdBy`, `modified`, `modifiedBy` (timestamps / user id)
- `isActive: true`

Updates set `modified` / `modifiedBy` when metadata is enabled.

## Ownership and admin checks

- **Update**: user must be admin **or** match `oldData.createdBy`.
- **Archive**: same as update (owner or admin).
- **Dearchive**: admin only unless `noMetaData` is set (then non-admin allowed by code path).
- **Delete**: admin always; or owner if `allowUserDelete` and `user.uid === data.createdBy`.
- **Get all / include inactive**: **`getAllDocuments`** requires admin.

`isUserAdmin(user)` is implemented as `!!user && !!user.admin` (expects a custom claim or enriched token — however you populate `req.user`).

## Helper methods you can call from custom routes

`ControllerBase` exposes async methods that load the data/logging services via `serviceFactory`: `createDocument`, `getDocumentById`, `getDocumentByIdFull`, `getActiveDocuments`, `getAllDocuments`, `getDocumentsByProp`, `getDocumentsByProps`, `queryDocumentsByProp`, `getDocumentsWhereInProp`, `getRecentDocuments`, `getMyDocuments`, `getUserDocuments`, `updateDocument`, `archiveDocument`, `dearchiveDocument`, `deleteDocument`.

Use these with `httpHelpers.handleRoute` for consistent status codes and error handling (see [HTTP helpers & errors](http-errors.md)).

## Export shape

Each file under `controllers/` should export:

```javascript
module.exports = {
  controller: MyController,
  // optional: collection constants, rules, etc. for other controllers
}
```

## `getRouter()`

`buildApp` mounts each controller with:

```javascript
app.use(controllerPath, controller.getRouter())
```

so `controllerPath` from config becomes the URL prefix for that router.
