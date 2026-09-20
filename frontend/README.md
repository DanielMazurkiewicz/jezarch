# JezArch Frontend

React-based frontend for the JezArch archival management system.

## Quick Start

```bash
# Install dependencies
bun install

# Build for development (unminified, with source maps) into dist/
bun run dev

# Build for production (minified) into dist/
bun run build
```

There is **no dev server and no file watcher**: `bun run dev` (in this directory) is a one-shot `Bun.build` (via `build.ts`) that writes to `dist/` and exits. To see changes you must rebuild, and the backend must serve the fresh files. From the repository root, `bun run start:dev` builds the frontend once and then starts the backend server.

The build outputs to `dist/` which the backend serves statically.

## Tech Stack

- **React 19** with TypeScript
- **Shadcn UI** (Radix UI + **Tailwind CSS v4**)
- **React Router DOM** for routing
- **React Hook Form** + **Zod** for form validation
- **Custom translation system** with `intl-messageformat` (ICU MessageFormat)
- **Bun** build script (`build.ts`) using `Bun.build` API

Tip: from the repository root, `bun run start:dev` builds this frontend once and then starts the backend that serves it.

## Project Structure

```
src/
├── App.tsx                 # Root routing (public & protected routes)
├── frontend.tsx            # React DOM entry point
├── types.d.ts              # TypeScript declarations
├── lib/
│   ├── api.ts              # API client (all backend calls)
│   ├── utils.ts            # Utility functions
│   └── zodSchemas.ts       # Zod validation schemas
├── context/
│   └── AuthContext.tsx      # Authentication state management
├── hooks/
│   └── useAuth.ts           # Auth hook
├── components/
│   ├── auth/               # LoginForm, RegisterForm, AuthLayout, ProtectedRoute
│   ├── layout/             # Layout, Sidebar, Header
│   ├── user/               # ChangePasswordDialog
│   ├── archive/            # ArchivePage, DocumentList/Form/PreviewDialog, BatchTagDialog, UnitSelector, QuickSignatureFilter
│   ├── signatures/         # ComponentsPage, ElementsPage, lists/forms/preview dialogs, ElementSelector
│   ├── tags/               # TagsPage, TagList, TagForm
│   ├── notes/              # NotesPage, NoteList, NoteEditor, NotePreviewDialog
│   ├── admin/              # AdminPage, UserManagement (+ create/password/language/tags dialogs), SettingsForm, DatabaseManagement, LogViewer
│   ├── shared/             # HelpDialog, SearchBar, Pagination, TagSelector, SignaturePathSelector, SingleSignaturePathPicker, ElementBrowserDialogContent, ErrorBoundary/ErrorDisplay, LoadingSpinner, useDebounce
│   └── ui/                 # Shadcn UI primitives
└── translations/
    ├── models.ts           # Translation key types (aggregated)
    ├── loader.ts           # Translation loading
    ├── utils.ts            # t() function with ICU MessageFormat
    ├── models/             # Key type definitions per domain
    └── data/               # en/ and pl/ translation files
```

## Features

- **Archive Management** — Browse, search, create, edit, and soft-delete archival units and documents with batch tagging support; deleted items can be restored
- **Signature System** — Manage classification components (Fonds, Series) and elements with hierarchical parent-child relationships and re-indexing
- **Tags** — Global tag management for organizing documents and notes
- **Notes** — Personal/shared notes with tag support
- **Admin Panel** — User management (creation, roles, passwords, language, tag assignment), application settings, database backup download, log viewer with purge
- **Role-based UI** — Navigation and features adapt based on `admin`, `employee`, or `user` role
- **Built-in Help** — Help button on every main page opens a per-page guide dialog
- **Search** — Advanced search with multiple filter conditions, negation, and tag-based access control
- **Localization** — English and Polish with per-user language preferences

## Inactive / legacy frontends

The directories `frontend-react/`, `frontend-solid/`, `frontend-vanilla/`, `frontend-vanjs/`, and `solid_tmp/` (at the repository root) are **inactive** prototypes of older UI approaches. They are not built, not served, and not covered by the root `bun run build:prod`/`bun run start:dev` scripts. This document covers only the `frontend/` directory.
