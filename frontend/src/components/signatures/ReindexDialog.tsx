import React, { useEffect, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { indexTypeLabel } from '@/lib/signatureIndexType';
import { t } from '@/translations/utils';
import { useAuth } from '@/hooks/useAuth';
import type { SignatureComponent, ReindexOrderBy } from '../../../../backend/src/functionalities/signature/component/models';

export interface ReindexOptions {
    orderBy: ReindexOrderBy;
    reverse: boolean;
}

interface ReindexDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    /** The component whose elements will be renumbered. */
    component: SignatureComponent | null;
    isPending?: boolean;
    onConfirm: (options: ReindexOptions) => void;
}

const ORDER_BY_VALUES: ReindexOrderBy[] = ['alphabetical', 'creation'];

/**
 * Confirmation dialog for re-indexing a component's elements: shows what is
 * about to be renumbered and lets the user pick the ordering mode (with an
 * optional reversal) before confirming.
 */
const ReindexDialog: React.FC<ReindexDialogProps> = ({ isOpen, onOpenChange, component, isPending = false, onConfirm }) => {
    const { preferredLanguage } = useAuth();
    const [orderBy, setOrderBy] = useState<ReindexOrderBy>('alphabetical');
    const [reverse, setReverse] = useState(false);

    // Start from the defaults every time the dialog is opened.
    useEffect(() => {
        if (isOpen) {
            setOrderBy('alphabetical');
            setReverse(false);
        }
    }, [isOpen]);

    const handleOpenChange = (open: boolean) => {
        if (isPending) return; // Don't allow dismissing while the request is running
        onOpenChange(open);
    };

    const handleConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
        // Keep the dialog open (showing the spinner) until the parent closes it
        // once the request settles.
        event.preventDefault();
        if (isPending) return;
        onConfirm({ orderBy, reverse });
    };

    if (!component) return null;

    const elementCount = component.index_count ?? 0;

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirmReindexComponentTitle', preferredLanguage)}</AlertDialogTitle>
                    {/* Detail of what exactly is about to be re-indexed */}
                    <AlertDialogDescription>
                        {t('confirmReindexComponentMessage', preferredLanguage, { componentName: component.name })}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{component.name}</Badge>
                    <Badge variant="secondary">
                        {t('reindexElementsCountLabel', preferredLanguage)}: {elementCount}
                    </Badge>
                    <Badge variant="secondary">
                        {t('reindexIndexFormatLabel', preferredLanguage)}: {indexTypeLabel(component.index_type, preferredLanguage)}
                    </Badge>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="reindex-order-by">{t('reindexOrderByLabel', preferredLanguage)}</Label>
                    <Select value={orderBy} onValueChange={(value) => setOrderBy(value as ReindexOrderBy)} disabled={isPending}>
                        <SelectTrigger id="reindex-order-by" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ORDER_BY_VALUES.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {t(value === 'alphabetical' ? 'reindexOrderAlphabetical' : 'reindexOrderCreation', preferredLanguage)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-start gap-3">
                    <Checkbox
                        id="reindex-reverse"
                        checked={reverse}
                        disabled={isPending}
                        onCheckedChange={(checked) => setReverse(checked === true)}
                    />
                    <div className="grid gap-1">
                        <Label htmlFor="reindex-reverse">{t('reindexReverseLabel', preferredLanguage)}</Label>
                        <p className="text-xs text-neutral-600">{t('reindexReverseHint', preferredLanguage)}</p>
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>{t('cancelButton', preferredLanguage)}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
                        {isPending && <LoadingSpinner size="sm" className="mr-2" />}
                        {t('reindexConfirmButton', preferredLanguage)}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ReindexDialog;
