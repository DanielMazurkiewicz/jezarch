import { Component, Show } from 'solid-js'; // Added Show
import { useLocation, useNavigate } from '@solidjs/router';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/shared/Icon';
import styles from './Header.module.css'; // Import CSS Module (Typed)
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils'; // Import cn

// Function to derive title from pathname (simple version)
const getTitleFromPath = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    // Handle specific cases
    if (segments[0] === 'signatures' && segments[2] === 'elements') {
        return 'Signature Elements'; // More specific title
    }
    const title = segments[0].replace(/-/g, ' ');
    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
};

interface HeaderProps {
    toggleSidebar?: () => void; // For potential mobile toggle
}

const Header: Component<HeaderProps> = (props) => {
    const [authState, { logout }] = useAuth();
    const location = useLocation();
    const navigate = useNavigate(); // Still potentially useful for explicit navigation

    const currentPageTitle = () => getTitleFromPath(location.pathname);

    const handleLogout = async () => {
        await logout();
        // AuthProvider change triggers route protection, navigation should be handled there
    };

    return (
        <header class={styles.headerContainer}>
            {/* Mobile Menu Button (Placeholder) */}
            <Show when={props.toggleSidebar}>
                <Button
                    variant="outline"
                    size="icon"
                    class={styles.mobileMenuButton}
                    onClick={props.toggleSidebar}
                    aria-label="Toggle Menu"
                >
                    <Icon name="Menu" />
                </Button>
            </Show>

            {/* Page Title */}
            <h1 class={styles.pageTitle}>{currentPageTitle()}</h1>

            {/* Right Section */}
            <div class={styles.rightSection}>
                <Show when={authState.user}>
                    {(user) => ( // Use accessor
                        <span class={styles.userInfo} title={`User: ${user().login} | Role: ${user().role}`}>
                            {user().login} ({user().role})
                        </span>
                    )}
                </Show>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleLogout}
                    aria-label="Logout"
                    title="Logout"
                    class={styles.headerButton}
                >
                    <Icon name="LogOut" />
                </Button>
            </div>
        </header>
    );
};

export default Header;