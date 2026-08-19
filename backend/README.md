# JezArch Backend

## Quick Start

```bash
# Install dependencies
bun install

# Run development server (watches for changes)
bun run dev

# Build and run production bundle
bun run build
bun run ./dist/server.js
```

---

# JezArch Backend API Documentation

This document describes the available API endpoints for the JezArch backend.

**Base URL:** Depends on your server configuration (host, port, protocol). Examples use `http://localhost:8080`.

## Table of Contents

- [Authentication](#authentication)
- [Roles](#roles)
- [Common Responses](#common-responses)
- [Search API](#search-api)
- [Endpoints](#endpoints)
  - [1. API Status](#1-api-status)
  - [2. User Management](#2-user-management)
  - [3. Notes Management](#3-notes-management)
  - [4. Tag Management](#4-tag-management)
  - [5. Configuration Management](#5-configuration-management)
  - [6. Log Management](#6-log-management)
  - [7. Signature Component Management](#7-signature-component-management)
  - [8. Signature Element Management](#8-signature-element-management)
  - [9. Archive Document Management](#9-archive-document-management)
  - [10. Database Administration](#10-database-administration)

---

## Authentication

Most endpoints require authentication via a session token (UUID). Include the token in the `Authorization` header:

```
Authorization: <your_session_token>
```

Tokens are obtained via `POST /api/user/login` and expire after 24 hours.

## Roles

| Role | Description |
|------|-------------|
| `admin` | Full access: user management, configuration, deleting any resource, re-indexing signatures, viewing all logs, managing archive documents. |
| `employee` | Can manage archive documents, signature components/elements, tags, and notes. Cannot delete components or re-index. |
| `user` | Restricted: can only view/search archive documents filtered by tags assigned by an administrator. |

Users with `null` role cannot log in (account disabled).

## Common Responses

| Status | Meaning |
|--------|---------|
| `200 OK` | Request successful. Response body contains data or success message. |
| `201 Created` | Resource created. Response body contains the created resource. |
| `204 No Content` | Successful action with no response body (used by soft-delete/restore endpoints). |
| `400 Bad Request` | Malformed request: missing fields, invalid JSON, failed validation, invalid ID format. |
| `401 Unauthorized` | Missing or invalid `Authorization` header, or expired token. |
| `403 Forbidden` | Authenticated but insufficient permissions (wrong role or not owner). |
| `404 Not Found` | Resource not found or not visible (e.g. soft-deleted archive documents). |
| `409 Conflict` | Name already exists (duplicate user, tag, or component). |
| `500 Internal Server Error` | Unexpected server error. Check server logs for details. |

---

## Search API

Endpoints supporting search (`POST /api/notes/search`, `POST /api/logs/search`, `POST /api/signature/elements/search`, `POST /api/archive/documents/search`) accept this request body:

```json
{
  "query": [
    {
      "field": "fieldName",
      "not": false,
      "condition": "EQ",
      "value": "..."
    }
  ],
  "page": 1,
  "pageSize": 10
}
```

### Conditions

| Condition | Description | Value Type |
|-----------|-------------|------------|
| `EQ` | Equal to (`=`) or `IS NULL` when value is `null` | `string`, `number`, `boolean`, `null` |
| `GT` | Greater than (`>`) | `number` |
| `GTE` | Greater than or equal to (`>=`) | `number` |
| `LT` | Less than (`<`) | `number` |
| `LTE` | Less than or equal to (`<=`) | `number` |
| `ANY_OF` | Value must be one of the items in the array (`IN (...)`) | `array` |
| `FRAGMENT` | Case-sensitive substring match (`LIKE %...%`) | `string` |
| `STARTS_WITH` | Signature path starts with given element ID sequence | `number[]` |
| `CONTAINS_SEQUENCE` | Signature path contains given element ID sequence | `number[]` |

Set `"not": true` to negate any condition (e.g., `NOT IN`, `NOT LIKE`).

### Response Format

All search endpoints return:

```json
{
  "data": [],
  "page": 1,
  "pageSize": 10,
  "totalSize": 55,
  "totalPages": 6
}
```

### Custom Search Fields

Some endpoints support special fields handled by custom logic. See individual endpoint documentation below.

---

## Endpoints

### 1. API Status

Health check endpoints.

**`GET /api/api/status`** — No authentication required.

Response `200 OK`:
```json
{ "message": "API is working" }
```

**`GET /api/api/ping`** — No authentication required.

Response `200 OK`: Plain text `PONG`

---

### 2. User Management

**`POST /api/user/create`** — Register a new user. No authentication required.

Request body:
```json
{
  "login": "newuser",
  "password": "Password123",
  "preferredLanguage": "en"
}
```

- `login`: 3–50 characters, required.
- `password`: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit. Required.
- `preferredLanguage`: `"en"` or `"pl"`. Optional, defaults to `"en"`.

Response `201 Created`:
```json
{
  "userId": 2,
  "login": "newuser",
  "role": null,
  "preferredLanguage": "en"
}
```

New users have `role: null` and cannot log in until an admin assigns a role.

---

**`POST /api/user/login`** — Authenticate and get a session token. No authentication required.

Request body:
```json
{
  "login": "username",
  "password": "password"
}
```

Response `200 OK`:
```json
{
  "token": "uuid-session-token",
  "userId": 1,
  "login": "username",
  "role": "admin",
  "preferredLanguage": "en",
  "assignedTags": []
}
```

- `role`: `"admin"`, `"employee"`, `"user"`, or `null` (disabled).
- `assignedTags`: Array of tag objects (relevant for `user` role).

---

**`POST /api/user/logout`** — Invalidate current session. Requires authentication.

Response `204 No Content`

---

**`GET /api/users/all`** — List all users. Requires authentication (any role).

Response `200 OK`:
```json
[
  {
    "userId": 1,
    "login": "admin",
    "role": "admin",
    "preferredLanguage": "en",
    "assignedTags": []
  }
]
```

---

**`GET /api/user/by-login/:login`** — Get a specific user by login. Requires authentication (admin, or self).

Response `200 OK`:
```json
{
  "userId": 1,
  "login": "admin",
  "role": "admin",
  "preferredLanguage": "en",
  "assignedTags": []
}
```

---

**`PATCH /api/user/by-login/:login`** — Update a user's role. Requires authentication (admin only). Cannot change your own role.

Request body:
```json
{
  "role": "employee"
}
```

`role` must be `"admin"`, `"employee"`, `"user"`, or `null`. Changing away from `"user"` automatically clears assigned tags.

Response `200 OK`:
```json
{ "message": "User role updated successfully" }
```

---

**`POST /api/user/change-password`** — Change your own password. Requires authentication (any role).

Request body:
```json
{
  "oldPassword": "currentPassword",
  "password": "NewSecurePassword1"
}
```

Response `204 No Content`

---

**`PATCH /api/user/by-login/:login/set-password`** — Admin sets another user's password. Requires authentication (admin only). Cannot set your own password.

Request body:
```json
{
  "password": "NewSecurePassword1"
}
```

Response `204 No Content`

---

**`PATCH /api/user/by-login/:login/language`** — Update a user's preferred language. Requires authentication (admin, or self).

Request body:
```json
{
  "preferredLanguage": "pl"
}
```

`preferredLanguage` must be `"en"` or `"pl"`.

Response `200 OK`: Returns the updated user object.

---

**`GET /api/user/by-login/:login/tags`** — Get tags assigned to a user. Requires authentication (admin only). Returns empty array if user's role is not `"user"`.

Response `200 OK`:
```json
[
  { "tagId": 1, "name": "Historical", "description": "..." }
]
```

---

**`PUT /api/user/by-login/:login/tags`** — Assign tags to a `user`-role account. Requires authentication (admin only). Replaces existing tags.

Request body:
```json
{
  "tagIds": [1, 3, 5]
}
```

Response `200 OK`: Returns the updated tag list.

---

### 3. Notes Management

**`PUT /api/note`** — Create a new note. Requires authentication (admin or employee).

Request body:
```json
{
  "title": "My Note Title",
  "content": "Note content here.",
  "shared": false,
  "tagIds": [1, 5, 10]
}
```

- `title`: Required, non-empty.
- `content`: Required.
- `shared`: Optional, defaults to `false`.
- `tagIds`: Optional array of existing tag IDs.

Response `201 Created`: `{"message": "Note created successfully"}`

---

**`GET /api/note/id/:noteId`** — Get a specific note. Requires authentication (admin or employee). Must be owner or admin.

Response `200 OK`:
```json
{
  "noteId": 1,
  "title": "...",
  "content": "...",
  "shared": false,
  "ownerUserId": 5,
  "createdOn": "...",
  "modifiedOn": "..."
}
```

---

**`PATCH /api/note/id/:noteId`** — Update a note. Requires authentication (admin or employee). Must be owner or admin. Fields are optional; `tagIds` replaces existing tags.

Request body:
```json
{
  "title": "Updated Title",
  "content": "Updated content.",
  "shared": true,
  "tagIds": [2, 8]
}
```

Response `200 OK`: `{"message": "Note updated successfully"}`

---

**`DELETE /api/note/id/:noteId`** — Delete a note. Requires authentication (admin only). Associated tag links removed via cascade.

Response `200 OK`: `{"message": "Note deleted successfully"}`

---

**`GET /api/notes/by-login/:login`** — Get all notes owned by a user. Requires authentication (admin or employee).

Response `200 OK`: Array of note objects.

---

**`POST /api/notes/search`** — Search notes. Requires authentication (admin or employee).

Allowed fields: `title`, `content`, `shared`, `ownerUserId`, `createdOn`, `modifiedOn`.

Custom handler: `tags` with `ANY_OF` condition — `value` is an array of `tagId` numbers.

Response `200 OK`: `SearchResponse<Note>`

---

### 4. Tag Management

**`PUT /api/tag`** — Create a new tag. Requires authentication (admin or employee). Tag names must be unique.

Request body:
```json
{
  "name": "Important",
  "description": "Tag for important items"
}
```

Response `201 Created`:
```json
{ "tagId": 1, "name": "Important", "description": "Tag for important items" }
```

---

**`GET /api/tags`** — List all tags, ordered by name. Requires authentication (admin or employee).

Response `200 OK`:
```json
[
  { "tagId": 1, "name": "Important", "description": "..." }
]
```

---

**`GET /api/tag/id/:tagId`** — Get a specific tag. Requires authentication (admin or employee).

Response `200 OK`: Tag object.

---

**`PATCH /api/tag/id/:tagId`** — Update a tag. Requires authentication (admin only). Name must remain unique.

Request body:
```json
{
  "name": "Updated Name",
  "description": "New description"
}
```

Response `200 OK`: Updated tag object.

---

**`DELETE /api/tag/id/:tagId`** — Delete a tag. Requires authentication (admin only). Association links removed via cascade.

Response `200 OK`: `{"message": "Tag deleted successfully"}`

---

### 5. Configuration Management

**`GET /api/config/default-language`** — Get the default language. No authentication required.

Response `200 OK`:
```json
{ "defaultLanguage": "en" }
```

---

**`GET /api/configs/:key`** — Get a configuration value. Requires authentication.

- `admin` can read all keys.
- `employee` can read: `default_language`, `http_port`, `https_port`.

Sensitive paths (`https_key_path`, `https_cert_path`, `https_ca_path`) return `"*** SET (Path Hidden) ***"` for non-admins.

Response `200 OK`:
```json
{ "key_name": "value" }
```

---

**`PUT /api/configs/:key`** — Set a configuration value. Requires authentication (admin only). The `:key` in the URL is informational; the key must also be in the body.

Request body:
```json
{
  "key": "http_port",
  "value": "9000"
}
```

Valid keys: `default_language`, `http_port`, `https_port`, `https_key_path`, `https_cert_path`, `https_ca_path`.

Response `200 OK`:
```json
{ "message": "Config 'http_port' updated successfully. Manual server restart required for changes to take effect." }
```

Port changes require manual server restart. HTTPS path changes trigger automatic TLS reload.

---

**`DELETE /api/config/https`** — Clear all HTTPS settings and stop the HTTPS server. Requires authentication (admin only).

Response `200 OK`:
```json
{ "message": "HTTPS configuration cleared successfully. HTTPS server stopped." }
```

---

### 6. Log Management

**`POST /api/logs/search`** — Search log entries. Requires authentication (admin only).

Allowed fields: `level`, `createdOn`, `userId`, `category`, `message`.

Response `200 OK`: `SearchResponse<LogEntry>`

---

**`DELETE /api/logs/purge`** — Purge old log entries. Requires authentication (admin only).

Query parameter: `days` (number of days to keep, defaults to 7).

Example: `DELETE /api/logs/purge?days=30`

Response `200 OK`:
```json
{
  "message": "Successfully purged 150 log entries older than 30 days.",
  "deletedCount": 150
}
```

---

### 7. Signature Component Management

**`PUT /api/signature/component`** — Create a new component. Requires authentication (admin only).

Request body:
```json
{
  "name": "Series",
  "description": "A group of related records",
  "index_type": "dec"
}
```

- `name`: Required, 1–100 chars, unique.
- `description`: Optional, max 500 chars.
- `index_type`: `"dec"` (decimal), `"roman"`, `"small_char"`, or `"capital_char"`. Defaults to `"dec"`.

Response `201 Created`: Created component object with `index_count: 0`.

---

**`GET /api/signature/components`** — List all components. Requires authentication (admin or employee).

Response `200 OK`: Array of component objects.

---

**`GET /api/signature/component/:id`** — Get a specific component. Requires authentication (admin or employee).

Response `200 OK`: Component object.

---

**`PATCH /api/signature/component/:id`** — Update a component. Requires authentication (admin only). Name must remain unique.

Request body:
```json
{
  "name": "Updated Name",
  "description": "New description",
  "index_type": "roman"
}
```

Response `200 OK`: Updated component object.

---

**`DELETE /api/signature/component/:id`** — Delete a component and all its elements (cascade). Requires authentication (admin only).

Response `204 No Content`

---

**`POST /api/signature/components/id/:id/reindex`** — Recalculate all element indices within a component. Requires authentication (admin only). Sorts elements alphabetically and assigns indices based on the component's `index_type`.

Response `200 OK`:
```json
{
  "message": "Successfully re-indexed 15 elements.",
  "finalCount": 15
}
```

---

### 8. Signature Element Management

**`PUT /api/signature/element`** — Create a new element. Requires authentication (admin or employee).

Request body:
```json
{
  "signatureComponentId": 1,
  "name": "Series A",
  "description": "Details...",
  "index": "1a",
  "parentIds": [2, 5]
}
```

- `signatureComponentId`: Required, must reference an existing component.
- `name`: Required, 1–100 chars.
- `description`: Optional, max 500 chars.
- `index`: Optional. If omitted, auto-generated from component's counter and `index_type`. If provided, used directly (but counter still increments).
- `parentIds`: Optional array of existing element IDs to set as parents.

Response `201 Created`: Created element with populated `component` and `parentElements`.

---

**`GET /api/signature/components/id/:componentId/elements/all`** — List all elements for a component. Requires authentication (admin or employee).

Response `200 OK`: Array of element objects.

---

**`GET /api/signature/element/:id`** — Get a specific element. Requires authentication (admin or employee).

Optional query param: `?populate=component,parents` to include related data.

Response `200 OK`:
```json
{
  "signatureElementId": 10,
  "signatureComponentId": 1,
  "name": "Series A",
  "index": "1",
  "component": { ... },
  "parentElements": [ ... ]
}
```

---

**`PATCH /api/signature/element/:id`** — Update an element. Requires authentication (admin or employee). Updating `index` here does not affect the component's `index_count`.

Request body:
```json
{
  "name": "Updated Name",
  "description": null,
  "index": "NewIndex",
  "parentIds": [3]
}
```

Response `200 OK`: Updated element with populated `component` and `parentElements`.

---

**`DELETE /api/signature/element/:id`** — Delete an element. Requires authentication (admin only). Parent/child links removed via cascade.

Response `204 No Content`

---

**`POST /api/signature/elements/search`** — Search elements. Requires authentication (admin or employee).

Allowed direct fields: `signatureElementId`, `signatureComponentId`, `name`, `description`, `index`, `createdOn`, `modifiedOn`.

Custom handlers:
- `parentIds` with `ANY_OF`: `value` is an array of element IDs.
- `hasParents` with `EQ`: `value` is a boolean.
- `componentName` with `FRAGMENT` or `EQ`: `value` is a component name string.

Response `200 OK`: `SearchResponse<SignatureElementSearchResult>`

---

### 9. Archive Document Management

**`PUT /api/archive/document`** — Create a new document or unit. Requires authentication (admin or employee).

Request body:
```json
{
  "parentUnitArchiveDocumentId": null,
  "type": "document",
  "topographicSignature": "Signature text",
  "descriptiveSignatureElementIds": [[1, 5], [8]],
  "title": "Document Title",
  "creator": "Creator Name",
  "creationDate": "Circa 1950",
  "numberOfPages": "12",
  "isDigitized": false,
  "tagIds": [1, 3]
}
```

- `type`: `"unit"` or `"document"`. Required.
- `title`, `creator`, `creationDate`: Required.
- `descriptiveSignatureElementIds`: Array of element ID paths (each path is an array of element IDs).
- `tagIds`: Optional array of existing tag IDs.

Response `201 Created`: Created document object with populated `tags` and `resolvedDescriptiveSignatures`.

---

**`GET /api/archive/document/id/:id`** — Get a specific document/unit. Requires authentication (admin, employee, or user). `user` role access is filtered by assigned tags.

Soft-deleted documents return `404 Not Found` for all roles.

Response `200 OK`: Document object with populated `tags`.

---

**`PATCH /api/archive/document/id/:id`** — Update a document/unit. Requires authentication (admin or employee). Fields are optional; `tagIds` replaces existing tags.

Response `200 OK`: Updated document object with populated `tags`.

---

**`DELETE /api/archive/document/id/:id`** — Soft-delete a document/unit (sets `isDeleted` to `true`). Requires authentication (admin or employee). Deleting an already deleted document returns `400 Bad Request`.

Response `204 No Content`

---

**`POST /api/archive/document/id/:id/restore`** — Restore a soft-deleted document/unit (sets `isDeleted` to `false`). Requires authentication (admin or employee). Restoring a document that is not deleted returns `400 Bad Request`.

Response `204 No Content`

---

**`POST /api/archive/documents/search`** — Search documents/units. Requires authentication (admin, employee, or user).

Allowed direct fields: `archiveDocumentId`, `parentUnitArchiveDocumentId`, `createdBy`, `updatedBy`, `type`, `title`, `creator`, `creationDate`, `numberOfPages`, `documentType`, `dimensions`, `binding`, `condition`, `documentLanguage`, `contentDescription`, `remarks`, `accessLevel`, `accessConditions`, `additionalInformation`, `relatedDocumentsReferences`, `isDigitized`, `digitizedVersionLink`, `createdOn`, `modifiedOn`, `isDeleted`, `topographicSignature`.

Custom handlers:
- `tags` with `ANY_OF`: `value` is an array of `tagId` numbers.
- `descriptiveSignature` with `STARTS_WITH` or `CONTAINS_SEQUENCE`: `value` is an array of element IDs.
- `isDeleted`: Admin/employee see deleted documents in search results unless they explicitly filter them out (e.g. `{ "field": "isDeleted", "condition": "EQ", "value": false }`). For non-admin/employee roles the `isDeleted` filter is always forced to `false`, so only non-deleted documents are returned.
- `user` role: Results are automatically filtered to documents matching assigned tags.

Response `200 OK`: `SearchResponse<ArchiveDocumentSearchResult>` (results include `tags` and `resolvedDescriptiveSignatures`).

---

**`POST /api/archive/documents/batch-tag`** — Add or remove tags from documents matching a search query. Requires authentication (admin or employee).

Request body:
```json
{
  "searchQuery": [
    { "field": "title", "condition": "FRAGMENT", "value": "report", "not": false }
  ],
  "tagIds": [1, 3],
  "action": "add"
}
```

- `searchQuery`: Array of search query elements (same format as search endpoints).
- `tagIds`: Array of tag IDs to add or remove. At least one required.
- `action`: `"add"` or `"remove"`.

Response `200 OK`:
```json
{
  "message": "Successfully added tags for 25 documents.",
  "count": 25
}
```

---

### 10. Database Administration

**`GET /api/admin/db/backup`** — Download the SQLite database file. Requires authentication (admin only).

The server performs a WAL checkpoint before sending the file for consistency.

Response `200 OK`: Binary SQLite database file with `Content-Disposition: attachment` header. Filename format: `jezarch-backup-YYYY-MM-DDTHH-MM-SS-ZZZ.sqlite.db`.
