import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setPasswordSchema, SetPasswordFormData, updateUserRoleSchema } from '@/lib/zodSchemas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import TagSelector from '@/components/shared/TagSelector'; // Import TagSelector
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
// Updated UserRole import - User now potentially includes assignedTags
import type { User, UserRole } from '../../../../backend/src/functionalities/user/models';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { KeyRound, Ban, Tags } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip

const UserManagement: React.FC = () => {
    const { token, user: adminUser } = useAuth();
    // User type now potentially includes assignedTags
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatingLogin, setUpdatingLogin] = useState<string | null>(null);
    const [settingPasswordLogin, setSettingPasswordLogin] = useState<string | null>(null);
    const [isSetPasswordDialogOpen, setIsSetPasswordDialogOpen] = useState(false);
    const [targetUserForPassword, setTargetUserForPassword] = useState<Omit<User, 'password'> | null>(null);

    const [isAssignTagsDialogOpen, setIsAssignTagsDialogOpen] = useState(false);
    const [targetUserForTags, setTargetUserForTags] = useState<Omit<User, 'password'> | null>(null);
    const [assignedTags, setAssignedTags] = useState<number[]>([]);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);

    const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPasswordForm, formState: { errors: passwordErrors } } = useForm<SetPasswordFormData>({
        resolver: zodResolver(setPasswordSchema), defaultValues: { password: '' },
    });

    // --- Fetching Data ---
    const fetchUsers = useCallback(async () => {
        if (!token) { setIsLoading(false); setFetchError("Authentication token not found."); return; }
        setIsLoading(true); setFetchError(null); setUpdateError(null);
        try {
            // API now returns assignedTags for 'user' roles
            const fetchedUsers = await api.getAllUsers(token);
            setUsers(fetchedUsers.sort((a, b) => a.login.localeCompare(b.login)));
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch users'; setFetchError(msg); toast.error(`Fetch users failed: ${msg}`);
        } finally { setIsLoading(false); }
    }, [token]);

    const fetchAvailableTags = useCallback(async () => {
        if (!token) return;
        setIsLoadingTags(true);
        try {
            const tags = await api.getAllTags(token);
            setAvailableTags(tags.sort((a, b) => a.name.localeCompare(b.name))); // Sort available tags
        } catch (err) {
            toast.error("Failed to load available tags for assignment.");
            console.error("Failed to load available tags:", err);
        } finally { setIsLoadingTags(false); }
    }, [token]);

    useEffect(() => { fetchUsers(); fetchAvailableTags(); }, [fetchUsers, fetchAvailableTags]);

    // --- Handlers ---
    const handleRoleChange = useCallback(async (login: string, newRole: UserRole | null) => {
        if (!token || login === adminUser?.login) { toast.warning("Cannot change your own role."); return; }
        setUpdatingLogin(login); setUpdateError(null);
        const originalUser = users.find(u => u.login === login);
        if (!originalUser) return; // Safety check

        const originalRole = originalUser.role;
        try {
            // Optimistic UI update
            setUsers(prev => prev.map(u => (u.login === login ? { ...u, role: newRole, assignedTags: newRole === 'user' ? u.assignedTags : undefined } : u)));
            await api.updateUserRole(login, newRole, token);
            const roleText = newRole === null ? 'disabled (No Role)' : newRole === 'user' ? 'User (Restricted)' : newRole === 'employee' ? 'Employee' : 'Admin';
            toast.success(`Role/Status for "${login}" updated to ${roleText}.`);

            // If changed TO 'user', open tag assignment dialog AFTER successful role update
            // Fetch the updated user details to ensure we have the userId for tag assignment
             if (newRole === 'user') {
                 const updatedUser = await api.getUserByLogin(login, token); // Fetch fresh user data
                 if(updatedUser) {
                     openAssignTagsDialog(updatedUser);
                 } else {
                     toast.error("Failed to fetch updated user details for tag assignment.");
                 }
             } else {
                 // Refresh the user list to ensure assignedTags field is correctly updated (removed)
                 fetchUsers();
             }
        } catch (err: any) {
            const msg = `Failed to update role for ${login}: ${err.message}`; setUpdateError(msg); toast.error(msg);
            // Revert UI on error
            setUsers(prev => prev.map(u => (u.login === login ? { ...u, role: originalRole, assignedTags: originalRole === 'user' ? originalUser.assignedTags : undefined } : u)));
        } finally { setUpdatingLogin(null); }
    }, [token, adminUser?.login, users, fetchUsers]); // Added fetchUsers dependency

    const openSetPasswordDialog = (userToSet: Omit<User, 'password'>) => {
        setTargetUserForPassword(userToSet);
        resetPasswordForm({ password: '' });
        setUpdateError(null);
        setIsSetPasswordDialogOpen(true);
    };

    const onSetPasswordSubmit = async (data: SetPasswordFormData) => {
        if (!token || !targetUserForPassword) return;
        setSettingPasswordLogin(targetUserForPassword.login);
        setUpdateError(null);
        try {
            await api.adminSetUserPassword(targetUserForPassword.login, data.password, token);
            toast.success(`Password for user "${targetUserForPassword.login}" has been set.`);
            setIsSetPasswordDialogOpen(false);
            setTargetUserForPassword(null);
        } catch (err: any) {
            const msg = `Failed to set password for ${targetUserForPassword.login}: ${err.message}`;
            setUpdateError(msg);
            toast.error(msg);
        } finally {
            setSettingPasswordLogin(null);
        }
    };

    const openAssignTagsDialog = useCallback(async (userToAssign: Omit<User, 'password'>) => {
        if (userToAssign.role !== 'user') {
            toast.info("Tags can only be assigned to users with the 'user' role.");
            return;
        }
        setTargetUserForTags(userToAssign);
        setUpdateError(null);
        setIsLoadingTags(true);
        // Use tags already fetched for the user list if available, otherwise fetch fresh
        const currentTags = userToAssign.assignedTags?.map(t => t.tagId!) ?? [];
        setAssignedTags(currentTags);
        setIsAssignTagsDialogOpen(true);
        setIsLoadingTags(false); // Assume tags are loaded or use cached

        // Optional: Refetch just in case state is stale (uncomment if needed)
        // if (!token) return;
        // try {
        //     const currentTagsData = await api.getAssignedTagsForUser(userToAssign.login, token);
        //     setAssignedTags(currentTagsData.map(t => t.tagId!));
        //     setIsAssignTagsDialogOpen(true);
        // } catch (err: any) { /* ... error handling ... */ }
        // finally { setIsLoadingTags(false); }

    }, [token]);

    const handleAssignTagsSave = async () => {
        if (!token || !targetUserForTags) return;
        setUpdatingLogin(targetUserForTags.login);
        setUpdateError(null);
        try {
            await api.assignTagsToUser(targetUserForTags.login, assignedTags, token);
            toast.success(`Tags assigned successfully to ${targetUserForTags.login}.`);
            setIsAssignTagsDialogOpen(false);
            setTargetUserForTags(null);
            fetchUsers(); // Refresh user list to show updated tags
        } catch (err: any) {
            const msg = `Failed to assign tags: ${err.message}`;
            setUpdateError(msg);
            toast.error(msg);
        } finally {
            setUpdatingLogin(null);
        }
    };

    const getRoleDisplay = (role: UserRole | null): React.ReactNode => {
        if (role === 'admin') return <Badge variant="default">Admin</Badge>;
        if (role === 'employee') return <Badge variant="secondary">Employee</Badge>;
        if (role === 'user') return <Badge variant="outline" className="text-blue-700 border-blue-300">User (Restricted)</Badge>; // Custom style for user
        return <Badge variant="outline" className='border-dashed text-muted-foreground'>No Role</Badge>;
    };

    return (
        <TooltipProvider delayDuration={150}> {/* Wrap table for Tooltips */}
            <Card className="bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user roles and access. 'Employee' has general access, 'User' has restricted access based on assigned tags.</CardDescription>
                </CardHeader>
                <CardContent>
                    {fetchError && !isLoading && <ErrorDisplay message={fetchError} className='mb-4' />}
                    {updateError && !isLoading && <ErrorDisplay message={updateError} className='mb-4' />}
                    {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}

                    {!isLoading && !fetchError && users.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Login</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Assigned Tags</TableHead> {/* New Header */}
                                        <TableHead className="text-right w-[150px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => {
                                        const isSelf = user.login === adminUser?.login;
                                        const isProcessing = updatingLogin === user.login || settingPasswordLogin === user.login;

                                        return (
                                            <TableRow key={user.userId} className={cn(isProcessing && "opacity-50")}>
                                                <TableCell className="font-medium">{user.login}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <Select
                                                            value={user.role === null ? 'null' : user.role}
                                                            onValueChange={(value) => handleRoleChange(user.login, value === 'null' ? null : value as UserRole)}
                                                            disabled={isSelf || isProcessing}
                                                        >
                                                            <SelectTrigger className={cn('w-[160px] h-9', updatingLogin === user.login && 'opacity-70')} aria-label={`Change role for ${user.login}`}>
                                                                <SelectValue placeholder="Change role...">{getRoleDisplay(user.role)}</SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                                <SelectItem value="employee">Employee</SelectItem>
                                                                <SelectItem value="user">User (Restricted)</SelectItem>
                                                                <SelectItem value="null"><span className='text-muted-foreground italic flex items-center gap-1'><Ban className='h-3 w-3'/> No Role / Disabled</span></SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {updatingLogin === user.login && !isAssignTagsDialogOpen && <LoadingSpinner size="sm" />}
                                                    </div>
                                                </TableCell>
                                                {/* Assigned Tags Cell */}
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {user.role === 'user' ? (
                                                            user.assignedTags && user.assignedTags.length > 0 ? (
                                                                user.assignedTags.slice(0, 3).map(tag => (
                                                                    <Badge key={tag.tagId} variant="outline" className='font-normal'>{tag.name}</Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">None assigned</span>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                        {user.role === 'user' && user.assignedTags && user.assignedTags.length > 3 && (
                                                             <Tooltip>
                                                                 <TooltipTrigger asChild>
                                                                     <Badge variant="secondary" className='cursor-default'>+{user.assignedTags.length - 3} more</Badge>
                                                                 </TooltipTrigger>
                                                                 <TooltipContent className="max-w-xs break-words">
                                                                     {user.assignedTags.slice(3).map(t => t.name).join(', ')}
                                                                 </TooltipContent>
                                                             </Tooltip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    {user.role === 'user' && !isSelf && (
                                                         <Button variant="ghost" size="icon" onClick={() => openAssignTagsDialog(user)} disabled={isProcessing} title={`Assign tags for ${user.login}`}>
                                                            {updatingLogin === user.login ? <LoadingSpinner size="sm"/> : <Tags className="h-4 w-4 text-blue-600" />}
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={() => openSetPasswordDialog(user)} disabled={isSelf || isProcessing} title={`Set password for ${user.login}`}>
                                                        {settingPasswordLogin === user.login ? <LoadingSpinner size="sm"/> : <KeyRound className="h-4 w-4" />}
                                                    </Button>
                                                    {/* Placeholder for alignment if needed */}
                                                    {(user.role !== 'user' && !isSelf) && <span className='inline-block w-9 h-9'></span>}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {!isLoading && !fetchError && users.length === 0 && (<p className='text-muted-foreground text-center py-6'>No users found.</p>)}
                </CardContent>

                {/* Dialogs remain the same */}
                 <Dialog open={isSetPasswordDialogOpen} onOpenChange={setIsSetPasswordDialogOpen}>
                     <DialogContent className="sm:max-w-[425px]">
                         <DialogHeader><DialogTitle>Set Password for "{targetUserForPassword?.login}"</DialogTitle><DialogDescription>Enter the new password.</DialogDescription></DialogHeader>
                          {updateError && <ErrorDisplay message={updateError} className='my-2' />}
                          <form onSubmit={handlePasswordSubmit(onSetPasswordSubmit)}>
                             <div className="grid gap-4 py-4"> <div className="grid grid-cols-4 items-start gap-x-4 gap-y-1"> <Label htmlFor="new-password" className="text-right pt-2">New Password</Label> <div className="col-span-3 space-y-1"> <Input id="new-password" type="password" {...registerPassword("password")} className={cn(passwordErrors.password && "border-destructive")} aria-invalid={!!passwordErrors.password}/> {passwordErrors.password && <p className="text-xs text-destructive">{passwordErrors.password.message}</p>} </div> </div> </div>
                             <DialogFooter> <DialogClose asChild><Button type="button" variant="outline" disabled={!!settingPasswordLogin}>Cancel</Button></DialogClose> <Button type="submit" disabled={!!settingPasswordLogin || !!passwordErrors.password}>{settingPasswordLogin ? <LoadingSpinner size="sm" className="mr-2" /> : 'Set Password'}</Button> </DialogFooter>
                          </form>
                     </DialogContent>
                 </Dialog>
                 <Dialog open={isAssignTagsDialogOpen} onOpenChange={setIsAssignTagsDialogOpen}>
                     <DialogContent className="sm:max-w-md">
                         <DialogHeader> <DialogTitle>Assign Allowed Tags for "{targetUserForTags?.login}"</DialogTitle> <DialogDescription>Select the tags this 'user' role account is allowed to view/search within the archive.</DialogDescription> </DialogHeader>
                         {updateError && <ErrorDisplay message={updateError} className='my-2' />}
                         {isLoadingTags ? (<div className="flex justify-center py-4"><LoadingSpinner /></div>) : ( <div className="py-4"> <TagSelector selectedTagIds={assignedTags} onChange={setAssignedTags} availableTags={availableTags}/> </div> )}
                         <DialogFooter> <DialogClose asChild><Button type="button" variant="outline" disabled={updatingLogin === targetUserForTags?.login}>Cancel</Button></DialogClose> <Button type="button" onClick={handleAssignTagsSave} disabled={isLoadingTags || updatingLogin === targetUserForTags?.login}> {updatingLogin === targetUserForTags?.login ? <LoadingSpinner size="sm" className="mr-2" /> : 'Save Assignments'} </Button> </DialogFooter>
                     </DialogContent>
                 </Dialog>
            </Card>
        </TooltipProvider>
    );
};

export default UserManagement;