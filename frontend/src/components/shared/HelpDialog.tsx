import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/translations/utils';

export interface HelpSection {
    heading?: string;
    body: string;
}

interface HelpDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    sections: HelpSection[];
}

const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onOpenChange, title, sections }) => {
    const { preferredLanguage } = useAuth();
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="sr-only">{title}</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
                    {sections.map((section, index) => (
                        <div key={index} className="space-y-1">
                            {section.heading && <p className="font-semibold text-neutral-900">{section.heading}:</p>}
                            <p className="text-sm leading-relaxed text-neutral-600">{section.body}</p>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('closeButton', preferredLanguage)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default HelpDialog;
