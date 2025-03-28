# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```


### REST API Documentation

---

## **User Functionality**

### **Models**
```typescript
// User Credentials (Login/Creation)
interface UserCredentials {
  login: string;      // 3-50 characters
  password: string;   // Min 8 chars, 1 uppercase, 1 lowercase, 1 number
}

// Full User Object
interface User {
  userId: number;
  login: string;
  role: "admin" | "regular_user"; 
}

// Password Change Request
interface PasswordChangeRequest {
  oldPassword: string;
  password: string;   // Same validation as UserCredentials.password
}
```

---

### **Endpoints**

#### **Create User**
- **URL**: `POST /api/user/create`
- **Auth**: None
- **Request Body**: `UserCredentials` + optional `role`
- **Response**: 
  ```json
  { "login": "newuser", "message": "User created successfully" }
  ```

#### **Get All Users**
- **URL**: `GET /api/users/all`
- **Auth**: Admin or Regular User
- **Response**: 
  ```json
  [{ "userId": 1, "login": "admin", "role": "admin" }, ...]
  ```

#### **Get User by Login**
- **URL**: `GET /api/user/by-login/:login`
- **Auth**: Admin
- **Response**: 
  ```json
  { "userId": 2, "login": "user2", "role": "regular_user" }
  ```

#### **Update User Role**
- **URL**: `PATCH /api/user/by-login/:login`
- **Auth**: Admin
- **Request Body**: 
  ```json
  { "role": "admin" }
  ```

#### **Change Password**
- **URL**: `POST /api/user/change-password`
- **Auth**: Any authenticated user
- **Request Body**: `PasswordChangeRequest`

#### **Login**
- **URL**: `POST /api/user/login`
- **Request Body**: `UserCredentials`
- **Response**:
  ```json
  { "token": "uuid-session-token" }
  ```

#### **Logout**
- **URL**: `POST /api/user/logout`
- **Headers**: `Authorization: <session-token>`

---

## **Note Functionality**

### **Model**
```typescript
interface Note {
  noteId?: number;
  title: string;
  content: string;
  shared: boolean;
  ownerUserId: number;  // Auto-populated from session
  createdOn: Date;      // Auto-generated
  modifiedOn: Date;     // Auto-updated
}
```

---

### **Endpoints**

#### **Create Note**
- **URL**: `PUT /api/note`
- **Auth**: Any authenticated user
- **Request Body**: `{ title, content, shared }`

#### **Get Note by ID**
- **URL**: `GET /api/note/id/:noteId`
- **Auth**: Owner or Admin
- **Response**: Full `Note` object

#### **Update Note**
- **URL**: `PATCH /api/note/id/:noteId`
- **Auth**: Owner
- **Request Body**: Partial `{ title?, content?, shared? }`

#### **Delete Note**
- **URL**: `DELETE /api/note/id/:noteId`
- **Auth**: Admin only

#### **Search Notes**
- **URL**: `POST /api/notes/search`
- **Auth**: Any authenticated user
- **Request Body**:
  ```typescript
  interface SearchRequest {
    query: SearchQuery[];  // See Search section
    page: number;
    pageSize: number;
  }
  ```
- **Response**:
  ```json
  {
    "data": [Note1, Note2],
    "page": 1,
    "pageSize": 10,
    "totalSize": 42,
    "totalPages": 5
  }
  ```

---

## **Configuration**

### **Config Keys**
```typescript
enum AppConfigKeys {
  DEFAULT_LANGUAGE = 'default_language',  // e.g., "en"
  PORT = 'port',                          // Server port
  SSL_KEY = 'ssl_key',                    // PEM format
  SSL_CERT = 'ssl_cert'                   // PEM format
}
```

---

### **Endpoints**

#### **Get Config**
- **URL**: `GET /api/configs/:key`
- **Auth**: Admin (except DEFAULT_LANGUAGE)
- **Response**: 
  ```json
  { "default_language": "en" }
  ```

#### **Set Config**
- **URL**: `PUT /api/configs/:key`
- **Auth**: Admin
- **Request Body**: `{ value: "new-value" }`

#### **SSL Management**
- **Upload Certs**: `PUT /api/config/ssl/upload`
  ```json
  { "key": "-----BEGIN PRIVATE KEY...", "cert": "-----BEGIN CERTIFICATE..." }
  ```
- **Generate Self-Signed**: `POST /api/config/ssl/generate`

---

## **Logging**

### **Log Entry Model**
```typescript
interface LogEntry {
  id: number;
  level: "info" | "error";
  createdOn: Date;
  userId?: string;
  category?: string;  // e.g., "auth", "db"
  message: string;
  data?: any;         // Error details or additional context
}
```

---

### **Endpoints**

#### **Get All Logs**
- **URL**: `GET /api/logs/all`
- **Auth**: Admin

#### **Search Logs**
- **URL**: `POST /api/logs/search`
- **Auth**: Admin
- Uses same `SearchRequest` format as Notes

---

## **Session Management**

### **Models**
```typescript
interface SessionResponse {
  token: string;        // Session UUID
  expiresOn: Date;      // 24h from creation
}

interface SessionAndUser {
  user: User;
  session: SessionResponse;
}
```

---

## **System API**

### **Endpoints**

#### **Status Check**
- **URL**: `GET /api/api/status`
- **Response**:
  ```json
  { "message": "API is working" }
  ```

#### **Ping**
- **URL**: `GET /api/api/ping`
- **Response**: `"PONG"`

---

## **Search System**

### **Search Query**
```typescript
type SearchQuery = Array<{
  field: string;
  not?: boolean;
  condition: "EQ" | "GT" | "LT" | "ANY_OF" | "FRAGMENT";
  value: string | number | boolean | Array<string|number>;
}>;
```

---

## **Error Responses**

All endpoints return standardized errors:
```json
{
  "message": "Error description",
  "error": "Technical details (dev only)"
}
```

**Status Codes**:
- `401 Unauthorized`: Missing/invalid session token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `500 Internal Error`: Server-side issue

---

## **Authentication**

Include session token in headers:
```http
Authorization: 550e8400-e29b-41d4-a716-446655440000
```