import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    LogOut, Menu, Settings, User as UserIcon, Languages,
    LayoutDashboard, StickyNote, Tag, PenTool, Archive as ArchiveIcon, ShieldAlert, FileSearch
} from 'lucide-react'; // Added page icons
import { useAuth } from '@/hooks/useAuth';
import ChangePasswordDialog from '@/components/user/ChangePasswordDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { type SupportedLanguage, supportedLanguages as appSupportedLanguages, defaultLanguage as appDefaultLanguage } from '@/translations/models';
import api from '@/lib/api';
import { toast } from "sonner";
import { t } from '@/translations/utils';
import { cn } from '@/lib/utils'; // Import cn

interface HeaderProps {
  toggleSidebar?: () => void;
}

// Helper function to get title and icon from path
const getPageInfoFromPath = (pathname: string, lang: SupportedLanguage, userRole?: string | null): { title: string, Icon: React.ComponentType<{ className?: string }> } => {
    const segments = pathname.split('/').filter(Boolean);
    let titleKey: string = 'dashboardTitle'; // Default to dashboard
    let Icon: React.ComponentType<{ className?: string }> = LayoutDashboard; // Default icon

    if (segments.length > 0) {
        const baseSegment = segments[0];
        switch (baseSegment) {
            case 'archive':
                titleKey = 'archiveTitle';
                Icon = userRole === 'user' ? FileSearch : ArchiveIcon; // Match sidebar logic
                break;
            case 'signatures':
                titleKey = 'signaturesTitle';
                Icon = PenTool;
                if (segments.length > 1) titleKey = 'elementsTitle'; // Basic override for sub-page
                break;
            case 'tags':
                titleKey = 'tagsTitle';
                Icon = Tag;
                break;
            case 'notes':
                titleKey = 'notesTitle';
                Icon = StickyNote;
                break;
            case 'admin':
                titleKey = 'adminPanelTitle';
                Icon = ShieldAlert;
                break;
            // Add cases for other base routes if needed
            default:
                 // Fallback for unknown top-level routes, keep dashboard
                 titleKey = 'dashboardTitle';
                 Icon = LayoutDashboard;
        }
    } else {
        // Root path, default to dashboard
        titleKey = 'dashboardTitle';
        Icon = LayoutDashboard;
    }

    // Attempt to translate the key; fallback to a sensible default if key is invalid
    let title = t(titleKey as any, lang); // Use 'any' carefully or refine key type
    if (title === titleKey && title !== 'dashboardTitle') { // Fallback if translation missing
         const segmentName = segments[0] || 'Dashboard';
         title = segmentName.charAt(0).toUpperCase() + segmentName.slice(1).replace(/-/g, ' ');
    }

    return { title, Icon };
};


const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    // Use preferredLanguage directly from context state
    const { logout, user, updateContextUser, setContextPreferredLanguage, preferredLanguage, token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { title: currentPageTitle, Icon: CurrentPageIcon } = getPageInfoFromPath(location.pathname, preferredLanguage, user?.role); // Get title and icon
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        // Navigation handled by AuthContext/App.tsx
    }

    const handleLanguageChange = useCallback(async (newLanguage: AppSupportedLanguage) => {
        if (!user || !token || user.preferredLanguage === newLanguage) return;

        // 1. Store old language for potential revert
        const oldLanguage = user.preferredLanguage;

        // 2. Optimistically update context & localStorage (which updates the UI)
        setContextPreferredLanguage(newLanguage);
        console.log(`Header: Optimistically set language to ${newLanguage}`);

        try {
            // 3. API call to persist the change for the logged-in user
            await api.updateUserPreferredLanguage(user.login, newLanguage, token);
            console.log(`Header: User language preference updated to ${newLanguage.toUpperCase()} via API.`);
            // 4. Show success toast in the *newly selected* language
            toast.success(t('languageUpdatedSuccess', newLanguage, { login: user.login, language: newLanguage.toUpperCase() }));
            // No need to call updateContextUser again, setContextPreferredLanguage handles it
        } catch (error: any) {
            console.error("Header: Failed to update user language preference via API:", error);
            // 5. Revert optimistic update if API call fails
            setContextPreferredLanguage(oldLanguage);
            console.log(`Header: Reverted language back to ${oldLanguage}`);
            // 6. Show error in the *original* language
            toast.error(t('errorMessageTemplate', oldLanguage, { message: `Failed to save language preference: ${error.message}` }));
        }
    }, [user, token, setContextPreferredLanguage]); // Removed updateContextUser as it's redundant


    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
         {toggleSidebar && (
            <Button size="icon" variant="outline" className="sm:hidden" onClick={toggleSidebar}>
                <Menu className="h-5 w-5" /> <span className="sr-only">Toggle Menu</span>
            </Button>
         )}
          {/* Page Title with Icon */}
         <div className="flex flex-1 items-center gap-2">
             <CurrentPageIcon className={cn("h-5 w-5 text-muted-foreground")} />
             <h1 className="text-xl font-semibold">{currentPageTitle}</h1>
         </div>

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
                    {t('headerSignedInAs', preferredLanguage)} <span className='font-medium'>{user?.login}</span> ({user?.role})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* --- Language Submenu --- */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Languages className="mr-2 h-4 w-4" />
                        {/* Use translated label */}
                        <span>{t('languageLabel', preferredLanguage)} ({preferredLanguage.toUpperCase()})</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup
                                value={preferredLanguage} // Bind value to context state
                                onValueChange={(value) => handleLanguageChange(value as AppSupportedLanguage)}
                            >
                                {appSupportedLanguages.map(lang => (
                                    <DropdownMenuRadioItem key={lang} value={lang}>
                                        {lang === 'en' ? 'English (EN)' : lang === 'pl' ? 'Polski (PL)' : lang.toUpperCase()}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                {/* --- End Language Submenu --- */}
                <DropdownMenuItem onSelect={() => setIsChangePasswordOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('headerChangePassword', preferredLanguage)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className='text-destructive focus:text-destructive focus:bg-destructive/10'>
                    <LogOut className="mr-2 h-4 w-4" /> {t('headerLogout', preferredLanguage)}
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