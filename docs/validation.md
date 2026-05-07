# Validation

Implementation: `src/validation.js`. Re-exported as `require('turbo-api').validation`.

## Rule builders

| Function | Meaning |
|----------|---------|
| `stringRule(minLength, maxLength, required, unique?)` | String length bounds; optional DB uniqueness. |
| `numberRule(minValue, maxValue, required)` | Numeric range. |
| `boolRule(required)` | Boolean. |
| `enumRule(values, required?, isNumber?)` | Value must be in `values`; type string or number. |
| `fKeyRule(reference, required?, isNumber?)` | Foreign key: `reference` is target collection name; value must exist. |
| `colorRule(required?, unique?)` | Hex color `#rgb` or `#rrggbb`. |

Rules are plain objects with optional fields used by validators: `type`, `minLength`, `maxLength`, `minValue`, `maxValue`, `values`, `reference`, `required`, `unique`, `format` (RegExp), `condition`, `default`, `isColor`.

## Types exported for comparison

`stringType`, `numberType`, `boolType`, `arrType` — from `typeof` literals, used internally for `validateType`.

## Pipeline entry points

- **`filterObjectByProps(data, propNames)`** — only keys listed in `propNames` are kept (incoming payload sanitation).
- **`applyDefaults(data, rules)`** — copies `data` and fills `rule.default` when the key is missing.
- **`validateData(data, rules, dbService, collectionName)`** — async; validates **every** field rule in `rules`, then **`uniquePropCombination`** when present. Hits the database for FK and uniqueness checks where configured.
- **`validateDataPartial(data, rules, dbService, collectionName)`** — async; validates **only** keys that exist on `data` and have a matching rule. Use for sparse PATCH bodies. Does **not** run `uniquePropCombination`; call `validateData` on a full merged document when you need that check.

### `uniquePropCombination`

If a rule key **`uniquePropCombination`** is present, its value should be an array of property names. The validator uses `dbService.getDocumentsByProps` with `includeInactive` semantics from the implementation and throws **`ForbiddenError`** if a matching document exists.

## Per-field validation

`validateProp` applies, when applicable:

- Required / conditional required (`validateCondition`)
- `validateType`, `validateLength`, `validateSize`, `validateValue`, `validateFormat`, `validateColor`
- `validateForeignKey` (requires `dbService`)
- `validateUniqueness` (requires `dbService` and `rule.unique`)

## Conditional rules

`rule.condition` can be `true` or a 3-tuple: `[baseProperty, operator, target]`.

- `baseProperty` must exist on `data`.
- `target` can be another property name (indirection) or a literal.

Operators supported in `doComparison`: `==`, `!=`, `>`, `>=`, `<`, `<=`, `oneOf` (where `target` is an array).

## Error classes

Thrown from validation or mapped to HTTP responses via `http.handleErrors`:

| Error | Typical HTTP status |
|-------|---------------------|
| `NoContentError` | 204 |
| `ValidationError` | 400 |
| `AuthError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `LogicError` | 418 |
| `DependencyError` | 424 |
| `ServiceError` | 503 |
| `InternalError` | 500 |

All extend `Error` with a `name` matching the class name.

### `uniquePropCombination` order

Field rules run first; the combination uniqueness check runs **last** so individual fields are validated before the composite check.

## Module exports (from code)

`validateData`, `validateDataPartial`, `applyDefaults`, `filterObjectByProps`, all error classes, types, and rule helpers: `stringRule`, `fKeyRule`, `boolRule`, `enumRule`, `numberRule`, `colorRule`.
