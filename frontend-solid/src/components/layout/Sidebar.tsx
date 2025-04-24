import { Component, For, Show } from 'solid-js'; // Added Show
// Replaced NavLink with A and added useMatch for active state logic
import { A, useNavigate, useLocation, useMatch } from '@solidjs/router';
import { useAuth } from '@/context/AuthContext';
import { Icon, IconName } from '@/components/shared/Icon';
import { Button } from '@/components/ui/Button';
import styles from './Sidebar.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

interface NavItem {
    path: string;
    label: string;
    icon: IconName;
    exact?: boolean;
    adminOnly?: boolean;
}

const Sidebar: Component = () => {
    const [authState, { logout }] = useAuth();
    const navigate = useNavigate(); // Keep useNavigate
    const location = useLocation();

    const isAdmin = () => authState.user?.role === 'admin';

    const handleLogout = async () => {
        await logout();
        // Redirect handled by App/ProtectedRoute
    };

    const navItems: NavItem[] = [
        { path: '/', label: 'Dashboard', icon: 'LayoutDashboard', exact: true },
        { path: '/archive', label: 'Archive', icon: 'Archive' },
        { path: '/signatures', label: 'Signatures', icon: 'PenTool' },
        { path: '/tags', label: 'Tags', icon: 'Tag' },
        { path: '/notes', label: 'Notes', icon: 'StickyNote' },
        { path: '/admin', label: 'Admin', icon: 'ShieldAlert', adminOnly: true },
    ];

    const filteredNavItems = () => navItems.filter(item => !item.adminOnly || isAdmin());

    // Function to determine if a NavLink should be active using useMatch
    const isLinkActive = (path: string, exact?: boolean) => {
        const match = useMatch(() => path); // Use match function
        // For exact match, check if match exists and path is exactly the same (ignoring trailing slash perhaps)
        if (exact) {
            // Normalize paths to remove trailing slashes before comparison
            const currentPathname = location.pathname.replace(/\/$/, "");
            const itemPath = path.replace(/\/$/, "");
            return !!match() && currentPathname === itemPath;
        }
        // For non-exact match, just check if match exists (covers parent paths)
        return !!match();
    };

    return (
        <aside class={styles.sidebarContainer}>
            <div class={styles.sidebarHeader}>
                <h2 class={styles.sidebarTitle}>JezArch Solid</h2>
                <Show when={authState.user}>
                    {(user) => ( // user() is the accessor for the user object
                         <span class={styles.sidebarUserInfo} title={`Logged in as: ${user().login} (${user().role})`}>
                            {user().login} ({user().role})
                        </span>
                    )}
                </Show>
            </div>

            {/* Use basic div for scroll area with CSS module styles */}
            <div class={styles.scrollArea}>
                <nav class={styles.navList}>
                    <For each={filteredNavItems()}>
                        {(item) => (
                            <A
                                href={item.path}
                                // Use cn to apply classes conditionally based on active state
                                class={cn(
                                    styles.navLinkBase,
                                    isLinkActive(item.path, item.exact) ? styles.navLinkActive : styles.navLinkInactive
                                )}
                                // 'end' prop is not used with <A>, manual active check needed
                            >
                                <Icon name={item.icon} class={styles.navLinkIcon} />
                                {item.label}
                            </A>
                        )}
                    </For>
                </nav>
            </div>

            <div class={styles.sidebarFooter}>
                <Button
                    variant="outline"
                    class={styles.logoutButton} // Apply specific class
                    onClick={handleLogout}
                >
                    <Icon name="LogOut" class={styles.navLinkIcon} />
                    Logout
                </Button>
            </div>
        </aside>
    );
};

export default Sidebar;