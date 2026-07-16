# JezArch Usage Guide

This guide covers the core functionalities of the JezArch application for different user roles. Administrators should also consult the [Admin Guide](ADMIN_GUIDE.md) for specific administrative tasks.

## Table of Contents

*   [Logging In & Registration](#logging-in--registration)
*   [Interface Overview](#interface-overview)
    *   [Header](#header)
    *   [Sidebar](#sidebar)
    *   [Main Content Area](#main-content-area)
*   [Dashboard](#dashboard)
*   [Archive Management](#archive-management)
    *   [Browsing Units & Documents](#browsing-units--documents)
    *   [Searching](#searching)
    *   [Viewing Details](#viewing-details)
    *   [Creating Units/Documents (Admin/Employee)](#creating-unitsdocuments-adminemployee)
    *   [Editing Units/Documents (Admin/Employee)](#editing-unitsdocuments-adminemployee)
    *   [Disabling Items (Admin/Employee)](#disabling-items-adminemployee)
    *   [Batch Tagging (Admin/Employee)](#batch-tagging-adminemployee)
*   [Signatures (Admin/Employee)](#signatures-adminemployee)
    *   [Components](#components)
    *   [Elements](#elements)
*   [Tags (Admin/Employee)](#tags-adminemployee)
*   [Notes (Admin/Employee)](#notes-adminemployee)
    *   [Viewing & Searching](#viewing--searching)
    *   [Creating & Editing](#creating--editing)
    *   [Deleting](#deleting)
    *   [Sharing](#sharing)
*   [User Profile](#user-profile)
    *   [Changing Password](#changing-password)
    *   [Changing Language](#changing-language)
    *   [Logging Out](#logging-out)

---

## Logging In & Registration

*   **Login:** Access the application via the URL provided by your administrator (e.g., `http://localhost:8080`). Enter your username and password on the login screen.
*   **Registration:** If registration is enabled, click the "Register" link. Provide a username and a strong password (minimum 8 characters, including uppercase, lowercase, and a number). Confirm your password. After successful registration, you will typically have no assigned role ('null') and cannot log in until an Administrator assigns you a role ('employee' or 'user').

---

## Interface Overview

### Header

*   **Page Title & Icon:** Displays the name and relevant icon for the current section.
*   **User Menu:** Click the user icon (top right) to:
    *   See your username and role.
    *   Change your interface language.
    *   Change your password.
    *   Log out.

### Sidebar

*   Provides navigation to the main sections of the application based on your role:
    *   **Dashboard:** Overview page.
    *   **Archive:** Browse and search archival documents and units. ('User' role sees 'Search Archive').
    *   **Signatures (Admin/Employee):** Manage signature components and elements.
    *   **Tags (Admin/Employee):** Manage global tags.
    *   **Notes (Admin/Employee):** Access personal and shared notes.
    *   **Admin (Admin only):** Access administrative functions.

### Main Content Area

*   Displays the content for the selected section (e.g., list of documents, forms, settings).

---

## Dashboard

The default page after logging in. Provides a welcome message. 'User' role users are prompted to use the sidebar to search the archive, while other roles are prompted to select a section.

---

## Archive Management

Accessible via the "Archive" / "Search Archive" link in the sidebar.

### Browsing Units & Documents

*   The main archive view lists top-level units and documents.
*   Items marked with a **Folder** icon are **Units**. Clicking a Unit navigates into it, showing its child documents and sub-units.
*   Items marked with a **File** icon are **Documents**. Clicking a Document opens a preview dialog.
*   Use the **Back Arrow** button when inside a unit to return to the parent level or archive root.

### Searching

*   Use the **Search Bar** at the top of the Archive page to find items.
*   Click **Add Filter** to add search criteria.
*   Select a **Field** (e.g., Title, Creator, Tags, Descriptive Signature).
*   Choose a **Condition** (e.g., Contains, Equals, Has Any Of, Starts With Path).
*   Enter a **Value**.
    *   For text fields (`Contains`): Enter text fragments.
    *   For `Tags`: Select one or more tags from the dropdown. `Has Any Of` finds items with *at least one* of the selected tags.
    *   For `Descriptive Signature`: Use the **Signature Path Picker** (`Equals`, `Starts With`, `Contains Sequence`) to build the signature path you want to search for.
    *   For `boolean` fields (Is Digitized, Is Active): Select `True` or `False`.
*   You can check the **NOT** box to negate a condition (e.g., find items *not* matching).
*   Add multiple criteria to narrow down results (they are combined with AND).
*   Click **Search** to apply filters. Click **Reset** to clear filters.
*   **'User' role:** Search results are automatically filtered to show only documents matching tags assigned to the user by an administrator.

### Viewing Details

*   Clicking a **Document** row in the list opens a **Preview Dialog**.
*   The dialog shows:
    *   Basic info (Title, Creator, Date, Parent Unit link).
    *   Assigned Tags and Signatures (Topographic and resolved Descriptive).
    *   Created By/Updated By information with timestamps.
    *   Content Description, Physical Details, Access info, Remarks, etc.
    *   A link to the digitized version if available.
*   Admins/Employees see **Edit** and **Disable** buttons in the dialog footer.

### Creating Units/Documents (Admin/Employee)

*   Click the **Create Item** button (or **Create Document** when inside a unit).
*   A dialog appears with a form:
    *   **Type:** Select 'Unit' or 'Document'. Cannot be changed after creation. If inside a unit, this defaults to 'Document' and cannot be changed.
    *   **Parent Unit:** (Only for Documents, when creating at root) Select the unit this document belongs to using the dropdown search.
    *   **Title, Creator, Creation Date:** Required fields.
    *   **Signatures & Tags:** Use the dedicated pickers to assign Topographic Signature (text), Descriptive Signatures (paths), and Tags.
    *   **Other Fields:** Fill in optional metadata (Physical Description, Content, Access, Digitization, etc.).
    *   Click **Create Item**.

### Editing Units/Documents (Admin/Employee)

*   Click the **Edit** (pencil) icon on an item row or in the preview dialog.
*   The form dialog opens, pre-filled with the item's data.
*   Modify the fields as needed. The 'Type' cannot be changed.
*   Click **Update Item**.

### Disabling Items (Admin/Employee)

*   Click the **Disable** (trash can) icon on an item row or in the preview dialog.
*   Confirm the action in the prompt.
*   The item will be marked as inactive and hidden from regular views and searches (unless an Admin specifically includes inactive items in their search). Disabled items are not permanently deleted.

### Batch Tagging (Admin/Employee)

*   Use the search bar to filter the items you want to tag.
*   Click **Add Tags** or **Remove Tags** near the search bar.
*   A dialog appears showing how many items will be affected based on the current search filters.
    *   **Warning:** If no search filters are active, the action will apply to *all* items in the archive.
*   Select the tags you want to add or remove using the Tag Selector.
*   Click **Add Tags ({count})** or **Remove Tags ({count})** to confirm.

---

## Signatures (Admin/Employee)

Manage the building blocks for descriptive signatures.

### Components

*   Navigate to **Signatures**.
*   View existing components, their description, index type, and element count.
*   **Create:** Click **New Component**. Provide a unique Name, optional Description, and choose the Index Formatting type (how element indices within this component will be displayed - Decimal, Roman, etc.).
*   **Edit:** Click the **Edit** (pencil) icon. Modify Name, Description, or Index Type.
*   **Delete (Admin only):** Click the **Delete** (trash can) icon. **Warning:** This permanently deletes the component AND all its elements.
*   **Re-index (Admin only):** Click the **Re-index** (list restart) icon. This recalculates and updates the `index` field for all elements within that component based on their alphabetical order and the component's index type. Useful after adding/deleting/renaming multiple elements.
*   **Open:** Click a component row to navigate to its Elements page.

### Elements

*   Access this page by clicking a component row on the Signatures page.
*   View elements belonging to the selected parent component.
*   **Create:** Click **New Element**. Provide a Name, optional Description. You can optionally provide a specific Index override (text, e.g., "1a", "V"), otherwise it will be auto-generated based on the component's counter and index type. Use the **Parent Elements** selector to link this element as a child of other elements (creating hierarchical relationships).
*   **Edit:** Click the **Edit** (pencil) icon. Modify Name, Description, Index override, or Parent Elements.
*   **Delete:** Click the **Delete** (trash can) icon.
*   **Search:** Use the search bar to filter elements within the current component by Name, Description, Index, or whether they have parents.

---

## Tags (Admin/Employee)

Manage global tags used for organizing documents and notes.

*   Navigate to **Tags**.
*   View all existing tags.
*   **Create:** Click **Create Tag**. Enter a Name and optional Description.
*   **Edit (Admin only):** Click the **Edit** (pencil) icon. Modify Name or Description.
*   **Delete (Admin only):** Click the **Delete** (trash can) icon. Confirm deletion. This removes the tag globally and from all associated items.

---

## Notes (Admin/Employee)

Create and manage personal or shared notes.

### Viewing & Searching

*   Navigate to **Notes**.
*   The list displays notes you created **OR** notes created by others that are marked as **Shared**.
*   Use the **Search Bar** to filter notes by Title, Content, Shared status, Tags, or Author (Admin only).
*   Click a note title or the **Preview** (eye) icon to view its full content in a dialog.

### Creating & Editing

*   Click **Create Note**.
*   Enter a Title (required) and Content.
*   Use the **Tag Selector** to assign relevant tags.
*   Optionally, check **Share this note publicly** to make it visible to other Admins/Employees in the main list. (Only owners or Admins can change this later).
*   Click **Create Note**.
*   To edit, click the **Edit** (pencil) icon on a note row. Modify details and click **Edit Note**.

### Deleting

*   You can delete notes you own.
*   Admins can delete any note.
*   Click the **Delete** (trash can) icon and confirm.

### Sharing

*   When creating or editing a note, check the "Share this note publicly" checkbox.
*   Shared notes are visible in the main list for all Admins and Employees.
*   Only the note's owner or an Administrator can change the shared status.

---

## User Profile

Accessible via the user icon dropdown in the header.

### Changing Password

*   Select "Change Password" from the user menu.
*   Enter your **Current Password**.
*   Enter your **New Password** and confirm it. Ensure it meets complexity requirements.
*   Click **Change Password**.

### Changing Language

*   Click the user icon dropdown.
*   Hover over or click the "Language" submenu.
*   Select your preferred language (e.g., English, Polski).
*   The interface will update immediately, and your preference will be saved for future sessions.

### Logging Out

*   Select "Logout" from the user menu.
*   Your session will be terminated.
