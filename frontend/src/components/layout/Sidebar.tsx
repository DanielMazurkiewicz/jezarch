import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // Use NavLink
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Settings, Users, Tag, StickyNote, PenTool, Archive, ShieldAlert, LayoutDashboard } from 'lucide-react'; // Keep icons
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
          // Navigate only after successful logout (or immediate UI update in useAuth)
          navigate('/login');
          // Toast is handled inside useAuth now
      } catch (error: any) {
          toast.error(`Logout failed: ${error.message}`);
      }
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/notes', label: 'Notes', icon: StickyNote },
    { path: '/tags', label: 'Tags', icon: Tag },
    { path: '/signatures', label: 'Signatures', icon: PenTool },
    { path: '/archive', label: 'Archive', icon: Archive },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: ShieldAlert }] : []),
  ];

  return (
    <aside className={cn("w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col", className)}>
       <div className="p-4 border-b border-sidebar-border">
         <h2 className="text-lg font-semibold">JezArch FE</h2>
         {user && <span className="text-sm text-muted-foreground truncate">Logged in as: {user.login} ({user.role})</span>}
       </div>
      <ScrollArea className="flex-1 px-4 py-2">
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end // Use 'end' prop for exact match on dashboard ('/')
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 justify-start px-3 py-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" // Active style
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" // Hover style
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