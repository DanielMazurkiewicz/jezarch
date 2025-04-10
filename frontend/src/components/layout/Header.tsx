import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Import useLocation
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  toggleSidebar?: () => void; // For mobile sidebar toggle (optional)
}

// Function to derive a user-friendly title from the pathname
const getTitleFromPath = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean); // Remove empty strings, e.g., from '/'
    if (segments.length === 0) return 'Dashboard'; // Default for root path

    // Capitalize first letter, replace dashes with spaces for multi-word segments
    const title = segments[0].replace(/-/g, ' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
};


const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { logout, user } = useAuth();
  const location = useLocation(); // Get current location object
  const navigate = useNavigate();
  const currentPageTitle = getTitleFromPath(location.pathname); // Derive title from current path

  const handleLogout = async () => {
      await logout();
      // Navigation is handled by AuthContext/App.tsx after state change
      // navigate('/login'); // No longer needed here
  }


  return (
    // Sticky header for scrolling pages, flex layout, border, padding
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       {/* Mobile menu button (optional, requires state management in Layout) */}
       {toggleSidebar && (
         <Button size="icon" variant="outline" className="sm:hidden" onClick={toggleSidebar}>
           <Menu className="h-5 w-5" />
           <span className="sr-only">Toggle Menu</span>
         </Button>
       )}
       {/* Page Title */}
       <h1 className="text-xl font-semibold flex-1">{currentPageTitle}</h1>

       {/* Right-aligned items (User info, Logout) */}
       <div className="flex items-center gap-2">
           {/* Display user login/role - hidden on small screens */}
           <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.login} ({user?.role})
           </span>
           {/* Logout Button */}
           <Button variant="outline" size="icon" onClick={handleLogout} title="Logout">
             <LogOut className="h-4 w-4" />
             <span className="sr-only">Logout</span>
           </Button>
       </div>
    </header>
  );
};

export default Header;