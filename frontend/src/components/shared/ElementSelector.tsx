import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For Component selection
import { Label } from '@/components/ui/label'; // Import Label
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import Spinner
import { t } from '@/translations/utils'; // Import translation utility

interface ElementSelectorProps {
    selectedElementIds: number[]; // IDs of the selected parent elements
    onChange: (selectedIds: number[]) => void;
    currentComponentId?: number; // Optional: Exclude elements from this component
    currentElementId?: number; // Optional: Exclude the element itself
    label?: string;
    className?: string; // Allow passing additional classes
}

const ElementSelector: React.FC<ElementSelectorProps> = ({
    selectedElementIds,
    onChange,
    currentComponentId,
    currentElementId,
    label, // Use the passed label prop
    className
}) => {
    const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
    const [availableComponents, setAvailableComponents] = useState<SignatureComponent[]>([]);
    const [searchComponentId, setSearchComponentId] = useState<string>(""); // Component ID to search within
    const [availableElements, setAvailableElements] = useState<SignatureElement[]>([]); // Elements in the selected component
    const [isLoadingComponents, setIsLoadingComponents] = useState(false);
    const [isLoadingElements, setIsLoadingElements] = useState(false);
    const [isLoadingSelectedDetails, setIsLoadingSelectedDetails] = useState(false); // Loading for selected badges
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [selectedElementObjects, setSelectedElementObjects] = useState<SignatureElement[]>([]); // Holds full objects for selected IDs for badges
    const [searchTerm, setSearchTerm] = useState(""); // Search within the popover

    // Fetch Components
    useEffect(() => {
        const fetchComps = async () => {
            if (!token) return;
            setIsLoadingComponents(true);
            setError(null);
            try {
                const comps = await api.getAllSignatureComponents(token);
                setAvailableComponents(comps.sort((a,b) => a.name.localeCompare(b.name))); // Sort components
            } catch (err: any) {
                const msg = err.message || t('componentLoadFailedError', preferredLanguage);
                setError(msg);
            } finally {
                setIsLoadingComponents(false);
            }
        };
        fetchComps();
    }, [token, preferredLanguage]); // Add preferredLanguage

    // Fetch Elements when searchComponentId changes
    useEffect(() => {
        const fetchElems = async () => {
            if (!token || !searchComponentId) {
                 setAvailableElements([]); // Clear if no component selected
                 return;
            };
            setIsLoadingElements(true);
            setError(null);
            try {
                const elems = await api.getElementsByComponent(parseInt(searchComponentId), token);
                 // Filter out the current element being edited
                 setAvailableElements(
                    elems
                        .filter(el => el.signatureElementId !== currentElementId)
                        .sort((a,b) => (a.index ?? a.name).localeCompare(b.index ?? b.name)) // Sort elements
                 );
            } catch (err: any) {
                const msg = err.message || t('elementLoadFailedError', preferredLanguage);
                setError(msg);
                setAvailableElements([]);
            } finally {
                setIsLoadingElements(false);
            }
        };
        fetchElems();
    }, [token, searchComponentId, currentElementId, preferredLanguage]); // Add preferredLanguage


    // Fetch details for selected elements (for badges) when selected IDs change
    useEffect(() => {
        const fetchSelectedDetails = async () => {
            if (!token || selectedElementIds.length === 0) {
                setSelectedElementObjects([]);
                return;
            }
            setIsLoadingSelectedDetails(true);
            try {
                 // Fetch details for each selected ID
                 const detailsPromises = selectedElementIds.map(id =>
                     api.getSignatureElementById(id, [], token).catch(() => null) // Return null on error for one ID
                 );
                 const results = await Promise.all(detailsPromises);
                 setSelectedElementObjects(results.filter((el): el is SignatureElement => el !== null)
                                            .sort((a,b) => a.name.localeCompare(b.name))); // Filter out nulls and sort
            } catch (err) {
                 console.error("Failed to fetch selected element details:", err);
                 setError(t('selectedElementLoadFailedError', preferredLanguage));
                 setSelectedElementObjects([]); // Clear on error
            } finally {
                 setIsLoadingSelectedDetails(false);
            }
        };
        fetchSelectedDetails();
    }, [token, selectedElementIds, preferredLanguage]); // Add preferredLanguage


    const handleSelectElement = (elementId: number) => {
        const newSelectedIds = selectedElementIds.includes(elementId)
            ? selectedElementIds.filter(id => id !== elementId)
            : [...selectedElementIds, elementId];
        onChange(newSelectedIds);
        setSearchTerm(""); // Clear search within popover
        // Keep popover open
    };

    // Filter elements for the dropdown based on search term
    const filteredDropdownElements = useMemo(() => {
         return availableElements.filter(el =>
             (el.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             el.index?.toLowerCase().includes(searchTerm.toLowerCase()))
         );
    }, [availableElements, searchTerm]);


    return (
        // Use solid white background for the container
        <div className={cn('space-y-2 p-3 border rounded bg-white dark:bg-white', className)}> {/* Changed bg-muted to bg-white */}
            {/* Use the passed label prop, ensure text contrasts */}
            <Label className='text-sm font-medium text-neutral-700'>{label || t('elementParentElementsLabel', preferredLanguage)}</Label>
            {/* Component Selector */}
            <Select value={searchComponentId} onValueChange={setSearchComponentId} disabled={isLoadingComponents}>
                {/* SelectTrigger uses bg-white */}
                <SelectTrigger className='h-9 text-sm'>
                    {/* Use translated placeholder */}
                    <SelectValue placeholder={t('elementBrowserSelectComponentPlaceholder', preferredLanguage)} />
                </SelectTrigger>
                {/* SelectContent uses bg-white */}
                <SelectContent>
                    {isLoadingComponents && <SelectItem value="loading" disabled><div className='flex items-center'><LoadingSpinner size='sm' className='mr-2'/>{t('loadingText', preferredLanguage)}...</div></SelectItem>}
                    {availableComponents.map(comp => (
                        <SelectItem key={comp.signatureComponentId} value={String(comp.signatureComponentId)}>
                            {comp.name}
                        </SelectItem>
                    ))}
                     {/* Use translated placeholder */}
                     {!isLoadingComponents && availableComponents.length === 0 && <SelectItem value="no-comps" disabled>{t('componentNoComponentsFound', preferredLanguage)}</SelectItem>}
                </SelectContent>
            </Select>

            {/* Element Multi-Select Popover */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between min-h-[36px] font-normal" // Button variant="outline" uses bg-white
                        disabled={isLoadingElements || !searchComponentId || !!error}
                    >
                        <span className='truncate'>
                            {/* Use translated placeholders/states */}
                            {isLoadingElements ? t('elementBrowserLoadingElements', preferredLanguage) :
                             !searchComponentId ? t('elementBrowserSelectComponentFirst', preferredLanguage) :
                             error ? t('errorText', preferredLanguage) :
                             t('elementBrowserSelectElements', preferredLanguage)}
                        </span>
                        {isLoadingElements ? <LoadingSpinner size='sm' className='ml-2'/> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                    </Button>
                </PopoverTrigger>
                {/* PopoverContent uses bg-white */}
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    {/* Command uses bg-white */}
                    <Command shouldFilter={false}> {/* Manual filtering */}
                        <CommandInput
                             // Use translated placeholder
                            placeholder={t('elementBrowserSearchPlaceholder', preferredLanguage)}
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />
                         {/* CommandList uses bg-white */}
                        <CommandList>
                             {/* Use translated states */}
                             {isLoadingElements && <div className='text-center p-2 text-sm text-neutral-600'><LoadingSpinner size='sm'/></div>}
                             <CommandEmpty>{!isLoadingElements && t('elementBrowserNoElementsFound', preferredLanguage)}</CommandEmpty>
                             {!isLoadingElements && filteredDropdownElements.length > 0 && (
                                 <CommandGroup>
                                    {filteredDropdownElements.map((el) => (
                                        <CommandItem
                                            key={el.signatureElementId}
                                            value={`${el.index || ''} ${el.name}`} // Search by index + name
                                            onSelect={() => {
                                                handleSelectElement(el.signatureElementId!);
                                            }}
                                            className='cursor-pointer text-sm' // Smaller text
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedElementIds.includes(el.signatureElementId!) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className='font-mono text-xs w-10 mr-2 text-right inline-block text-neutral-500'>{el.index || '-'}</span> {/* Styled Index */}
                                            <span className="text-neutral-900">{el.name}</span>
                                        </CommandItem>
                                    ))}
                                 </CommandGroup>
                             )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Display Selected Badges - Use light gray background for badges */}
            <div className="flex flex-wrap gap-1 pt-1 min-h-[22px]">
                 {isLoadingSelectedDetails && <LoadingSpinner size='sm'/>}
                 {!isLoadingSelectedDetails && selectedElementObjects.length > 0 && (
                    selectedElementObjects.map(el => (
                        <Badge key={el.signatureElementId} variant="secondary" className='items-center'>
                             <span>{el.index ? `[${el.index}] ` : ''}{el.name}</span>
                             <button
                                 type="button"
                                 className="ml-1 p-0.5 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-white/50 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1"
                                 onClick={() => handleSelectElement(el.signatureElementId!)}
                                 // Use translated aria-label
                                 aria-label={`${t('removeButton', preferredLanguage)} ${el.name}`}
                             >
                                <X className="h-3 w-3"/>
                             </button>
                        </Badge>
                    ))
                 )}
                 {/* Use translated placeholder */}
                 {!isLoadingSelectedDetails && selectedElementIds.length === 0 && (
                     <span className='text-xs text-neutral-500 italic'>{t('elementSelectorNoParentsSelected', preferredLanguage)}</span>
                 )}
            </div>

            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
};

export default ElementSelector;