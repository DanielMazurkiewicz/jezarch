import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { User, UserRole } from '../../../../backend/src/functionalities/user/models';
import { toast } from "sonner";

const UserManagement: React.FC = () => {
    const { token, user: adminUser } = useAuth();
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatingLogin, setUpdatingLogin] = useState<string | null>(null);


    const fetchUsers = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        setUpdateError(null); // Clear previous update errors on fetch
        try {
            const fetchedUsers = await api.getAllUsers(token);
            setUsers(fetchedUsers);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch users');
            toast.error(`Failed to fetch users: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (login: string, newRole: UserRole) => {
        if (!token || login === adminUser?.login) {
             toast.warning("Cannot change your own role here.");
             return;
        }
        setUpdatingLogin(login);
        setUpdateError(null);
        const originalRole = users.find(u => u.login === login)?.role; // Store original role for revert

        try {
            // Optimistic UI update
            setUsers(prevUsers =>
                prevUsers.map(u => (u.login === login ? { ...u, role: newRole } : u))
            );

            await api.updateUserRole(login, newRole, token);
            toast.success(`Role for ${login} updated to ${newRole}.`);
            // No need to refetch if optimistic update is used and successful
        } catch (err: any) {
            const msg = `Failed to update role for ${login}: ${err.message}`;
            setUpdateError(msg);
            toast.error(msg);
             // Revert optimistic update on error
            if (originalRole) {
                 setUsers(prevUsers =>
                     prevUsers.map(u => (u.login === login ? { ...u, role: originalRole } : u))
                 );
            }
             // Optionally refetch to be absolutely sure
             // await fetchUsers();
        } finally {
            setUpdatingLogin(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user roles. You cannot change your own role here.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}
                {/* Display fetch error */}
                {error && !isLoading && <ErrorDisplay message={error} />}
                 {/* Display specific update error */}
                {updateError && <ErrorDisplay message={updateError} className='mb-4' />}

                {!isLoading && !error && users.length > 0 && (
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Login</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.userId}>
                                        <TableCell className="font-medium">{user.login}</TableCell>
                                        <TableCell>{user.userId}</TableCell>
                                        <TableCell className="w-[220px]"> {/* Fixed width cell */}
                                            <div className="flex items-center space-x-2">
                                                <Select
                                                    value={user.role}
                                                    onValueChange={(newRole) => handleRoleChange(user.login, newRole as UserRole)}
                                                    disabled={user.login === adminUser?.login || updatingLogin === user.login}
                                                >
                                                    <SelectTrigger className='w-[180px]' aria-label={`Change role for ${user.login}`}>
                                                        <SelectValue placeholder="Change role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="regular_user">Regular User</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {updatingLogin === user.login && <LoadingSpinner size="sm" />}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                 {!isLoading && !error && users.length === 0 && (
                    <p className='text-muted-foreground text-center'>No users found.</p>
                 )}
            </CardContent>
        </Card>
    );
};

export default UserManagement;