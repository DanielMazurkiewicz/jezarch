# JezArch Administrator Guide

This guide details the functionalities available exclusively to users with the 'Admin' role in the JezArch application.

## Table of Contents

*   [Accessing the Admin Panel](#accessing-the-admin-panel)
*   [User Management](#user-management)
    *   [Viewing Users](#viewing-users)
    *   [Assigning/Changing Roles](#assigningchanging-roles)
    *   [Assigning Tags (for 'User' role)](#assigning-tags-for-user-role)
    *   [Setting User Passwords](#setting-user-passwords)
    *   [Setting Preferred Language](#setting-preferred-language)
*   [Application Settings](#application-settings)
    *   [Default Language](#default-language)
    *   [Network Ports (HTTP/HTTPS)](#network-ports-httphttps)
    *   [HTTPS/SSL Configuration](#httpssl-configuration)
    *   [Restart Implications](#restart-implications)
*   [Database Management](#database-management)
    *   [Backup](#backup)
    *   [Restore](#restore)
*   [Log Viewer](#log-viewer)
    *   [Searching Logs](#searching-logs)
    *   [Viewing Details](#viewing-details-1)
    *   [Purging Logs](#purging-logs)
*   [Other Admin Privileges](#other-admin-privileges)

---

## Accessing the Admin Panel

1.  Log in with an account that has the 'Admin' role.
2.  Click on the "Admin" link in the sidebar navigation.

---

## User Management

Navigate to the "User Management" tab within the Admin Panel.

### Viewing Users

*   A table displays all registered users, including their Login, Role, Preferred Language, and Assigned Tags (if applicable).
*   Users with `null` (No Role / Disabled) role cannot log in.

### Assigning/Changing Roles

*   Use the dropdown menu in the "Role" column for a specific user.
*   Select the desired role: 'Admin', 'Employee', 'User', or 'No Role / Disabled' (which effectively disables the account).
*   **Important:** You cannot change your own role.
*   Changing a user's role *away from* 'User' will automatically clear any tags previously assigned to them.
*   Changing a user's role *to* 'User' allows you to subsequently assign tags. You might be prompted to assign tags immediately after changing the role to 'User'.

### Assigning Tags (for 'User' role)

*   This feature is only applicable to users with the 'User' role. Users with this role can only view/search archive documents that have *at least one* of the tags assigned to them here.
*   Click the **Assign Tags** (tags icon) button in the "Actions" column for a user with the 'User' role.
*   A dialog opens with a Tag Selector. Select the tags the user should have access to.
*   Click **Save**.
*   To remove all tags, open the dialog and save with no tags selected.

### Setting User Passwords

*   Click the **Set Password** (key icon) button for any user (except yourself).
*   Enter a new password that meets the complexity requirements (shown in the dialog).
*   Click **Set Password**. This immediately changes the user's password.

### Setting Preferred Language

*   Click the **Set Language** (languages icon) button for any user (including yourself, though usually done via header dropdown).
*   Select the desired language from the dropdown.
*   Click **Save**. The user's interface preference will be updated.

---

## Application Settings

Navigate to the "App Settings" tab within the Admin Panel. Changes here might require a server restart or trigger automatic actions (like reloading HTTPS configuration).

### Default Language

*   Select the default language for the user interface for new users or users without a specific preference set.

### Network Ports (HTTP/HTTPS)

*   Set the port numbers the application server listens on for HTTP and HTTPS traffic.
*   **Requires Manual Server Restart:** Changing these ports **requires you to manually stop and restart the backend server process** for the changes to take effect.

### HTTPS/SSL Configuration

*   To enable HTTPS, provide the **absolute paths** on the server to your:
    *   **Private Key File** (e.g., `/etc/ssl/private/mydomain.key`)
    *   **Certificate File** (e.g., `/etc/ssl/certs/mydomain.crt` or `.pem`)
*   You can optionally provide a path to a **CA Chain File** if needed for your certificate.
*   **Paths must exist on the server where the backend is running.** The application checks for file existence before saving.
*   Setting valid Key and Certificate paths and saving will attempt to start/reload the HTTPS server.
*   To disable HTTPS, click the **Clear HTTPS Settings** button. This removes all paths and stops the HTTPS server.
*   **Server Actions:** Changing these settings may trigger an automatic reload of the HTTPS configuration or stop the HTTPS server if paths become invalid or are cleared. Check server logs for confirmation.

### Restart Implications

*   Changing **HTTP Port** or **HTTPS Port** requires a **manual restart** of the backend server process.
*   Changing **Default Language** takes effect immediately for new sessions/users without preferences.
*   Changing **HTTPS Paths** triggers automatic actions (reload/stop HTTPS service) but a manual restart might sometimes be beneficial if issues occur.

---

## Database Management

Navigate to the "Database" tab.

### Backup

*   Click **Download Backup File**.
*   This initiates a download of the current SQLite database file (e.g., `jezarch-backup-YYYY-MM-DDTHH-MM-SS-ZZZ.sqlite.db`).
*   **Note:** Before backup, the system attempts a `PRAGMA wal_checkpoint(TRUNCATE)` to ensure data consistency if Write-Ahead Logging (WAL) is enabled (which is the default).
*   Store the downloaded backup file securely in a separate location.

### Restore

*   **Restoring is a manual process requiring server access.**
*   **Procedure:**
    1.  **Stop** the JezArch backend server process completely.
    2.  **Locate** the active SQLite database file on the server. Its path is shown in the startup logs or can be inferred from configuration (default: `backend/jezarch.sqlite.db`).
    3.  **Replace** the active database file with your desired backup file. Ensure the filename matches what the application expects (e.g., rename your backup to `jezarch.sqlite.db`).
    4.  **Restart** the JezArch backend server process.

---

## Log Viewer

Navigate to the "System Logs" tab.

### Searching Logs

*   Use the search bar to filter logs by:
    *   Level (Info, Warn, Error)
    *   User ID (or 'system')
    *   Category (e.g., 'auth', 'db', 'startup')
    *   Message content (Contains)
    *   Timestamp (Date range conditions)

### Viewing Details

*   If a log entry has associated data (e.g., error details, request payload), an **Info** (i) icon appears in the "Data" column.
*   Click the icon to open a dialog displaying the formatted data (usually JSON).

### Purging Logs

*   To prevent the log database from growing indefinitely, you can purge old entries.
*   Enter the number of days in the input field (e.g., `30` to keep the last 30 days).
*   Click the **Purge** button.
*   Confirm the action in the dialog.
*   **Warning:** This permanently deletes log entries older than the specified number of days.

---

## Other Admin Privileges

Beyond the dedicated Admin Panel, Administrators generally have elevated permissions throughout the application:

*   **Can edit/delete any Tag.**
*   **Can edit/delete any Note.**
*   **Can edit/delete any Signature Component (including Elements via cascade).**
*   **Can bypass ownership checks** for viewing/editing/deleting most items (except changing their own role/password via admin routes).
*   Can view deleted Archive items in searches (included by default; use the `Is Deleted` filter to narrow them down).
