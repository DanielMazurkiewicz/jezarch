import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Search as SearchIcon, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

type ResolvedPath = { idPath: number[]; display: string };

interface SignaturePathSelectorProps {
  label: string;
  elementIdPaths: number[][]; // Array of paths, e.g., [[1, 5], [1, 8, 3]]
  onChange: (newPaths: number[][]) => void;
  className?: string;
}

// --- Element Browser Component (Internal - Popover Content) ---
interface ElementBrowserPopoverContentProps {
    onSelectPath: (path: number[]) => void;
}

const ElementBrowserPopoverContent: React.FC<ElementBrowserPopoverContentProps> = ({ onSelectPath }) => {
    const { token } = useAuth();
    const [components, setComponents] = useState<SignatureComponent[]>([]);
    const [selectedComponentId, setSelectedComponentId] = useState<string>('');
    const [elements, setElements] = useState<SignatureElement[]>([]);
    const [currentPath, setCurrentPath] = useState<SignatureElement[]>([]);
    const [isLoadingComponents, setIsLoadingComponents] = useState(false);
    const [isLoadingElements, setIsLoadingElements] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Components
    useEffect(() => {
        const fetchComps = async () => {
            if (!token) return;
            setIsLoadingComponents(true);
            try {
                setComponents((await api.getAllSignatureComponents(token)).sort((a,b) => a.name.localeCompare(b.name)));
            } catch (err) { console.error("Failed to load components", err); }
             finally { setIsLoadingComponents(false); }
        };
        fetchComps();
    }, [token]);

    // Fetch Elements when Component changes
    useEffect(() => {
        const fetchElems = async () => {
            if (!token || !selectedComponentId) {
                setElements([]);
                return;
            }
            setIsLoadingElements(true);
            try {
                const allElements = await api.getElementsByComponent(parseInt(selectedComponentId), token);
                setElements(allElements.sort((a,b) => (a.index ?? a.name).localeCompare(b.index ?? b.name)));
            } catch (err) { console.error("Failed to load elements", err); setElements([]); }
             finally { setIsLoadingElements(false); }
        };
        fetchElems();
        setCurrentPath([]); // Reset path when component changes
    }, [token, selectedComponentId]);

    const handleSelectElement = (element: SignatureElement) => {
        setCurrentPath([...currentPath, element]);
        setSearchTerm(''); // Clear search
    };

    const handleRemoveLastElement = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    const handleConfirmPath = () => {
        if (currentPath.length > 0) {
            onSelectPath(currentPath.map(el => el.signatureElementId!));
            setCurrentPath([]);
            setSelectedComponentId('');
        }
    };

     const filteredElements = elements.filter(el =>
        !currentPath.some(p => p.signatureElementId === el.signatureElementId) &&
        (el.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        el.index?.toLowerCase().includes(searchTerm.toLowerCase()))
     );

    const selectedComponentName = components.find(c => String(c.signatureComponentId) === selectedComponentId)?.name;

    return (
        // PopoverContent already provides bg-popover, no need to set bg here
        <div className="space-y-3 p-4 w-full">
            {/* Current Path Display - Use solid background for contrast */}
             <div className="flex flex-wrap items-center gap-1 border rounded p-2 bg-muted min-h-[40px]"> {/* Changed bg-muted/50 to bg-muted */}
                <Label className='mr-2 shrink-0 text-xs font-semibold'>Current Path:</Label>
                {currentPath.map((el) => (
                    <Badge key={el.signatureElementId} variant="secondary" className='font-mono text-xs'>
                         {el.index ? `[${el.index}] ` : ''}{el.name}
                    </Badge>
                 ))}
                 {currentPath.length === 0 && <span className="text-xs text-muted-foreground italic">Select component & elements below...</span>}
            </div>

            {/* Component Selector */}
            <Select value={selectedComponentId} onValueChange={setSelectedComponentId} disabled={isLoadingComponents}>
                {/* SelectTrigger inherits background from parent PopoverContent */}
                <SelectTrigger className='w-full text-sm h-9'>
                    <SelectValue placeholder="1. Select Component..." />
                </SelectTrigger>
                {/* SelectContent will use bg-popover */}
                <SelectContent>
                    {isLoadingComponents && <SelectItem value="loading" disabled><div className='flex items-center'><LoadingSpinner size='sm' className='mr-2'/>Loading...</div></SelectItem>}
                    {components.map(comp => (
                        <SelectItem key={comp.signatureComponentId} value={String(comp.signatureComponentId)}>
                            {comp.name}
                        </SelectItem>
                    ))}
                    {!isLoadingComponents && components.length === 0 && <SelectItem value="no-comps" disabled>No components found</SelectItem>}
                </SelectContent>
            </Select>

            {/* Element Selector/Search (only if component selected) */}
            {selectedComponentId && (
                <div className="flex-1 overflow-hidden flex flex-col">
                     <Label className='text-xs mb-1 block'>2. Select Element(s) from "{selectedComponentName}"</Label>
                     {/* Command inherits background from PopoverContent */}
                    <Command className='rounded-lg border shadow-sm'>
                        <CommandInput
                            placeholder="Search elements by name or index..."
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />
                         {/* CommandList should use bg-popover from Command parent */}
                         <CommandList className="max-h-[200px]">
                             {isLoadingElements && <div className='p-4 text-center'><LoadingSpinner size='sm' /></div>}
                             <CommandEmpty>No elements found.</CommandEmpty>
                             {!isLoadingElements && filteredElements.length > 0 && (
                                 <CommandGroup heading="Available Elements">
                                     {filteredElements.map((el) => (
                                        <CommandItem
                                            key={el.signatureElementId}
                                            value={`${el.index || ''} ${el.name}`}
                                            onSelect={() => handleSelectElement(el)}
                                            className="cursor-pointer flex justify-between items-center text-sm"
                                        >
                                            <div className='flex items-center'>
                                                <span className='font-mono text-xs w-10 mr-2 text-right inline-block text-muted-foreground'>{el.index || '-'}</span>
                                                <span>{el.name}</span>
                                            </div>
                                            <Plus className='h-4 w-4 text-muted-foreground'/>
                                         </CommandItem>
                                     ))}
                                 </CommandGroup>
                             )}
                        </CommandList>
                     </Command>
                 </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-auto pt-3 border-t">
                 <Button type="button" variant="outline" size="sm" onClick={handleRemoveLastElement} disabled={currentPath.length === 0}>
                     <X className="mr-1 h-3 w-3" /> Remove Last
                 </Button>
                 <Button type="button" size="sm" onClick={handleConfirmPath} disabled={currentPath.length === 0}>
                     Add This Path
                 </Button>
             </div>
         </div>
    );
};
// --- End Element Browser ---


const SignaturePathSelector: React.FC<SignaturePathSelectorProps> = ({ label, elementIdPaths, onChange, className }) => {
  const { token } = useAuth();
  const [resolvedPaths, setResolvedPaths] = useState<ResolvedPath[]>([]);
  const [isLoadingPaths, setIsLoadingPaths] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  // Resolve paths whenever elementIdPaths changes
  useEffect(() => {
    const resolveAllPaths = async () => {
        if (!token || elementIdPaths.length === 0) {
            setResolvedPaths([]);
            return;
        }
        setIsLoadingPaths(true);
        const resolved: ResolvedPath[] = [];
        try {
            for (const idPath of elementIdPaths) {
                if (idPath.length === 0) continue; // Skip empty paths
                const elementsInPath: (SignatureElement | null)[] = await Promise.all(
                    idPath.map(id =>
                        api.getSignatureElementById(id, [], token)
                           .catch(() => null)
                    )
                );
                 const displayString = elementsInPath
                     .map((el: SignatureElement | null) => {
                         if (el) {
                             return `${el.index ? `[${el.index}]` : ''}${el.name}`;
                         } else {
                             return `[Fetch Error]`;
                         }
                     })
                     .join(' / ');
                 resolved.push({ idPath, display: displayString });
            }
             setResolvedPaths(resolved.sort((a, b) => a.display.localeCompare(b.display)));
        } catch (error) {
             console.error("Error resolving signature paths:", error);
             setResolvedPaths(elementIdPaths.map(p => ({idPath: p, display: `[${p.join(' / ')}] (Error)`})));
        } finally {
            setIsLoadingPaths(false);
        }

    };
    resolveAllPaths();
  }, [elementIdPaths, token]);

  const addPath = (newPath: number[]) => {
      const newPathStr = JSON.stringify(newPath);
      if (!elementIdPaths.some(p => JSON.stringify(p) === newPathStr)) {
          onChange([...elementIdPaths, newPath]);
      }
      setIsBrowserOpen(false);
  };

  const removePath = (pathToRemove: number[]) => {
    const pathToRemoveStr = JSON.stringify(pathToRemove);
    onChange(elementIdPaths.filter(p => JSON.stringify(p) !== pathToRemoveStr));
  };

  return (
    // Use flex column layout, REMOVED h-full
    <div className={cn("flex flex-col space-y-2 rounded border p-3 bg-muted", className)}>
      {/* Header row remains flex */}
      <div className="flex justify-between items-center mb-1">
         <Label className='text-sm font-medium'>{label}</Label>
         <Popover open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
             <PopoverTrigger asChild>
                <Button type="button" size="sm" variant="outline" className='shrink-0'>
                    <Plus className="mr-1 h-3 w-3" /> Add Path
                </Button>
             </PopoverTrigger>
             <PopoverContent className="w-[450px]" align="start">
                 <ElementBrowserPopoverContent onSelectPath={addPath} />
             </PopoverContent>
         </Popover>
       </div>
      {/* Display Area for Selected Paths - Reduced min-h */}
      <div className="flex-grow space-y-1 min-h-[40px] max-h-[150px] overflow-y-auto border rounded bg-background p-2"> {/* Reduced min-h */}
         {isLoadingPaths && <div className='flex justify-center p-2'><LoadingSpinner size='sm' /></div>}
         {!isLoadingPaths && resolvedPaths.map((resolved, index) => (
          <div key={index} className="flex items-center justify-between gap-2 rounded bg-muted p-1 px-2 text-sm">
            <span className="font-mono text-xs flex-grow break-words min-w-0">
                {resolved.display || <span className='italic text-muted-foreground'>Empty Path</span>}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removePath(resolved.idPath)}
              aria-label={`Remove path ${resolved.display}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
         {!isLoadingPaths && elementIdPaths.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-1">No paths added.</p>}
      </div>
    </div>
  );
};

export default SignaturePathSelector;