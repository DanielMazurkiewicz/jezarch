// src/components/archive/BatchTagDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TagSelector from '@/components/shared/TagSelector';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Tags, MinusCircle } from 'lucide-react';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { cn } from '@/lib/utils'; // Import cn
import { t } from '@/translations/utils'; // Import translation utility
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

interface BatchTagDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    action: 'add' | 'remove';
    availableTags: Tag[];
    onConfirm: (selectedTagIds: number[]) => void;
    isLoading: boolean;
    itemCount: number; // Number of items affected
}

const BatchTagDialog: React.FC<BatchTagDialogProps> = ({
    isOpen,
    onOpenChange,
    action,
    availableTags,
    onConfirm,
    isLoading,
    itemCount
}) => {
    const { preferredLanguage } = useAuth(); // Get preferredLanguage
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

    // Reset selected tags when dialog opens or action changes
    useEffect(() => {
        if (isOpen) {
            setSelectedTagIds([]);
        }
    }, [isOpen, action]);

    const handleConfirmClick = () => {
        if (!isLoading) {
            onConfirm(selectedTagIds);
        }
    };

    const title = t(action === 'add' ? 'archiveBatchTagsAddTitle' : 'archiveBatchTagsRemoveTitle', preferredLanguage);
    const description = t('archiveBatchTagsDescription', preferredLanguage, { action: t(action === 'add' ? 'addButton' : 'removeButton', preferredLanguage).toLowerCase(), count: itemCount.toLocaleString() });
    const confirmText = t(action === 'add' ? 'archiveBatchTagsConfirmAdd' : 'archiveBatchTagsConfirmRemove', preferredLanguage, { count: selectedTagIds.length });
    const icon = action === 'add' ? <Tags className='h-4 w-4' /> : <MinusCircle className='h-4 w-4'/>;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>{icon} {title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                 {/* Warning */}
                 <Alert variant="destructive" className="mt-2">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>{t('archiveBatchTagsWarningTitle', preferredLanguage)}</AlertTitle>
                     <AlertDescription>
                         {t('archiveBatchTagsWarningText', preferredLanguage, { count: itemCount.toLocaleString() })}
                     </AlertDescription>
                 </Alert>

                 {/* Tag Selector */}
                <div className="py-4">
                    <TagSelector
                        selectedTagIds={selectedTagIds}
                        onChange={setSelectedTagIds}
                        availableTags={availableTags}
                    />
                     {selectedTagIds.length === 0 && <p className='text-xs text-muted-foreground mt-1 text-center'>{t('archiveBatchTagsPlaceholder', preferredLanguage)}</p>}
                </div>

                <DialogFooter className='gap-2'>
                    <DialogClose asChild>
                         {/* Use translated button text */}
                        <Button type="button" variant="outline" disabled={isLoading}>{t('cancelButton', preferredLanguage)}</Button>
                    </DialogClose>
                    <Button
                        type="button"
                        onClick={handleConfirmClick}
                        disabled={isLoading || selectedTagIds.length === 0}
                        variant={action === 'remove' ? 'destructive' : 'default'}
                        className={cn( // Removed conditional text-white
                            "inline-flex items-center justify-center gap-2"
                        )}
                    >
                        {isLoading ? (
                             <LoadingSpinner size="sm" />
                         ) : (
                             <>
                                {icon}
                                <span>{confirmText}</span>
                             </>
                         )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BatchTagDialog;