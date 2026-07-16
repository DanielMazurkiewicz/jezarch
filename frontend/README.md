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
- **Shadcn UI** (Radix UI + Tailwind CSS)
- **React Router DOM** for routing
- **React Hook Form** + **Zod** for form validation
- **Custom translation system** with `intl-messageformat` (ICU MessageFormat)
- **Bun** build script (`build.ts`) using `Bun.build` API

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
│   ├── auth/               # LoginForm, RegisterForm, ProtectedRoute
│   ├── layout/             # Layout, Sidebar, Header
│   ├── archive/            # ArchivePage, DocumentList, DocumentForm, BatchTagDialog
│   ├── signatures/         # ComponentsPage, ElementsPage, forms
│   ├── tags/               # TagsPage, TagList, TagForm
│   ├── notes/              # NotesPage, NoteList, NoteEditor
│   ├── admin/              # AdminPage, UserManagement, SettingsForm, LogViewer
│   ├── shared/             # SearchBar, Pagination, TagSelector, SignaturePathSelector
│   └── ui/                 # Shadcn UI primitives
└── translations/
    ├── models.ts           # Translation key types
    ├── loader.ts           # Translation loading
    ├── utils.ts            # t() function with ICU MessageFormat
    ├── models/             # Key type definitions per domain
    └── data/               # en/ and pl/ translation files
```

## Features

- **Archive Management** — Browse, search, create, edit, and soft-delete archival units and documents with batch tagging support
- **Signature System** — Manage classification components (Fonds, Series) and elements with hierarchical parent-child relationships
- **Tags** — Global tag management for organizing documents and notes
- **Notes** — Personal/shared notes with tag support
- **Admin Panel** — User management, application settings, database backup, log viewer
- **Role-based UI** — Navigation and features adapt based on `admin`, `employee`, or `user` role
- **Search** — Advanced search with multiple filter conditions, negation, and tag-based access control
- **Localization** — English and Polish with per-user language preferences
