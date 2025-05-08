import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Ensure useMemo and useCallback are imported
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import ElementBrowserPopoverContent from './ElementBrowserPopoverContent';
import { t } from '@/translations/utils'; // Import translation utility

type ResolvedSignature = { idPath: number[]; display: string };

interface SignatureSelectorProps {
  label: string;
  signatures: number[][]; // Array of paths, e.g., [[1, 5], [1, 8, 3]]
  onChange: (newSignatures: number[][]) => void;
  className?: string;
}

const SignatureSelector: React.FC<SignatureSelectorProps> = ({
    label,
    signatures,
    onChange,
    className,
}) => {
  const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
  const [resolvedSignatures, setResolvedSignatures] = useState<ResolvedSignature[]>([]);
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  // Memoize the stringified version of signatures to stabilize useEffect dependency
  const stringifiedSignatures = useMemo(() => JSON.stringify(signatures), [signatures]);

  useEffect(() => {
    const resolveAllSignatures = async () => {
        const currentSignatures = JSON.parse(stringifiedSignatures); // Use the memoized string
        if (!token || currentSignatures.length === 0) {
            setResolvedSignatures([]); return;
        }
        setIsLoadingSignatures(true);
        const resolved: ResolvedSignature[] = [];
        try {
            for (const idPath of currentSignatures) {
                if (idPath.length === 0) continue;
                const elementsInPath: (SignatureElement | null)[] = await Promise.all(
                    idPath.map((id: number) => api.getSignatureElementById(id, [], token).catch(() => null))
                );
                 const displayParts = elementsInPath.map((el: SignatureElement | null, index: number) => {
                     if (el) return `${el.index ? `[${el.index}]` : ''}${el.name}`;
                     // Use translated error
                     return `[${t('errorText', preferredLanguage)} ID: ${idPath[index] !== undefined ? idPath[index] : t('unknown', preferredLanguage)}]`; // Use translated unknown
                 });
                 resolved.push({ idPath, display: displayParts.join(' / ') });
            }
             setResolvedSignatures(resolved.sort((a, b) => a.display.localeCompare(b.display)));
        } catch (error) {
             console.error("Error resolving signatures:", error);
             // Use translated error
             setResolvedSignatures(currentSignatures.map((p: number[]) => ({idPath: p, display: `[${p.join(' / ')}] (${t('errorText', preferredLanguage)})`})));
        } finally { setIsLoadingSignatures(false); }
    };
    resolveAllSignatures();
  }, [stringifiedSignatures, token, preferredLanguage]); // Add preferredLanguage

  const addSignatureCallback = useCallback((newSignature: number[]) => {
      const newSignatureStr = JSON.stringify(newSignature);
      const currentSignatures = JSON.parse(stringifiedSignatures);
      if (!currentSignatures.some((p: number[]) => JSON.stringify(p) === newSignatureStr)) {
          onChange([...currentSignatures, newSignature]);
      }
      setIsBrowserOpen(false);
  }, [stringifiedSignatures, onChange]);


  const removeSignature = useCallback((signatureToRemove: number[]) => {
    const signatureToRemoveStr = JSON.stringify(signatureToRemove);
    const currentSignatures = JSON.parse(stringifiedSignatures);
    onChange(currentSignatures.filter((p: number[]) => JSON.stringify(p) !== signatureToRemoveStr));
  }, [stringifiedSignatures, onChange]);

  const handleClosePopover = useCallback(() => {
    setIsBrowserOpen(false);
  }, []);


  return (
    // Force white background for the container
    <div className={cn("flex flex-col space-y-2 rounded border p-3 bg-white dark:bg-white", className)}>
      <div className="flex justify-between items-center mb-1">
         {/* Use the passed label prop, ensure text contrast */}
         <Label className='text-sm font-medium text-neutral-700'>{label}</Label>
         <Popover open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
             <PopoverTrigger asChild>
                 {/* Use translated button text */}
                <Button type="button" size="sm" variant="outline" className='shrink-0'>
                    <Plus className="mr-1 h-3 w-3" /> {t('addSignaturePathButton', preferredLanguage)}
                </Button>
             </PopoverTrigger>
             {/* Popover content is forced white */}
             <PopoverContent className="w-[500px] max-w-[calc(100vw-2rem)] p-0" align="start">
                 <ElementBrowserPopoverContent
                     onSelectSignature={addSignatureCallback}
                     onClosePopover={handleClosePopover}
                 />
             </PopoverContent>
         </Popover>
       </div>
       {/* Inner container for badges - use lighter gray background */}
      <div className="flex-grow space-y-1 min-h-[40px] max-h-[150px] overflow-y-auto border rounded bg-neutral-50 p-2">
         {/* Use translated loading text */}
         {isLoadingSignatures && <div className='flex justify-center p-2'><LoadingSpinner size='sm' /></div>}
         {!isLoadingSignatures && resolvedSignatures.map((resolved) => ( // Removed index from map parameters
          <div key={JSON.stringify(resolved.idPath)} className="flex items-center justify-between gap-2 rounded bg-neutral-100 p-1 px-2 text-sm"> {/* Use Badge's secondary bg */}
            <span className="font-mono text-xs flex-grow break-words min-w-0 text-neutral-800">
                {resolved.display || <span className='italic text-neutral-500'>{t('emptySignaturePlaceholder', preferredLanguage)}</span>} {/* Use translated placeholder */}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-neutral-500 hover:text-destructive"
              onClick={() => removeSignature(resolved.idPath)}
              aria-label={`${t('removeButton', preferredLanguage)} ${resolved.display}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
         {/* Use translated placeholder */}
         {!isLoadingSignatures && signatures.length === 0 && <p className="text-xs text-neutral-500 italic text-center py-1">{t('noSignaturesAddedHint', preferredLanguage)}</p>}
      </div>
    </div>
  );
};

export default SignatureSelector;