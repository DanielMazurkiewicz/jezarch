import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Settings, User as UserIcon, Languages } from 'lucide-react'; // Added Languages
import { useAuth } from '@/hooks/useAuth';
import ChangePasswordDialog from '@/components/user/ChangePasswordDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub, // Added Sub components
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
// Backend model import for SupportedLanguage
import type { SupportedLanguage, supportedLanguages as backendSupportedLanguages } from '../../../../backend/src/functionalities/user/models';


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
  const { logout, user, updateContextUser, token } = useAuth(); // Added updateContextUser and token
  const location = useLocation();
  const navigate = useNavigate();
  const currentPageTitle = getTitleFromPath(location.pathname);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogout = async () => {
      await logout();
      // Navigation handled by AuthContext/App.tsx
  }

  // --- NEW: Language Change Handler ---
  const handleLanguageChange = useCallback(async (newLanguage: SupportedLanguage) => {
      if (!user || !token || user.preferredLanguage === newLanguage) return;
      try {
          // Optimistically update context
          updateContextUser({ preferredLanguage: newLanguage });
          // API call to persist the change for the current user (admin changes via UserManagement)
          // Assuming an API endpoint like '/api/user/language' (PATCH)
          // This specific endpoint is not added in this iteration for brevity,
          // but this is where it would go. For now, it's a local preference change.
          // await api.updateSelfPreferredLanguage(newLanguage, token);
          // toast.success(`Language changed to ${newLanguage.toUpperCase()}.`);
          console.log(`Frontend: Language preference changed to ${newLanguage.toUpperCase()}`);
          // Force a re-render or reload if necessary for UI text changes,
          // though with simple 'EN' only, not much will change visually yet.
          // window.location.reload(); // Drastic, consider better state management for i18n
      } catch (error: any) {
          console.error("Failed to update language preference:", error);
          // Revert optimistic update if API call fails
          // updateContextUser({ preferredLanguage: user.preferredLanguage });
          // toast.error(`Failed to change language: ${error.message}`);
      }
  }, [user, token, updateContextUser]);
  // --- END NEW ---

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
              {/* --- Language Submenu --- */}
              <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                      <Languages className="mr-2 h-4 w-4" />
                      <span>Language ({user?.preferredLanguage.toUpperCase() || 'EN'})</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup
                              value={user?.preferredLanguage || 'en'}
                              onValueChange={(value) => handleLanguageChange(value as SupportedLanguage)}
                          >
                              {/* Only English is supported for now */}
                              <DropdownMenuRadioItem value="en">English (EN)</DropdownMenuRadioItem>
                              {/* Example for future languages:
                              <DropdownMenuRadioItem value="de" disabled>Deutsch (DE) - Soon</DropdownMenuRadioItem>
                              */}
                          </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                  </DropdownMenuPortal>
              </DropdownMenuSub>
              {/* --- End Language Submenu --- */}
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