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

**Base URL:** The base URL depends on your server configuration (host, port, protocol - HTTP/HTTPS). Examples assume `http://localhost:3000`.

**Authentication:**

*   Most endpoints require authentication via a session token (UUID).
*   Include the token in the `Authorization` header of your request:
    ```
    Authorization: <your_session_token>
    ```
*   Tokens are obtained via the `/api/user/login` endpoint and expire after 24 hours.
*   Different endpoints may require specific user roles (`admin` or `regular_user`). These requirements are noted for each endpoint.

**Roles:**

*   `admin`: Full access, including user management, configuration, deleting any resource, and viewing all logs.
*   `regular_user`: Standard user, can manage their own notes, view/create tags, view/search signature components/elements, view shared resources (if applicable), change their own password, and view some general information (e.g., `default_language` config).

**Common Responses:**

*   `200 OK`: Request successful. Response body contains data or a success message.
*   `201 Created`: Resource created successfully. Response body usually contains the created resource or a success message.
*   `204 No Content`: Request successful, typically after deletion where no data is returned (used by Signature Component/Element delete). *(Note: User, Note, Tag deletes currently return 200 with messages).*
*   `400 Bad Request`: The request was malformed (e.g., missing required fields, invalid JSON, invalid data types, failed schema validation). Response body often contains an error message, sometimes with validation details.
*   `401 Unauthorized`: Authentication failed or is required but was not provided (missing or invalid `Authorization` header/token, or expired token).
*   `403 Forbidden`: Authentication succeeded, but the user does not have the necessary permissions (role) to access the resource or perform the action.
*   `404 Not Found`: The requested resource (e.g., user, note, tag, component, element) could not be found.
*   `409 Conflict`: The request could not be completed due to a conflict with the current state of the resource (e.g., trying to create a user or tag with a name that already exists).
*   `500 Internal Server Error`: An unexpected error occurred on the server. The response body may contain an error message (often generic for security). Check server logs for details.

**Search API Structure:**

Endpoints supporting search (e.g., `/api/notes/search`, `/api/logs/search`, `/api/signature/elements/search`) use a `POST` request with the following JSON body structure:

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
      "data": [ /* Array of results (e.g., Note objects, LogEntry objects, SignatureElementSearchResult) */ ],
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
        *   `componentName` (field) with `FRAGMENT` (condition) expects a string `value` to search by the name of the associated component.

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
    *   **Description:** Creates a new user. Default role is `regular_user`. *(Security Note: Currently requires no authentication, allowing anyone to create users. Consider restricting this endpoint, possibly to Admins or requiring an initial setup token).*
    *   **Authentication:** None required.
    *   **Request Body:** (`userSchema`)
        ```json
        {
          "login": "newuser",
          "password": "Password123", // Min 8 chars, 1 upper, 1 lower, 1 digit
          "role": "regular_user" // Optional, defaults to 'regular_user' if omitted. Ignored if provided (always creates 'regular_user'). Use PATCH /api/user/by-login/:login to set admin role.
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{"login": "newuser", "message": "User created successfully"}`
        *   `400 Bad Request`: Invalid input data (doesn't match schema) or username already exists (`Username already exists`).
        *   `500 Internal Server Error`: Failed to create user.

*   **POST `/api/user/login`**
    *   **Description:** Authenticates a user and returns a session token (UUID) valid for 24 hours.
    *   **Authentication:** None required.
    *   **Request Body:**
        ```json
        {
          "login": "username",
          "password": "password"
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"token": "uuid-session-token", "role": "admin" | "regular_user", "login": "username"}`
        *   `401 Unauthorized`: `Invalid credentials` (if login/password mismatch).
        *   `500 Internal Server Error`: `Login doesn't exist` (if user found during password check but not found immediately after - should be rare) or other login error.

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
          "role": "admin" | "regular_user"
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "User role updated successfully"}`
        *   `400 Bad Request`: Implicitly if JSON is malformed or `role` value is not one of the allowed enums (though explicit validation isn't shown in controller).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: User not found (implicitly handled by DB update affecting 0 rows, but controller doesn't check this, returns 200 regardless).
        *   `500 Internal Server Error`

*   **POST `/api/user/change-password`**
    *   **Description:** Allows the authenticated user to change their own password.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:**
        ```json
        {
          "oldPassword": "currentPassword",
          "password": "NewSecurePassword1" // Must meet complexity requirements defined in `userSchema`
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "User role updated successfully"}` *(Note: Success message is inaccurate, refers to role not password)*.
        *   `400 Bad Request`: New password doesn't meet complexity requirements *(Note: Controller currently does **not** validate the new password against `userSchema` rules. Only `createUser` does)*.
        *   `401 Unauthorized`: `Invalid password` (if `oldPassword` is incorrect).
        *   `403 Forbidden` (Not possible with current role check).
        *   `500 Internal Server Error`

### 3. Notes Management

Endpoints for creating, reading, updating, deleting, and searching notes. Notes belong to users. Tags associated with notes are managed via `tagIds` in create/update and returned when getting a specific note (if populated).

*   **PUT `/api/note`**
    *   **Description:** Creates a new note for the authenticated user. Can optionally associate existing tags.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** (`NoteInput` based, `noteInputSchema` may apply implicitly via DB or future validation)
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
        *   `400 Bad Request`: Invalid input (e.g., missing title/content, non-numeric tag ID if schema enforced).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error` (e.g., database error, non-existent tag ID if checked).

*   **GET `/api/note/id/:noteId`**
    *   **Description:** Retrieves a specific note by its ID. Only the owner or an admin can retrieve a note. *(Note: Tags are currently **not** automatically populated in the response based on DB query)*.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). User must be the owner or an admin.
    *   **Path Parameters:**
        *   `noteId`: The ID of the note to retrieve.
    *   **Responses:**
        *   `200 OK`: `{ "noteId": 1, "title": "...", "content": "...", "shared": false, "ownerUserId": 5, "createdOn": "...", "modifiedOn": "...", "tags": [] }` *(Example shows tags array, but code doesn't currently join/populate them here)*
        *   `401 Unauthorized`
        *   `403 Forbidden`: Authenticated user is not the owner and not an admin.
        *   `404 Not Found`: `{"message": "Note not found"}`
        *   `500 Internal Server Error`

*   **PATCH `/api/note/id/:noteId`**
    *   **Description:** Updates a specific note. Only the owner or an admin can update. Fields in the body are optional; only provided fields are updated. `tagIds` replaces all existing tags for the note if provided.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). User must be the owner or an admin.
    *   **Path Parameters:**
        *   `noteId`: The ID of the note to update.
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
        *   `400 Bad Request`: Invalid input.
        *   `401 Unauthorized`
        *   `403 Forbidden`: Authenticated user is not the owner and not an admin.
        *   `404 Not Found`: `{"message": "Note not found"}` (if note doesn't exist before update attempt).
        *   `500 Internal Server Error`

*   **DELETE `/api/note/id/:noteId`**
    *   **Description:** Deletes a specific note. Associated entries in `note_tags` are also deleted (DB cascade).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `noteId`: The ID of the note to delete.
    *   **Responses:**
        *   `200 OK`: `{"message": "Note deleted successfully"}`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: Note not found (implicitly handled by DB delete affecting 0 rows, controller returns 200 regardless).
        *   `500 Internal Server Error`

*   **GET `/api/notes/by-login/:login`**
    *   **Description:** Retrieves all notes owned by the user specified by login. *(Security Note: Any authenticated user (`admin` or `regular_user`) can currently view any other user's notes list by providing their login)*.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `login`: The login name of the user whose notes to retrieve.
    *   **Responses:**
        *   `200 OK`: `[ { "noteId": 1, "title": "...", "content": "...", "shared": false, "ownerUserId": ..., ... }, ... ]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: User with the specified login does not exist (returns 500 in current code: `Internal server issue`).
        *   `500 Internal Server Error`

*   **POST `/api/notes/search`**
    *   **Description:** Searches notes based on specified criteria. *(Note: Currently searches across **all** notes, regardless of ownership or `shared` status. Consider adding scope restrictions based on user role/identity if needed)*.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed direct `field` values: `title`, `content`, `shared`, `ownerUserId`.
        *   Custom `field` handler: `tags` (Requires `condition: "ANY_OF"` with an array of `tagId` numbers as the `value`).
    *   **Responses:**
        *   `200 OK`: `SearchResponse<Note>`
        *   `400 Bad Request`: Invalid search query structure or values.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 4. Tag Management

Endpoints for managing tags, which can be associated with notes.

*   **PUT `/api/tag`**
    *   **Description:** Creates a new tag. Tag names must be unique.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** (`tagSchema`)
        ```json
        {
          "name": "Important", // Required, Max 50 chars, non-empty, unique
          "description": "Tag for important notes" // Optional, Max 255 chars
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{ "tagId": 1, "name": "Important", "description": "..." }` (Returns the created tag object).
        *   `400 Bad Request`: `{"message": "Tag name is required"}` or invalid based on schema.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `409 Conflict`: `{"message": "Tag name '...' already exists."}` (Handled by catching DB unique constraint error).
        *   `500 Internal Server Error`

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
        *   `tagId`: The ID of the tag to retrieve.
    *   **Responses:**
        *   `200 OK`: `{"tagId": 1, "name": "...", "description": "..."}`
        *   `400 Bad Request`: `{"message": "Invalid tag ID"}` (if `tagId` is not a number).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Tag not found"}`.
        *   `500 Internal Server Error`

*   **PATCH `/api/tag/id/:tagId`**
    *   **Description:** Updates a specific tag's name and/or description. Name must remain unique if changed.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `tagId`: The ID of the tag to update.
    *   **Request Body:** (Partial Tag, `tagSchema` constraints apply)
        ```json
        {
          "name": "Updated Tag Name", // Optional, Max 50 chars, unique
          "description": ""          // Optional, Max 255 chars. Can be set to empty or null.
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{ "tagId": 1, "name": "Updated Tag Name", "description": "" }` (Returns the updated tag object).
        *   `400 Bad Request`: `{"message": "Invalid tag ID"}` or `{"message": "Tag name cannot be empty"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Tag not found"}` (Checked before update attempt).
        *   `409 Conflict`: `{"message": "Tag name '...' already exists."}` (If name is changed to an existing one).
        *   `500 Internal Server Error`

*   **DELETE `/api/tag/id/:tagId`**
    *   **Description:** Deletes a specific tag. Associated entries in `note_tags` are also deleted (DB cascade).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `tagId`: The ID of the tag to delete.
    *   **Responses:**
        *   `200 OK`: `{"message": "Tag deleted successfully"}`
        *   `400 Bad Request`: `{"message": "Invalid tag ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Tag not found"}` (Checked before delete attempt).
        *   `500 Internal Server Error`

### 5. Configuration Management

Endpoints for managing application configuration settings stored in the database.

*   **GET `/api/configs/:key`**
    *   **Description:** Retrieves the value of a specific configuration key.
    *   **Authentication:** Required. Role `admin` required for most keys. `admin` or `regular_user` allowed for `default_language`.
    *   **Path Parameters:**
        *   `key`: The configuration key to retrieve (e.g., `default_language`, `port`, `ssl_key`, `ssl_cert`). Must be one of the values from `AppConfigKeys` enum.
    *   **Responses:**
        *   `200 OK`: `{"key_name": "value"}` (e.g., `{"port": "3000"}`) or `{"key_name": null}` if key exists but value is null/undefined in DB.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: (Not explicitly returned, likely results in `200 OK` with null value or `500 Internal Server Error` if DB access fails).
        *   `500 Internal Server Error`

*   **PUT `/api/configs/:key`**
    *   **Description:** Sets the value of a specific configuration key. ***Important: The `:key` in the path parameter is ignored by the controller. The actual key and value MUST be provided in the request body.***
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:**
        ```json
        {
          "key": "port", // Key from AppConfigKeys enum (e.g., "port", "default_language")
          "value": "8080" // The value to set (as a string)
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "Config updated successfully"}`
        *   `400 Bad Request`: Missing `key` or `value` in body (implicit from JSON parsing/usage). Invalid key enum value not explicitly checked.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **PUT `/api/config/ssl/upload`**
    *   **Description:** Uploads and saves SSL private key and certificate strings to the configuration (`ssl_key`, `ssl_cert`).
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:** (`SslConfig`)
        ```json
        {
          "key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", // Required
          "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n" // Required
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "SSL configuration updated successfully"}`
        *   `400 Bad Request`: `{"message": "Key and certificate are required"}` (if `key` or `cert` is missing/empty in the body).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **POST `/api/config/ssl/generate`**
    *   **Description:** Generates a new self-signed SSL certificate and key and saves them to the configuration (`ssl_key`, `ssl_cert`). *Note: Current implementation in `generateSelfSignedCert` seems incomplete/placeholder.*
    *   **Authentication:** Required (Role: `admin`).
    *   **Responses:**
        *   `201 Created`: `{"message": "Self-signed SSL certificate generated and saved"}`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 6. Log Management

Endpoints for viewing and searching application logs stored in the database.

*   **GET `/api/logs/all`**
    *   **Description:** Retrieves all log entries, ordered by creation date (descending).
    *   **Authentication:** Required (Role: `admin`).
    *   **Responses:**
        *   `200 OK`: `[ { "id": 1, "level": "info", "createdOn": "...", "userId": "admin", "category": "auth", "message": "Login successful", "data": "{\"login\":\"admin\"}" }, ... ]` (Data field is stored as JSON string).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **POST `/api/logs/search`**
    *   **Description:** Searches log entries based on specified criteria.
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed `field` values: `level`, `createdOn`, `userId`, `category`, `message`. *(Note: Searching `data` field is not directly supported)*.
    *   **Responses:**
        *   `200 OK`: `SearchResponse<LogEntry>`
        *   `400 Bad Request`: Invalid search query structure or values.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 7. Signature Component Management

Endpoints for managing signature components (groups for signature elements).

*   **POST `/api/signature/components`**
    *   **Description:** Creates a new signature component. Component names must be unique.
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:** (`createSignatureComponentSchema`)
        ```json
        {
          "name": "Component Name", // Required, unique, 1-100 chars
          "description": "Optional description" // Optional, max 500 chars
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{ "signatureComponentId": 1, "name": "...", "description": "...", "createdOn": "...", "modifiedOn": "..." }` (Returns the created component object).
        *   `400 Bad Request`: `{"message": "Invalid input", "errors": {...}}` (If schema validation fails).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `409 Conflict`: `{"message": "Component name '...' already exists."}` (DB constraint).
        *   `500 Internal Server Error`

*   **GET `/api/signature/components`**
    *   **Description:** Retrieves a list of all signature components, ordered by name.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Responses:**
        *   `200 OK`: `[{"signatureComponentId": 1, "name": "...", ...}, ...]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **GET `/api/signature/components/:id`**
    *   **Description:** Retrieves a specific signature component by its ID.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `id`: The ID of the component to retrieve.
    *   **Responses:**
        *   `200 OK`: `{ "signatureComponentId": 1, "name": "...", ... }`
        *   `400 Bad Request`: `{"message": "Invalid component ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component not found"}`.
        *   `500 Internal Server Error`

*   **PATCH `/api/signature/components/:id`**
    *   **Description:** Updates a specific signature component's name and/or description. Name must remain unique if changed.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `id`: The ID of the component to update.
    *   **Request Body:** (Partial component, `updateSignatureComponentSchema`)
        ```json
        {
          "name": "Updated Component Name", // Optional, unique, 1-100 chars
          "description": "New description"     // Optional, max 500 chars, can be null
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{ "signatureComponentId": 1, "name": "...", ... }` (Returns the updated component).
        *   `400 Bad Request`: `{"message": "Invalid component ID"}` or `{"message": "Invalid input", "errors": {...}}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component not found"}` (Checked before update).
        *   `409 Conflict`: `{"message": "Component name '...' already exists."}`.
        *   `500 Internal Server Error`

*   **DELETE `/api/signature/components/:id`**
    *   **Description:** Deletes a specific signature component. Associated signature elements within this component are also deleted (DB cascade).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `id`: The ID of the component to delete.
    *   **Responses:**
        *   `204 No Content`: Successful deletion.
        *   `400 Bad Request`: `{"message": "Invalid component ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component not found"}` (Checked before delete).
        *   `500 Internal Server Error`

### 8. Signature Element Management

Endpoints for managing signature elements, which belong to components and can have parent-child relationships with other elements.

*   **POST `/api/signature/elements`**
    *   **Description:** Creates a new signature element within a specified component. Can optionally link parent elements.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** (`createSignatureElementSchema`)
        ```json
        {
          "signatureComponentId": 1,   // Required, ID of an existing component
          "name": "Element Name",      // Required, 1-100 chars
          "description": "Details...", // Optional, max 500 chars
          "parentIds": [2, 5]          // Optional: Array of existing SignatureElement IDs to set as parents
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{ "signatureElementId": 10, "signatureComponentId": 1, "name": "...", ..., "parentElements": [...] }` (Returns the created element, populated with parent elements).
        *   `400 Bad Request`: `{"message": "Invalid input", "errors": {...}}` or `{"message": "Component with ID ... not found"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error` (e.g., DB error, invalid parent ID if checked).

*   **GET `/api/signature/components/:componentId/elements`**
    *   **Description:** Retrieves all signature elements belonging to a specific component, ordered by name.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `componentId`: The ID of the parent component.
    *   **Responses:**
        *   `200 OK`: `[{"signatureElementId": 10, "name": "...", ...}, ...]`
        *   `400 Bad Request`: `{"message": "Invalid component ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Component not found"}` (Checked before fetching elements).
        *   `500 Internal Server Error`

*   **GET `/api/signature/elements/:id`**
    *   **Description:** Retrieves a specific signature element by its ID. Can optionally populate related component and parent elements using query parameters.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `id`: The ID of the element to retrieve.
    *   **Query Parameters (Optional):**
        *   `populate`: Comma-separated list of relations to include. Supported values: `component`, `parents`. (e.g., `?populate=component,parents`)
    *   **Responses:**
        *   `200 OK`: `{ "signatureElementId": 10, "name": "...", ..., "component": {...}?, "parentElements": [...]? }` (Populated fields depend on `populate` query param).
        *   `400 Bad Request`: `{"message": "Invalid element ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Element not found"}`.
        *   `500 Internal Server Error`

*   **PATCH `/api/signature/elements/:id`**
    *   **Description:** Updates a specific signature element's details (name, description) and/or replaces its parent elements. `signatureComponentId` cannot be changed via this endpoint.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Path Parameters:**
        *   `id`: The ID of the element to update.
    *   **Request Body:** (Partial element, `updateSignatureElementSchema`)
        ```json
        {
          "name": "Updated Element Name", // Optional, 1-100 chars
          "description": null,            // Optional, max 500 chars, can be set to null
          "parentIds": [3]                // Optional: Replaces *all* existing parents with this list (empty array removes all parents)
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{ "signatureElementId": 10, ..., "parentElements": [...] }` (Returns the updated element, populated with new parents).
        *   `400 Bad Request`: `{"message": "Invalid element ID"}` or `{"message": "Invalid input", "errors": {...}}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Element not found"}` (Checked before update).
        *   `500 Internal Server Error`

*   **DELETE `/api/signature/elements/:id`**
    *   **Description:** Deletes a specific signature element. Its relationships in the `signature_element_parents` table (both as a child and as a parent) are also deleted (DB cascade).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `id`: The ID of the element to delete.
    *   **Responses:**
        *   `204 No Content`: Successful deletion.
        *   `400 Bad Request`: `{"message": "Invalid element ID"}`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: `{"message": "Element not found"}` (Checked before delete).
        *   `500 Internal Server Error`

*   **POST `/api/signature/elements/search`**
    *   **Description:** Searches signature elements based on specified criteria, including relationships.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed direct `field` values: `signatureElementId`, `signatureComponentId`, `name`, `description`, `createdOn`, `modifiedOn`.
        *   Custom `field` handlers:
            *   `parentIds`: (`condition: ANY_OF`, `value`: array of parent element IDs)
            *   `hasParents`: (`condition: EQ`, `value`: boolean)
            *   `componentName`: (`condition: FRAGMENT`, `value`: string)
    *   **Responses:**
        *   `200 OK`: `SearchResponse<SignatureElementSearchResult>` (Note: `parentElements` are not populated in search results).
        *   `400 Bad Request`: Invalid search query structure or values.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

---
