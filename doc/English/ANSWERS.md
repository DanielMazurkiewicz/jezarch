# JezArch - Frequently Asked Questions

Answers to common questions about the JezArch archival management system.

## General Concepts

### What is an element? (#21)

In the signature system, an **element** is an individual item within a component. For example, if you have a component called "Series", the elements might be "Series A", "Series B", "Series C", etc.

Elements can have **parent elements** from other components, forming a hierarchy. For instance, "Series A" (element) can be a child of "Fonds X" (element from a different component).

When you create a document in the Archive section, you assign it a "descriptive signature path" - a sequence of element IDs that classifies where the document belongs in the archive structure.

### What is a component? (#25)

A **component** is a classification category that defines a level in your archive's hierarchical structure. Common examples include:

- **Fonds** - the highest level of organization (e.g., an entire collection)
- **Series** - a group of related records within a fonds
- **Sub-series** - a subdivision of a series

Each component has an **index type** that determines how its elements are numbered:
- Decimal (1, 2, 3...)
- Roman (I, II, III...)
- Lowercase letters (a, b, c...)
- Uppercase letters (A, B, C...)

### What is the difference between a component and an element? (#25)

| Component | Element |
|-----------|---------|
| A category type (like a folder label) | A specific instance within that category |
| Defines the index format (decimal, roman, etc.) | Gets an auto-generated or manual index |
| Example: "Series" | Example: "Series A", "Series B" |
| Can be deleted (cascades to elements) | Can have parent elements from other components |

### How does the element hierarchy work? (#27)

Elements can have **parent-child relationships** with other elements, even across different components. This is stored in a many-to-many junction table (`signature_element_parents`), meaning an element can have multiple parents.

In the **Signature Path Selector** dialog (used when creating/editing archive documents):

- **Hierarchical mode**: Shows root-level elements (those without parents) first. Selecting an element reveals its children, allowing you to drill down level by level.
- **Free mode**: Shows all elements from a selected component at once, letting you pick any element regardless of parent relationships.

When creating or editing an element, you can assign parent elements from other components to build the classification tree. The system prevents self-parenting but does not enforce a strict single-parent tree — elements can belong to multiple branches.

## Archive & Signatures Relationship

### What is the relationship between Archive and Signatures? (#22)

- **Signatures** define the classification system - the hierarchical taxonomy of components and elements
- **Archive** stores the actual units (containers) and documents (items)

The link between them is the **"descriptive signature path"** field on archive documents. This field stores references to element IDs from the signature system, classifying where each document belongs.

For example, a document might have a descriptive signature path of `[1, 5, 12]`, meaning it belongs under Element 1 → Element 5 → Element 12 in the classification hierarchy.

### How do entries in Signatures appear in Archive? (#24)

When you create components and elements in the Signatures section, they become available in the Archive section's "Add Signature Path" dialog. The dialog fetches all components and elements from the API, allowing you to browse and select elements to build a signature path for your documents.

### Should Signatures use inventory-style descriptions and Archive use tree view? (#23)

The current design separates concerns:

- **Signatures section** uses a list view (like an inventory/catalog) - this is appropriate because components and elements are classification definitions, not hierarchical containers
- **Archive section** supports hierarchical navigation through units (clicking a unit navigates to `?unitId=N`, showing only children of that unit)

The archive's tree structure is defined by the `parentUnitArchiveDocumentId` field, which creates parent-child relationships between units and documents.

## Document & Unit Descriptions

### Why can't units and documents have the same detailed description? (#20)

The physical description fields (dimensions, binding, condition, number of pages, etc.) apply to **units** (bound volumes), not individual documents. A unit represents a physical object like a bound volume that may contain multiple documents.

For **documents**, only the following fields are needed:
- Title
- Creator
- Creation date
- Content description
- Remarks
- Topographic/descriptive signatures
- Tags

The form conditionally shows physical description fields only when the type is set to "unit". Additionally, the preview dialog only displays physical details for units, and the backend automatically strips physical description fields when the type is "document".

## User Roles & Permissions

### Why can only administrators create components? (#26)

This was a limitation that has been fixed. Now both **admin** and **employee** roles can:
- Create components
- Edit components
- Create and edit elements
- View component and element previews

**Admin-only** actions remain:
- Delete components (destructive - cascades to all elements)
- Re-index elements (recalculates all indices)

### Why can't employees access the Signatures section? (#28)

The Signatures section is accessible to both admin and employee roles. If you experience issues accessing it:

1. Ensure your user account has the `employee` role assigned (not `null`)
2. Log out and log back in to refresh your session
3. Check that the sidebar shows the "Signatures" link for your role

The backend controllers and frontend routes both correctly allow `admin` and `employee` roles for all signature operations.

## Signature Path Selection

### Why don't documents appear when adding a signature path? (#29)

The signature path picker (`ElementBrowserDialogContent`) loads components and elements from the API. If elements don't appear:

1. Ensure components and elements have been created in the Signatures section
2. Select a component from the dropdown first
3. In **Hierarchical mode**: elements without parents are shown first, then children of selected elements
4. In **Free mode**: all elements from the selected component are shown
5. Use the search field to filter elements by name or index

The remarks field in document forms accepts unlimited characters (uses a `Textarea` component with no character limit in the frontend or backend).

## UI Features

### Does every section have preview and delete options? (#30)

Yes, all main sections now have:

| Section | Preview | Delete |
|---------|---------|--------|
| Archive | DocumentPreviewDialog | Soft-disable (soft delete) |
| Components | ComponentPreviewDialog | Admin-only hard delete |
| Elements | ElementPreviewDialog | Admin/Employee delete |
| Tags | Edit form serves as preview | Delete with confirmation |
| Notes | NotePreviewDialog | Delete with confirmation |

Preview dialogs show read-only details of the selected item, with edit/delete buttons for authorized users (owner or admin for notes, admin/employee for other sections).

### Is the archive list sortable? (#31)

Yes, the archive list supports sorting by:
- **Title** - alphabetical sorting
- **Type** - unit vs document
- **Topographic Signature** - alphabetical sorting of the signature text

Click a column header to sort. Click again to toggle between ascending and descending order. Sort indicators (arrows) show the current sort direction.
