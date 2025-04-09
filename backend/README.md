# backend

To install dependencies:

```bash
bun install
```

To run development server:

```bash
bun run dev
# or explicitly: bun run src/main.ts
```

To run the bundled version (after `bun run build` using Bunfile.js):

```bash
bun run ./dist/server.js
```


---

# JezArch Backend API Documentation

This document outlines the available API endpoints for the JezArch backend application.

**Base URL:** The base URL depends on your server configuration (host, port, protocol - HTTP/HTTPS). Examples assume `http://localhost:8080`.

**Authentication:**

*   Most endpoints require authentication via a session token (UUID).
*   Include the token in the `Authorization` header of your request:
    ```
    Authorization: <your_session_token>
    ```
*   Tokens are obtained via the `/api/user/login` endpoint and expire after 24 hours (defined in `session/db.ts`).
*   Different endpoints may require specific user roles (`admin` or `regular_user`). These requirements are noted for each endpoint.

**Roles:**

*   `admin`: Full access, including user management, configuration, deleting any resource, re-indexing signatures, managing archive documents, and viewing all logs.
*   `regular_user`: Standard user, can manage their own notes, view/create tags, view/search signature components/elements, create/manage their own archive documents, change their own password, and view some general information (e.g., `default_language` config).

**Common Responses:**

*   `200 OK`: Request successful. Response body contains data or a success message.
*   `201 Created`: Resource created successfully. Response body usually contains the created resource or a success message.
*   `204 No Content`: Request successful, typically after deletion where no data is returned (used by Signature Component/Element and Archive Document disable/delete).
*   `400 Bad Request`: The request was malformed (e.g., missing required fields, invalid JSON, invalid data types, failed schema validation, invalid ID format). Response body often contains an error message, sometimes with validation details.
*   `401 Unauthorized`: Authentication failed or is required but was not provided (missing or invalid `Authorization` header/token, or expired token).
*   `403 Forbidden`: Authentication succeeded, but the user does not have the necessary permissions (role or ownership) to access the resource or perform the action.
*   `404 Not Found`: The requested resource (e.g., user, note, tag, component, element, archive document) could not be found or (in some cases) is not active.
*   `409 Conflict`: The request could not be completed due to a conflict with the current state of the resource (e.g., trying to create a user, tag, or component with a name that already exists).
*   `500 Internal Server Error`: An unexpected error occurred on the server. The response body may contain an error message (often generic for security). Check server logs for details.

**Search API Structure:**

Endpoints supporting search (e.g., `/api/notes/search`, `/api/logs/search`, `/api/signature/elements/search`, `/api/archive/documents/search`) use a `POST` request with the following JSON body structure:

```json
{
  "query": [
    // Array of query elements combined with AND
    {
      "field": "fieldName", // Name of the field to filter on
      "not": false,        // Optional: Negate the condition (default: false)
      "condition": "EQ" | "GT" | "GTE" | "LT" | "LTE" | "ANY_OF" | "FRAGMENT",
      "value": "..."     // string, number, boolean, null, or array for ANY_OF
    }
    // ... more elements
  ],
  "page": 1,         // Requested page number (1-based)
  "pageSize": 10     // Number of items per page
}
```

*   **Conditions:**
    *   `EQ`: Equal to (`=` or `IS NULL`)
    *   `GT`: Greater than (`>`)
    *   `GTE`: Greater than or equal to (`>=`)
    *   `LT`: Less than (`<`)
    *   `LTE`: Less than or equal to (`<=`)
    *   `ANY_OF`: Field value must be one of the values in the `value` array (`IN (...)`). Requires `value` to be an array. Handles `NOT IN` if `not: true`.
    *   `FRAGMENT`: Field value contains the `value` string (case-sensitive `LIKE %...%`). Requires `value` to be a string. Handles `NOT LIKE` if `not: true`.
*   **Response:** The search endpoints return a `SearchResponse<T>` object:
    ```json
    {
      "data": [ /* Array of results (e.g., Note, LogEntry, SignatureElementSearchResult, ArchiveDocumentSearchResult) */ ],
      "page": 1,
      "pageSize": 10,
      "totalSize": 55, // Total number of matching items across all pages
      "totalPages": 6  // Total number of pages
    }
    ```
*   **Custom Search Fields/Handlers:** Some search endpoints support special fields handled by custom logic:
    *   `/api/notes/search`: `tags` (field) with `ANY_OF` (condition) expects an array of `tagId` numbers in `value`.
    *   `/api/signature/elements/search`:
        *   `parentIds` (field) with `ANY_OF` (condition) expects an array of parent `signatureElementId` numbers in `value`.
        *   `hasParents` (field) with `EQ` (condition) expects a boolean `value` (true/false) to find elements that have/don't have any parents.
        *   `componentName` (field) with `FRAGMENT` (condition) expects a string `value` to search fragment by the name of the associated component (JOINs `signature_components`).
        *   `componentName` (field) with `EQ` (condition) expects a string `value` to search exact match by the name of the associated component (JOINs `signature_components`).
    *   `/api/archive/documents/search`:
        *   `tags` (field) with `ANY_OF` (condition) expects an array of `tagId` numbers in `value`.
        *   `topographicSignaturePrefix` (field) with `ANY_OF` (condition) expects an array of arrays of element IDs (`number[][]`) in `value`. Matches documents where *any* topographic signature starts with *any* of the provided prefixes.
        *   `descriptiveSignaturePrefix` (field) with `ANY_OF` (condition) expects an array of arrays of element IDs (`number[][]`) in `value`. Matches documents where *any* descriptive signature starts with *any* of the provided prefixes.
        *   `active` (field): By default, searches only return `active: true` documents. Admins can override this by including `{ "field": "active", "condition": "EQ", "value": false/true }` in the query. Non-admins attempting to search by `active` will have this filter ignored.

---

## API Endpoints

### 1. API Status

Endpoints to check the basic health and status of the API.

*   **GET `/api/api/status`**
    *   **Description:** Checks if the API is running.
    *   **Authentication:** None required.
    *   **Responses:**
        *   `200 OK`: `{"message": "API is working"}`

*   **GET `/api/api/ping`**
    *   **Description:** Simple ping endpoint.
    *   **Authentication:** None required.
    *   **Responses:**
        *   `200 OK`: Plain text `PONG`

### 2. User Management

Endpoints for user creation, authentication, and administration.

*   **POST `/api/user/create`**
    *   **Description:** Creates a new user with the `regular_user` role. *(Security Note: Currently requires no authentication. Consider restricting this endpoint).*
    *   **Authentication:** None required.
    *   **Request Body:** (`userSchema`)
        ```json
        {
          "login": "newuser",
          "password": "Password123", // Min 8 chars, 1 upper, 1 lower, 1 digit (enforced by schema)
          "role": "regular_user" // Optional, ignored by controller (always 'regular_user')
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{"login": "newuser", "message": "User created successfully"}`
        *   `400 Bad Request`: Invalid input data (doesn't match schema) or `Username already exists`.
        *   `500 Internal Server Error`: Failed to create user (e.g., DB error).

*   **POST `/api/user/login`**
    *   **Description:** Authenticates a user and returns a session token (UUID) valid for 24 hours.
    *   **Authentication:** None required.
    *   **Request Body:** (`UserCredentials`)
        ```json
        {
          "login": "username",
          "password": "password"
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"token": "uuid-session-token", "role": "admin" | "regular_user", "login": "username"}`
        *   `401 Unauthorized`: `Invalid credentials` (login/password mismatch).
        *   `500 Internal Server Error`: `Login doesn't exist` (rare) or other DB/login error.

*   **POST `/api/user/logout`**
    *   **Description:** Invalidates the user's current session token provided in the `Authorization` header.
    *   **Authentication:** Required (Any authenticated user).
    *   **Responses:**
        *   `200 OK`: Plain text `Logged out`
        *   `400 Bad Request`: Missing `Authorization` header.
        *   `500 Internal Server Error`: Failed to delete session.

*   **GET `/api/users/all`**
    *   **Description:** Retrieves a list of all users (passwords omitted).
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Responses:**
        *   `200 OK`: `[{"userId": 1, "login": "admin", "role": "admin", "password": ""}, ...]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **GET `/api/user/by-login/:login`**
    *   **Description:** Retrieves a specific user by their login name (password omitted).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `login`: The login name of the user to retrieve.
    *   **Responses:**
        *   `200 OK`: `{"userId": 1, "login": "admin", "role": "admin", "password": ""}`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "User not found"}`
        *   `500 Internal Server Error`

*   **PATCH `/api/user/by-login/:login`**
    *   **Description:** Updates the role of a specific user.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `login`: The login name of the user to update.
    *   **Request Body:**
        ```json
        {
          "role": "admin" | "regular_user" // Required
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "User role updated successfully"}`
        *   `400 Bad Request`: Invalid/missing `role` in body.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: User not found (DB update affects 0 rows, returns 200).
        *   `500 Internal Server Error`

*   **POST `/api/user/change-password`**
    *   **Description:** Allows the authenticated user to change their own password. *(Note: Does not currently validate new password complexity)*.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:**
        ```json
        {
          "oldPassword": "currentPassword", // Required
          "password": "NewSecurePassword1" // Required (New password)
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "User role updated successfully"}` *(Note: Success message is incorrect)*.
        *   `400 Bad Request`: Missing fields in body. *(Note: New password complexity not validated here)*.
        *   `401 Unauthorized`: `Invalid password` (if `oldPassword` is incorrect).
        *   `403 Forbidden` (Should not occur with current role check).
        *   `500 Internal Server Error`

### 3. Notes Management

Endpoints for creating, reading, updating, deleting, and searching notes. Notes belong to users. Tags are managed via `tagIds`.

*   **PUT `/api/note`** (Should likely be POST for creation)
    *   **Description:** Creates a new note for the authenticated user. Can optionally associate existing tags.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** (`NoteInput`, validated by `noteInputSchema` implicitly or explicitly later)
        ```json
        {
          "title": "My Note Title", // Required, non-empty
          "content": "Note content here.", // Required
          "shared": false,      // Optional, defaults to false
          "tagIds": [1, 5, 10]  // Optional: Array of existing Tag IDs to associate
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{"message": "Note created successfully"}`
        *   `400 Bad Request`: Invalid input (e.g., missing title/content, non-integer `tagIds`).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error` (e.g., DB error).

*   **GET `/api/note/id/:noteId`**
    *   **Description:** Retrieves a specific note by its ID. Only the owner or an admin can retrieve a note. *(Note: Tags are **not** populated in the response currently)*.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). User must be the owner or an admin.
    *   **Path Parameters:**
        *   `noteId`: The integer ID of the note.
    *   **Responses:**
        *   `200 OK`: `{ "noteId": 1, "title": "...", "content": "...", "shared": false, "ownerUserId": 5, "createdOn": "...", "modifiedOn": "...", "tags": null | [] }` *(Code returns DB result directly, tags field likely missing or null unless populated)*
        *   `400 Bad Request`: Invalid `noteId`.
        *   `401 Unauthorized`
        *   `403 Forbidden`: Authenticated user is not the owner and not an admin.
        *   `404 Not Found`: `{"message": "Note not found"}`
        *   `500 Internal Server Error`

*   **PATCH `/api/note/id/:noteId`**
    *   **Description:** Updates a specific note. Only the owner or an admin can update. Fields are optional. `tagIds` replaces existing tags if provided.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). User must be the owner or an admin.
    *   **Path Parameters:**
        *   `noteId`: The integer ID of the note.
    *   **Request Body:** (Partial `NoteInput`)
        ```json
        {
          "title": "Updated Title", // Optional
          "content": "Updated content.", // Optional
          "shared": true,           // Optional
          "tagIds": [2, 8]          // Optional: Replaces existing tags
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "Note updated successfully"}`
        *   `400 Bad Request`: Invalid `noteId` or input body.
        *   `401 Unauthorized`
        *   `403 Forbidden`: Authenticated user is not the owner and not an admin.
        *   `404 Not Found`: `{"message": "Note not found"}` (Checked before update).
        *   `500 Internal Server Error`

*   **DELETE `/api/note/id/:noteId`**
    *   **Description:** Deletes a specific note. Associated tags are removed via DB cascade (`note_tags`).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `noteId`: The integer ID of the note.
    *   **Responses:**
        *   `200 OK`: `{"message": "Note deleted successfully"}`
        *   `400 Bad Request`: Invalid `noteId`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: Note not found (DB delete affects 0 rows, returns 200).
        *   `500 Internal Server Error`

*   **GET `/api/notes/by-login/:login`**
    *   **Description:** Retrieves all notes owned by the user specified by login. *(Security Note: Any logged-in user can view any other user's notes list currently)*.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `login`: The login name of the user.
    *   **Responses:**
        *   `200 OK`: `[ { "noteId": 1, "title": "...", ... }, ... ]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`: `{"message": "Internal server issue"}` (if user login doesn't exist) or DB error.

*   **POST `/api/notes/search`**
    *   **Description:** Searches notes based on criteria. *(Note: Searches all notes, access control based on results isn't implemented)*.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed direct fields: `title`, `content`, `shared`, `ownerUserId`.
        *   Custom handler: `tags` (`condition: "ANY_OF"`, `value`: `tagId[]`).
    *   **Responses:**
        *   `200 OK`: `SearchResponse<Note>`
        *   `400 Bad Request`: Invalid search query.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 4. Tag Management

Endpoints for managing tags (used by Notes and Archive Documents).

*   **PUT `/api/tag`** (Should likely be POST for creation)
    *   **Description:** Creates a new tag. Tag names must be unique (case-sensitive).
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** (`tagSchema`)
        ```json
        {
          "name": "Important", // Required, Max 50 chars, non-empty, unique
          "description": "Tag for important items" // Optional, Max 255 chars
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{ "tagId": 1, "name": "Important", "description": "..." }` (Returns created tag).
        *   `400 Bad Request`: `{"message": "Tag name is required"}` or schema validation fail.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `409 Conflict`: `{"message": "Tag name '...' already exists."}` (DB constraint).
        *   `500 Internal Server Error`: `{"message": "Failed to create tag"}`.

*   **GET `/api/tags`**
    *   **Description:** Retrieves a list of all tags, ordered by name.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Responses:**
        *   `200 OK`: `[{"tagId": 1, "name": "...", "description": "..."}, ...]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **GET `/api/tag/id/:tagId`**
    *   **Description:** Retrieves a specific tag by its ID.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `tagId`: The integer ID of the tag.
    *   **Responses:**
        *   `200 OK`: `{"tagId": 1, "name": "...", "description": "..."}`
        *   `400 Bad Request`: `{"message": "Invalid tag ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Tag not found"}`.
        *   `500 Internal Server Error`

*   **PATCH `/api/tag/id/:tagId`**
    *   **Description:** Updates a specific tag's name and/or description. Name must remain unique.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `tagId`: The integer ID of the tag.
    *   **Request Body:** (Partial Tag, `tagSchema` constraints apply)
        ```json
        {
          "name": "Updated Tag Name", // Optional, Max 50, unique
          "description": ""          // Optional, Max 255. Can be empty/null.
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{ "tagId": 1, "name": "...", "description": "..." }` (Returns updated tag).
        *   `400 Bad Request`: `{"message": "Invalid tag ID"}` or `{"message": "Tag name cannot be empty"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Tag not found"}` (Checked before update).
        *   `409 Conflict`: `{"message": "Tag name '...' already exists."}`.
        *   `500 Internal Server Error`

*   **DELETE `/api/tag/id/:tagId`**
    *   **Description:** Deletes a specific tag. Associations in `note_tags` and `archive_document_tags` are removed via DB cascade.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `tagId`: The integer ID of the tag.
    *   **Responses:**
        *   `200 OK`: `{"message": "Tag deleted successfully"}`
        *   `400 Bad Request`: `{"message": "Invalid tag ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Tag not found"}` (Checked before delete).
        *   `500 Internal Server Error`

### 5. Configuration Management

Endpoints for managing application configuration.

*   **GET `/api/configs/:key`**
    *   **Description:** Retrieves a specific configuration value.
    *   **Authentication:** Required. Role `admin` required for `port`, `ssl_key`, `ssl_cert`. `admin` or `regular_user` allowed for `default_language`.
    *   **Path Parameters:**
        *   `key`: The config key (`AppConfigKeys`: `default_language`, `port`, `ssl_key`, `ssl_cert`).
    *   **Responses:**
        *   `200 OK`: `{"key_name": "value"}` or `{"key_name": null}` if not set.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found` (Key itself invalid - returns 500 as `getConfig` likely fails).
        *   `500 Internal Server Error`

*   **PUT `/api/configs/:key`**
    *   **Description:** Sets or updates a configuration value. ***Note: The `:key` in the path is ignored. Key/Value must be in the body.***
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:** (`Config`)
        ```json
        {
          "key": "port", // Key from AppConfigKeys enum
          "value": "8080" // Value as string
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "Config updated successfully"}`
        *   `400 Bad Request`: Invalid/missing `key` or `value`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **PUT `/api/config/ssl/upload`**
    *   **Description:** Uploads SSL key and certificate strings.
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:** (`SslConfig`)
        ```json
        {
          "key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", // Required PEM string
          "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n" // Required PEM string
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "SSL configuration updated successfully"}`
        *   `400 Bad Request`: `{"message": "Key and certificate are required"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **POST `/api/config/ssl/generate`**
    *   **Description:** Generates and saves a self-signed SSL certificate/key. *(Note: Implementation in `generateSelfSignedCert` is likely a placeholder)*.
    *   **Authentication:** Required (Role: `admin`).
    *   **Responses:**
        *   `201 Created`: `{"message": "Self-signed SSL certificate generated and saved"}`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 6. Log Management

Endpoints for accessing application logs.

*   **GET `/api/logs/all`**
    *   **Description:** Retrieves all log entries, ordered most recent first.
    *   **Authentication:** Required (Role: `admin`).
    *   **Responses:**
        *   `200 OK`: `[ { "id": 1, "level": "info", "createdOn": "...", "userId": "admin", ... "data": "{\"details\":\"...\"}" }, ... ]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **POST `/api/logs/search`**
    *   **Description:** Searches log entries.
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed fields: `level`, `createdOn`, `userId`, `category`, `message`.
    *   **Responses:**
        *   `200 OK`: `SearchResponse<LogEntry>`
        *   `400 Bad Request`: Invalid search query.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 7. Signature Component Management

Manage signature components (categories for elements, define indexing).

*   **PUT `/api/signature/component`** (Should likely be POST for creation)
    *   **Description:** Creates a new signature component. Name must be unique. `index_count` starts at 0.
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:** (`createSignatureComponentSchema`)
        ```json
        {
          "name": "Component Name", // Required, unique, 1-100 chars
          "description": "Optional description", // Optional, max 500 chars
          "index_type": "dec" // Optional: "dec" | "roman" | "small_char" | "capital_char". Default: "dec"
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{ "signatureComponentId": 1, "name": "...", "description": "...", "index_count": 0, "index_type": "dec", "createdOn": "...", "modifiedOn": "..." }` (Returns created component).
        *   `400 Bad Request`: `{"message": "Invalid input", "errors": {...}}` or `{"message": "Invalid index_type..."}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `409 Conflict`: `{"message": "Component name '...' already exists."}`.
        *   `500 Internal Server Error`

*   **GET `/api/signature/components`**
    *   **Description:** Retrieves all signature components, ordered by name.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Responses:**
        *   `200 OK`: `[{"signatureComponentId": 1, "name": "...", "index_count": 5, ...}, ...]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **GET `/api/signature/component/:id`**
    *   **Description:** Retrieves a specific signature component by ID.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `id`: The integer ID of the component.
    *   **Responses:**
        *   `200 OK`: `{ "signatureComponentId": 1, "name": "...", ... }`
        *   `400 Bad Request`: `{"message": "Invalid component ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component not found"}`.
        *   `500 Internal Server Error`

*   **PATCH `/api/signature/component/:id`**
    *   **Description:** Updates a component's name, description, or index type. Name must remain unique. `index_count` is not updated here.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `id`: The integer ID of the component.
    *   **Request Body:** (Partial component, `updateSignatureComponentSchema`)
        ```json
        {
          "name": "Updated Name",      // Optional, unique, 1-100 chars
          "description": "New desc",   // Optional, max 500, nullable
          "index_type": "roman"        // Optional: "dec" | "roman" | "small_char" | "capital_char"
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{ "signatureComponentId": 1, "name": "...", ... }` (Returns updated component).
        *   `400 Bad Request`: `{"message": "Invalid component ID"}` or `{"message": "Invalid input", "errors": {...}}` or `{"message": "Invalid index_type..."}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component not found"}` (Checked before update).
        *   `409 Conflict`: `{"message": "Component name '...' already exists."}`.
        *   `500 Internal Server Error`

*   **DELETE `/api/signature/component/:id`**
    *   **Description:** Deletes a component and all its associated elements (DB cascade).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `id`: The integer ID of the component.
    *   **Responses:**
        *   `204 No Content`: Successful deletion.
        *   `400 Bad Request`: `{"message": "Invalid component ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component not found"}` (Checked before delete).
        *   `500 Internal Server Error`

*   **POST `/api/signature/components/id/:id/reindex`**
    *   **Description:** Re-calculates and updates the `index` field for all elements within the specified component, based on their alphabetical order and the component's `index_type`. Resets the component's `index_count`.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `id`: The integer ID of the component to re-index.
    *   **Responses:**
        *   `200 OK`: `{"message": "Successfully re-indexed 15 elements.", "finalCount": 15}`
        *   `400 Bad Request`: `{"message": "Invalid component ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component with ID ... not found"}`.
        *   `500 Internal Server Error`: `{"message": "Failed to re-index elements", "error": "..."}` or `{"message": "Re-indexing failed during element update", "error": "..."}`.

### 8. Signature Element Management

Manage signature elements within components, including their parent relationships and indices.

*   **PUT `/api/signature/element`** (Should likely be POST for creation)
    *   **Description:** Creates a new signature element. If `index` is not provided in the body, it's automatically generated based on the component's `index_count` (which is then incremented) and `index_type`. If `index` *is* provided, it's used directly, but the `index_count` is still incremented (to avoid collisions with next auto-generated index). Can link parent elements.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** (`createSignatureElementSchema`)
        ```json
        {
          "signatureComponentId": 1,   // Required, Existing component ID
          "name": "Element Name",      // Required, 1-100 chars
          "description": "Details...", // Optional, max 500 chars
          "index": "UserDefinedIndex", // Optional: Explicit index string. If omitted, auto-generated. Max 255 chars.
          "parentIds": [2, 5]          // Optional: Array of existing SignatureElement IDs
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{ "signatureElementId": 10, "signatureComponentId": 1, "name": "...", "index": "...", "component": {...}, "parentElements": [...] }` (Returns created element, populated with component and parents).
        *   `400 Bad Request`: `{"message": "Invalid input", "errors": {...}}` or `{"message": "Component with ID ... not found"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`: `{"message": "Failed to create element", "error": "..."}`.

*   **GET `/api/signature/components/id/:componentId/elements/all`**
    *   **Description:** Retrieves all elements for a specific component, ordered by name (case-insensitive).
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `componentId`: The integer ID of the parent component.
    *   **Responses:**
        *   `200 OK`: `[{"signatureElementId": 10, "name": "...", "index": "...", ...}, ...]`
        *   `400 Bad Request`: `{"message": "Invalid component ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component not found"}` (Checked before fetch).
        *   `500 Internal Server Error`

*   **GET `/api/signature/element/:id`**
    *   **Description:** Retrieves a specific element. Can populate related data via query params.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `id`: The integer ID of the element.
    *   **Query Parameters (Optional):**
        *   `populate`: Comma-separated: `component`, `parents`. (e.g., `?populate=component,parents`)
    *   **Responses:**
        *   `200 OK`: `{ "signatureElementId": 10, ..., "component": {...}?, "parentElements": [...]? }`
        *   `400 Bad Request`: `{"message": "Invalid element ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Element not found"}`.
        *   `500 Internal Server Error`

*   **PATCH `/api/signature/element/:id`**
    *   **Description:** Updates element details (name, description, index) and/or replaces parent relationships. Updating `index` here does *not* affect the component's `index_count`.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `id`: The integer ID of the element.
    *   **Request Body:** (Partial element, `updateSignatureElementSchema`)
        ```json
        {
          "name": "Updated Name",   // Optional, 1-100 chars
          "description": null,      // Optional, max 500, nullable
          "index": "NewIndex",      // Optional, max 255, nullable
          "parentIds": [3]          // Optional: Replaces parents (empty array removes all)
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{ "signatureElementId": 10, ..., "component": {...}, "parentElements": [...] }` (Returns updated element, populated with component and parents).
        *   `400 Bad Request`: `{"message": "Invalid element ID"}` or `{"message": "Invalid input", "errors": {...}}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Element not found"}` (Checked before update).
        *   `500 Internal Server Error`: `{"message": "Failed to update element", "error": "..."}`.

*   **DELETE `/api/signature/element/:id`**
    *   **Description:** Deletes an element. Parent/child links are removed via DB cascade. Does *not* affect component `index_count`.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `id`: The integer ID of the element.
    *   **Responses:**
        *   `204 No Content`: Successful deletion.
        *   `400 Bad Request`: `{"message": "Invalid element ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Element not found"}` (Checked before delete).
        *   `500 Internal Server Error`

*   **POST `/api/signature/elements/search`**
    *   **Description:** Searches elements based on criteria, including relationships.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed direct fields: `signatureElementId`, `signatureComponentId`, `name`, `description`, `index`, `createdOn`, `modifiedOn`.
        *   Custom handlers: `parentIds` (`ANY_OF`, `value`: `elementId[]`), `hasParents` (`EQ`, `value`: `boolean`), `componentName` (`FRAGMENT` or `EQ`, `value`: `string`).
    *   **Responses:**
        *   `200 OK`: `SearchResponse<SignatureElementSearchResult>` *(Note: `parentElements` not populated)*.
        *   `400 Bad Request`: Invalid search query.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 9. Archive Document Management

Manage archive documents and units, including metadata, signatures, and tags. Uses soft delete (`active` flag).

*   **PUT `/api/archive/document`** (Should likely be POST for creation)
    *   **Description:** Creates a new archive document or unit. Associates tags if `tagIds` provided. Signatures are stored as arrays of element ID paths.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** (`createArchiveDocumentSchema`)
        ```json
        {
          "parentUnitArchiveDocumentId": null, // Optional: ID of parent unit, or null for root
          "type": "document", // Required: "unit" | "document"
          "topographicSignatureElementIds": [ [1, 5], [8] ], // Optional: Array of paths (element IDs)
          "descriptiveSignatureElementIds": [ [10, 12] ], // Optional
          "title": "Document Title", // Required
          "creator": "Creator Name", // Required
          "creationDate": "Circa 1950", // Required (flexible string)
          // ... other metadata fields (numberOfPages, documentType, etc.) ... are optional strings
          "isDigitized": false, // Optional, default false
          "digitizedVersionLink": null, // Optional, nullable URL string
          "tagIds": [1, 3] // Optional: Array of existing Tag IDs
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{ "archiveDocumentId": 1, "type": "document", ..., "tags": [...] }` (Returns created document, populated with tags).
        *   `400 Bad Request`: `{"message": "Invalid input", "errors": {...}}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`: `{"message": "Failed to create archive document", "error": "..."}`.

*   **GET `/api/archive/document/id/:id`**
    *   **Description:** Retrieves a specific *active* archive document/unit by ID, populated with its tags.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). *(Note: No ownership check currently enforced here)*.
    *   **Path Parameters:**
        *   `id`: The integer ID of the document/unit.
    *   **Responses:**
        *   `200 OK`: `{ "archiveDocumentId": 1, ..., "active": true, "tags": [...] }`
        *   `400 Bad Request`: `{"message": "Invalid document ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Document not found or not active"}`.
        *   `500 Internal Server Error`

*   **PATCH `/api/archive/document/id/:id`**
    *   **Description:** Updates an archive document/unit. Only owner or admin can update. Fields are optional. `tagIds` replaces existing tags. Can update signatures.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). User must be the owner or an admin.
    *   **Path Parameters:**
        *   `id`: The integer ID of the document/unit.
    *   **Request Body:** (Partial `ArchiveDocument`, `updateArchiveDocumentSchema`)
        ```json
        {
          "title": "Updated Title", // Optional
          "topographicSignatureElementIds": [ [1, 6] ], // Optional: Replaces existing topo signatures
          "condition": "Good", // Optional
          "tagIds": [4] // Optional: Replaces tags
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{ "archiveDocumentId": 1, ..., "tags": [...] }` (Returns updated document/unit, populated with tags).
        *   `400 Bad Request`: `{"message": "Invalid document ID"}` or `{"message": "Invalid input", "errors": {...}}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`: Authenticated user is not owner and not admin.
        *   `404 Not Found`: `{"message": "Document not found"}` (Checked before update).
        *   `500 Internal Server Error`: `{"message": "Failed to update archive document", "error": "..."}`.

*   **DELETE `/api/archive/document/id/:id`**
    *   **Description:** Disables (soft deletes) an archive document/unit by setting `active` to `false`. Only owner or admin can disable.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). User must be the owner or an admin.
    *   **Path Parameters:**
        *   `id`: The integer ID of the document/unit.
    *   **Responses:**
        *   `204 No Content`: Successful disable.
        *   `400 Bad Request`: `{"message": "Invalid document ID"}` or `{"message": "Document already inactive"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`: Authenticated user is not owner and not admin.
        *   `404 Not Found`: `{"message": "Document not found"}` or `{"message": "Document not found or disable failed"}` (if disable affected 0 rows).
        *   `500 Internal Server Error`

*   **POST `/api/archive/documents/search`**
    *   **Description:** Searches *active* archive documents/units by default. Admins can search inactive ones. Supports searching by tags and signature prefixes. Results are populated with tags.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed direct fields: All fields from `ArchiveDocument` model *except* `active` (unless admin overrides).
        *   Custom handlers: `tags` (`ANY_OF`, `value`: `tagId[]`), `topographicSignaturePrefix` (`ANY_OF`, `value`: `elementId[][]`), `descriptiveSignaturePrefix` (`ANY_OF`, `value`: `elementId[][]`).
    *   **Responses:**
        *   `200 OK`: `SearchResponse<ArchiveDocumentSearchResult>` (Results populated with `tags`).
        *   `400 Bad Request`: Invalid search query.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`: `{"message": "Failed to search archive documents", "error": "..."}`.

---