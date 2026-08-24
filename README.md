# JezArch - Archival Management System

JezArch is a full-stack web application designed for managing archival documents, units, notes, tags, and descriptive signatures. It provides role-based access control for administrators, employees, and restricted users.

## ✨ Key Features

*   **Archive Management:** Organize documents and hierarchical units, manage metadata, apply tags (individually or in batch), and assign topographic/descriptive signatures.
*   **Soft Delete & Restore:** Deleted archive items are hidden rather than destroyed and can be restored later by staff.
*   **User Roles:** Supports 'Admin', 'Employee', and 'User' roles with distinct permissions.
*   **Tagging System:** Create and manage global tags, assign them to documents and notes, and restrict 'User' role access based on assigned tags.
*   **Notes System:** Create personal or shared notes with tag support.
*   **Signature System:** Define signature components (e.g., Fonds, Series) and elements, build hierarchical descriptive signatures, apply them to documents, and re-index element numbering at any time.
*   **Search Functionality:** Robust search across documents, notes, and system logs with various filter conditions.
*   **Admin Panel:** Manage users (roles, passwords, tags, language), application settings (ports, language, HTTPS), database (backup), and system logs (view, purge).
*   **Built-in Help:** Every main page has a Help button with an up-to-date guide for its features.
*   **Configuration:** Flexible configuration via database, environment variables, and command-line arguments.
*   **Authentication:** Secure login with session management.
*   **Localization:** User interface available in English and Polish, with user-specific language preferences.
*   **Modern Tech Stack:** Built with Bun, React, TypeScript, SQLite, and Tailwind CSS.

## 🚀 Getting Started

1.  **Installation:** Follow the instructions in the Installation Guide to set up the application on your system (Windows, macOS, or Linux):
    *   [English](doc/English/INSTALLATION.md)
    *   [Polski](doc/Polski/INSTALLATION.md)
2.  **Running:** Learn how to start the application in development or production mode in the same guide ([EN](doc/English/INSTALLATION.md#running-the-application) / [PL](doc/Polski/INSTALLATION.md#uruchamianie-aplikacji)).

## 📖 Usage

*   For general usage instructions covering login, navigation, and features available to different roles, refer to the Usage Guide: [English](doc/English/USAGE_GUIDE.md) / [Polski](doc/Polski/USAGE_GUIDE.md).
*   Administrators should consult the detailed Admin Guide ([English](doc/English/ADMIN_GUIDE.md) / [Polski](doc/Polski/ADMIN_GUIDE.md)) for managing users, settings, and system maintenance tasks.

## 🔧 Technical Details (Optional)

For insights into the technology stack, configuration precedence, and a high-level overview, see Technical Details: [English](doc/English/TECHNICAL_DETAILS.md) / [Polski](doc/Polski/TECHNICAL_DETAILS.md).

Developer references: [backend/README.md](backend/README.md) (API reference) and [frontend/README.md](frontend/README.md).

## ❓ FAQ

For answers to common questions about components, elements, signatures, and the relationship between Archive and Signatures, see the FAQ: [English](doc/English/ANSWERS.md) / [Polski](doc/Polski/ANSWERS.md).

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.