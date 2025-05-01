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

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  // Added check for employee role
  const isEmployee = user?.role === 'employee';
  const isUserRole = user?.role === 'user'; // Check for 'user' role

  const handleLogout = async () => {
      try {
          await logout();
      } catch (error: any) {
          toast.error(`Logout failed: ${error.message}`);
      }
  }

  // Define navigation items based on roles
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['admin', 'employee', 'user'] }, // All roles see dashboard
    { path: '/archive', label: 'Archive', icon: isUserRole ? FileSearch : Archive, roles: ['admin', 'employee', 'user'] }, // All roles can access Archive (permissions handled inside)
    { path: '/signatures', label: 'Signatures', icon: PenTool, roles: ['admin', 'employee'] }, // Only admin/employee manage signatures
    { path: '/tags', label: 'Tags', icon: Tag, roles: ['admin', 'employee'] }, // Only admin/employee manage tags
    { path: '/notes', label: 'Notes', icon: StickyNote, roles: ['admin', 'employee'] }, // Only admin/employee access notes
    { path: '/admin', label: 'Admin', icon: ShieldAlert, roles: ['admin'] }, // Only admin sees Admin section
  ].filter(item => item.roles.includes(user?.role || '')); // Filter items based on current user's role


  return (
    <aside className={cn(
      "w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col",
      className
    )}>
       <div className="p-4 border-b border-sidebar-border">
         <h2 className="text-lg font-semibold">JezArch FE</h2>
         {user && <span className="text-sm text-muted-foreground block truncate">Logged in as: {user.login} ({user.role})</span>}
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
                  "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "justify-start px-3 py-2",
                  (isActive || location.pathname.startsWith(item.path + '/'))
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
               <item.icon className="mr-2 h-4 w-4" />
               {item.label}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

       <div className="p-4 mt-auto border-t border-sidebar-border">
         <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
           <LogOut className="mr-2 h-4 w-4" />
           Logout
         </Button>
       </div>
    </aside>
  );
};

export default Sidebar;