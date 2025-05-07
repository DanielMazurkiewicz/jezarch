import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import ElementBrowserPopoverContent from './ElementBrowserPopoverContent';
import { Badge } from '@/components/ui/badge';
import { X, Wand2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import { cn } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';
import { t } from '@/translations/utils'; // Import translation utility

interface SingleSignaturePathPickerProps {
  selectedPath: number[] | null; // Array of element IDs or null if none selected
  onChange: (newPath: number[] | null) => void;
  label?: string; // Optional label for the picker
  className?: string;
}

const SingleSignaturePathPicker: React.FC<SingleSignaturePathPickerProps> = ({
  selectedPath,
  onChange,
  label = "Select Signature Path",
  className,
}) => {
  const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [resolvedDisplayPath, setResolvedDisplayPath] = useState<string | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);

  useEffect(() => {
    const resolvePath = async () => {
      if (!selectedPath || selectedPath.length === 0 || !token) {
        setResolvedDisplayPath(null);
        return;
      }
      setIsLoadingPath(true);
      try {
        const elementsInPath: (SignatureElement | null)[] = await Promise.all(
          selectedPath.map(id => api.getSignatureElementById(id, [], token).catch(() => null))
        );
        const displayParts = elementsInPath.map((el, index) => {
          if (el) return `${el.index ? `[${el.index}]` : ''}${el.name}`;
           // Use translated error
           return `[${t('errorText', preferredLanguage)} ID: ${selectedPath[index]}]`;
        });
        setResolvedDisplayPath(displayParts.join(' / '));
      } catch (error) {
        console.error("Error resolving signature path:", error);
         // Use translated error
        setResolvedDisplayPath(`[${t('errorText', preferredLanguage)}: ${selectedPath.join(',')}]`);
      } finally {
        setIsLoadingPath(false);
      }
    };
    resolvePath();
  }, [selectedPath, token, preferredLanguage]); // Add preferredLanguage

  const handlePathSelected = (newPath: number[]) => {
    onChange(newPath);
    setIsBrowserOpen(false);
  };

  const handleClearPath = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent popover from opening if button is inside trigger
    onChange(null);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <Popover open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal min-h-[36px] h-auto whitespace-normal py-1.5"
            type="button"
          >
            {isLoadingPath ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                 {/* Use translated loading text */}
                 <span>{t('singlePathPickerLoading', preferredLanguage)}</span>
              </div>
            ) : resolvedDisplayPath ? (
              <div className="flex items-center justify-between w-full gap-2">
                <span className="font-mono text-xs break-all">{resolvedDisplayPath}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={handleClearPath}
                   // Use translated tooltip
                  aria-label={t('singlePathPickerClearTooltip', preferredLanguage)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
               // Use translated placeholder
              <span className="text-muted-foreground">{t('singlePathPickerPlaceholder', preferredLanguage)}</span>
            )}
          </Button>
        </PopoverTrigger>
         {/* Increase popover width for better browsing */}
         <PopoverContent className="w-[500px] max-w-[calc(100vw-2rem)] p-0" align="start">
          <ElementBrowserPopoverContent
            onSelectSignature={handlePathSelected}
            onClosePopover={() => setIsBrowserOpen(false)}
            initialPath={selectedPath || []}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SingleSignaturePathPicker;
