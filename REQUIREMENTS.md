
## 1. Introduction
This document outlines the requirements for a web application designed to facilitate user management, note taking, and basic document collaboration. The application will feature role-based access control (RBAC) with admin and regular user roles. It will be built using a React front-end served by a TypeScript/Bun backend, utilizing SQLite as its primary data store.
## 2. Functional Requirements
*   **User Authentication & Authorization:**
*   **Registration:** The application shall allow new users to register with a unique userId and password. Newly registered users shall initially have no permissions assigned.
*   **Login:** Registered users shall be able to log in using their credentials.
*   **Role-Based Access Control (RBAC):**  The system shall implement RBAC, distinguishing between 'admin' and 'regular user' roles.
*   **Admin User Management:** Admin users shall have the ability to:
*   View a list of all registered users.
*   Assign permissions to other users (e.g., grant/revoke access to specific functionalities).  The permission system should be flexible enough to accommodate future feature additions without requiring code changes.
*   **Default Landing Page:** Upon successful login, the application shall redirect users to the "Notes" functionality by default.
*   **Core Functionalities (Main Screen):** The main screen shall provide access to the following functionalities via a left-side navigation menu with icons and labels:
*   **Signature Components:** Placeholder for future signature management features.  (No immediate implementation required).
*   **Units/Documents:** Placeholder for future document management features. (No immediate implementation required).
*   **Notes:**
*   Users shall be able to create, read, update, and delete notes.
*   Users shall be able to share notes with all other users within the system.  The application should clearly indicate which notes are shared.
*   **Users Management:** (Admin Only) – Access to user management features as described above.
*   **Backups:** Placeholder for future backup/restore functionality. (No immediate implementation required).
*   **Settings:** Users shall be able to configure application preferences, including language selection.
*   **Language Support:** The front-end shall support both Polish and English languages.  Users should be able to select their preferred language through the "Settings" functionality.
## 3. Non-Functional Requirements
*   **Performance:**
*   The application shall respond to user interactions within a reasonable timeframe (e.g., page loads under 3 seconds).
*   Database queries shall be optimized for performance.
*   **Usability:** The application shall have an intuitive and user-friendly interface.  Navigation should be clear and consistent. Leveraging the Radix UI components will contribute to this goal.
*   **Scalability:** While initial scale is not a primary concern, the architecture should allow for future scalability to accommodate a growing number of users and data.
*   **Maintainability:** Code should be well-documented, modular, and adhere to coding best practices to facilitate maintenance and future development. TypeScript will aid in maintainability through static typing.
*   **Portability:** The application shall be designed to run on standard web servers without requiring specific platform dependencies beyond Bun and SQLite.
*   **Deployment:**  The backend must serve the React front-end files (HTML, CSS, JavaScript) and any static media assets.
*   **HTTPS:** The application should support HTTPS for secure communication over LAN environments.
## 4. Security Requirements
*   **Password Storage:** User passwords shall be securely hashed and salted before being stored in the database.  Use a strong hashing algorithm (e.g., bcrypt).
*   **Authentication:** The application shall implement secure authentication mechanisms to prevent unauthorized access.
*   **Authorization:** Access to sensitive functionalities (e.g., user management) shall be restricted based on user roles and permissions.
*   **Data Validation:** All user inputs shall be validated to prevent injection attacks (e.g., SQL injection, XSS).  Zod will be used for schema validation in both frontend and backend.
*   **Session Management:** Secure session management techniques should be employed to protect against session hijacking.  Consider using HTTPOnly and Secure flags for cookies.
*   **Sensitive Data Protection:** Any sensitive data stored in the database (e.g., API keys – if added later) shall be encrypted at rest.
## 5. Database Requirements
*   **Database System:** SQLite will be used as the primary data store, accessed via `bun:sqlite`.
*   **Data Persistence:** All application data, including user accounts, permissions, notes, and settings, shall be persistently stored in the database.  This includes any media files associated with notes (stored as BLOBs).
*   **Database Initialization & Migration:**
*   If the database file does not exist, the application shall create it and perform initial schema setup (table creation).
*   The application shall implement a mechanism for checking the database version and applying necessary data migrations if an existing database has an older schema.  This should be handled gracefully without data loss.
*   **Configuration Storage:** All configuration items (e.g., default language, port number) shall be stored in the SQLite database. This eliminates the need for external configuration files or environment variables.
## 6. Command Line Arguments
*   The application shall accept the following command-line arguments:
*   `--database <path>`:  Specifies the path to the SQLite database file. If not provided, the default is the current working directory.
*   `--port <number>`: Specifies the port number on which the application should listen. If not provided, a default port (e.g., 3000) shall be used.
## 7. Technology Stack
*   **Backend:** TypeScript, Bun.js, SQLite
*   **Frontend:** React, TypeScript
## 8. Further Considerations/Open Questions:
*   **Error Handling & Logging:**  A robust error handling and logging mechanism should be implemented for debugging and monitoring.
*   **Testing:** Unit tests, integration tests, and end-to-end tests are crucial to ensure the quality of the application.
*   **API Design:** If future integrations with other systems are anticipated, a well-defined API design is important.
*   **Media Storage:** Media files associated with notes will be stored directly within the SQLite database as BLOBs (Binary Large Objects).



