import van, { State } from "vanjs-core"; // Import State
import { authStore } from "@/state/authStore";
import { navigate, useLocation } from "@/lib/router";
import { Button } from "@/components/ui/Button"; // Assuming Button component exists
import * as icons from "@/components/ui/icons"; // Assuming icons library
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";

const { header, h1, div, span, button } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// --- Styles ---
const headerStyle = style([
    styles.sticky, // Make header sticky
    styles.top0,
    styles.z30, // Ensure header is above content but below modals
    styles.flex,
    styles.h14, // Fixed height
    styles.itemsCenter,
    styles.gap4,
    styles.borderB,
    styles.bgBackground,
    styles.px4,
    {
        '@media': {
            'screen and (min-width: 640px)': { // sm breakpoint
                 // Reset sticky, height, border for larger screens if needed by design
                 // position: 'static', // Example: remove stickiness
                 // height: 'auto', // Example: auto height
                 // borderBottomWidth: '0', // Example: remove border
                 backgroundColor: 'transparent', // Make transparent on larger screens
                 paddingLeft: themeVars.spacing.xl, // Use theme variable equivalent to px-6
                 paddingRight: themeVars.spacing.xl, // Use theme variable equivalent to px-6
            }
        }
    }
]);

const titleStyle = style([
    styles.textXl,
    styles.fontSemibold,
    styles.flexGrow, // Take up available space
]);

const userInfoStyle = style([
    styles.textSm,
    styles.textMutedForeground,
    {
        display: 'none', // Hidden by default
         '@media': {
             'screen and (min-width: 640px)': { // sm breakpoint
                 display: 'inline', // Show on small screens+
             }
         }
    }
]);

const mobileMenuButtonStyle = style({
     '@media': {
         'screen and (min-width: 640px)': { // sm breakpoint
             display: 'none', // Hide on small screens+
         }
     }
});

// --- Helper ---
const getTitleFromPath = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    // Improved title generation: capitalize first letter, replace dashes/underscores
    const title = segments[0].replace(/[-_]/g, ' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
};


// --- Component ---
interface HeaderProps {
    toggleSidebar?: () => void; // Optional callback for mobile
}

const Header = ({ toggleSidebar }: HeaderProps = {}) => {
    const { path: currentPath } = useLocation();
    const { logout, user } = authStore;

    const handleLogout = async () => {
        // Add a loading indicator or disable button during logout?
        await logout();
        // Navigation is handled by the authStore logout action
    };

    // Derive title from current path state
    const currentPageTitle = van.derive(() => getTitleFromPath(currentPath.val));

    return header({ class: headerStyle },
        // Mobile Menu Button (optional)
        toggleSidebar ? Button({
            variant: "outline",
            size: "icon",
            class: mobileMenuButtonStyle,
            onclick: toggleSidebar,
            title: "Toggle Menu",
            'aria-label': "Toggle Menu"
            },
            icons.MenuIcon(),
            span({ class: styles.srOnly }, "Toggle Menu")
        ) : null,

        // Page Title
        h1({ class: titleStyle }, () => currentPageTitle.val), // Use derived state

        // Right Aligned Items
        div({ class: `${styles.flex} ${styles.itemsCenter} ${styles.gap2}` },
            // User Info (conditionally rendered based on state)
            () => user.val ? span({ class: userInfoStyle }, `${user.val.login} (${user.val.role})`) : null,

            // Logout Button
            Button({
                variant: "outline",
                size: "icon",
                onclick: handleLogout,
                title: "Logout",
                'aria-label': "Logout"
                },
                icons.LogOutIcon(), // Use icon component
                span({ class: styles.srOnly }, "Logout")
            )
        )
    );
};

export default Header;