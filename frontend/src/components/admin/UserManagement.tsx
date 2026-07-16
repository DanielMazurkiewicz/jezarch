import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import UserCreateDialog from './UserCreateDialog';
import SetPasswordDialog from './SetPasswordDialog';
import AssignTagsDialog from './AssignTagsDialog';
import SetLanguageDialog from './SetLanguageDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { User, UserRole, SupportedLanguage } from '../../../../backend/src/functionalities/user/models';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { KeyRound, Ban, Tags, PlusCircle, Languages } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { t } from '@/translations/utils';

const UserManagement: React.FC = () => {
    const { token, user: adminUser, updateContextUser, preferredLanguage } = useAuth(); // Get preferredLanguage
    // User type now potentially includes assignedTags and preferredLanguage
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatingLogin, setUpdatingLogin] = useState<string | null>(null);
    const [isSetPasswordDialogOpen, setIsSetPasswordDialogOpen] = useState(false);
    const [targetUserForPassword, setTargetUserForPassword] = useState<Omit<User, 'password'> | null>(null);

    const [isAssignTagsDialogOpen, setIsAssignTagsDialogOpen] = useState(false);
    const [targetUserForTags, setTargetUserForTags] = useState<Omit<User, 'password'> | null>(null);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);

    // --- State for Preferred Language Dialog ---
    const [isSetLanguageDialogOpen, setIsSetLanguageDialogOpen] = useState(false);
    const [targetUserForLanguage, setTargetUserForLanguage] = useState<Omit<User, 'password'> | null>(null);
    // -------------------------------------------

    // --- State for Create User Dialog ---
    const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
    // ------------------------------------


    // --- Fetching Data ---
    const fetchUsers = useCallback(async () => {
        if (!token) { setIsLoading(false); setFetchError(t('authTokenMissingError', preferredLanguage)); return; } // Use translated error
        setIsLoading(true); setFetchError(null); setUpdateError(null);
        try {
            // API now returns assignedTags for 'user' roles and preferredLanguage
            const fetchedUsers = await api.getAllUsers(token);
            setUsers(fetchedUsers.sort((a, b) => a.login.localeCompare(b.login)));
        } catch (err: any) {
            const msg = err.message || t('userFetchFailedError', preferredLanguage); setFetchError(msg); toast.error(`${t('userFetchFailedError', preferredLanguage)}: ${msg}`); // Use translated error
        } finally { setIsLoading(false); }
    }, [token, preferredLanguage]); // Add preferredLanguage

    const fetchAvailableTags = useCallback(async () => {
        if (!token) return;
        setIsLoadingTags(true);
        try {
            const tags = await api.getAllTags(token);
            setAvailableTags(tags.sort((a, b) => a.name.localeCompare(b.name))); // Sort available tags
        } catch (err) {
            toast.error(t('tagLoadFailedError', preferredLanguage)); // Use translated error
            console.error("Failed to load available tags:", err);
        } finally { setIsLoadingTags(false); }
    }, [token, preferredLanguage]); // Add preferredLanguage

    useEffect(() => { fetchUsers(); fetchAvailableTags(); }, [fetchUsers, fetchAvailableTags]);

    // --- FIX: Define openAssignTagsDialog before handleRoleChange ---
    const openAssignTagsDialog = useCallback((userToAssign: Omit<User, 'password'>) => {
        if (userToAssign.role !== 'user') {
            toast.info(t('tagsCannotBeAssignedWarning', preferredLanguage));
            return;
        }
        setTargetUserForTags(userToAssign);
        setIsAssignTagsDialogOpen(true);
    }, [preferredLanguage]);

    // --- Handlers ---
    const handleRoleChange = useCallback(async (login: string, newRole: UserRole | null) => {
        if (!token || login === adminUser?.login) { toast.warning(t('cannotChangeOwnRoleWarning', preferredLanguage)); return; }
        setUpdatingLogin(login); setUpdateError(null);
        const originalUser = users.find(u => u.login === login);
        if (!originalUser) return;

        const originalRole = originalUser.role;
        let roleText = '';
        switch(newRole) {
            case 'admin': roleText = t('adminRoleOption', preferredLanguage); break;
            case 'employee': roleText = t('employeeRoleOption', preferredLanguage); break;
            case 'user': roleText = t('userRoleOption', preferredLanguage); break;
            default: roleText = t('noRoleOption', preferredLanguage);
        }

        try {
            setUsers(prev => prev.map(u => (u.login === login ? { ...u, role: newRole, assignedTags: newRole === 'user' ? u.assignedTags : undefined } : u)));
            await api.updateUserRole(login, newRole, token);
            toast.success(t('roleUpdatedSuccess', preferredLanguage, { login, roleText }));

            if (newRole === 'user') {
                const updatedUser = await api.getUserByLogin(login, token);
                if (updatedUser) {
                    openAssignTagsDialog(updatedUser);
                } else {
                    toast.error(t('userFetchDetailsFailedError', preferredLanguage));
                }
            } else {
                fetchUsers();
            }
        } catch (err: any) {
            const msg = t('userRoleUpdateFailedError', preferredLanguage, { login, message: err.message });
            setUpdateError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
            setUsers(prev => prev.map(u => (u.login === login ? { ...u, role: originalRole, assignedTags: originalRole === 'user' ? originalUser.assignedTags : undefined } : u)));
        } finally { setUpdatingLogin(null); }
    }, [token, adminUser?.login, users, fetchUsers, preferredLanguage, openAssignTagsDialog]);

    const openSetPasswordDialog = (userToSet: Omit<User, 'password'>) => {
        setTargetUserForPassword(userToSet);
        setIsSetPasswordDialogOpen(true);
    };

    const openSetLanguageDialog = (userToSet: Omit<User, 'password'>) => {
        setTargetUserForLanguage(userToSet);
        setIsSetLanguageDialogOpen(true);
    };

    // --- Handler for successful user creation ---
    const handleUserCreated = () => {
        setIsCreateUserDialogOpen(false);
        fetchUsers(); // Refresh the user list
    };
    // -------------------------------------------

    // Get translated role display text or badge
    const getRoleDisplay = (role: UserRole | null): React.ReactNode => {
        if (role === 'admin') return <Badge variant="default">{t('adminRoleOption', preferredLanguage)}</Badge>;
        // Adjusted secondary/outline badges for white bg
        if (role === 'employee') return <Badge variant="secondary">{t('employeeRoleOption', preferredLanguage)}</Badge>;
        if (role === 'user') return <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-50">{t('userRoleOption', preferredLanguage)}</Badge>; // Added light blue background
        return <Badge variant="outline" className='border-dashed text-neutral-500'>{t('noRoleOption', preferredLanguage)}</Badge>; // Adjusted outline for white bg
    };

    // Get translated language display text
    const getLanguageDisplay = (langCode: SupportedLanguage): string => {
        switch (langCode) {
            case 'en': return 'English (EN)';
            case 'pl': return 'Polski (PL)';
        }
    }

    return (
        <TooltipProvider delayDuration={150}> {/* Wrap table for Tooltips */}
             {/* Card is forced white */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                         <div>
                             {/* Use translated title and description */}
                             <CardTitle>{t('userManagementTitleAdmin', preferredLanguage)}</CardTitle>
                             <CardDescription>{t('userManagementDescriptionAdmin', preferredLanguage)}</CardDescription>
                         </div>
                         {/* --- Create User Button & Dialog Trigger --- */}
                          {/* Dialog is forced white */}
                         <UserCreateDialog
                            isOpen={isCreateUserDialogOpen}
                            onOpenChange={setIsCreateUserDialogOpen}
                            onUserCreated={handleUserCreated}
                         >
                             <Button size="sm" className='shrink-0'>
                                 <PlusCircle className="mr-2 h-4 w-4" />
                                 {/* Use translated button text */}
                                 {t('createUserButtonAdmin', preferredLanguage)}
                             </Button>
                         </UserCreateDialog>
                         {/* ---------------------------------------- */}
                     </div>
                </CardHeader>
                <CardContent>
                    {fetchError && !isLoading && <ErrorDisplay message={fetchError} className='mb-4' />}
                    {updateError && !isLoading && <ErrorDisplay message={updateError} className='mb-4' />}
                    {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}

                    {!isLoading && !fetchError && users.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                             {/* Table styles adjusted for white bg */}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                         {/* Use translated column headers */}
                                        <TableHead>{t('userLoginColumn', preferredLanguage)}</TableHead>
                                        <TableHead>{t('userRoleColumn', preferredLanguage)}</TableHead>
                                        <TableHead>{t('userLanguageColumn', preferredLanguage)}</TableHead>
                                        <TableHead>{t('userAssignedTagsColumn', preferredLanguage)}</TableHead>
                                        <TableHead className="text-right w-[180px]">{t('userActionsColumn', preferredLanguage)}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => {
                                        const isSelf = user.login === adminUser?.login;
                                        const isProcessing = updatingLogin === user.login;
                                        // Calculate title beforehand to avoid complex JSX inside attribute
                                        const languageButtonTitle = t('setLanguageButtonTooltip', preferredLanguage, { login: user.login });
                                        const assignTagsButtonTitle = t('assignTagsButtonTooltip', preferredLanguage, { login: user.login });
                                        const setPasswordButtonTitle = t('setPasswordButtonTooltip', preferredLanguage, { login: user.login });


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
                                                             {/* Select is adjusted for white bg */}
                                                            <SelectTrigger className={cn('w-[160px] h-9', updatingLogin === user.login && 'opacity-70')} aria-label={t('selectRolePlaceholder', preferredLanguage)}>
                                                                <SelectValue placeholder={t('selectRolePlaceholder', preferredLanguage)}>{getRoleDisplay(user.role)}</SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="admin">{t('adminRoleOption', preferredLanguage)}</SelectItem>
                                                                <SelectItem value="employee">{t('employeeRoleOption', preferredLanguage)}</SelectItem>
                                                                <SelectItem value="user">{t('userRoleOption', preferredLanguage)}</SelectItem>
                                                                <SelectItem value="null"><span className='text-neutral-500 italic flex items-center gap-1'><Ban className='h-3 w-3'/> {t('noRoleOption', preferredLanguage)}</span></SelectItem> {/* Adjusted muted color */}
                                                            </SelectContent>
                                                        </Select>
                                                        {updatingLogin === user.login && !isAssignTagsDialogOpen && !isSetLanguageDialogOpen && <LoadingSpinner size="sm" />}
                                                    </div>
                                                </TableCell>
                                                {/* Preferred Language Cell */}
                                                <TableCell>
                                                     {/* Use translated language display */}
                                                      {/* Badge outline adjusted for white bg */}
                                                     <Badge variant="outline" className="font-normal">{getLanguageDisplay(user.preferredLanguage)}</Badge>
                                                </TableCell>
                                                {/* Assigned Tags Cell */}
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {user.role === 'user' ? (
                                                            user.assignedTags && user.assignedTags.length > 0 ? (
                                                                user.assignedTags.slice(0, 3).map(tag => (
                                                                     // Badge outline adjusted for white bg
                                                                    <Badge key={tag.tagId} variant="outline" className='font-normal'>{tag.name}</Badge>
                                                                ))
                                                            ) : (
                                                                 // Use translated text, adjusted muted color
                                                                <span className="text-xs text-neutral-500 italic">{t('noneLabel', preferredLanguage)} {t('assignButton', preferredLanguage).toLowerCase()}ed</span>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-neutral-500">—</span> // Adjusted muted color
                                                        )}
                                                        {user.role === 'user' && user.assignedTags && user.assignedTags.length > 3 && (
                                                             <Tooltip>
                                                                 <TooltipTrigger asChild>
                                                                      {/* Badge secondary adjusted for white bg */}
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
                                                    {/* Language Button - Visible for admin, not for self */}
                                                    {!isSelf && (
                                                         <Button
                                                             variant="ghost"
                                                             size="icon"
                                                             onClick={() => openSetLanguageDialog(user)}
                                                             disabled={isProcessing}
                                                             title={languageButtonTitle}
                                                         >
                                                              <Languages className="h-4 w-4 text-purple-600" />
                                                         </Button>
                                                    )}
                                                    {/* Assign Tags Button */}
                                                    {user.role === 'user' && !isSelf && (
                                                         <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openAssignTagsDialog(user)}
                                                            disabled={isProcessing}
                                                            title={assignTagsButtonTitle}
                                                        >
                                                             <Tags className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                    )}
                                                    {/* Set Password Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openSetPasswordDialog(user)}
                                                        disabled={isSelf || isProcessing}
                                                        title={setPasswordButtonTitle}
                                                    >
                                                         <KeyRound className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                     {/* Use translated empty state */}
                    {!isLoading && !fetchError && users.length === 0 && (<p className='text-neutral-500 text-center py-6'>{t('noUsersFound', preferredLanguage)}</p>)} {/* Adjusted muted color */}
                </CardContent>

                 {/* Extracted Dialogs */}
                 <SetPasswordDialog
                     isOpen={isSetPasswordDialogOpen}
                     onOpenChange={setIsSetPasswordDialogOpen}
                     targetUser={targetUserForPassword}
                     token={token}
                     preferredLanguage={preferredLanguage}
                 />
                 <AssignTagsDialog
                     isOpen={isAssignTagsDialogOpen}
                     onOpenChange={setIsAssignTagsDialogOpen}
                     targetUser={targetUserForTags}
                     initialTagIds={targetUserForTags?.assignedTags?.map(t => t.tagId!) ?? []}
                     availableTags={availableTags}
                     token={token}
                     preferredLanguage={preferredLanguage}
                     onSave={fetchUsers}
                 />
                 <SetLanguageDialog
                     isOpen={isSetLanguageDialogOpen}
                     onOpenChange={setIsSetLanguageDialogOpen}
                     targetUser={targetUserForLanguage}
                     token={token}
                     preferredLanguage={preferredLanguage}
                     adminUser={adminUser}
                     updateContextUser={updateContextUser}
                     onSave={fetchUsers}
                 />
            </Card>
        </TooltipProvider>
    );
};

export default UserManagement;