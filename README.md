# JezArch - Archival Management System

JezArch is a full-stack web application designed for managing archival documents, units, notes, tags, and descriptive signatures. It provides role-based access control for administrators, employees, and restricted users.

## ✨ Key Features

*   **Archive Management:** Organize documents and hierarchical units, manage metadata, apply tags, and assign topographic/descriptive signatures.
*   **User Roles:** Supports 'Admin', 'Employee', and 'User' roles with distinct permissions.
*   **Tagging System:** Create and manage global tags, assign them to documents and notes, and restrict 'User' role access based on assigned tags.
*   **Notes System:** Create personal or shared notes with tag support.
*   **Signature System:** Define signature components (e.g., Fonds, Series) and elements, build hierarchical descriptive signatures, and apply them to documents.
*   **Search Functionality:** Robust search across documents, notes, and system logs with various filter conditions.
*   **Admin Panel:** Manage users (roles, passwords, tags, language), application settings (ports, language, HTTPS), database (backup), and system logs (view, purge).
*   **Configuration:** Flexible configuration via database, environment variables, and command-line arguments.
*   **Authentication:** Secure login with session management.
*   **Localization:** User interface available in English and Polish, with user-specific language preferences.
*   **Modern Tech Stack:** Built with Bun, React, TypeScript, SQLite, and Tailwind CSS.

## 🚀 Getting Started

1.  **Installation:** Follow the instructions in the [Installation Guide](doc/INSTALLATION.md) to set up the application on your system (Windows, macOS, or Linux).
2.  **Running:** Learn how to start the application in development or production mode in the [Installation Guide](doc/INSTALLATION.md#running-the-application).

## 📖 Usage

*   For general usage instructions covering login, navigation, and features available to different roles, refer to the [Usage Guide](doc/USAGE_GUIDE.md).
*   Administrators should consult the detailed [Admin Guide](doc/ADMIN_GUIDE.md) for managing users, settings, and system maintenance tasks.

## 🔧 Technical Details (Optional)

For insights into the technology stack, configuration precedence, and a high-level overview, see [Technical Details](doc/TECHNICAL_DETAILS.md).

## 📜 License

(Specify your license here, e.g., MIT License, or state if it's proprietary)

---