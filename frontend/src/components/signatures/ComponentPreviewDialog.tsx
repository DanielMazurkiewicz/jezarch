import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FolderOpen } from 'lucide-react';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/translations/utils';

interface ComponentPreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    component: SignatureComponent | null;
    onEdit: (component: SignatureComponent) => void;
    onDelete: (componentId: number) => void;
}

const ComponentPreviewDialog: React.FC<ComponentPreviewDialogProps> = ({
    isOpen,
    onOpenChange,
    component,
    onEdit,
    onDelete,
}) => {
    const { user, preferredLanguage } = useAuth();

    if (!component) return null;

    const getIndexTypeLabel = (type: SignatureComponent['index_type']): string => {
        switch(type) {
            case 'dec': return t('indexTypeDecimal', preferredLanguage);
            case 'roman': return t('indexTypeRoman', preferredLanguage);
            case 'small_char': return t('indexTypeLowerLetter', preferredLanguage);
            case 'capital_char': return t('indexTypeUpperLetter', preferredLanguage);
            default: return type;
        }
    };

    const canModify = user?.role === 'admin' || user?.role === 'employee';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        {t('componentPreviewTitle', preferredLanguage)}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid gap-3">
                        <div>
                            <span className="text-sm font-medium text-muted-foreground">{t('componentNameLabel', preferredLanguage)}</span>
                            <p className="text-base font-semibold">{component.name}</p>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-muted-foreground">{t('componentDescriptionLabel', preferredLanguage)}</span>
                            <p className="text-sm">{component.description || <em className="text-muted-foreground">{t('noDescription', preferredLanguage)}</em>}</p>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-muted-foreground">{t('componentIndexTypeLabel', preferredLanguage)}</span>
                            <div className="mt-1"><Badge variant="outline">{getIndexTypeLabel(component.index_type)}</Badge></div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-muted-foreground">{t('componentElementsCountLabel', preferredLanguage)}</span>
                            <p className="text-sm">{component.index_count ?? 0}</p>
                        </div>
                        {component.createdOn && (
                            <div>
                                <span className="text-sm font-medium text-muted-foreground">{t('createdOnLabel', preferredLanguage)}</span>
                                <p className="text-sm">{new Date(component.createdOn).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                    {canModify && (
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit(component); }}>
                                <Edit className="mr-2 h-4 w-4" /> {t('editButton', preferredLanguage)}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => { onOpenChange(false); onDelete(component.signatureComponentId!); }}>
                                <Trash2 className="mr-2 h-4 w-4" /> {t('deleteButton', preferredLanguage)}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ComponentPreviewDialog;
