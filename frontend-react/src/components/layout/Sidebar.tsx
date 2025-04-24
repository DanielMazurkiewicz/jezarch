import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // Use NavLink for active styling
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
// Use specific icons for clarity
import {
  LayoutDashboard, StickyNote, Tag, PenTool, Archive, ShieldAlert, LogOut
} from 'lucide-react';
import { toast } from "sonner"; // Import toast for logout feedback

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
      try {
          await logout();
          // Navigation is handled inside AuthContext/App.tsx upon state change
          // toast is also handled within useAuth hook now
      } catch (error: any) {
          // This catch might be redundant if useAuth handles it, but good fallback
          toast.error(`Logout failed: ${error.message}`);
      }
  }

  // Define navigation items including icons - REORDERED
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/archive', label: 'Archive', icon: Archive },
    { path: '/signatures', label: 'Signatures', icon: PenTool },
    { path: '/tags', label: 'Tags', icon: Tag },
    { path: '/notes', label: 'Notes', icon: StickyNote },
    // Conditionally add Admin link
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: ShieldAlert }] : []),
  ];

  return (
    <aside className={cn(
      // Base styles: width, background, text color, border, flex layout
      "w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col",
      className // Allow overriding via props
    )}>
       {/* Header section of sidebar */}
       <div className="p-4 border-b border-sidebar-border">
         <h2 className="text-lg font-semibold">JezArch FE</h2>
         {/* Display user info */}
         {user && <span className="text-sm text-muted-foreground block truncate">Logged in as: {user.login} ({user.role})</span>}
       </div>

      {/* Scrollable navigation area */}
      <ScrollArea className="flex-1 px-4 py-2">
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact} // Use 'end' prop for exact matching (e.g., for '/')
              // Use a function for className to access isActive for conditional styling
              className={({ isActive }) =>
                cn(
                  // Base link styles (flex, alignment, padding, rounding, transition)
                  "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  // Horizontal layout
                  "justify-start px-3 py-2",
                  // Check isActive for the base path OR if the current path starts with the item path (for nested routes like /signatures/...)
                  (isActive || location.pathname.startsWith(item.path + '/'))
                    // Active state: background, text color, font weight
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    // Inactive state: hover effects
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
               <item.icon className="mr-2 h-4 w-4" /> {/* Icon */}
               {item.label} {/* Label */}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

       {/* Footer section of sidebar (Logout button) */}
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