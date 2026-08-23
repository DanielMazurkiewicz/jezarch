import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Layers } from 'lucide-react';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/translations/utils';
import { formatDateTime } from '@/lib/format';

interface ElementPreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    element: SignatureElement | null;
    onEdit: (element: SignatureElement) => void;
    onDelete: (elementId: number) => void;
}

const ElementPreviewDialog: React.FC<ElementPreviewDialogProps> = ({
    isOpen,
    onOpenChange,
    element,
    onEdit,
    onDelete,
}) => {
    const { user, preferredLanguage } = useAuth();

    if (!element) return null;

    const canModify = user?.role === 'admin' || user?.role === 'employee';
    // Deleting elements is admin-only (matches component deletion and the API)
    const canDelete = user?.role === 'admin';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-muted-foreground" />
                        {t('elementPreviewTitle', preferredLanguage)}
                    </DialogTitle>
                    <DialogDescription className="sr-only">{t('elementPreviewTitle', preferredLanguage)}</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
                    <div className="grid gap-3">
                        <div>
                            <span className="text-sm font-medium text-muted-foreground">{t('elementIndexShortLabel', preferredLanguage)}</span>
                            <p className="text-base font-mono break-words">{element.index || <em className="text-muted-foreground">{t('elementIndexAuto', preferredLanguage)}</em>}</p>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-muted-foreground">{t('elementNameLabel', preferredLanguage)}</span>
                            <p className="text-base font-semibold break-words">{element.name}</p>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-muted-foreground">{t('elementDescriptionLabel', preferredLanguage)}</span>
                            <p className="text-sm whitespace-pre-wrap break-words">{element.description || <em className="text-muted-foreground">{t('noDescription', preferredLanguage)}</em>}</p>
                        </div>
                        {element.parentElements && element.parentElements.length > 0 && (
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">{t('elementParentElementsLabel', preferredLanguage)}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {element.parentElements.map((parent) => (
                                        <Badge key={parent.signatureElementId} variant="secondary" className="font-mono text-xs">
                                            {parent.index ? `[${parent.index}] ` : ''}{parent.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {element.createdOn && (
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">{t('createdOnLabel', preferredLanguage)}</span>
                                <p className="text-sm">{formatDateTime(element.createdOn, preferredLanguage)}</p>
                            </div>
                        )}
                    </div>
                </div>
                {canModify && (
                    <div className="flex shrink-0 justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit(element); }}>
                            <Edit className="mr-2 h-4 w-4" /> {t('editButton', preferredLanguage)}
                        </Button>
                        {canDelete && (
                            <Button variant="destructive" size="sm" onClick={() => { onOpenChange(false); onDelete(element.signatureElementId!); }}>
                                <Trash2 className="mr-2 h-4 w-4" /> {t('deleteButton', preferredLanguage)}
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ElementPreviewDialog;
