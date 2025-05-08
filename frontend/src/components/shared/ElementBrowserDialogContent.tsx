import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // Added useRef
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
// Removed Popover imports
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { SearchRequest, SearchQueryElement } from '../../../../backend/src/utils/search';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Keep Dialog imports for internal create dialog
import ElementForm from '@/components/signatures/ElementForm';
import useDebounce from './useDebounce';
import { t } from '@/translations/utils'; // Import translation utility

type SelectionMode = "free" | "hierarchical";

interface ElementBrowserDialogContentProps { // Renamed interface
    onSelectSignature: (signature: number[]) => void;
    onCloseDialog: () => void; // Renamed prop
    initialPath?: number[];
}

const MAX_SEARCH_RESULTS = 200;
const DEBOUNCE_DELAY = 300;

const compareElements = (a: SignatureElement, b: SignatureElement): number => {
    const valA = a.index ?? a.name ?? '';
    const valB = b.index ?? b.name ?? '';
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return valA.localeCompare(valB);
};

// Renamed component
const ElementBrowserDialogContent: React.FC<ElementBrowserDialogContentProps> = ({
    onSelectSignature,
    onCloseDialog, // Use renamed prop
    initialPath = [],
}) => {
    const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
    const [components, setComponents] = useState<SignatureComponent[]>([]);
    const [selectedComponentId, setSelectedComponentId] = useState<string>('');
    const [elements, setElements] = useState<SignatureElement[]>([]);
    const [currentSignatureElements, setCurrentSignatureElements] = useState<SignatureElement[]>([]);
    const [isLoadingComponents, setIsLoadingComponents] = useState(false);
    const [isLoadingElements, setIsLoadingElements] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [mode, setMode] = useState<SelectionMode>("hierarchical");
    const [error, setError] = useState<string | null>(null);
    const [isCreateElementDialogOpen, setIsCreateElementDialogOpen] = useState(false);
    const [componentForCreate, setComponentForCreate] = useState<SignatureComponent | null>(null);
    const [refetchElementsTrigger, setRefetchElementsTrigger] = useState(0);

    const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);
    const stringifiedInitialPath = useMemo(() => JSON.stringify(initialPath), [initialPath]);

    // --- Ref for the search input ---
    const searchInputRef = useRef<HTMLInputElement>(null);
    // --------------------------------

    useEffect(() => {
        const resolveInitialPath = async () => {
            const currentInitialPath = JSON.parse(stringifiedInitialPath); // Use stable stringified version
            if (currentInitialPath.length === 0 || !token) {
                setCurrentSignatureElements([]);
                return;
            }
            setIsLoadingElements(true);
            try {
                const resolvedElements: SignatureElement[] = [];
                for (const elementId of currentInitialPath) {
                    const element = await api.getSignatureElementById(elementId, [], token);
                    if (element) resolvedElements.push(element);
                    else {
                        toast.warn(t('signaturePathResolveError', preferredLanguage, { elementId }));
                        setCurrentSignatureElements([]);
                        setIsLoadingElements(false);
                        return;
                    }
                }
                setCurrentSignatureElements(resolvedElements);
            } catch (err) {
                toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('signaturePathInitialResolveError', preferredLanguage) })); // Use translated error
                setCurrentSignatureElements([]);
            } finally {
                setIsLoadingElements(false);
            }
        };
        resolveInitialPath();
    }, [stringifiedInitialPath, token, preferredLanguage]); // Add preferredLanguage

    useEffect(() => {
        const fetchComps = async () => {
            if (!token) return;
            setIsLoadingComponents(true);
            setError(null);
            try {
                setComponents((await api.getAllSignatureComponents(token)).sort((a,b) => a.name.localeCompare(b.name)));
            } catch (err: any) {
                 const msg = err.message || t('componentLoadFailedError', preferredLanguage);
                setError(msg);
            } finally { setIsLoadingComponents(false); }
        };
        fetchComps();
    }, [token, preferredLanguage]); // Add preferredLanguage

    useEffect(() => {
        const fetchElems = async () => {
            setError(null);
            if (!token) { setElements([]); setIsLoadingElements(false); return; }

            const lastElementId = mode === 'hierarchical' && currentSignatureElements.length > 0 ? currentSignatureElements[currentSignatureElements.length - 1].signatureElementId : undefined;
            const componentIdToFetch = selectedComponentId ? parseInt(selectedComponentId, 10) : undefined;
            const hasSearchTerm = debouncedSearchTerm.trim().length > 0;
            const isComponentSelected = componentIdToFetch !== undefined && !isNaN(componentIdToFetch);
            let wasTriggeredBySearch = false; // Flag to track if fetch was due to search term

            const searchRequest: SearchRequest = { query: [], page: 1, pageSize: MAX_SEARCH_RESULTS };
            let shouldFetch = false;
            const queryFilters: SearchQueryElement[] = [];

            if (hasSearchTerm) {
                queryFilters.push({ field: 'name', condition: 'FRAGMENT', value: debouncedSearchTerm.trim(), not: false });
                if (isComponentSelected) {
                    queryFilters.push({ field: 'signatureComponentId', condition: 'EQ', value: componentIdToFetch, not: false });
                }
                shouldFetch = true;
                wasTriggeredBySearch = true; // Mark as search-triggered
            } else {
                if (mode === 'hierarchical') {
                    if (lastElementId) {
                        queryFilters.push({ field: 'parentIds', condition: 'ANY_OF', value: [lastElementId], not: false });
                        shouldFetch = true;
                    } else if (isComponentSelected) {
                        queryFilters.push({ field: 'signatureComponentId', condition: 'EQ', value: componentIdToFetch, not: false });
                         // For hierarchical top-level, also filter for elements *without* parents
                         queryFilters.push({ field: 'hasParents', condition: 'EQ', value: false, not: false });
                        shouldFetch = true;
                    }
                } else { // Free mode
                    if (isComponentSelected) {
                        queryFilters.push({ field: 'signatureComponentId', condition: 'EQ', value: componentIdToFetch, not: false });
                        shouldFetch = true;
                    }
                    // If free mode and NO component selected AND no search term, don't fetch anything
                }
            }


            if (!shouldFetch) {
                setElements([]); setIsLoadingElements(false); return;
            }

            searchRequest.query = queryFilters;
            setIsLoadingElements(true);
            try {
                const response = await api.searchSignatureElements(searchRequest, token);
                setElements(response.data.sort(compareElements));
            } catch (err: any) {
                 const msg = err.message || t('elementLoadFailedError', preferredLanguage);
                setError(msg); setElements([]);
            } finally {
                setIsLoadingElements(false);
                // --- Refocus input after search results load ---
                 if (wasTriggeredBySearch && searchInputRef.current) {
                     // Use requestAnimationFrame to ensure focus happens after render cycle
                     requestAnimationFrame(() => {
                         searchInputRef.current?.focus();
                     });
                 }
                 // ----------------------------------------------
            }
        };
        fetchElems();
    }, [token, selectedComponentId, mode, currentSignatureElements, debouncedSearchTerm, refetchElementsTrigger, preferredLanguage]); // Add preferredLanguage

    const handleSelectElement = useCallback((element: SignatureElement) => {
        setCurrentSignatureElements(prev => [...prev, element]);
        setSearchTerm('');
        if (mode === 'free') {
            setSelectedComponentId('');
        }
    }, [mode]);

    const handleRemoveLastElement = useCallback(() => {
        setCurrentSignatureElements(prev => {
            const newPath = prev.slice(0, -1);
            if (mode === 'hierarchical' && newPath.length === 0) {
                setSelectedComponentId('');
            }
            return newPath;
        });
    }, [mode]);

    const handleConfirmSignature = useCallback(() => {
        if (currentSignatureElements.length > 0) {
            onSelectSignature(currentSignatureElements.map(el => el.signatureElementId!));
            setCurrentSignatureElements([]); setSelectedComponentId(''); setSearchTerm(''); setError(null);
            onCloseDialog(); // Use renamed prop
        }
    }, [currentSignatureElements, onSelectSignature, onCloseDialog]); // Use renamed prop

    const handleOpenCreateElementDialog = useCallback(() => {
        const component = components.find(c => String(c.signatureComponentId) === selectedComponentId);
        if (component) {
            setComponentForCreate(component);
            setIsCreateElementDialogOpen(true);
        } else {
             toast.error(t('cannotCreateElementError', preferredLanguage));
        }
    }, [components, selectedComponentId, preferredLanguage]); // Add preferredLanguage

    const handleElementCreated = useCallback((createdElement: SignatureElement | null) => {
        setIsCreateElementDialogOpen(false);
        setComponentForCreate(null);
        if (createdElement) {
            toast.success(t('elementCreatedSuccess', preferredLanguage, { name: createdElement.name }));
            setRefetchElementsTrigger(prev => prev + 1);
        }
    }, [preferredLanguage]); // Add preferredLanguage

    const handleModeChange = useCallback((value: SelectionMode | null) => {
        if (value) {
            setMode(value);
            setCurrentSignatureElements([]);
            setSelectedComponentId('');
            setSearchTerm('');
            setError(null);
        }
    }, []);


    const filteredElements = useMemo(() => {
        return elements.filter(el =>
           !currentSignatureElements.some(p => p.signatureElementId === el.signatureElementId) &&
           (el.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           el.index?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [elements, currentSignatureElements, searchTerm]);

    const selectedComponentName = useMemo(() => components.find(c => String(c.signatureComponentId) === selectedComponentId)?.name, [components, selectedComponentId]);

    const getNextStepPrompt = useCallback((): string => {
        if (mode === 'hierarchical') {
            if (currentSignatureElements.length === 0) return t('elementBrowserSelectComponentFirst', preferredLanguage);
            return t('elementBrowserSelectChildOf', preferredLanguage, { name: currentSignatureElements[currentSignatureElements.length - 1].name });
        } else {
            if (currentSignatureElements.length === 0) return t('elementBrowserSelectComponentOptional', preferredLanguage); // TODO: Add elementBrowserSelectComponentOptional
            return t('elementBrowserSelectNextElement', preferredLanguage); // TODO: Add elementBrowserSelectNextElement
        }
    }, [mode, currentSignatureElements, preferredLanguage]); // Add preferredLanguage

     // Can create if a component is selected and it's free mode OR hierarchical mode at the root level
     const canTriggerCreateElement = useMemo(() => !!selectedComponentId && !isLoadingComponents && !isNaN(parseInt(selectedComponentId, 10)) &&
                                    (mode === 'free' || (mode === 'hierarchical' && currentSignatureElements.length === 0)),
                                    [selectedComponentId, isLoadingComponents, mode, currentSignatureElements]);

    return (
        // This component now renders the *content* of the dialog
        <div className="space-y-3 p-4 w-full flex flex-col h-full overflow-hidden"> {/* Added flex layout */}
            <div className="flex flex-col gap-3 shrink-0"> {/* Non-scrolling part */}
                <div className='flex flex-col gap-1.5'>
                    <Label className='text-xs font-medium'>{t('elementBrowserSelectionModeLabel', preferredLanguage)}</Label>
                    <ToggleGroup type="single" value={mode} defaultValue="hierarchical" onValueChange={handleModeChange} aria-label={t('elementBrowserSelectionModeLabel', preferredLanguage)} size="sm">
                        <ToggleGroupItem value="hierarchical" aria-label={t('elementBrowserModeHierarchical', preferredLanguage)} className='flex-1 gap-1'><Network className='h-4 w-4'/><span className={cn(mode === 'hierarchical' && 'font-bold')}>{t('elementBrowserModeHierarchical', preferredLanguage)}</span></ToggleGroupItem>
                        <ToggleGroupItem value="free" aria-label={t('elementBrowserModeFree', preferredLanguage)} className='flex-1 gap-1'><ArrowRight className='h-4 w-4'/><span className={cn(mode === 'free' && 'font-bold')}>{t('elementBrowserModeFree', preferredLanguage)}</span></ToggleGroupItem>
                    </ToggleGroup>
                    <p className='text-xs text-muted-foreground px-1'>{mode === 'hierarchical' ? t('elementBrowserModeHierarchicalHint', preferredLanguage) : t('elementBrowserModeFreeHint', preferredLanguage)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1 border rounded p-2 bg-muted min-h-[40px]">
                    <Label className='mr-2 shrink-0 text-xs font-semibold'>{t('elementBrowserPopoverCurrentPathLabel', preferredLanguage)}</Label>
                    {currentSignatureElements.map((el, index) => (
                        <React.Fragment key={el.signatureElementId}>
                        {index > 0 && <span className="text-xs text-muted-foreground">/</span>}
                        <Badge variant="secondary" className='font-mono text-xs'>{el.index ? `[${el.index}] ` : ''}{el.name}</Badge>
                        </React.Fragment>
                    ))}
                    {currentSignatureElements.length === 0 && <span className="text-xs text-muted-foreground italic">{t('elementBrowserBuildPathHint', preferredLanguage)}</span>}
                </div>

                {(currentSignatureElements.length === 0 || mode === 'free') && (
                    <Select value={selectedComponentId} onValueChange={setSelectedComponentId} disabled={isLoadingComponents || (mode === 'hierarchical' && currentSignatureElements.length > 0)}>
                        <SelectTrigger className='w-full text-sm h-9'><SelectValue placeholder={t('elementBrowserPopoverSelectComponentPlaceholder', preferredLanguage)} /></SelectTrigger>
                        <SelectContent>
                            {isLoadingComponents && <SelectItem value="loading" disabled><div className='flex items-center'><LoadingSpinner size='sm' className='mr-2'/>{t('elementBrowserPopoverLoadingComponents', preferredLanguage)}</div></SelectItem>}
                            {components.map(comp => (<SelectItem key={comp.signatureComponentId} value={String(comp.signatureComponentId)}>{comp.name}</SelectItem>))}
                            {!isLoadingComponents && components.length === 0 && <SelectItem value="no-comps" disabled>{t('elementBrowserPopoverNoComponentsFound', preferredLanguage)}</SelectItem>}
                        </SelectContent>
                    </Select>
                )}
            </div>

             {/* --- Scrollable Element List Area --- */}
             {(
                (mode === 'hierarchical' && (currentSignatureElements.length > 0 || selectedComponentId)) ||
                (mode === 'free' && (selectedComponentId || debouncedSearchTerm.trim()))
             ) && (
                <div className="flex-1 overflow-hidden flex flex-col gap-2 mt-3"> {/* Added mt-3 */}
                     <Label className='text-xs mb-1 block shrink-0'>
                         {getNextStepPrompt()}
                     </Label>
                    <Command className='rounded-lg border shadow-sm flex-grow overflow-hidden flex flex-col' filter={() => 1}> {/* flex-grow + overflow */}
                         {/* Attach the ref to CommandInput */}
                        <CommandInput
                            ref={searchInputRef}
                            placeholder={t('elementBrowserSearchPlaceholder', preferredLanguage)}
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            disabled={isLoadingElements}
                         />
                         {/* --------------------------- */}
                         {/* Ensure CommandList can grow and scroll */}
                         <CommandList className="flex-grow overflow-y-auto"> {/* Changed max-h to flex-grow */}
                             {isLoadingElements && <div className='p-4 text-center'><LoadingSpinner size='sm' /></div>}
                             {error && !isLoadingElements && <CommandEmpty className='text-destructive px-2 py-4 text-center'>{error}</CommandEmpty>}
                             {!error && !isLoadingElements && elements.length === 0 && <CommandEmpty>{t('elementBrowserPopoverNoElementsFound', preferredLanguage)}</CommandEmpty>}
                             {!error && !isLoadingElements && elements.length > 0 && (
                                 <CommandGroup heading={`${t('elementBrowserPopoverAvailableElementsHeading', preferredLanguage)} (${elements.length}${elements.length >= MAX_SEARCH_RESULTS ? '+' : ''})`}>
                                     {elements.map((el) => (
                                        <CommandItem key={el.signatureElementId} value={`${el.index || ''} ${el.name}`} onSelect={() => handleSelectElement(el)} className="cursor-pointer flex justify-between items-center text-sm">
                                            <div className='flex items-center'><span className='font-mono text-xs w-10 mr-2 text-right inline-block text-muted-foreground'>{el.index || '-'}</span><span>{el.name}</span></div>
                                            <Plus className='h-4 w-4 text-muted-foreground'/>
                                         </CommandItem>
                                     ))}
                                 </CommandGroup>
                             )}
                             {elements.length >= MAX_SEARCH_RESULTS && !isLoadingElements && (<div className='text-xs text-muted-foreground text-center p-1 italic'>{t('elementBrowserTooManyResultsHint', preferredLanguage)}</div>)} {/* TODO: Add elementBrowserTooManyResultsHint */}
                        </CommandList>
                         {canTriggerCreateElement && (
                             <div className='p-2 border-t shrink-0'> {/* shrink-0 */}
                                <Button type="button" variant="outline" size="sm" className='w-full justify-start text-muted-foreground' onClick={handleOpenCreateElementDialog}>
                                    <PlusCircle className='mr-2 h-4 w-4'/> {t('elementBrowserCreateElementButtonHint', preferredLanguage, { componentName: selectedComponentName || '...' })}
                                </Button>
                             </div>
                         )}
                     </Command>
                 </div>
            )}
             {/* --- End Scrollable Area --- */}

             {/* --- Dialog Footer --- */}
            <div className="flex justify-between items-center mt-auto pt-3 border-t shrink-0">
                <div className='flex gap-2'>
                     <Button type="button" variant="outline" size="sm" onClick={handleRemoveLastElement} disabled={currentSignatureElements.length === 0}><X className="mr-1 h-3 w-3" /> {t('elementBrowserPopoverRemoveLastButton', preferredLanguage)}</Button>
                     <Button type="button" variant="ghost" size="sm" onClick={onCloseDialog}><Ban className='mr-1 h-3 w-3'/> {t('cancelButton', preferredLanguage)}</Button>
                </div>
                 <Button type="button" size="sm" onClick={handleConfirmSignature} disabled={currentSignatureElements.length === 0}>{t('elementBrowserPopoverAddPathButton', preferredLanguage)}</Button>
             </div>
             {/* --- End Dialog Footer --- */}

             {/* --- Internal Create Element Dialog --- */}
            <Dialog open={isCreateElementDialogOpen} onOpenChange={setIsCreateElementDialogOpen}>
               <DialogContent className="sm:max-w-[600px]">
                   <DialogHeader><DialogTitle>{t('createElementDialogTitle', preferredLanguage)}</DialogTitle></DialogHeader>
                   {componentForCreate && (
                       <ElementForm
                            elementToEdit={null}
                            currentComponent={componentForCreate}
                            onSave={handleElementCreated}
                        />
                   )}
               </DialogContent>
            </Dialog>
         </div>
    );
};

// Export the renamed component
export default ElementBrowserDialogContent;
