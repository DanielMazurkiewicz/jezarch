// Import and export component classes directly.
// Self-definition happens within each component file now.

export { AppLayout } from './layout/app-layout';
export { AppHeader } from './layout/app-header';
export { AppSidebar } from './layout/app-sidebar';

export { LoadingSpinner } from './ui/loading-spinner';
export { ErrorDisplay } from './ui/error-display';
export { AppButton } from './ui/app-button';
export { AppInput } from './ui/app-input';
export { AppTextarea } from './ui/app-textarea';
export { AppSelect } from './ui/app-select';
export { AppCheckbox } from './ui/app-checkbox';
export { AppLabel } from './ui/app-label';
export { AppCard } from './ui/app-card';
export { AppDialog } from './ui/app-dialog';
export { AppTabs } from './ui/app-tabs';
export { AppBadge } from './ui/app-badge';
export { ToastHandler } from './ui/toast-handler'; // Toast container
export { AppPopover } from './ui/app-popover';
export { AppCommand, AppCommandItem, AppCommandGroup } from './ui/app-command';
export { AppToggleGroup, AppToggleGroupItem } from './ui/app-toggle-group';
export { Pagination } from './ui/pagination'; // Corrected name

export { LoginForm } from './auth/login-form';
export { RegisterForm } from './auth/register-form';

// Import Pages from the correct location
export { DashboardPage } from './pages/dashboard-page';
export { NotesPage } from './pages/notes/notes-page';
export { TagsPage } from './pages/tags/tags-page';
export { ComponentsPage } from './pages/signatures/components-page'; // Renamed
export { ElementsPage } from './pages/signatures/elements-page';   // Added
export { ArchivePage } from './pages/archive/archive-page';
export { AdminPage } from './pages/admin/admin-page';

// Shared Components
export { SearchBar } from './shared/search-bar';
export { TagSelector } from './shared/tag-selector';
export { ElementSelector } from './shared/element-selector'; // Corrected export name
export { ParentElementSelector } from './shared/parent-element-selector'; // Corrected import location
export { SignatureSelector } from './shared/signature-selector';
export { ElementBrowserPopoverContent } from './shared/element-browser-popover-content';

// Archive Components (Forms/Lists used by ArchivePage)
export { DocumentForm } from './archive/document-form';
export { DocumentList } from './archive/document-list';
export { DocumentPreviewDialog } from './archive/document-preview-dialog';

// Notes Components (Forms/Lists used by NotesPage)
export { NoteEditor } from './notes/note-editor';
export { NoteList } from './notes/note-list';
export { NotePreviewDialog } from './notes/note-preview-dialog';

// Tags Components (Forms/Lists used by TagsPage)
export { TagForm } from './tags/tag-form';
export { TagList } from './tags/tag-list';

// Signatures Components (Forms/Lists used by Components/Elements Pages)
export { ComponentForm } from './signatures/component-form';
export { ComponentList } from './signatures/component-list';
export { ElementForm } from './signatures/element-form';
export { ElementList } from './signatures/element-list';

// Admin Sub-Components (Used by AdminPage)
export { UserManagement } from './pages/admin/user-management';
export { SettingsForm } from './pages/admin/settings-form';
export { SslConfig } from './pages/admin/ssl-config';
export { LogViewer } from './pages/admin/log-viewer';


// REMOVED defineComponents function

console.log("Component modules loaded. Self-definition occurs within each component file.");
