import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Settings, User as UserIcon } from 'lucide-react'; // Added Settings, UserIcon
import { useAuth } from '@/hooks/useAuth';
import ChangePasswordDialog from '@/components/user/ChangePasswordDialog'; // Import the new dialog
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Import Dropdown components


interface HeaderProps {
  toggleSidebar?: () => void; // For mobile sidebar toggle (optional)
}

const getTitleFromPath = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    const title = segments[0].replace(/-/g, ' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
};

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPageTitle = getTitleFromPath(location.pathname);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false); // State for dialog

  const handleLogout = async () => {
      await logout();
      // Navigation handled by AuthContext/App.tsx
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       {toggleSidebar && (
         <Button size="icon" variant="outline" className="sm:hidden" onClick={toggleSidebar}>
           <Menu className="h-5 w-5" /> <span className="sr-only">Toggle Menu</span>
         </Button>
       )}
       <h1 className="text-xl font-semibold flex-1">{currentPageTitle}</h1>

       <div className="flex items-center gap-2">
         {/* User Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <UserIcon className="h-4 w-4" />
                <span className="sr-only">User Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className='text-sm font-normal'>
                Signed in as <span className='font-medium'>{user?.login}</span> ({user?.role})
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Add Settings/Profile link/button here if needed */}
              {/* <DropdownMenuItem onSelect={() => navigate('/profile')}> <Settings className="mr-2 h-4 w-4" /> Profile </DropdownMenuItem> */}
              <DropdownMenuItem onSelect={() => setIsChangePasswordOpen(true)}>
                 <Settings className="mr-2 h-4 w-4" /> Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout} className='text-destructive focus:text-destructive focus:bg-destructive/10'>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
       </div>

        {/* Change Password Dialog */}
        <ChangePasswordDialog
            isOpen={isChangePasswordOpen}
            onOpenChange={setIsChangePasswordOpen}
        />
    </header>
  );
};

export default Header;