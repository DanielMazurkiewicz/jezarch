import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import { navigate, Link } from "@/lib/router";
import { Button } from "@/components/ui/Button";
import * as icons from "@/components/ui/icons";
import { style } from "@vanilla-extract/css";
import * as styles from "@/styles/utils.css";
import { themeVars } from "@/styles/theme.css";

const { aside, div, h2, span, nav, button } = van.tags;

// --- Styles ---
const sidebarStyle = style([
    styles.flex,
    styles.flexCol,
    styles.w64, // Fixed width
    styles.borderR,
    {
        backgroundColor: themeVars.color.sidebar,
        color: themeVars.color.sidebarForeground,
        borderColor: themeVars.color.sidebarBorder,
        // Add transition for potential future hiding/showing animation
        transition: 'transform 0.3s ease-in-out',
        // Example for mobile hiding (needs state and class toggling)
        // '@media': {
        // '(max-width: 639px)': {
        //     position: 'absolute',
        //     transform: 'translateX(-100%)',
        //     height: '100vh',
        //     zIndex: 40, // Below header/modals potentially
        // }
        // }
    }
]);

// Style for when sidebar is open on mobile (example)
// const sidebarOpenStyle = style({
//     '@media': {
//         '(max-width: 639px)': {
//             transform: 'translateX(0)',
//         }
//     }
// });

const sidebarHeaderStyle = style([
    styles.p4,
    styles.borderB,
    { borderColor: themeVars.color.sidebarBorder }
]);

const sidebarTitleStyle = style([styles.textLg, styles.fontSemibold]);

const userInfoStyle = style([
    styles.textSm,
    styles.textMutedForeground, // Using main muted, maybe define sidebar-muted?
    styles.block,
    styles.truncate
]);

const navScrollViewStyle = style([
    styles.flexGrow, // Take remaining space
    styles.px4,
    styles.py2,
    styles.overflowYAuto // Make nav scrollable
]);

const navLinkStyle = style([
    styles.inlineFlex,
    styles.itemsCenter,
    styles.justifyStart,
    styles.wFull,
    styles.px3, // Corresponds to Shadcn's size default
    styles.py2,
    styles.roundedMd,
    styles.textSm,
    styles.fontMedium,
    styles.whitespaceNowrap,
    styles.transitionColors,
    {
        color: 'inherit', // Inherit from sidebar foreground
        ':hover': {
            backgroundColor: themeVars.color.sidebarAccent,
            color: themeVars.color.sidebarAccentForeground,
        },
        ':focus-visible': { // Basic focus style
             outline: `2px solid ${themeVars.color.ring}`,
             outlineOffset: '2px',
        }
    }
]);

const navLinkActiveStyle = style({ // Style for the active link
    backgroundColor: themeVars.color.sidebarAccent,
    color: themeVars.color.sidebarAccentForeground,
    fontWeight: themeVars.font.heading // Example: bolder weight
});

const sidebarFooterStyle = style([
    styles.p4,
    styles.borderT,
    {
        marginTop: 'auto', // Push footer to bottom
        borderColor: themeVars.color.sidebarBorder,
    }
]);

// --- Component ---
const Sidebar = () => {
    const { logout, user } = authStore;
    const isAdmin = van.derive(() => user.val?.role === 'admin');

    const handleLogout = async () => {
        await logout();
        // Navigation handled by store
    };

    const navItems = van.derive(() => [
        { path: '/', label: 'Dashboard', icon: icons.LayoutDashboardIcon, exact: true },
        { path: '/archive', label: 'Archive', icon: icons.ArchiveIcon },
        { path: '/signatures', label: 'Signatures', icon: icons.PenToolIcon },
        { path: '/tags', label: 'Tags', icon: icons.TagIcon },
        { path: '/notes', label: 'Notes', icon: icons.StickyNoteIcon },
        ...(isAdmin.val ? [{ path: '/admin', label: 'Admin', icon: icons.ShieldAlertIcon }] : []),
    ]);

    return aside({ class: sidebarStyle },
        div({ class: sidebarHeaderStyle },
            h2({ class: sidebarTitleStyle }, "JezArch FE"),
            // Display user info using derived state
            () => user.val ? span({ class: userInfoStyle }, `Logged in as: ${user.val.login} (${user.val.role})`) : span({ class: userInfoStyle }, "Not logged in")
        ),

        // Scrollable Nav Area
        div({ class: navScrollViewStyle },
            nav({ class: styles.spaceY2 }, // Use spaceY instead of space-y-1 directly for consistency
                // Use van.derive to render list based on derived state
                () => navItems.val.map(item =>
                    Link({
                            to: item.path,
                            class: navLinkStyle,
                            activeClass: navLinkActiveStyle, // Pass the active class style
                            // Exact matching needed for '/'
                            ...(item.exact && { onclick: (e: Event) => { if (window.location.pathname !== item.path) { Link({to:item.path}).click() } else { e.preventDefault() }} }), // Crude exact matching via click handler modification
                         },
                        item.icon({ class: styles.pr2 }), // Render icon component
                        item.label
                    )
                )
            )
        ),

        // Footer
        div({ class: sidebarFooterStyle },
            Button({ variant: "outline", class: `${styles.wFull} ${styles.justifyStart}`, onclick: handleLogout },
                icons.LogOutIcon({ class: styles.pr2 }), // Render icon component
                "Logout"
            )
        )
    );
};

export default Sidebar;
