import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select"; // Use basic Select
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { User, UserRole } from "../../../../backend/src/functionalities/user/models";
// Removed toast import

const { div, p } = van.tags;

// --- Styles ---
const spinnerContainerStyle = style([styles.flex, styles.justifyCenter, styles.py6]);
const tableContainerStyle = style([styles.border, styles.roundedLg, styles.overflowHidden]);
const roleSelectContainerStyle = style([styles.flex, styles.itemsCenter, styles.spaceX2]);
const updatingSelectStyle = style({ opacity: 0.7 }); // Style for select while updating

// --- Component ---
const UserManagement = () => {
    const { token, user: adminUser } = authStore;

    // --- State ---
    const users = van.state<Omit<User, 'password'>[]>([]);
    const isLoading = van.state(true);
    const fetchError = van.state<string | null>(null);
    const updateError = van.state<string | null>(null);
    const updatingLogin = van.state<string | null>(null); // Track user being updated

    // --- Data Fetching ---
    const fetchUsers = async () => {
        if (!token.val) {
            isLoading.val = false;
            fetchError.val = "Authentication token not found.";
            return;
        }
        isLoading.val = true;
        fetchError.val = null;
        updateError.val = null;
        try {
            const fetchedUsers = await api.getAllUsers(token.val);
            users.val = fetchedUsers.sort((a, b) => a.login.localeCompare(b.login));
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch users';
            fetchError.val = msg;
            users.val = []; // Clear users on error
        } finally {
            isLoading.val = false;
        }
    };

    // Fetch on mount and when token changes (using derive for reactivity)
    van.derive(() => {
        token.val; // Depend on token
        fetchUsers();
    });


    // --- Event Handlers ---
    const handleRoleChange = async (login: string, newRole: UserRole) => {
        if (!token.val || login === adminUser.val?.login) {
             alert("Cannot change your own role via this interface.");
             // Visually reverting select might be complex with native select,
             // rely on disabled state for prevention.
             return;
        }

        const originalUserIndex = users.val.findIndex(u => u.login === login);
        if (originalUserIndex === -1) return; // Should not happen
        const originalRole = users.val[originalUserIndex].role;

        updatingLogin.val = login;
        updateError.val = null;

        // Optimistic UI Update
        const currentUsers = [...users.val]; // Create a copy
        currentUsers[originalUserIndex] = { ...currentUsers[originalUserIndex], role: newRole };
        users.val = currentUsers; // Update state

        try {
            await api.updateUserRole(login, newRole, token.val);
            // alert(`Role for user "${login}" updated to ${newRole}.`); // Simple feedback
        } catch (err: any) {
            const msg = `Failed to update role for ${login}: ${err.message}`;
            updateError.val = msg;
            alert(msg); // Simple feedback

            // Revert optimistic update on error
             const revertedUsers = [...users.val]; // Get potentially updated state
             const userToRevertIndex = revertedUsers.findIndex(u => u.login === login);
             if (userToRevertIndex !== -1 && originalRole) { // Ensure user exists and original role is known
                 revertedUsers[userToRevertIndex] = { ...revertedUsers[userToRevertIndex], role: originalRole };
                 users.val = revertedUsers; // Update state back
             }
        } finally {
            updatingLogin.val = null;
        }
    };

    // --- Available Roles ---
    const roleOptions = [
        { value: "admin", label: "Admin" },
        { value: "regular_user", label: "Regular User" },
    ];

    // --- Render ---
    return Card( // Removed forced white background
        CardHeader(
            CardTitle("User Management"),
            CardDescription("View and manage user roles. You cannot change your own role here.")
        ),
        CardContent(
            // Display errors
            () => fetchError.val ? ErrorDisplay({ message: fetchError.val, class: styles.mb4 }) : null, // Added mb4
            () => updateError.val ? ErrorDisplay({ message: updateError.val, class: styles.mb4 }) : null, // Added mb4

            // Loading State
            () => isLoading.val ? div({ class: spinnerContainerStyle }, LoadingSpinner({})) : null, // Pass empty props

            // User Table (conditionally rendered)
            () => (!isLoading.val && !fetchError.val && users.val.length > 0) ? div({ class: tableContainerStyle },
                Table(
                    TableHeader(
                        TableRow(
                            TableHead("Login"),
                            TableHead("User ID"),
                            TableHead({ class: 'w-[240px]' }, "Role")
                        )
                    ),
                    TableBody(
                        // Reactively render rows based on users state
                        van.derive(() => users.val.map((user) => // Wrap map in derive
                            TableRow({ key: user.userId },
                                TableCell({ class: styles.fontMedium }, user.login),
                                TableCell({ class: `${styles.textSm} ${styles.textMutedForeground}` }, user.userId),
                                TableCell(
                                    div({ class: roleSelectContainerStyle },
                                        // Select component for role change
                                        Select({
                                            value: user.role ?? "", // Bind to user's role
                                            options: roleOptions,
                                            onchange: (e: Event) => handleRoleChange(user.login, (e.target as HTMLSelectElement).value as UserRole),
                                            // Derive disabled state reactively
                                            disabled: () => user.login === adminUser.val?.login || updatingLogin.val === user.login,
                                            // Apply style when updating
                                             class: () => updatingLogin.val === user.login ? updatingSelectStyle : '',
                                            'aria-label': `Change role for ${user.login}`
                                        }),
                                        // Show spinner next to select while updating this user
                                        () => updatingLogin.val === user.login ? LoadingSpinner({ size: "sm" }) : null
                                    )
                                )
                            )
                        )) // End map + derive
                    ) // End TableBody
                ) // End Table
            ) : null, // End Table Container conditional

            // Empty State (conditionally rendered)
            () => (!isLoading.val && !fetchError.val && users.val.length === 0)
                ? p({ class: `${styles.textMutedForeground} ${styles.textCenter} ${styles.py6}` }, "No users found.")
                : null
        ) // End CardContent
    ); // End Card
};

export default UserManagement;