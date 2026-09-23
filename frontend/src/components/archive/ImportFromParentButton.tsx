import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/translations/utils';
import { truncateImportPreview } from '@/lib/parentImport';

interface ImportFromParentButtonProps {
    /** Label of the field this button imports into (used in the tooltip and aria-label). */
    fieldLabel: string;
    /** Full, display-ready value that will be imported from the parent unit. */
    parentValueText: string;
    onImport: () => void;
}

/**
 * Small icon button shown next to a form label when the document has a
 * parent unit. Clicking it imports the parent unit's value into the field.
 * The tooltip explains the action and previews the value (first 60 chars).
 */
const ImportFromParentButton: React.FC<ImportFromParentButtonProps> = ({ fieldLabel, parentValueText, onImport }) => {
    const { preferredLanguage } = useAuth();
    const tooltipTitle = t('archiveFormImportFromParentTooltip', preferredLanguage, { field: fieldLabel });

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={tooltipTitle}
                    onClick={onImport}
                >
                    <Download className="h-3.5 w-3.5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px]">
                <div>{tooltipTitle}</div>
                <div className="text-muted-foreground break-words">{truncateImportPreview(parentValueText)}</div>
            </TooltipContent>
        </Tooltip>
    );
};

export default ImportFromParentButton;
