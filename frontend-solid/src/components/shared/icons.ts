// src/components/shared/icons.ts
// Export SolidJS components for each Lucide icon needed.
// This allows tree-shaking. Manually list required icons.

// Example using lucide-solid. Install with `bun add lucide-solid`.

export {
    // Auth / Layout
    LogIn, LogOut, Menu, User, ShieldAlert, X, Check, ChevronsUpDown, ArrowLeft, HelpCircle, Loader2, // Renamed Loader2 export
    // General UI
    PlusCircle, Edit, Trash2, Search, Eye, RefreshCcw, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info, Ban, Plus, Network, ArrowRight, UploadCloud, Minus,
    // App sections
    LayoutDashboard, StickyNote, Tag, PenTool, Archive, ListRestart, FolderOpen, FileText, Folder, CheckCircle,
} from 'lucide-solid';

// If not using lucide-solid, define simple functional components here:
// import type { JSX } from 'solid-js';
// export const LogOut = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" {...props}>
//     <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
//     <polyline points="16 17 21 12 16 7"/>
//     <line x1="21" y1="12" x2="9" y2="12"/>
//   </svg>
// );
// ... and so on for each required icon.