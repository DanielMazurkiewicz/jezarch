# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```


---

# JezArch Backend API Documentation

This document outlines the available API endpoints for the JezArch backend application.

**Base URL:** The base URL depends on your server configuration (host, port, protocol - HTTP/HTTPS). Examples assume `http://localhost:3000`.

**Authentication:**

*   Most endpoints require authentication via a session token.
*   Include the token in the `Authorization` header of your request:
    ```
    Authorization: <your_session_token>
    ```
*   Tokens are obtained via the `/api/user/login` endpoint.
*   Different endpoints may require specific user roles (`admin` or `regular_user`). These requirements are noted for each endpoint.

**Roles:**

*   `admin`: Full access, including user management, configuration, and deleting any resource.
*   `regular_user`: Standard user, can manage their own notes, view shared resources (if applicable), and view some general information.

**Common Responses:**

*   `200 OK`: Request successful. Response body contains data or a success message.
*   `201 Created`: Resource created successfully. Response body may contain the created resource or a success message.
*   `204 No Content`: Request successful, but no response body (e.g., after successful deletion where no data is returned). *(Note: Controllers currently return 200 with messages for deletes)*
*   `400 Bad Request`: The request was malformed (e.g., missing required fields, invalid JSON, invalid data types). Response body often contains an error message.
*   `401 Unauthorized`: Authentication failed or is required but was not provided (missing or invalid `Authorization` header/token).
*   `403 Forbidden`: Authentication succeeded, but the user does not have the necessary permissions (role) to access the resource or perform the action.
*   `404 Not Found`: The requested resource (e.g., user, note, tag) could not be found.
*   `409 Conflict`: The request could not be completed due to a conflict with the current state of the resource (e.g., trying to create a user or tag with a name that already exists).
*   `500 Internal Server Error`: An unexpected error occurred on the server. The response body may contain an error message (often generic for security). Check server logs for details.

**Search API Structure:**

Endpoints supporting search (e.g., `/api/notes/search`, `/api/logs/search`) use a `POST` request with the following JSON body structure:

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
    *   `ANY_OF`: Field value must be one of the values in the `value` array (`IN (...)`). Requires `value` to be an array.
    *   `FRAGMENT`: Field value contains the `value` string (`LIKE %...%`). Requires `value` to be a string.
*   **Response:** The search endpoints return a `SearchResponse<T>` object:
    ```json
    {
      "data": [ /* Array of results (e.g., Note objects, LogEntry objects) */ ],
      "page": 1,
      "pageSize": 10,
      "totalSize": 55, // Total number of matching items across all pages
      "totalPages": 6  // Total number of pages
    }
    ```

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
    *   **Description:** Creates a new user. Default role is `regular_user`. *(Security Note: Currently requires no authentication, consider restricting to Admins)*.
    *   **Authentication:** None required.
    *   **Request Body:**
        ```json
        {
          "login": "newuser",
          "password": "Password123", // Min 8 chars, 1 upper, 1 lower, 1 digit
          "role": "regular_user" // Optional, defaults to 'regular_user'
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{"login": "newuser", "message": "User created successfully"}`
        *   `400 Bad Request`: Invalid input data (doesn't match schema) or username already exists.
        *   `500 Internal Server Error`: Failed to create user.

*   **POST `/api/user/login`**
    *   **Description:** Authenticates a user and returns a session token.
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
        *   `401 Unauthorized`: Invalid login or password.
        *   `500 Internal Server Error`: User not found after password check (shouldn't happen if password check passed) or other login error.

*   **POST `/api/user/logout`**
    *   **Description:** Invalidates the user's current session token.
    *   **Authentication:** Required (Any authenticated user). Uses token from `Authorization` header.
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
        *   `404 Not Found`: User with the specified login does not exist.
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
        *   `400 Bad Request`: Invalid role value.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: User not found (implicitly handled by DB update).
        *   `500 Internal Server Error`

*   **POST `/api/user/change-password`**
    *   **Description:** Allows the authenticated user to change their own password.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:**
        ```json
        {
          "oldPassword": "currentPassword",
          "password": "NewSecurePassword1" // Must meet complexity requirements
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "User password updated successfully"}` // Message is inaccurate, should be password
        *   `400 Bad Request`: New password doesn't meet requirements (validation seems missing currently).
        *   `401 Unauthorized`: `oldPassword` is incorrect.
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 3. Notes Management

Endpoints for creating, reading, updating, deleting, and searching notes. Notes belong to users.

*   **PUT `/api/note`**
    *   **Description:** Creates a new note for the authenticated user.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:** (`NoteInput`)
        ```json
        {
          "title": "My Note Title",
          "content": "Note content here.",
          "shared": false,      // Optional, defaults to false
          "tagIds": [1, 5, 10]  // Optional: Array of existing Tag IDs to associate
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{"message": "Note created successfully"}`
        *   `400 Bad Request`: Invalid input (e.g., non-numeric tag ID).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **GET `/api/note/id/:noteId`**
    *   **Description:** Retrieves a specific note by its ID. Only the owner or an admin can retrieve a note.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). User must be the owner or an admin.
    *   **Path Parameters:**
        *   `noteId`: The ID of the note to retrieve.
    *   **Responses:**
        *   `200 OK`: `{ "noteId": 1, "title": "...", "content": "...", "shared": false, "ownerUserId": 5, "createdOn": "...", "modifiedOn": "...", "tags": [{"tagId": 1, "name": "...", ...}] }` (Tags populated via join, might be missing if no tags)
        *   `401 Unauthorized`
        *   `403 Forbidden`: Authenticated user is not the owner and not an admin.
        *   `404 Not Found`: Note with the specified ID does not exist.
        *   `500 Internal Server Error`

*   **PATCH `/api/note/id/:noteId`**
    *   **Description:** Updates a specific note. Only the owner or an admin can update. Fields in the body are optional; only provided fields are updated. `tagIds` replaces all existing tags for the note.
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
        *   `404 Not Found`: Note with the specified ID does not exist.
        *   `500 Internal Server Error`

*   **DELETE `/api/note/id/:noteId`**
    *   **Description:** Deletes a specific note. Associated note-tag entries are also deleted (cascade).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `noteId`: The ID of the note to delete.
    *   **Responses:**
        *   `200 OK`: `{"message": "Note deleted successfully"}`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: Note not found (implicitly handled by DB delete).
        *   `500 Internal Server Error`

*   **GET `/api/notes/by-login/:login`**
    *   **Description:** Retrieves all notes owned by the user specified by login.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). *(Note: Any authenticated user can currently view any other user's notes by login, might need tightening based on requirements)*.
    *   **Path Parameters:**
        *   `login`: The login name of the user whose notes to retrieve.
    *   **Responses:**
        *   `200 OK`: `[ { "noteId": 1, "title": "...", ... }, ... ]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: User with the specified login does not exist.
        *   `500 Internal Server Error`

*   **POST `/api/notes/search`**
    *   **Description:** Searches notes based on specified criteria.
    *   **Authentication:** Required (Role: `admin` or `regular_user`). *(Note: Currently searches all notes, might need scoping to user's own notes + shared notes depending on requirements)*.
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed `field` values: `title`, `content`, `shared`, `ownerUserId`, `tags`.
        *   `tags` field handler: Supports `condition: "ANY_OF"` with an array of `tagId` numbers as the `value`.
    *   **Responses:**
        *   `200 OK`: `SearchResponse<Note>`
        *   `400 Bad Request`: Invalid search query structure or values.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 4. Tag Management

Endpoints for managing tags, which can be associated with notes.

*   **PUT `/api/tag`**
    *   **Description:** Creates a new tag.
    *   **Authentication:** Required (Role: `admin` or `regular_user`).
    *   **Request Body:**
        ```json
        {
          "name": "Important", // Max 50 chars, required
          "description": "Tag for important notes" // Optional, Max 255 chars
        }
        ```
    *   **Responses:**
        *   `201 Created`: `{ "tagId": 1, "name": "Important", "description": "..." }` (If newly created)
        *   `400 Bad Request`: Missing or invalid name/description.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `409 Conflict`: Tag name already exists.
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
        *   `400 Bad Request`: Invalid `tagId`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: Tag with the specified ID does not exist.
        *   `500 Internal Server Error`

*   **PATCH `/api/tag/id/:tagId`**
    *   **Description:** Updates a specific tag's name and/or description.
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `tagId`: The ID of the tag to update.
    *   **Request Body:** (Partial Tag)
        ```json
        {
          "name": "Updated Tag Name", // Optional
          "description": ""          // Optional, can be set to empty/null
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{ "tagId": 1, "name": "Updated Tag Name", "description": "" }` (Updated tag)
        *   `400 Bad Request`: Invalid input (e.g., empty name).
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: Tag with the specified ID does not exist.
        *   `409 Conflict`: Updated tag name already exists for another tag.
        *   `500 Internal Server Error`

*   **DELETE `/api/tag/id/:tagId`**
    *   **Description:** Deletes a specific tag. Associated note-tag entries are also deleted (cascade).
    *   **Authentication:** Required (Role: `admin`).
    *   **Path Parameters:**
        *   `tagId`: The ID of the tag to delete.
    *   **Responses:**
        *   `200 OK`: `{"message": "Tag deleted successfully"}`
        *   `400 Bad Request`: Invalid `tagId`.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: Tag with the specified ID does not exist.
        *   `500 Internal Server Error`

### 5. Configuration Management

Endpoints for managing application configuration settings. Primarily for administrators.

*   **GET `/api/configs/:key`**
    *   **Description:** Retrieves the value of a specific configuration key.
    *   **Authentication:** Required. Role `admin` required for most keys. `admin` or `regular_user` allowed for `default_language`.
    *   **Path Parameters:**
        *   `key`: The configuration key to retrieve (e.g., `default_language`, `port`, `ssl_key`, `ssl_cert`). See `AppConfigKeys` enum.
    *   **Responses:**
        *   `200 OK`: `{"key_name": "value"}` (e.g., `{"port": "3000"}`)
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `404 Not Found`: Key does not exist (or controller returns 500).
        *   `500 Internal Server Error`

*   **PUT `/api/configs/:key`**
    *   **Description:** Sets the value of a specific configuration key. *(Note: The `:key` in the path is ignored by the controller; the key/value must be provided in the request body)*.
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:**
        ```json
        {
          "key": "port", // Key from AppConfigKeys
          "value": "8080"
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "Config updated successfully"}`
        *   `400 Bad Request`: Missing key or value in body.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **PUT `/api/config/ssl/upload`**
    *   **Description:** Uploads and saves SSL private key and certificate.
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:**
        ```json
        {
          "key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
          "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
        }
        ```
    *   **Responses:**
        *   `200 OK`: `{"message": "SSL configuration updated successfully"}`
        *   `400 Bad Request`: Missing `key` or `cert` in body.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **POST `/api/config/ssl/generate`**
    *   **Description:** Generates a new self-signed SSL certificate and key and saves them to the configuration.
    *   **Authentication:** Required (Role: `admin`).
    *   **Responses:**
        *   `201 Created`: `{"message": "Self-signed SSL certificate generated and saved"}`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

### 6. Log Management

Endpoints for viewing and searching application logs.

*   **GET `/api/logs/all`**
    *   **Description:** Retrieves all log entries, ordered by creation date (descending).
    *   **Authentication:** Required (Role: `admin`).
    *   **Responses:**
        *   `200 OK`: `[ { "id": 1, "level": "info", "createdOn": "...", "userId": "admin", "category": "auth", "message": "Login successful", "data": "{...}" }, ... ]`
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

*   **POST `/api/logs/search`**
    *   **Description:** Searches log entries based on specified criteria.
    *   **Authentication:** Required (Role: `admin`).
    *   **Request Body:** See [Search API Structure](#search-api-structure).
        *   Allowed `field` values: `level`, `createdOn`, `userId`, `category`, `message`.
    *   **Responses:**
        *   `200 OK`: `SearchResponse<LogEntry>`
        *   `400 Bad Request`: Invalid search query structure or values.
        *   `401 Unauthorized`
        *   `403 Forbidden`
        *   `500 Internal Server Error`

---