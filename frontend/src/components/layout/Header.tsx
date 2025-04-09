import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Import useLocation
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  toggleSidebar?: () => void; // For mobile potentially
}

// Function to derive title from pathname (simple example)
const getTitleFromPath = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean); // Remove empty strings
    if (segments.length === 0) return 'Dashboard';
    const title = segments[0].replace('-', ' '); // Replace hyphens if any
    return title.charAt(0).toUpperCase() + title.slice(1); // Capitalize
};


const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { logout, user } = useAuth();
  const location = useLocation(); // Get current location
  const navigate = useNavigate();
  const currentPageTitle = getTitleFromPath(location.pathname); // Derive title

  const handleLogout = async () => {
      await logout();
      navigate('/login');
  }


  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       {toggleSidebar && (
         <Button size="icon" variant="outline" className="sm:hidden" onClick={toggleSidebar}>
           <Menu className="h-5 w-5" />
           <span className="sr-only">Toggle Menu</span>
         </Button>
       )}
       <h1 className="text-xl font-semibold">{currentPageTitle}</h1>
       <div className="ml-auto flex items-center gap-2">
           <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.login} ({user?.role})
           </span>
           <Button variant="outline" size="icon" onClick={handleLogout}>
             <LogOut className="h-4 w-4" />
             <span className="sr-only">Logout</span>
           </Button>
       </div>
    </header>
  );
};

export default Header;