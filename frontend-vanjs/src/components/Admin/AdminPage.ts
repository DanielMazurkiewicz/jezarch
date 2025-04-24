import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
// Import Admin Tab Components (assuming they exist)
import UserManagement from "./UserManagement";
import SettingsForm from "./SettingsForm";
import SslConfig from "./SslConfig";
import LogViewer from "./LogViewer";
// Basic Tab Implementation
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/Tabs"; // Assuming Tabs component
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";

const { div, h1, p } = van.tags;

// --- Styles ---
const pageHeaderStyle = style([
    styles.flex, styles.flexCol, styles.gap4,
    // Use direct media query as sm: prefix helpers aren't available in VE directly
    {
        '@media': {
            'screen and (min-width: 640px)': { // sm breakpoint
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }
        }
    }
]);

// --- Component ---
const AdminPage = () => {
    const { user } = authStore;
    const isAdmin = van.derive(() => user.val?.role === 'admin');
    const activeTab = van.state("users"); // Default to users tab

    // --- Render Logic ---
    return div({ class: styles.spaceY6 },
        // Check Admin Role (Render Access Denied or Admin Content)
        van.derive(() => { // Wrap conditional logic in derive for reactivity
            if (!isAdmin.val) {
                // Show Access Denied Card
                return Card({ class: styles.borderDestructive }, // Use destructive border
                    CardHeader(
                        CardTitle({ class: styles.textDestructive }, "Access Denied")
                    ),
                    CardContent(
                        p("You do not have the necessary permissions to view this page.")
                    )
                );
            } else {
                // Show Admin Panel Content
                return [ // Return array for multiple elements
                    // Page Header
                    div({ class: pageHeaderStyle },
                        div(
                            h1({ class: styles.text2xl }, "Admin Panel"),
                            p({ class: styles.textMutedForeground }, "Manage application users, settings, and logs.")
                        ),
                        // Placeholder for global admin actions
                    ),
                    // Tabs Component - Pass state and handler
                    Tabs({ value: activeTab, onValueChange: v => activeTab.val = v },
                         // Wrap TabList for overflow handling
                         div({ class: `${styles.overflowXAuto} ${styles.pb1} ${styles.borderB}` },
                            TabList({ class: `${styles.inlineFlex} w-auto min-w-full` }, // Ensure list doesn't shrink
                                // Pass required props to TabTrigger
                                TabTrigger({ value: "users", activeValueState: activeTab, onValueChange: v => activeTab.val = v }, "User Management"),
                                TabTrigger({ value: "settings", activeValueState: activeTab, onValueChange: v => activeTab.val = v }, "App Settings"),
                                TabTrigger({ value: "ssl", activeValueState: activeTab, onValueChange: v => activeTab.val = v }, "SSL Config"),
                                TabTrigger({ value: "logs", activeValueState: activeTab, onValueChange: v => activeTab.val = v }, "System Logs")
                            )
                         ),
                         // Tab Content Areas (rendered based on activeTab state)
                         // Add margin top for spacing below tabs
                         div({ class: styles.mt6 }, // Container for content with margin
                            // Use derive to conditionally render content based on active tab
                             van.derive(() => {
                                 switch(activeTab.val) {
                                     case "users": return TabContent({ value: "users" }, UserManagement());
                                     case "settings": return TabContent({ value: "settings" }, SettingsForm());
                                     case "ssl": return TabContent({ value: "ssl" }, SslConfig());
                                     case "logs": return TabContent({ value: "logs" }, LogViewer());
                                     default: return null;
                                 }
                             })
                         ) // End content container
                    ) // End Tabs
                ]; // End Admin Panel Content Array
            }
        }) // End Conditional Admin Check Derive
    ); // End Main Div
};

export default AdminPage;