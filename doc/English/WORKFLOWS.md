# JezArch Example Workflows

This guide walks you through common end-to-end workflows in JezArch, from first run to everyday use. It assumes the application is installed and running — see the [Installation Guide](INSTALLATION.md) if you haven't done that yet.

## Table of Contents

*   [1. First Run and Initial Admin Access](#1-first-run-and-initial-admin-access)
*   [2. Exploring With Demo Data (Optional)](#2-exploring-with-demo-data-optional)
*   [3. Building an Archive Structure](#3-building-an-archive-structure)
    *   [Step 1: Define the classification (Signatures)](#step-1-define-the-classification-signatures)
    *   [Step 2: Create units (containers)](#step-2-create-units-containers)
    *   [Step 3: Add documents](#step-3-add-documents)
    *   [Step 4: Assign signatures and tags](#step-4-assign-signatures-and-tags)
*   [4. Organizing With Tags and Batch Tagging](#4-organizing-with-tags-and-batch-tagging)
*   [5. Searching and Filtering the Archive](#5-searching-and-filtering-the-archive)
*   [6. Giving a Restricted User Access](#6-giving-a-restricted-user-access)
*   [7. Managing the Lifecycle of an Item](#7-managing-the-lifecycle-of-an-item)
*   [8. Using Notes as a Team](#8-using-notes-as-a-team)
*   [9. Routine Admin Maintenance](#9-routine-admin-maintenance)

---

## 1. First Run and Initial Admin Access

**Goal:** Log in for the first time and secure the administrator account.

1.  Start the server (`bun run start:dev` or `bun run start:prod`). On first start the application creates the SQLite database and an `admin` account.
2.  Read the **admin password** from the console output:
    *   If you set the `JEZARCH_INITIAL_ADMIN_PASSWORD` environment variable before starting, that is the password.
    *   Otherwise, a strong random password is **printed exactly once** in the server console. Copy it immediately.
3.  Open the web UI (default: `http://localhost:8080`) and log in with **admin** and the password.
4.  Change the password right away for security:
    *   Click your user icon in the header → **Change Password**.
    *   Enter the current password, choose a new one, and confirm.

> **Tip:** Other people can register their own accounts, but those accounts are created without a role and cannot log in until you assign one (see [Workflow 6](#6-giving-a-restricted-user-access) and the [Admin Guide](ADMIN_GUIDE.md)).

---

## 2. Exploring With Demo Data (Optional)

**Goal:** Fill a fresh instance with sample users, tags, signatures, units, documents, and notes so you can explore the interface.

1.  With the server running, seed English demo data from the repository root:
    ```bash
    bun run seed              # comprehensive English demo data (= seed:en)
    bun run seed:en           # comprehensive English demo data
    bun run seed:pl           # Polish demo data
    ```
    If the admin password is not recognized, pass it explicitly:
    ```bash
    bun run seed http://localhost:8080 <admin-password>
    ```
2.  Log in as `admin` (or a demo user) and browse the Archive, Signatures, Tags, and Notes sections to see the seeded content.

> Note: the seed scripts use the admin account by default (`SEED_ADMIN_PASSWORD`, the CLI argument, or `JEZARCH_INITIAL_ADMIN_PASSWORD`). See the [Installation Guide](INSTALLATION.md#initial-setup) for the details.

---

## 3. Building an Archive Structure

**Goal:** From an empty archive, create a classification, add containers, and file documents with signatures and tags.

### Step 1: Define the classification (Signatures)

Start with the descriptive-signature taxonomy, because documents reference it.

1.  Go to **Signatures**.
2.  Click **New Component** and create the levels you need, for example:
    *   **Fonds** with index type *Decimal* (1, 2, 3...).
    *   **Series** with index type *Roman* (I, II, III...).
    *   **Sub-series** with index type *Lowercase letters* (a, b, c...).
    Tick **Main component** for the levels that make up your main signature system — main components are listed first everywhere and shown by default in the archive's quick signature tree (the demo seed data marks all three of these as main).
3.  Click a component row to open its Elements page.
4.  Click **New Element** to add instances, e.g. under *Series* add "Series A", "Series B". Leave the **Index** field empty to auto-number the element. To create a child of an existing element, either use the **Parent Elements** selector in the dialog, or click the element's name on the Elements page and use **New Element** on its Child Elements page — there the parent is pre-filled (read-only) and you only choose the component.
5.  If you later rename, add, or delete many elements, click the **Re-index** icon — on the Components list or next to the title on a component's Elements page — to renumber everything consistently (custom index values are overwritten).

### Step 2: Create units (containers)

1.  Open the **Archive** section.
2.  Click **Create Item**, set **Type = Unit**, and give it a **Title**, **Creator**, and **Creation Date**.
3.  Optionally fill the **Physical Description** block (number of pages, document type, dimensions, binding, condition) that only applies to units.
4.  Click **Create Item**. The new unit appears in the list.
5.  Repeat for as many nested containers as you need.

### Step 3: Add documents

1.  **Click the unit** to enter it, then click **Create Document**.
    *   The form is forced to *Document* and the parent unit is already set; you can also create documents at the archive root and pick a parent unit with the unit selector.
2.  Fill the required fields: **Title**, **Creator**, **Creation Date** (free text, e.g. `2023-10-26` or `ca. 1950`).
3.  Fill optional metadata as relevant:
    *   *Content & Context:* document language, content description, remarks, seals, related document references, additional information.
    *   *Access & Digitization:* access level and conditions; tick **Is Digitized** and provide the **Digitized Version Link** (a valid URL) if a scan exists.
4.  See [Step 4](#step-4-assign-signatures-and-tags) for signatures and tags, then click **Create Item**.

### Step 4: Assign signatures and tags

With a document form open:

1.  **Topographic Signature:** enter its physical location as free text, e.g. `Box 1, Folder 5, Item 3`.
2.  **Descriptive Signatures:** click **Add Signature Path** and use the picker:
    *   In **Tree mode** (default), expand components and elements and click the one you want — its full path is selected automatically. Alternatively, select a **component** and either browse **Hierarchically** (drill down from root elements) or pick any element in **Free** mode.
    *   Each element you add extends the current path; click **Add This Path** to attach it. You can attach several paths to one document.
3.  **Tags:** use the **Tag Selector** to attach existing tags. Create missing tags first in the **Tags** section (see Workflow 4).

---

## 4. Organizing With Tags and Batch Tagging

**Goal:** set up a consistent tag vocabulary and apply it to many documents at once.

1.  Go to **Tags** and click **Create Tag** for each label you want to reuse (e.g. `Digitalized`, `Confidential`, `19th century`). Optionally add a description.
2.  Go to **Archive** and build a search that selects exactly the group of items you want to tag (see Workflow 5). The header shows how many items currently match.
3.  Click **Add Tags** (or **Remove Tags**) next to the search bar.
4.  Choose the tags in the dialog and confirm.
    *   **Warning:** if no search filters are active, a batch action applies to **all** items in the archive. Always double-check the shown count before confirming.
5.  Tags act as access control for restricted users — see Workflow 6.

---

## 5. Searching and Filtering the Archive

**Goal:** find a precise subset of documents (and keep it as a reusable idea).

1.  Open **Archive**. Staff see non-deleted items by default through an automatic `Is Deleted = False` filter.
2.  Click **Show filters** in the top button row (the search bar is hidden by default), then use the **Search Bar** to add criteria:
    *   **Add Filter** for each field you want to constrain. Available fields include Title, Creator, Creation Date, Place of Creation, Seals, Content Description, Topographic Signature, Descriptive Signature, Type (at root) and Is Digitized; staff additionally see Tags, Created By, Updated By, and Is Deleted.
    *   Pick a **Condition** for each field:
        *   Text fields: **Contains** (fragment match) or **Equals**.
        *   Select fields (Type): **Is** or **Is Any Of**.
        *   Boolean fields (Is Digitized, Is Deleted): **Is** → True/False.
        *   Tags: **Has Any Of** (at least one of the chosen tags).
        *   Descriptive Signature: **Contains Sequence**, **Starts With**, or **Equals** (pick the signature path with the picker).
    *   Tick **NOT** on any row to invert it (e.g. `Is Digitized = NOT True`).
    *   Multiple criteria are combined with **AND**, so each one narrows the results.
3.  Click **Search**. The result count ("Found N item(s).") and the pagination bar reflect the filtered results.
4.  Click **Reset** to clear your criteria (staff return to the default non-deleted view).
5.  Narrow further with the **Descriptive signature tree** in the sidebar: tick it, pick a condition (`Starts With` / `Contains Sequence` / `Equals`), then click through the signature hierarchy in the tree. The selected path is applied on top of your search-bar filters and shown as a chip. Use the refresh button if the tree is out of date.
6.  Reorder results by clicking the **Type**, **Title**, or **Topographic Sig.** column headers (toggle ascending/descending).

> For restricted `user` accounts, the results are automatically limited to documents that carry at least one tag assigned to the account; if no tags are assigned, the search returns nothing.

---

## 6. Giving a Restricted User Access

**Goal:** let a new user log in and search only the documents they are allowed to see.

1.  Have the user register (or create the account for them in **Admin → User Management → Create User**). New accounts have **No Role / Disabled** and cannot log in.
2.  In **Admin → User Management**, find the user and change their role to **User** using the Role dropdown.
    *   You will be prompted to assign allowed tags immediately; you can also click the **Assign Tags** (tag icon) button in the Actions column later.
3.  In the tag dialog, select the tags whose documents the user may access, and click **Save**.
    *   The user can see a document if it has **at least one** of the assigned tags. Documents with none of those tags are invisible to them, as are deleted items.
4.  Tell the user to log in. Their Archive page ("Search Archive") only shows matching documents, and the search automatically applies the tag filter.
5.  To revoke access later, remove tags in the same dialog, change the role, or set the role to **No Role / Disabled**.

> Tags assigned to a user are cleared automatically if you change their role away from **User**.

---

## 7. Managing the Lifecycle of an Item

**Goal:** delete an item safely and recover it later.

1.  **Soft delete:** in the Archive, click the **Delete** (trash) icon on a document or unit row (or in the preview dialog) and confirm. The item is hidden, **not** erased; it can be recovered by staff.
2.  **View deleted items:** as admin/employee, in the search bar set **Is Deleted = Is → True** (or remove the default `Is Deleted = False` filter). Deleted rows show a **Restore** icon.
3.  **Restore:** click the **Restore** icon to bring the item back to the regular list.

> Deleted items are never visible to `user` accounts. Deleting a component or element in **Signatures** is a *permanent* delete, so only admins can do it.

---

## 8. Using Notes as a Team

**Goal:** share working notes between staff.

1.  Open **Notes** and click **Create Note**.
2.  Enter a **Title** and **Content**, attach **Tags**, and tick **Share this note publicly** if other admins/employees should see it.
3.  Click **Create Note**. Shared notes appear in everyone's list with a *Shared* badge; private notes are only visible to you.
4.  Find notes quickly with the search bar: filter by Title, Content, Shared status, Tags, or Author (admins only).
5.  Only the owner or an admin can change a note's shared status or delete someone else's note.

---

## 9. Routine Admin Maintenance

**Goal:** keep backups, tidy logs, and adjust settings.

1.  **Database backup:** in **Admin → Database**, click **Download Backup File**. The server sends a consistent snapshot (`VACUUM INTO`), so it is safe to download while the system is running. Store the file somewhere secure, out of the server.
2.  **Restoring a backup** is a manual, server-side operation: stop the server, replace the active database file with the backup (renamed to the expected filename), and restart.
3.  **Prune logs:** in **Admin → System Logs**, type a number of days (e.g. `30`) and click **Purge** to permanently remove older log entries.
4.  **Adjust settings:** in **Admin → App Settings** you can change the default language (takes effect immediately) and the HTTPS key/certificate/CA paths (reload immediately). Changing the **HTTP/HTTPS ports** requires a manual server restart.
5.  **Enable HTTPS:** provide absolute paths to your key and certificate (and optional CA chain), click **Save**. The server reloads HTTPS automatically; clear the settings to disable HTTPS again.