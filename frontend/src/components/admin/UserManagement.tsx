import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Added Controller
import { zodResolver } from '@hookform/resolvers/zod';
// Updated import: Added userCreateSchema and UserCreateFormData, updatePreferredLanguageFormSchema
import { setPasswordSchema, SetPasswordFormData, updateUserRoleSchema, userCreateSchema, UserCreateFormData, updatePreferredLanguageFormSchema, UpdatePreferredLanguageFormData } from '@/lib/zodSchemas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import TagSelector from '@/components/shared/TagSelector'; // Import TagSelector
import UserCreateDialog from './UserCreateDialog'; // Import the new create user dialog
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
// Updated UserRole import - User now potentially includes assignedTags and preferredLanguage
// Import supportedLanguages constant from backend models
import type { User, UserRole, SupportedLanguage } from '../../../../backend/src/functionalities/user/models';
import { supportedLanguages } from '../../../../backend/src/functionalities/user/models'; // Import the constant
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
// Updated imports: Added PlusCircle, Languages icon
import { KeyRound, Ban, Tags, PlusCircle, Languages } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip
import { t } from '@/translations/utils'; // Import translation utility

const UserManagement: React.FC = () => {
    const { token, user: adminUser, updateContextUser, preferredLanguage } = useAuth(); // Get preferredLanguage
    // User type now potentially includes assignedTags and preferredLanguage
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

    // --- NEW: State for Preferred Language Dialog ---
    const [isSetLanguageDialogOpen, setIsSetLanguageDialogOpen] = useState(false);
    const [targetUserForLanguage, setTargetUserForLanguage] = useState<Omit<User, 'password'> | null>(null);
    // ---------------------------------------------

    // --- State for Create User Dialog ---
    const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
    // ------------------------------------

    const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPasswordForm, formState: { errors: passwordErrors } } = useForm<SetPasswordFormData>({
        resolver: zodResolver(setPasswordSchema), defaultValues: { password: '' },
    });

    // --- NEW: Form for Preferred Language ---
    const { control: languageControl, handleSubmit: handleLanguageSubmit, reset: resetLanguageForm, formState: { errors: languageErrors } } = useForm<UpdatePreferredLanguageFormData>({
        resolver: zodResolver(updatePreferredLanguageFormSchema), defaultValues: { preferredLanguage: 'en' },
    });
    // --------------------------------------


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
    const openAssignTagsDialog = useCallback(async (userToAssign: Omit<User, 'password'>) => {
        if (userToAssign.role !== 'user') {
            // Use translated warning
            toast.info(t('tagsCannotBeAssignedWarning', preferredLanguage));
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

    }, [token, preferredLanguage]); // Added preferredLanguage dependency
    // --- END FIX ---

    // --- Handlers ---
    const handleRoleChange = useCallback(async (login: string, newRole: UserRole | null) => {
        // Use translated warning
        if (!token || login === adminUser?.login) { toast.warning(t('cannotChangeOwnRoleWarning', preferredLanguage)); return; }
        setUpdatingLogin(login); setUpdateError(null);
        const originalUser = users.find(u => u.login === login);
        if (!originalUser) return; // Safety check

        const originalRole = originalUser.role;
        let roleText = ''; // Translate role for toast
        switch(newRole) {
            case 'admin': roleText = t('adminRoleOption', preferredLanguage); break;
            case 'employee': roleText = t('employeeRoleOption', preferredLanguage); break;
            case 'user': roleText = t('userRoleOption', preferredLanguage); break;
            default: roleText = t('noRoleOption', preferredLanguage);
        }

        try {
            // Optimistic UI update
            setUsers(prev => prev.map(u => (u.login === login ? { ...u, role: newRole, assignedTags: newRole === 'user' ? u.assignedTags : undefined } : u)));
            await api.updateUserRole(login, newRole, token);
            // Use translated success message
            toast.success(t('roleUpdatedSuccess', preferredLanguage, { login, roleText }));

            // If changed TO 'user', open tag assignment dialog AFTER successful role update
            // Fetch the updated user details to ensure we have the userId for tag assignment
             if (newRole === 'user') {
                 const updatedUser = await api.getUserByLogin(login, token); // Fetch fresh user data
                 if(updatedUser) {
                     openAssignTagsDialog(updatedUser); // This should now be defined
                 } else {
                     toast.error(t('userFetchDetailsFailedError', preferredLanguage)); // Use translated error
                 }
             } else {
                 // Refresh the user list to ensure assignedTags field is correctly updated (removed)
                 fetchUsers();
             }
        } catch (err: any) {
            const msg = t('userRoleUpdateFailedError', preferredLanguage, { login, message: err.message }); // Use translated error template
            setUpdateError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
            // Revert UI on error
            setUsers(prev => prev.map(u => (u.login === login ? { ...u, role: originalRole, assignedTags: originalRole === 'user' ? originalUser.assignedTags : undefined } : u)));
        } finally { setUpdatingLogin(null); }
    }, [token, adminUser?.login, users, fetchUsers, preferredLanguage, openAssignTagsDialog]); // Added openAssignTagsDialog

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
            // Use translated success message
            toast.success(t('passwordSetSuccess', preferredLanguage, { login: targetUserForPassword.login }));
            setIsSetPasswordDialogOpen(false);
            setTargetUserForPassword(null);
        } catch (err: any) {
            const msg = t('userPasswordSetFailedError', preferredLanguage, { login: targetUserForPassword.login, message: err.message }); // Use translated error
            setUpdateError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        } finally {
            setSettingPasswordLogin(null);
        }
    };

    // --- NEW: Handlers for Preferred Language Dialog ---
    const openSetLanguageDialog = (userToSet: Omit<User, 'password'>) => {
        setTargetUserForLanguage(userToSet);
        resetLanguageForm({ preferredLanguage: userToSet.preferredLanguage || 'en' });
        setUpdateError(null);
        setIsSetLanguageDialogOpen(true);
    };

    const onSetLanguageSubmit = async (data: UpdatePreferredLanguageFormData) => {
        if (!token || !targetUserForLanguage) return;
        setUpdatingLogin(targetUserForLanguage.login); // Reuse updatingLogin for loading state
        setUpdateError(null);
        try {
            const updatedUser = await api.updateUserPreferredLanguage(targetUserForLanguage.login, data.preferredLanguage, token);
            // Use translated success message
            toast.success(t('languageUpdatedSuccess', preferredLanguage, { login: targetUserForLanguage.login, language: data.preferredLanguage.toUpperCase() }));
            // Update local users state
            setUsers(prevUsers => prevUsers.map(u => u.userId === updatedUser.userId ? { ...u, preferredLanguage: updatedUser.preferredLanguage } : u));
            // If the updated user is the current admin, update context
            if (adminUser && adminUser.userId === updatedUser.userId) {
                 updateContextUser({ preferredLanguage: updatedUser.preferredLanguage });
            }
            setIsSetLanguageDialogOpen(false);
            setTargetUserForLanguage(null);
        } catch (err: any) {
            const msg = t('userLanguageUpdateFailedError', preferredLanguage, { login: targetUserForLanguage.login, message: err.message }); // Use translated error
            setUpdateError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        } finally {
            setUpdatingLogin(null);
        }
    };
    // --- END NEW ---

    const handleAssignTagsSave = async () => {
        if (!token || !targetUserForTags) return;
        setUpdatingLogin(targetUserForTags.login);
        setUpdateError(null);
        try {
            await api.assignTagsToUser(targetUserForTags.login, assignedTags, token);
            // Use translated success message
            toast.success(t('tagsAssignedSuccess', preferredLanguage, { login: targetUserForTags.login }));
            setIsAssignTagsDialogOpen(false);
            setTargetUserForTags(null);
            fetchUsers(); // Refresh user list to show updated tags
        } catch (err: any) {
            const msg = t('userTagAssignFailedError', preferredLanguage, { message: err.message }); // Use translated error
            setUpdateError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        } finally {
            setUpdatingLogin(null);
        }
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
    const getLanguageDisplay = (langCode: SupportedLanguage | undefined): string => {
        if (!langCode) return 'EN'; // Default if somehow undefined
        switch (langCode) {
            case 'en': return 'English (EN)';
            case 'pl': return 'Polski (PL)';
            default: return langCode.toUpperCase();
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
                                        const isProcessing = updatingLogin === user.login || settingPasswordLogin === user.login;
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
                                                             {updatingLogin === user.login && isSetLanguageDialogOpen ? <LoadingSpinner size="sm"/> : <Languages className="h-4 w-4 text-purple-600" />}
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
                                                            {updatingLogin === user.login && isAssignTagsDialogOpen ? <LoadingSpinner size="sm"/> : <Tags className="h-4 w-4 text-blue-600" />}
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
                                                        {settingPasswordLogin === user.login ? <LoadingSpinner size="sm"/> : <KeyRound className="h-4 w-4" />}
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

                 {/* Dialogs are forced white */}
                 <Dialog open={isSetPasswordDialogOpen} onOpenChange={setIsSetPasswordDialogOpen}>
                     <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader><DialogTitle>{t('setPasswordDialogTitle', preferredLanguage, { login: targetUserForPassword?.login || '...' })}</DialogTitle><DialogDescription>{t('setPasswordDialogDescription', preferredLanguage)}</DialogDescription></DialogHeader>
                          {updateError && <ErrorDisplay message={updateError} className='my-2' />}
                          <form onSubmit={handlePasswordSubmit(onSetPasswordSubmit)}>
                             <div className="grid gap-4 py-4"> <div className="grid grid-cols-4 items-start gap-x-4 gap-y-1">
                                  <Label htmlFor="new-password" className="text-right pt-2">{t('newPasswordLabel', preferredLanguage)}</Label>
                                 <div className="col-span-3 space-y-1"> <Input id="new-password" type="password" {...registerPassword("password")} className={cn(passwordErrors.password && "border-destructive")} aria-invalid={!!passwordErrors.password}/> {passwordErrors.password && <p className="text-xs text-destructive">{passwordErrors.password.message}</p>} </div> </div> </div>
                             <DialogFooter> <DialogClose asChild><Button type="button" variant="outline" disabled={!!settingPasswordLogin}>{t('cancelButton', preferredLanguage)}</Button></DialogClose> <Button type="submit" disabled={!!settingPasswordLogin || !!passwordErrors.password}>{settingPasswordLogin ? <LoadingSpinner size="sm" className="mr-2" /> : t('setPasswordButton', preferredLanguage)}</Button> </DialogFooter>
                          </form>
                     </DialogContent>
                 </Dialog>
                 <Dialog open={isAssignTagsDialogOpen} onOpenChange={setIsAssignTagsDialogOpen}>
                     <DialogContent className="sm:max-w-md">
                         <DialogHeader> <DialogTitle>{t('assignTagsDialogTitle', preferredLanguage, { login: targetUserForTags?.login || '...' })}</DialogTitle> <DialogDescription>{t('assignTagsDialogDescription', preferredLanguage)}</DialogDescription> </DialogHeader>
                         {updateError && <ErrorDisplay message={updateError} className='my-2' />}
                         {isLoadingTags ? (<div className="flex justify-center py-4"><LoadingSpinner /></div>) : ( <div className="py-4"> <TagSelector selectedTagIds={assignedTags} onChange={setAssignedTags} availableTags={availableTags}/> </div> )}
                         <DialogFooter> <DialogClose asChild><Button type="button" variant="outline" disabled={updatingLogin === targetUserForTags?.login}>{t('cancelButton', preferredLanguage)}</Button></DialogClose> <Button type="button" onClick={handleAssignTagsSave} disabled={isLoadingTags || updatingLogin === targetUserForTags?.login}> {updatingLogin === targetUserForTags?.login ? <LoadingSpinner size="sm" className="mr-2" /> : t('saveButton', preferredLanguage)} </Button> </DialogFooter>
                     </DialogContent>
                 </Dialog>
                 <Dialog open={isSetLanguageDialogOpen} onOpenChange={setIsSetLanguageDialogOpen}>
                     <DialogContent className="sm:max-w-[425px]">
                         <DialogHeader>
                             <DialogTitle>{t('setLanguageDialogTitle', preferredLanguage, { login: targetUserForLanguage?.login || '...' })}</DialogTitle>
                             <DialogDescription>{t('setLanguageDialogDescription', preferredLanguage)}</DialogDescription>
                         </DialogHeader>
                         {updateError && <ErrorDisplay message={updateError} className='my-2' />}
                         <form onSubmit={handleLanguageSubmit(onSetLanguageSubmit)}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="preferredLanguage">{t('languageLabel', preferredLanguage)}</Label>
                                    <Controller
                                        name="preferredLanguage"
                                        control={languageControl}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                 <SelectTrigger id="preferredLanguage" className={cn(languageErrors.preferredLanguage && "border-destructive")}>
                                                     <SelectValue placeholder={t('selectLanguagePlaceholder', preferredLanguage)} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {supportedLanguages.map(lang => (
                                                        <SelectItem key={lang} value={lang}>{getLanguageDisplay(lang)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {languageErrors.preferredLanguage && <p className="text-xs text-destructive">{languageErrors.preferredLanguage.message}</p>}
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" disabled={updatingLogin === targetUserForLanguage?.login}>{t('cancelButton', preferredLanguage)}</Button>
                                </DialogClose>
                                <Button type="submit" disabled={updatingLogin === targetUserForLanguage?.login || !!languageErrors.preferredLanguage}>
                                    {updatingLogin === targetUserForLanguage?.login ? <LoadingSpinner size="sm" className="mr-2" /> : t('saveButton', preferredLanguage)}
                                </Button>
                            </DialogFooter>
                         </form>
                     </DialogContent>
                 </Dialog>
                 {/* --- END NEW --- */}
            </Card>
        </TooltipProvider>
    );
};

export default UserManagement;