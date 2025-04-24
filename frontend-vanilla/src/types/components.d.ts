// Global type declarations for Custom Elements

// Import element classes for accurate type information
// UI Elements
import type { AppButton } from '../components/ui/app-button';
import type { AppInput } from '../components/ui/app-input';
import type { AppSelect } from '../components/ui/app-select';
import type { AppTextarea } from '../components/ui/app-textarea';
import type { AppCheckbox } from '../components/ui/app-checkbox';
import type { AppLabel } from '../components/ui/app-label';
import type { AppCard } from '../components/ui/app-card';
import type { AppDialog } from '../components/ui/app-dialog';
import type { AppTabs } from '../components/ui/app-tabs';
import type { AppBadge } from '../components/ui/app-badge';
import type { AppPopover } from '../components/ui/app-popover';
import type { AppCommand, AppCommandItem, AppCommandGroup } from '../components/ui/app-command';
import type { Pagination } from '../components/ui/pagination'; // Corrected name
import type { ErrorDisplay } from '../components/ui/error-display';
import type { LoadingSpinner } from '../components/ui/loading-spinner';
import type { ToastHandler } from '../components/ui/toast-handler';
import type { AppToggleGroup, AppToggleGroupItem } from '../components/ui/app-toggle-group';

// Shared Components
import type { TagSelector } from '../components/shared/tag-selector';
// Corrected: Import ElementSelector type
import type { ElementSelector } from '../components/shared/element-selector';
import type { ParentElementSelector } from '../components/shared/parent-element-selector';
import type { ElementBrowserPopoverContent } from '../components/shared/element-browser-popover-content';
import type { SearchBar } from '../components/shared/search-bar';
import type { SignatureSelector } from '../components/shared/signature-selector';

// Notes Components
import type { NoteEditor } from '../components/notes/note-editor';
import type { NoteList } from '../components/notes/note-list';
import type { NotePreviewDialog } from '../components/notes/note-preview-dialog';

// Tags Components
import type { TagForm } from '../components/tags/tag-form';
import type { TagList } from '../components/tags/tag-list';

// Signatures Components
import type { ComponentForm } from '../components/signatures/component-form';
import type { ComponentList } from '../components/signatures/component-list';
import type { ElementForm } from '../components/signatures/element-form';
import type { ElementList } from '../components/signatures/element-list';

// Archive Components
import type { DocumentForm } from '../components/archive/document-form';
import type { DocumentList } from '../components/archive/document-list';
import type { DocumentPreviewDialog } from '../components/archive/document-preview-dialog';

// Admin Components
import type { UserManagement } from '../components/pages/admin/user-management';
import type { SettingsForm } from '../components/pages/admin/settings-form';
import type { SslConfig } from '../components/pages/admin/ssl-config';
import type { LogViewer } from '../components/pages/admin/log-viewer';

// Layout Elements
import type { AppLayout } from '../components/layout/app-layout';
import type { AppHeader } from '../components/layout/app-header';
import type { AppSidebar } from '../components/layout/app-sidebar';

// Auth Forms
import type { LoginForm } from '../components/auth/login-form';
import type { RegisterForm } from '../components/auth/register-form';

// Pages
import type { DashboardPage } from '../components/pages/dashboard-page';
import type { NotesPage } from '../components/pages/notes/notes-page';
import type { TagsPage } from '../components/pages/tags/tags-page';
import type { ComponentsPage } from '../components/pages/signatures/components-page';
import type { ElementsPage } from '../components/pages/signatures/elements-page';
import type { ArchivePage } from '../components/pages/archive/archive-page';
import type { AdminPage } from '../components/pages/admin/admin-page';
// Add Not Found Page
import type { NotFoundPage } from '../components/pages/not-found-page';


declare global {
  // Define the interface for the custom elements
  interface HTMLElementTagNameMap {
    // UI Elements
    'app-button': AppButton;
    'app-input': AppInput;
    'app-select': AppSelect;
    'app-textarea': AppTextarea;
    'app-checkbox': AppCheckbox;
    'app-label': AppLabel;
    'app-card': AppCard;
    'app-dialog': AppDialog;
    'app-tabs': AppTabs;
    'app-badge': AppBadge;
    'app-popover': AppPopover;
    'app-command': AppCommand;
    'app-command-item': AppCommandItem;
    'app-command-group': AppCommandGroup;
    'app-pagination': Pagination;
    'app-toggle-group': AppToggleGroup;
    'app-toggle-group-item': AppToggleGroupItem;
    'error-display': ErrorDisplay;
    'loading-spinner': LoadingSpinner;
    'toast-handler': ToastHandler;

    // Shared Components
    'tag-selector': TagSelector;
    'element-selector': ElementSelector; // Corrected tag name
    'parent-element-selector': ParentElementSelector;
    'element-browser-popover-content': ElementBrowserPopoverContent;
    'search-bar': SearchBar;
    'signature-selector': SignatureSelector;

    // Notes Components
    'note-editor': NoteEditor;
    'note-list': NoteList;
    'note-preview-dialog': NotePreviewDialog;

    // Tags Components
    'tag-form': TagForm;
    'tag-list': TagList;

    // Signatures Components
    'component-form': ComponentForm;
    'component-list': ComponentList;
    'element-form': ElementForm;
    'element-list': ElementList;

    // Archive Components
    'document-form': DocumentForm;
    'document-list': DocumentList;
    'document-preview-dialog': DocumentPreviewDialog;

    // Admin Components
    'user-management': UserManagement;
    'settings-form': SettingsForm;
    'ssl-config': SslConfig;
    'log-viewer': LogViewer;

    // Layout Elements
    'app-layout': AppLayout;
    'app-header': AppHeader;
    'app-sidebar': AppSidebar;

    // Auth Forms
    'login-form': LoginForm;
    'register-form': RegisterForm;

    // Pages
    'dashboard-page': DashboardPage;
    'notes-page': NotesPage;
    'tags-page': TagsPage;
    'components-page': ComponentsPage;
    'elements-page': ElementsPage;
    'archive-page': ArchivePage;
    'admin-page': AdminPage;
    'not-found-page': NotFoundPage; // Add 404 page
  }
}

// Need this export to treat the file as a module
export {};