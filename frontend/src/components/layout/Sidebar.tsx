import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // Use NavLink for active styling
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
// Use specific icons for clarity
import {
  LayoutDashboard, StickyNote, Tag, PenTool, Archive, ShieldAlert, LogOut, FileSearch // Added FileSearch
} from 'lucide-react';
import { toast } from "sonner"; // Import toast for logout feedback
import { t } from '@/translations/utils'; // Import translation utility
import type { AppTranslationKey } from '@/translations/models'; // Import key type

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { logout, user, preferredLanguage } = useAuth(); // Get preferredLanguage
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  // Added check for employee role
  const isEmployee = user?.role === 'employee';
  const isUserRole = user?.role === 'user'; // Check for 'user' role

  const handleLogout = async () => {
      try {
          await logout();
      } catch (error: any) {
          // Use translated error message
          toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('logoutFailedError', preferredLanguage, { message: error.message }) })); // TODO: Add logoutFailedError
      }
  }

  // Map paths to translation keys
  const navItemTranslations: Record<string, AppTranslationKey> = {
    '/': 'dashboardTitle',
    '/archive': 'archiveTitle',
    '/signatures': 'signaturesTitle', // Use common key now
    '/tags': 'tagsTitle',
    '/notes': 'notesTitle',
    '/admin': 'adminPanelTitle',
  };

  // Define navigation items based on roles
  const navItems = [
    { path: '/', labelKey: navItemTranslations['/'], icon: LayoutDashboard, exact: true, roles: ['admin', 'employee', 'user'] }, // All roles see dashboard
    { path: '/archive', labelKey: navItemTranslations['/archive'], icon: isUserRole ? FileSearch : Archive, roles: ['admin', 'employee', 'user'] }, // All roles can access Archive (permissions handled inside)
    { path: '/signatures', labelKey: navItemTranslations['/signatures'], icon: PenTool, roles: ['admin', 'employee'] }, // Only admin/employee manage signatures
    { path: '/tags', labelKey: navItemTranslations['/tags'], icon: Tag, roles: ['admin', 'employee'] }, // Only admin/employee manage tags
    { path: '/notes', labelKey: navItemTranslations['/notes'], icon: StickyNote, roles: ['admin', 'employee'] }, // Only admin/employee access notes
    { path: '/admin', labelKey: navItemTranslations['/admin'], icon: ShieldAlert, roles: ['admin'] }, // Only admin sees Admin section
  ].filter(item => item.roles.includes(user?.role || '')); // Filter items based on current user's role


  return (
    <aside className={cn(
      // Force white background, adjust text/border for contrast
      "w-64 bg-white dark:bg-white text-neutral-700 border-r border-neutral-200 flex flex-col",
      className
    )}>
       {/* Header - Adjust text/border */}
       <div className="p-4 border-b border-neutral-200">
         <h2 className="text-lg font-semibold text-neutral-900">JezArch FE</h2>
         {user && <span className="text-sm text-neutral-600 block truncate">{t('sidebarLoggedInAs', preferredLanguage)} {user.login} ({user.role})</span>}
       </div>

      <ScrollArea className="flex-1 px-4 py-2">
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "justify-start px-3 py-2",
                  // Adjust hover/active states for white background
                  (isActive || (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path + '/'))) // Adjusted active check
                    ? "bg-neutral-100 text-neutral-900 font-semibold" // Active state: light gray bg, dark text
                    : "hover:bg-neutral-100 hover:text-neutral-900 text-neutral-700" // Default/Hover state
                )
              }
            >
               <item.icon className="mr-2 h-4 w-4" />
               {t(item.labelKey, preferredLanguage)}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

       {/* Footer - Adjust border, button variant */}
       <div className="p-4 mt-auto border-t border-neutral-200">
         <Button variant="outline" className="w-full justify-start text-neutral-700 border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900" onClick={handleLogout}>
           <LogOut className="mr-2 h-4 w-4" />
           {t('headerLogout', preferredLanguage)}
         </Button>
       </div>
    </aside>
  );
};

export default Sidebar;