# JezArch Frontend

React-based frontend for the JezArch archival management system.

## Quick Start

```bash
# Install dependencies
bun install

# Run development server (builds with source maps, no minify)
bun run dev

# Build for production (minified)
bun run build
```

The build outputs to `dist/` which the backend serves statically.

## Tech Stack

- **React 19** with TypeScript
- **Shadcn UI** (Radix UI + **Tailwind CSS v4**)
- **React Router DOM** for routing
- **React Hook Form** + **Zod** for form validation
- **Custom translation system** with `intl-messageformat` (ICU MessageFormat)
- **Bun** build script (`build.ts`) using `Bun.build` API

Tip: from the repository root, `bun run dev` starts the backend and this frontend dev server together.

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
