import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Plus, Search as SearchIcon, ChevronsUpDown, ArrowRight, Network, Ban, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, CreateSignatureElementInput } from '../../../../backend/src/functionalities/signature/element/models';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { SearchRequest, SearchQueryElement } from '../../../../backend/src/utils/search'; // Added SearchQueryElement
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ElementForm from '@/components/signatures/ElementForm';
import useDebounce from './useDebounce'; // Import the extracted hook

type SelectionMode = "free" | "hierarchical"; // Define selection modes

// --- Element Browser Component (Internal - Popover Content) ---
interface ElementBrowserPopoverContentProps {
    onSelectSignature: (signature: number[]) => void;
    onClose: () => void; // Callback to close the parent Popover
}

const MAX_SEARCH_RESULTS = 200;
const DEBOUNCE_DELAY = 300;

// Helper function for sorting elements by index or name
const compareElements = (a: SignatureElement, b: SignatureElement): number => {
    const valA = a.index ?? a.name ?? ''; // Ensure string fallback
    const valB = b.index ?? b.name ?? ''; // Ensure string fallback

    // Attempt numeric sort if both look like numbers
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    }
    // Fallback to locale string comparison
    return valA.localeCompare(valB);
};


const ElementBrowserPopoverContent: React.FC<ElementBrowserPopoverContentProps> = ({
    onSelectSignature,
    onClose, // This closes the MAIN popover
}) => {
    const { token } = useAuth();
    const [components, setComponents] = useState<SignatureComponent[]>([]);
    const [selectedComponentId, setSelectedComponentId] = useState<string>('');
    const [elements, setElements] = useState<SignatureElement[]>([]);
    const [currentSignatureElements, setCurrentSignatureElements] = useState<SignatureElement[]>([]);
    const [isLoadingComponents, setIsLoadingComponents] = useState(false);
    const [isLoadingElements, setIsLoadingElements] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [mode, setMode] = useState<SelectionMode>("hierarchical");
    const [error, setError] = useState<string | null>(null);

    // --- State for Create Element Dialog (Managed Internally) ---
    const [isCreateElementDialogOpen, setIsCreateElementDialogOpen] = useState(false);
    const [componentForCreate, setComponentForCreate] = useState<SignatureComponent | null>(null);
    // Use state to trigger element refetch after creation
    const [refetchElementsTrigger, setRefetchElementsTrigger] = useState(0);
    // --------------------------------------------

    const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);

    // Fetch Components
    useEffect(() => {
        const fetchComps = async () => {
            if (!token) return;
            setIsLoadingComponents(true);
            setError(null);
            try {
                setComponents((await api.getAllSignatureComponents(token)).sort((a,b) => a.name.localeCompare(b.name)));
            } catch (err: any) {
                setError(err.message || "Failed to load components");
                console.error("Failed to load components", err);
            } finally { setIsLoadingComponents(false); }
        };
        fetchComps();
    }, [token]);

    // Fetch Elements based on dependencies including the refetch trigger
    useEffect(() => {
        const fetchElems = async () => {
            setError(null);
            if (!token) { setElements([]); setIsLoadingElements(false); return; }

            const lastElementId = mode === 'hierarchical' && currentSignatureElements.length > 0 ? currentSignatureElements[currentSignatureElements.length - 1].signatureElementId : undefined;
            const componentIdToFetch = selectedComponentId ? parseInt(selectedComponentId, 10) : undefined;
            const hasSearchTerm = debouncedSearchTerm.trim().length > 0;
            const isComponentSelected = componentIdToFetch !== undefined && !isNaN(componentIdToFetch);

            const searchRequest: SearchRequest = { query: [], page: 1, pageSize: MAX_SEARCH_RESULTS };
            let shouldFetch = false;
            const queryFilters: SearchQueryElement[] = [];

            // --- Determine Filters Based on Mode and State ---

            if (hasSearchTerm) {
                // Search Term Active: Filter primarily by search term, optionally by component
                queryFilters.push({ field: 'name', condition: 'FRAGMENT', value: debouncedSearchTerm.trim(), not: false });
                if (isComponentSelected) {
                    queryFilters.push({ field: 'signatureComponentId', condition: 'EQ', value: componentIdToFetch, not: false });
                }
                shouldFetch = true;
            } else {
                // No Search Term
                if (mode === 'hierarchical') {
                    if (lastElementId) {
                        // Subsequent Hierarchical Step: Filter by parent
                        queryFilters.push({ field: 'parentIds', condition: 'ANY_OF', value: [lastElementId], not: false });
                        shouldFetch = true;
                        // DO NOT filter by componentId here - parent link is the key
                    } else if (isComponentSelected) {
                        // Initial Hierarchical Step: Filter by component, show all elements
                        queryFilters.push({ field: 'signatureComponentId', condition: 'EQ', value: componentIdToFetch, not: false });
                        // NO parent filter here - show roots and non-roots
                        shouldFetch = true;
                    }
                } else { // Free Mode (and no search term)
                    if (isComponentSelected) {
                        // Filter by component only
                        queryFilters.push({ field: 'signatureComponentId', condition: 'EQ', value: componentIdToFetch, not: false });
                        shouldFetch = true;
                    }
                    // Else (Free mode, no component, no search): Don't fetch anything
                }
            }

            // --- Execute Fetch if Necessary ---
            if (!shouldFetch) {
                setElements([]); setIsLoadingElements(false); return;
            }

            searchRequest.query = queryFilters;
            setIsLoadingElements(true);
            try {
                console.log("Fetching elements with query:", JSON.stringify(searchRequest.query)); // Debug log
                const response = await api.searchSignatureElements(searchRequest, token);
                setElements(response.data.sort(compareElements));
            } catch (err: any) {
                setError(err.message || "Failed to load elements");
                console.error("Failed to load elements", err); setElements([]);
            } finally { setIsLoadingElements(false); }
        };
        fetchElems();
    }, [token, selectedComponentId, mode, currentSignatureElements, debouncedSearchTerm, refetchElementsTrigger]); // Dependencies


    const handleSelectElement = (element: SignatureElement) => {
        setCurrentSignatureElements([...currentSignatureElements, element]);
        setSearchTerm(''); // Clear search after selecting
        if (mode === 'free') {
            setSelectedComponentId(''); // Reset component selection in free mode
        }
    };

    const handleRemoveLastElement = () => {
        const newPath = currentSignatureElements.slice(0, -1);
        setCurrentSignatureElements(newPath);
        // If removing the first element in hierarchical mode, reset component ID
        if (mode === 'hierarchical' && newPath.length === 0) {
            setSelectedComponentId('');
        }
    };

    const handleConfirmSignature = () => {
        if (currentSignatureElements.length > 0) {
            onSelectSignature(currentSignatureElements.map(el => el.signatureElementId!));
            setCurrentSignatureElements([]); setSelectedComponentId(''); setSearchTerm(''); setError(null);
            onClose(); // Close the main popover after selection
        }
    };

    // --- Handler for Opening Create Element Dialog ---
    const handleOpenCreateElementDialog = () => {
        const component = components.find(c => String(c.signatureComponentId) === selectedComponentId);
        if (component) {
            setComponentForCreate(component);
            setIsCreateElementDialogOpen(true);
        } else { toast.error("Cannot create element: Select a valid component first."); }
    };

    // --- Handler for After Element Creation ---
    // This function is called when the ElementForm (in the inner dialog) saves.
    const handleElementCreated = useCallback((createdElement: SignatureElement | null) => {
        console.log("ElementBrowserPopoverContent: handleElementCreated called with:", createdElement);
        // 1. Close the INNER "Create Element" Dialog
        setIsCreateElementDialogOpen(false);
        setComponentForCreate(null);

        if (createdElement) {
            toast.success(`Element "${createdElement.name}" created.`);
            // 2. Trigger a refetch of elements for the current view
            console.log("ElementBrowserPopoverContent: Triggering element refetch.");
            setRefetchElementsTrigger(prev => prev + 1);
        } else {
            console.warn("ElementBrowserPopoverContent: Element creation/update reported failure or no change.");
            // Toast for failure might already be handled in ElementForm
        }
        // 3. IMPORTANT: Do NOT close the MAIN Popover here. The user should still be able to
        //    select more elements or confirm the signature. The main Popover is closed by `onClose`
        //    which is only called via `handleConfirmSignature` or clicking outside.
    }, []); // Dependencies: none, relies on closure


    // Filter elements based on the *immediate* searchTerm for responsive UI filtering
    // This is now less critical as the fetch logic uses debounced term, but good for instant feedback
    const filteredElements = useMemo(() => {
        return elements.filter(el =>
           !currentSignatureElements.some(p => p.signatureElementId === el.signatureElementId) &&
           (el.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           el.index?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [elements, currentSignatureElements, searchTerm]);

    const selectedComponentName = components.find(c => String(c.signatureComponentId) === selectedComponentId)?.name;

    const getNextStepPrompt = (): string => {
        if (mode === 'hierarchical') {
            if (currentSignatureElements.length === 0) return "1. Select Component to Start";
            return `2. Select Child of "${currentSignatureElements[currentSignatureElements.length - 1].name}"`;
        } else { // Free mode
            if (currentSignatureElements.length === 0) return "1. Select Component (Optional)";
            return "2. Select Next Component or Element";
        }
    };


    // Determine if the Create Element button should be enabled
    const canTriggerCreateElement = !!selectedComponentId && !isLoadingComponents && !isNaN(parseInt(selectedComponentId, 10)) &&
                                   (mode === 'free' || currentSignatureElements.length === 0); // Only allow root creation in hierarchical


    return (
        <div className="space-y-3 p-4 w-full">
            {/* Mode Selector */}
            <div className='flex flex-col gap-1.5'>
                <Label className='text-xs font-medium'>Selection Mode</Label>
                <ToggleGroup type="single" value={mode} defaultValue="hierarchical" onValueChange={(value: SelectionMode) => { if (value) { setMode(value); setCurrentSignatureElements([]); setSelectedComponentId(''); setSearchTerm(''); setError(null); } }} aria-label="Signature Selection Mode" size="sm">
                    <ToggleGroupItem value="hierarchical" aria-label="Hierarchical selection" className='flex-1 gap-1'><Network className='h-4 w-4'/><span className={cn(mode === 'hierarchical' && 'font-bold')}>Hierarchical</span></ToggleGroupItem>
                    <ToggleGroupItem value="free" aria-label="Free selection" className='flex-1 gap-1'><ArrowRight className='h-4 w-4'/><span className={cn(mode === 'free' && 'font-bold')}>Free</span></ToggleGroupItem>
                </ToggleGroup>
                <p className='text-xs text-muted-foreground px-1'>{mode === 'hierarchical' ? 'Select elements based on parent-child relationships.' : 'Select elements from any component.'}</p>
            </div>

             {/* Current Signature Display */}
             <div className="flex flex-wrap items-center gap-1 border rounded p-2 bg-muted min-h-[40px]">
                 <Label className='mr-2 shrink-0 text-xs font-semibold'>Current Signature:</Label>
                {currentSignatureElements.map((el, index) => (
                    <React.Fragment key={el.signatureElementId}>
                       {index > 0 && <span className="text-xs text-muted-foreground">/</span>}
                       <Badge variant="secondary" className='font-mono text-xs'>{el.index ? `[${el.index}] ` : ''}{el.name}</Badge>
                    </React.Fragment>
                 ))}
                 {currentSignatureElements.length === 0 && <span className="text-xs text-muted-foreground italic">Build signature below...</span>}
            </div>

            {/* Component Selector */}
            {(currentSignatureElements.length === 0 || mode === 'free') && (
                 <Select value={selectedComponentId} onValueChange={setSelectedComponentId} disabled={isLoadingComponents || (mode === 'hierarchical' && currentSignatureElements.length > 0)}>
                     <SelectTrigger className='w-full text-sm h-9'><SelectValue placeholder={getNextStepPrompt()} /></SelectTrigger>
                     <SelectContent>
                         {isLoadingComponents && <SelectItem value="loading" disabled><div className='flex items-center'><LoadingSpinner size='sm' className='mr-2'/>Loading...</div></SelectItem>}
                         {components.map(comp => (<SelectItem key={comp.signatureComponentId} value={String(comp.signatureComponentId)}>{comp.name}</SelectItem>))}
                         {!isLoadingComponents && components.length === 0 && <SelectItem value="no-comps" disabled>No components found</SelectItem>}
                     </SelectContent>
                 </Select>
            )}

            {/* Element Selector/Search */}
            {/* Condition to show: Determined by `shouldFetch` logic within useEffect essentially */}
             {(
                (mode === 'hierarchical' && (currentSignatureElements.length > 0 || selectedComponentId)) ||
                (mode === 'free' && (selectedComponentId || debouncedSearchTerm.trim()))
             ) && (
                <div className="flex-1 overflow-hidden flex flex-col gap-2">
                     <Label className='text-xs mb-1 block'>
                         {mode === 'hierarchical'
                            ? currentSignatureElements.length > 0 ? `Select Child of "${currentSignatureElements[currentSignatureElements.length - 1].name}"` : `Select Element in "${selectedComponentName || '...'}"`
                            : selectedComponentName ? `Select Element from "${selectedComponentName}"` : 'Search Elements by Name'
                         }
                     </Label>
                    <Command className='rounded-lg border shadow-sm' filter={() => 1}> {/* Disable default filtering */}
                        <CommandInput placeholder="Search available elements..." value={searchTerm} onValueChange={setSearchTerm} disabled={isLoadingElements}/>
                         <CommandList className="max-h-[200px]">
                             {isLoadingElements && <div className='p-4 text-center'><LoadingSpinner size='sm' /></div>}
                             {error && !isLoadingElements && <CommandEmpty className='text-destructive px-2 py-4 text-center'>{error}</CommandEmpty>}
                             {/* Use 'elements' directly from fetched state */}
                             {!error && !isLoadingElements && elements.length === 0 && <CommandEmpty>No matching elements found.</CommandEmpty>}
                             {!error && !isLoadingElements && elements.length > 0 && (
                                 <CommandGroup heading={`Available Elements (${elements.length}${elements.length >= MAX_SEARCH_RESULTS ? '+' : ''})`}>
                                     {/* Map over fetched 'elements' */}
                                     {elements.map((el) => (
                                        <CommandItem key={el.signatureElementId} value={`${el.index || ''} ${el.name}`} onSelect={() => handleSelectElement(el)} className="cursor-pointer flex justify-between items-center text-sm">
                                            <div className='flex items-center'><span className='font-mono text-xs w-10 mr-2 text-right inline-block text-muted-foreground'>{el.index || '-'}</span><span>{el.name}</span></div>
                                            <Plus className='h-4 w-4 text-muted-foreground'/>
                                         </CommandItem>
                                     ))}
                                 </CommandGroup>
                             )}
                             {elements.length >= MAX_SEARCH_RESULTS && !isLoadingElements && (<div className='text-xs text-muted-foreground text-center p-1 italic'>More elements may exist. Refine your search.</div>)}
                        </CommandList>
                         {canTriggerCreateElement && (
                             <div className='p-2 border-t'>
                                <Button type="button" variant="outline" size="sm" className='w-full justify-start text-muted-foreground' onClick={handleOpenCreateElementDialog}>
                                    <PlusCircle className='mr-2 h-4 w-4'/> Create New Element in "{selectedComponentName}"...
                                </Button>
                             </div>
                         )}
                     </Command>
                 </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-auto pt-3 border-t">
                <div className='flex gap-2'>
                     <Button type="button" variant="outline" size="sm" onClick={handleRemoveLastElement} disabled={currentSignatureElements.length === 0}><X className="mr-1 h-3 w-3" /> Remove Last</Button>
                     <Button type="button" variant="ghost" size="sm" onClick={onClose}><Ban className='mr-1 h-3 w-3'/> Cancel</Button> {/* This button closes the main popover */}
                </div>
                 <Button type="button" size="sm" onClick={handleConfirmSignature} disabled={currentSignatureElements.length === 0}>Add This Signature</Button>
             </div>

            {/* Create Element Dialog (Rendered Internally) */}
            <Dialog open={isCreateElementDialogOpen} onOpenChange={setIsCreateElementDialogOpen}>
               <DialogContent className="sm:max-w-[600px]">
                   <DialogHeader><DialogTitle>Create New Element</DialogTitle></DialogHeader>
                   {/* Pass the callback function to ElementForm */}
                   {componentForCreate && (
                       <ElementForm
                            elementToEdit={null}
                            currentComponent={componentForCreate}
                            onSave={handleElementCreated} // Pass the special handler
                        />
                   )}
               </DialogContent>
            </Dialog>
         </div>
    );
};

export default ElementBrowserPopoverContent;