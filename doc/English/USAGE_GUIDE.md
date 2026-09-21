# JezArch Usage Guide

This guide covers the core functionalities of the JezArch application for different user roles. Administrators should also consult the [Admin Guide](ADMIN_GUIDE.md) for specific administrative tasks. For step-by-step end-to-end examples, see [Example Workflows](WORKFLOWS.md).

## Table of Contents

*   [Logging In & Registration](#logging-in--registration)
*   [Interface Overview](#interface-overview)
    *   [Header](#header)
    *   [Sidebar](#sidebar)
    *   [Main Content Area](#main-content-area)
    *   [Built-in Help](#built-in-help)
*   [Dashboard](#dashboard)
*   [Archive Management](#archive-management)
    *   [Browsing Units & Documents](#browsing-units--documents)
    *   [Searching](#searching)
    *   [Sorting & Pagination](#sorting--pagination)
    *   [Viewing Details](#viewing-details)
    *   [Creating Units/Documents (Admin/Employee)](#creating-unitsdocuments-adminemployee)
    *   [Editing Units/Documents (Admin/Employee)](#editing-unitsdocuments-adminemployee)
    *   [Deleting Items (Admin/Employee)](#deleting-items-adminemployee)
    *   [Batch Tagging (Admin/Employee)](#batch-tagging-adminemployee)
*   [Signatures (Admin/Employee)](#signatures-adminemployee)
    *   [Components](#components)
    *   [Elements](#elements)
    *   [Child Elements](#child-elements)
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
*   [Example Workflows](#example-workflows)

---

## Logging In & Registration

*   **Login:** Access the application via the URL provided by your administrator (e.g., `http://localhost:8080`). Enter your username and password on the login screen.
*   **Registration:** Click the "Register" link. Provide a username and a strong password (minimum 8 characters, including uppercase, lowercase, and a number). Confirm your password. After successful registration, you will typically have no assigned role ('null') and cannot log in until an Administrator assigns you a role ('employee' or 'user').
*   **Sessions:** A login session is valid for **24 hours**. After that you are logged out automatically and must log in again.
*   **Rate limiting:** To deter brute-force and spam, there are limits on how often you can attempt to log in or register. If you exceed them, you will get a "too many requests" response and need to wait before trying again.

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
*   The sidebar shows the account you are logged in as and a logout icon at the top.
*   The sidebar width can be **dragged** to resize it.
*   While on the **Archive** page, a **"Descriptive signature tree"** quick filter appears at the bottom of the sidebar (see [Searching](#searching)).

### Main Content Area

*   Displays the content for the selected section (e.g., list of documents, forms, settings).

### Built-in Help

*   Every main page (Dashboard, Archive, Signatures, Tags, Notes, Admin) has a **Help** button that opens a built-in guide for that page.
*   The guides explain the purpose of the section, its key concepts, and the permissions of each role.

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
*   The header shows how many items match the current view ("Found N item(s).").

### Searching

*   The filter section is hidden by default. Click the **Show filters** button in the top button row (next to Create / Help) to reveal the **Search Bar**; it then reads **Hide filters** to collapse it again. Criteria you have entered are preserved while the panel is hidden.
*   Use the **Search Bar** at the top of the Archive page to find items.
*   Click **Add Filter** to add a search criterion; each row has a **Field**, a **Condition**, and a **Value**.
*   Select a **Field** from:
    *   **All roles:** Title, Creator, Creation Date, Place of Creation, Seals, Content Description, Topographic Signature, Descriptive Signature, Type (only at the archive root), Is Digitized.
    *   **Admin/Employee only:** Tags, Created By, Updated By, Is Deleted.
    *   When you are browsing inside a unit, the list is automatically limited to that unit's contents.
*   Choose a **Condition** — the available conditions depend on the field type:
    *   **Text fields** (Title, Creator, Creation Date, Place, Seals, Content, Topo Signature, Created By, Updated By): `Contains` (finds fragments) or `Equals`.
    *   **Select fields** (Type): `Is` or `Is Any Of` (comma-separated values).
    *   **Boolean fields** (Is Digitized, Is Deleted): `Is` → `True` or `False`.
    *   **Tags:** `Has Any Of` — select one or more tags; matches items carrying **at least one** of the selected tags.
    *   **Descriptive Signature:** `Contains Sequence`, `Starts With`, or `Equals` — use the **Signature Path Picker** to build the element path you want to match. (`Equals` with an empty path matches items that have no descriptive signature.)
*   Enter the **Value** for the selected field (text fragment, typed value, boolean, tags, or signature path).
*   Tick the **NOT** box on a row to negate that condition (e.g. `Is Digitized` + `NOT` finds items that are *not* digitized; empty results or `[0]` arrays become "none of these").
*   Add multiple criteria to narrow the results — they are combined with **AND**, so each row further reduces the result set.
*   Click **Search** to apply the filters. Click **Reset** to clear your criteria and return to the default view (staff go back to hiding deleted items).
*   **Quick Signature Filter ("Descriptive signature tree"):** the tree at the bottom of the sidebar is an alternative way to filter by descriptive signature. Enable the checkbox, pick a condition (`Starts With` / `Contains Sequence` / `Equals`), and click through the signature hierarchy (components → elements → child elements) to select a path. The chosen path is applied **on top of** the search-bar criteria and its elements are shown as a resolved path. Click an already-selected element to clear the filter, and use the refresh icon if the tree is out of date. By default only **main components** appear at the top level of the tree; untick **Main components only** to show every component (elements of hidden components stay reachable as children).
*   **'User' role:** the automatic tag filter is always active — results only include documents carrying **at least one** of the tags assigned to you by an administrator. If no tags are assigned, the search returns no results.

### Sorting & Pagination

*   Click a table column header to sort the archive list — sortable columns are **Type**, **Title**, and **Topographic Sig.**
*   Click the same header again to toggle between ascending and descending order; arrows indicate the current direction.
*   Results are paginated (10 items per page). Use the pagination bar at the bottom of the list to move between pages.

### Viewing Details

*   Clicking a **Document** row in the list opens a **Preview Dialog**.
*   The dialog shows:
    *   Basic info (Title, Creator, Date, Place of Creation, Parent Unit link, Type).
    *   Assigned Tags and Signatures (Topographic and resolved Descriptive paths).
    *   Created By/Updated By information with timestamps.
    *   Content Description, Remarks, Seals, Document Language.
    *   Physical Details for **units** (Pages, Document Type, Dimensions, Binding, Condition).
    *   Access info (Access Level, Access Conditions) and Additional Info / Related Docs if present.
    *   Digitization status ("Yes — Link:" opens the digitized version if available, otherwise "No").
*   Admins/Employees see **Edit** and **Delete** buttons in the dialog footer (or **Restore** for deleted items).

### Creating Units/Documents (Admin/Employee)

*   Click the **Create Item** button (or **Create Document** when inside a unit).
*   A dialog appears with a form organized into sections:
    *   **Basic Information:**
        *   **Type:** Select 'Unit' or 'Document'. Cannot be changed after creation. If inside a unit, this defaults to 'Document' and cannot be changed.
        *   **Parent Unit:** (Only for Documents, when creating at root) Select the unit this document belongs to using the dropdown search.
        *   **Title, Creator, Creation Date:** Required fields. Creation Date is free text (e.g., `2023-10-26` or `ca. 1950`).
        *   **Place of Creation** and **Seals** (optional).
    *   **Physical Description** *(shown for Units only):* Number of Pages, Document Type, Dimensions, Binding, Condition.
    *   **Content & Context:** Document Language, Content Description, Remarks, Seals, Related Documents References, Additional Information.
    *   **Access & Digitization:** Access Level, Access Conditions, the **Is Digitized** checkbox (ticking it reveals the **Digitized Version Link**, which must be a valid URL).
    *   **Indexing:**
        *   **Topographic Signature:** free text for the physical location (e.g., `Box 1, Folder 5, Item 3`).
        *   **Descriptive Signatures:** use the **Signature Path Picker** to add one or more element paths.
        *   **Tags:** assign existing tags with the **Tag Selector** (create tags first in the Tags section).
    *   Click **Create Item**.

### Editing Units/Documents (Admin/Employee)

*   Click the **Edit** (pencil) icon on an item row or in the preview dialog.
*   The form dialog opens, pre-filled with the item's data.
*   Modify the fields as needed. The 'Type' cannot be changed.
*   Click **Update Item**.

### Deleting Items (Admin/Employee)

*   Click the **Delete** (trash can) icon on an item row or in the preview dialog.
*   Confirm the action in the prompt.
*   The item is soft-deleted: it is not permanently removed. The list shows non-deleted items by default; Admins and Employees can reveal deleted items by removing the `Is Deleted` filter (or setting it to `True`) — deleted items then show the **Restore** icon. Regular users never see deleted items.
*   Click the **Restore** icon on the item to bring it back.

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
*   View existing components, their description, index type, and element count. Components are listed with **main components first**, then alphabetically; main components show a highlighted (colored) folder icon.
*   **Create:** Click **New Component**. Provide a unique Name, optional Description, choose the Index Formatting type (how element indices within this component will be displayed - Decimal, Roman, etc.), and tick **Main component** if this level is part of your main signature system.
*   **Edit:** Click the **Edit** (pencil) icon. Modify Name, Description, Index Type, or the **Main component** flag.
*   **Delete (Admin only):** Click the **Delete** (trash can) icon. **Warning:** This permanently deletes the component AND all its elements.
*   **Re-index (Admin/Employee):** Click the **Re-index** (list restart) icon. This recalculates and updates the `index` field for all elements within that component based on their alphabetical order and the component's index type. Useful after adding/deleting/renaming multiple elements. Note that custom index overrides are overwritten.
*   **Open:** Click a component row to navigate to its Elements page.

### Elements

*   Access this page by clicking a component row on the Signatures page.
*   View elements belonging to the selected parent component.
*   **Edit the parent component:** Click the **Edit** (pencil) icon next to the page title to modify the component's Name, Description, Index Type, or Main flag without leaving the Elements page.
*   **Re-index the parent component:** Click the **Re-index** (list restart) icon next to the page title to renumber all elements in this component — the same action as the Re-index on the Components list (custom index overrides are overwritten).
*   **Create:** Click **New Element**. Provide a Name, optional Description. You can optionally provide a specific Index override (text, e.g., "1a", "V"), otherwise it will be auto-generated based on the component's counter and index type. Use the **Parent Elements** selector to link this element as a child of other elements (creating hierarchical relationships).
*   **Edit:** Click the **Edit** (pencil) icon. Modify Name, Description, Index override, or Parent Elements. Clearing the Index override removes it (the element keeps its current index until a re-index).
*   **Delete (Admin only):** Click the **Delete** (trash can) icon. This permanently removes the element and cleans up any references to it in document signature paths.
*   **Search:** The search bar is hidden by default — click the **Show filters** button in the card's top button row (next to New Element / Help) to reveal it. Use it to filter elements within the current component (the component filter is pre-applied). Available fields: **Name**, **Description**, and **Index** (all with `Contains` / `Equals` conditions) and **Has Parents** (a boolean `Is` → True/False condition that shows only elements that are children of other elements). Results are paginated (15 per page).
*   **Drill down into children:** Click an element's **name** to open its Child Elements page. A small badge next to the name shows how many children it has.

### Child Elements

*   Access this page by clicking an element name on a component's Elements page — or on another element's Child Elements page, so you can drill down through the hierarchy as deep as needed.
*   **Breadcrumbs:** Below the page title you see the path of elements you clicked to get here (starting from the root component). Click any crumb to jump back to that level, or use the arrow button to go up one level.
*   The list shows all **direct children** of the selected element. Because hierarchies can span components, a **Component** column shows which component each child belongs to.
*   Each row has the same actions as the Elements page: **Preview**, **Edit**, and **Delete (Admin only)**.
*   **Search:** Same fields as the Elements page (**Name**, **Description**, **Index**, **Has Parents**), paginated 15 per page. The search bar is hidden by default — use the **Show filters** button in the card's top button row to reveal it.
*   **Create a child element:** Click **New Element**. The dialog is slightly different from the one on the Elements page:
    *   The **Parent** is pre-filled with the element you are viewing and shown **read-only** — the new element will be its child.
    *   You choose the **Component** with a picker (a new element may belong to a different component than its parent). The picker defaults to the component of the first existing sibling; if the element has no children yet, it defaults to the element's own component.

---

## Tags (Admin/Employee)

Manage global tags used for organizing documents and notes.

*   Navigate to **Tags**.
*   View all existing tags.
*   **Create:** Click **Create Tag**. Enter a Name and optional Description.
*   **Edit (Admin/Employee):** Click the **Edit** (pencil) icon. Modify Name or Description.
*   **Delete (Admin/Employee):** Click the **Delete** (trash can) icon. Confirm deletion. This removes the tag globally and from all associated items.

---

## Notes (Admin/Employee)

Create and manage personal or shared notes.

### Viewing & Searching

*   Navigate to **Notes**.
*   The list displays notes you created **OR** notes created by others that are marked as **Shared**.
*   The search bar is hidden by default — click the **Show filters** button in the top button row (next to Create / Help) to reveal it, then use it to filter notes. Available fields: **Title**, **Content** (`Contains` / `Equals`), **Shared** (boolean `Is` → True/False), **Tags** (`Has Any Of`), and **Author** (`Contains` / `Equals`; visible to Admins only). Multiple criteria are combined with **AND**, and each row can be negated with **NOT**.
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

---

## Example Workflows

For complete, step-by-step walkthroughs — from first run through building an archive, searching, granting restricted access, and routine maintenance — see the [Example Workflows](WORKFLOWS.md) guide.
