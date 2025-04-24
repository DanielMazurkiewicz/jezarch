import { Component, createResource, For, Show, createSignal } from 'solid-js';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { User, UserRole } from '../../../../backend/src/functionalities/user/models';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
// import { useNotifications } from '@/context/NotificationContext'; // TODO: Use notifications
import { cn } from '@/lib/utils';
import styles from './UserManagement.module.css'; // Import CSS Module (Typed)

const UserManagement: Component = () => {
    const [authState] = useAuth();
    const [updateError, setUpdateError] = createSignal<string | null>(null);
    const [updatingLogin, setUpdatingLogin] = createSignal<string | null>(null);
    // const { addNotification } = useNotifications(); // TODO: Inject notification hook

    // Resource to fetch users
    const [usersResource, { refetch: refetchUsers, mutate: mutateUsers }] = createResource(
        () => authState.token, // Depends on token
        async (token) => {
            if (!token) return [];
            setUpdateError(null); // Clear previous errors on refetch
            console.log("Fetching users...");
            try {
                const fetched = await api.getAllUsers(token);
                return fetched.sort((a, b) => a.login.localeCompare(b.login));
            } catch (error: any) { // Catch specific error type if possible
                 console.error("Fetch Users error:", error);
                 // TODO: addNotification({ type: 'error', message: `Failed to load users: ${error.message}`});
                 throw error; // Let resource handle error state
            }
        },
        { initialValue: [] }
    );

    const handleRoleChange = async (login: string, newRole: UserRole) => {
        const token = authState.token;
        const adminUser = authState.user;

        if (!token || login === adminUser?.login) {
            // TODO: addNotification({ type: 'warning', message: 'Cannot change own role.' });
            console.warn("Cannot change own role here.");
            return;
        }
        setUpdatingLogin(login);
        setUpdateError(null);
        const originalRole = usersResource()?.find(u => u.login === login)?.role;

        // Optimistic UI update
        mutateUsers(prev => prev?.map(u => u.login === login ? { ...u, role: newRole } : u));

        try {
            await api.updateUserRole(login, newRole, token);
            // TODO: addNotification({ type: 'success', message: `Role updated for ${login}` });
            console.log(`Role updated for ${login} to ${newRole}`);
            // No need to refetch on success with optimistic update
        } catch (err: any) {
            const msg = `Failed to update role for ${login}: ${err.message}`;
            setUpdateError(msg);
            // TODO: addNotification({ type: 'error', message: msg });
            console.error(msg);
            // Revert optimistic update on error
             if (originalRole) {
                 mutateUsers(prev => prev?.map(u => u.login === login ? { ...u, role: originalRole } : u));
            }
        } finally {
            setUpdatingLogin(null);
        }
    };

    return (
        <Card class={styles.userManagementCard}>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage user roles. You cannot change your own role here.</CardDescription>
            </CardHeader>
            <CardContent>
                 {/* Display fetch error */}
                 <Show when={usersResource.error}>
                    <ErrorDisplay message={`Failed to load users: ${usersResource.error?.message}`} class={styles.errorContainer} />
                 </Show>
                 {/* Display update error */}
                 <Show when={updateError()}><ErrorDisplay message={updateError() ?? 'Unknown update error'} class={styles.errorContainer} /></Show> {/* Ensure message is string */}

                 {/* Loading or Table */}
                 <Show when={!usersResource.loading}
                    fallback={<div class={styles.loadingContainer}><LoadingSpinner size="lg"/></div>}
                 >
                     <Show when={usersResource() && usersResource()!.length > 0}
                         fallback={<p class={styles.emptyStateText}>No users found.</p>}
                     >
                        <div class={styles.userTableContainer}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Login</TableHead>
                                        <TableHead>User ID</TableHead>
                                        <TableHead style={{ width: '240px' }}>Role</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <For each={usersResource()}>
                                        {(user) => {
                                            const isUpdatingThisUser = () => updatingLogin() === user.login;
                                            const disableSelect = () => user.login === authState.user?.login || isUpdatingThisUser();
                                            return (
                                                <TableRow>
                                                    <TableCell class="font-medium">{user.login}</TableCell>
                                                    <TableCell class={styles.userIdText}>{user.userId}</TableCell>
                                                    <TableCell class={styles.roleSelectCell}>
                                                        <Select
                                                            value={user.role ?? 'regular_user'} // Provide default if role is null
                                                            onChange={(newRole) => handleRoleChange(user.login, newRole as UserRole)}
                                                            disabled={disableSelect()}
                                                            id={`role-select-${user.login}`} // Add unique ID
                                                        >
                                                             <SelectTrigger
                                                                class={styles.roleSelectTrigger}
                                                                aria-label={`Change role for ${user.login}`}
                                                                disabled={disableSelect()}
                                                            >
                                                                 {/* Use SelectValue for proper placeholder handling */}
                                                                 <SelectValue />
                                                             </SelectTrigger>
                                                            <SelectContent>
                                                                 <SelectItem value='admin'>Admin</SelectItem>
                                                                 <SelectItem value='regular_user'>Regular User</SelectItem>
                                                            </SelectContent>
                                                         </Select>
                                                        {/* Show spinner next to select while updating */}
                                                        <Show when={isUpdatingThisUser()}><LoadingSpinner size="sm" /></Show>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }}
                                    </For>
                                </TableBody>
                            </Table>
                        </div>
                     </Show>
                 </Show>
            </CardContent>
        </Card>
    );
};

export default UserManagement;