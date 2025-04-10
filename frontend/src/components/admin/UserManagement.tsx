import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Button is not used here anymore, can be removed if not needed elsewhere
// import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { User, UserRole } from '../../../../backend/src/functionalities/user/models';
import { toast } from "sonner"; // For feedback messages
import { cn } from '@/lib/utils'; // Import cn for conditional classes

const UserManagement: React.FC = () => {
    const { token, user: adminUser } = useAuth(); // Get current admin user info
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Start loading initially
    const [fetchError, setFetchError] = useState<string | null>(null); // Error during initial fetch
    const [updateError, setUpdateError] = useState<string | null>(null); // Error during role update
    const [updatingLogin, setUpdatingLogin] = useState<string | null>(null); // Track which user is being updated


    // Fetch all users on mount
    const fetchUsers = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            setFetchError("Authentication token not found.");
            return;
        }
        setIsLoading(true);
        setFetchError(null);
        setUpdateError(null); // Clear previous update errors on refresh
        try {
            const fetchedUsers = await api.getAllUsers(token);
            // Sort users alphabetically by login
            setUsers(fetchedUsers.sort((a, b) => a.login.localeCompare(b.login)));
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch users';
            setFetchError(msg);
            toast.error(`Fetch users failed: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Handle role change for a user
    const handleRoleChange = async (login: string, newRole: UserRole) => {
        // Prevent admin from changing their own role here
        if (!token || login === adminUser?.login) {
             toast.warning("Cannot change your own role via this interface.");
             // Revert the select dropdown visually if needed (though disabled should prevent this)
             // This requires tracking original value or finding it again if not disabled.
             return;
        }
        setUpdatingLogin(login); // Indicate which user is being updated
        setUpdateError(null);
        const originalRole = users.find(u => u.login === login)?.role; // Store original role for potential revert

        try {
            // Optimistic UI update: Change role in local state immediately
            setUsers(prevUsers =>
                prevUsers.map(u => (u.login === login ? { ...u, role: newRole } : u))
            );

            // Call API to update role
            await api.updateUserRole(login, newRole, token);
            toast.success(`Role for user "${login}" updated to ${newRole}.`);
            // No need to refetch if optimistic update is successful
        } catch (err: any) {
            const msg = `Failed to update role for ${login}: ${err.message}`;
            setUpdateError(msg); // Show specific update error
            toast.error(msg);
             // Revert optimistic update on error
            if (originalRole) {
                 setUsers(prevUsers =>
                     prevUsers.map(u => (u.login === login ? { ...u, role: originalRole } : u))
                 );
            }
             // Optionally refetch all users to ensure consistency after error
             // await fetchUsers();
        } finally {
            setUpdatingLogin(null); // Clear updating indicator
        }
    };

    // Render the user management table within a Card
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage user roles. You cannot change your own role here.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Display fetch error if occurred during initial load */}
                {fetchError && !isLoading && <ErrorDisplay message={fetchError} className='mb-4' />}
                 {/* Display specific update error if occurred */}
                {updateError && <ErrorDisplay message={updateError} className='mb-4' />}

                {/* Loading State */}
                {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}

                {/* User Table */}
                {!isLoading && !fetchError && users.length > 0 && (
                    // Remove border/rounded from div if table is directly in CardContent
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Login</TableHead>
                                    <TableHead>User ID</TableHead>
                                    {/* Slightly wider role column for Select + Spinner */}
                                    <TableHead className='w-[240px]'>Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.userId}>
                                        <TableCell className="font-medium">{user.login}</TableCell>
                                        {/* Display User ID */}
                                        <TableCell className='text-sm text-muted-foreground'>{user.userId}</TableCell>
                                        <TableCell>
                                            {/* Role Selector - Disable for self and while updating */}
                                            <div className="flex items-center space-x-2">
                                                <Select
                                                    value={user.role}
                                                    // Update role on change
                                                    onValueChange={(newRole) => handleRoleChange(user.login, newRole as UserRole)}
                                                    // Disable select for the currently logged-in admin or if this user is being updated
                                                    disabled={user.login === adminUser?.login || updatingLogin === user.login}
                                                >
                                                    <SelectTrigger
                                                        // Apply styling for disabled/loading state
                                                        className={cn('w-[180px]', updatingLogin === user.login && 'opacity-70')}
                                                        aria-label={`Change role for ${user.login}`}
                                                    >
                                                        <SelectValue placeholder="Change role..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {/* Define available roles */}
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="regular_user">Regular User</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {/* Show spinner next to select while updating */}
                                                {updatingLogin === user.login && <LoadingSpinner size="sm" />}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                 {/* Empty State */}
                 {!isLoading && !fetchError && users.length === 0 && (
                    <p className='text-muted-foreground text-center py-6'>No users found.</p>
                 )}
            </CardContent>
        </Card>
    );
};

export default UserManagement;