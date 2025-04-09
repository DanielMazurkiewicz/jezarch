import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Search as SearchIcon } from 'lucide-react'; // Added SearchIcon
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Added Dialog
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"; // Added Command
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select
import LoadingSpinner from './LoadingSpinner'; // Added LoadingSpinner
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models'; // Added types
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models'; // Added types
import { cn } from '@/lib/utils';

type ResolvedPath = { idPath: number[]; display: string };

interface SignaturePathSelectorProps {
  label: string;
  elementIdPaths: number[][]; // Array of paths, e.g., [[1, 5], [1, 8, 3]]
  onChange: (newPaths: number[][]) => void;
  className?: string;
}

// --- Element Browser Component (Internal) ---
interface ElementBrowserProps {
    onSelectPath: (path: number[]) => void;
}

const ElementBrowser: React.FC<ElementBrowserProps> = ({ onSelectPath }) => {
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
                setComponents(await api.getAllSignatureComponents(token));
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
                // Fetch all elements for the component for browsing
                const allElements = await api.getElementsByComponent(parseInt(selectedComponentId), token);
                setElements(allElements);
            } catch (err) { console.error("Failed to load elements", err); setElements([]); }
             finally { setIsLoadingElements(false); }
        };
        fetchElems();
    }, [token, selectedComponentId]);

    const handleSelectElement = (element: SignatureElement) => {
        setCurrentPath([...currentPath, element]);
        // Ideally, fetch next level if hierarchical components exist,
        // for now, just add to path. Reset component/element lists if needed.
        setSelectedComponentId(''); // Clear component selection to browse next level? Needs design decision.
        setSearchTerm('');
    };

    const handleRemoveLastElement = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    const handleConfirmPath = () => {
        if (currentPath.length > 0) {
            onSelectPath(currentPath.map(el => el.signatureElementId!));
            setCurrentPath([]); // Reset after confirming
        }
    };

     const filteredElements = elements.filter(el =>
        !currentPath.some(p => p.signatureElementId === el.signatureElementId) && // Don't show already selected in path
        (el.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        el.index?.toLowerCase().includes(searchTerm.toLowerCase()))
     );


    return (
        <div className="space-y-3 max-h-[60vh] flex flex-col">
            {/* Current Path Display */}
             <div className="flex flex-wrap items-center gap-1 border-b pb-2 mb-2 min-h-[30px]">
                <Label className='mr-2 shrink-0'>Building Path:</Label>
                {currentPath.map((el, index) => (
                    <Badge key={el.signatureElementId} variant="secondary">
                         {el.index ? `[${el.index}] ` : ''}{el.name}
                    </Badge>
                 ))}
                 {currentPath.length === 0 && <span className="text-xs text-muted-foreground italic">Select component then elements...</span>}
            </div>

             {/* Component Selector */}
             <div className="flex items-center gap-2">
                <Label className='w-[100px] shrink-0 text-right pr-2'>Component:</Label>
                 <Select value={selectedComponentId} onValueChange={setSelectedComponentId} disabled={isLoadingComponents}>
                     <SelectTrigger className='flex-grow'>
                         <SelectValue placeholder="Select Component..." />
                     </SelectTrigger>
                     <SelectContent>
                         {isLoadingComponents && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                         {components.map(comp => (
                             <SelectItem key={comp.signatureComponentId} value={String(comp.signatureComponentId)}>
                                 {comp.name}
                             </SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
             </div>

            {/* Element Selector/Search */}
            {selectedComponentId && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Command className='rounded-lg border shadow-md'>
                        <CommandInput
                            placeholder="Search elements by name or index..."
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />
                         <CommandList className="max-h-[250px]">
                             {isLoadingElements && <div className='p-4 text-center'><LoadingSpinner /></div>}
                             <CommandEmpty>No elements found.</CommandEmpty>
                             {!isLoadingElements && filteredElements.length > 0 && (
                                 <CommandGroup heading="Select Next Element">
                                     {filteredElements.map((el) => (
                                        <CommandItem
                                            key={el.signatureElementId}
                                            value={`${el.index || ''} ${el.name}`}
                                            onSelect={() => handleSelectElement(el)}
                                            className="cursor-pointer flex justify-between"
                                        >
                                            <span>
                                                <span className='font-mono text-xs w-10 mr-2 text-right inline-block'>{el.index || '-'}</span>
                                                <span>{el.name}</span>
                                            </span>
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
                     Confirm Path
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
                // Fetch details for each element in the path
                const namesAndIndices = await Promise.all(
                    idPath.map(id =>
                        api.getSignatureElementById(id, [], token)
                           .then(el => el ? `${el.index ? `[${el.index}]` : ''}${el.name}` : `[ID:${id}? ]`)
                           .catch(() => `[ID:${id} ERR]`) // Handle fetch errors for individual elements
                    )
                );
                 resolved.push({ idPath, display: namesAndIndices.join(' / ') });
            }
             setResolvedPaths(resolved);
        } catch (error) {
             console.error("Error resolving signature paths:", error);
             // Fallback to showing IDs on error
             setResolvedPaths(elementIdPaths.map(p => ({idPath: p, display: `[${p.join(' > ')}] (Error)`})));
        } finally {
            setIsLoadingPaths(false);
        }

    };
    resolveAllPaths();
  }, [elementIdPaths, token]);

  const addPath = (newPath: number[]) => {
      // Avoid adding duplicate paths
      const newPathStr = JSON.stringify(newPath);
      if (!elementIdPaths.some(p => JSON.stringify(p) === newPathStr)) {
          onChange([...elementIdPaths, newPath]);
      }
      setIsBrowserOpen(false); // Close dialog after selection
  };

  const removePath = (pathToRemove: number[]) => {
    const pathToRemoveStr = JSON.stringify(pathToRemove);
    onChange(elementIdPaths.filter(p => JSON.stringify(p) !== pathToRemoveStr));
  };

  return (
    <div className={cn("space-y-2 rounded border p-3 bg-muted/30", className)}>
      <div className="flex justify-between items-center mb-1">
         <Label>{label}</Label>
         <Dialog open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
             <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                    <Plus className="mr-1 h-3 w-3" /> Add Path
                </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Build Signature Path</DialogTitle>
                </DialogHeader>
                 <ElementBrowser onSelectPath={addPath} />
             </DialogContent>
         </Dialog>
       </div>
      <div className="space-y-1 min-h-[40px]">
         {isLoadingPaths && <div className='flex justify-center p-2'><LoadingSpinner size='sm' /></div>}
         {!isLoadingPaths && resolvedPaths.map((resolved, index) => (
          <div key={index} className="flex items-center justify-between gap-2 rounded bg-background p-1 px-2 text-sm border">
            <Badge variant="secondary" className="font-mono truncate flex-grow text-left justify-start h-auto py-0.5 whitespace-normal">
                {resolved.display || <span className='italic text-muted-foreground'>Empty Path</span>}
            </Badge>
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