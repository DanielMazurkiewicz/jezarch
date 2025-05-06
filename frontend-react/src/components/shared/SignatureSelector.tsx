import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react'; // Reduced imports
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import ElementBrowserPopoverContent from './ElementBrowserPopoverContent'; // Import the extracted component

type ResolvedSignature = { idPath: number[]; display: string };

interface SignatureSelectorProps {
  label: string;
  signatures: number[][]; // Array of signatures, each an array of element IDs
  onChange: (newSignatures: number[][]) => void;
  className?: string;
}

const SignatureSelector: React.FC<SignatureSelectorProps> = ({
    label,
    signatures,
    onChange,
    className,
}) => {
  const { token } = useAuth();
  const [resolvedSignatures, setResolvedSignatures] = useState<ResolvedSignature[]>([]);
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  // Resolve signatures whenever the input `signatures` array changes
  useEffect(() => {
    const resolveAllSignatures = async () => {
        if (!token || signatures.length === 0) {
            setResolvedSignatures([]); return;
        }
        setIsLoadingSignatures(true);
        const resolved: ResolvedSignature[] = [];
        try {
            for (const idPath of signatures) {
                if (idPath.length === 0) continue;
                const elementsInPath: (SignatureElement | null)[] = await Promise.all(
                    idPath.map(id => api.getSignatureElementById(id, [], token).catch(() => null))
                );
                 const displayParts = elementsInPath.map((el: SignatureElement | null, index: number) => {
                     if (el) return `${el.index ? `[${el.index}]` : ''}${el.name}`;
                     else return `[Error ID: ${idPath[index]}]`;
                 });
                 resolved.push({ idPath, display: displayParts.join(' / ') });
            }
             setResolvedSignatures(resolved.sort((a, b) => a.display.localeCompare(b.display)));
        } catch (error) {
             console.error("Error resolving signatures:", error);
             setResolvedSignatures(signatures.map(p => ({idPath: p, display: `[${p.join(' / ')}] (Resolve Error)`})));
        } finally { setIsLoadingSignatures(false); }
    };
    resolveAllSignatures();
  }, [signatures, token]);

  const addSignature = (newSignature: number[]) => {
      const newSignatureStr = JSON.stringify(newSignature);
      if (!signatures.some(p => JSON.stringify(p) === newSignatureStr)) {
          onChange([...signatures, newSignature]);
      }
      setIsBrowserOpen(false);
  };

  const removeSignature = (signatureToRemove: number[]) => {
    const signatureToRemoveStr = JSON.stringify(signatureToRemove);
    onChange(signatures.filter(p => JSON.stringify(p) !== signatureToRemoveStr));
  };

  return (
    <div className={cn("flex flex-col space-y-2 rounded border p-3 bg-muted", className)}>
      {/* Header row */}
      <div className="flex justify-between items-center mb-1">
         <Label className='text-sm font-medium'>{label}</Label>
         <Popover open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
             <PopoverTrigger asChild>
                <Button type="button" size="sm" variant="outline" className='shrink-0'>
                    <Plus className="mr-1 h-3 w-3" /> Add Signature
                </Button>
             </PopoverTrigger>
             <PopoverContent className="w-[500px] max-w-[calc(100vw-2rem)] p-0" align="start">
                 {/* Pass the correct onSelect callback */}
                 <ElementBrowserPopoverContent
                     onSelectSignature={addSignature} // Changed prop name
                     onClose={() => setIsBrowserOpen(false)}
                 />
             </PopoverContent>
         </Popover>
       </div>
      {/* Display Area for Selected Signatures */}
      <div className="flex-grow space-y-1 min-h-[40px] max-h-[150px] overflow-y-auto border rounded bg-background p-2">
         {isLoadingSignatures && <div className='flex justify-center p-2'><LoadingSpinner size='sm' /></div>}
         {!isLoadingSignatures && resolvedSignatures.map((resolved) => (
          <div key={JSON.stringify(resolved.idPath)} className="flex items-center justify-between gap-2 rounded bg-muted p-1 px-2 text-sm">
            <span className="font-mono text-xs flex-grow break-words min-w-0">
                {resolved.display || <span className='italic text-muted-foreground'>Empty Signature</span>}
            </span>
            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeSignature(resolved.idPath)} aria-label={`Remove signature ${resolved.display}`}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
         {!isLoadingSignatures && signatures.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-1">No signatures added.</p>}
      </div>
    </div>
  );
};

export default SignatureSelector;