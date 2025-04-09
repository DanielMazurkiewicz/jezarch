import React, { useState, useEffect } from 'react';
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
    label = "Select Parent Elements",
    className
}) => {
    const { token } = useAuth();
    const [availableComponents, setAvailableComponents] = useState<SignatureComponent[]>([]);
    const [searchComponentId, setSearchComponentId] = useState<string>(""); // Component ID to search within
    const [availableElements, setAvailableElements] = useState<SignatureElement[]>([]);
    const [isLoadingComponents, setIsLoadingComponents] = useState(false);
    const [isLoadingElements, setIsLoadingElements] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [selectedElementObjects, setSelectedElementObjects] = useState<SignatureElement[]>([]);

    // Fetch Components
    useEffect(() => {
        const fetchComps = async () => {
            if (!token) return;
            setIsLoadingComponents(true);
            setError(null);
            try {
                const comps = await api.getAllSignatureComponents(token);
                setAvailableComponents(comps);
            } catch (err: any) {
                setError(err.message || "Failed to load components");
            } finally {
                setIsLoadingComponents(false);
            }
        };
        fetchComps();
    }, [token]);

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
                 // Filter out the current element being edited and potentially elements from the same component if needed
                 setAvailableElements(
                    elems.filter(el =>
                         el.signatureElementId !== currentElementId
                         // && el.signatureComponentId !== currentComponentId // Uncomment if needed
                    )
                 );
            } catch (err: any) {
                setError(err.message || "Failed to load elements");
                setAvailableElements([]);
            } finally {
                setIsLoadingElements(false);
            }
        };
        fetchElems();
    }, [token, searchComponentId, currentElementId]); // Add currentElementId dependency


    const handleSelectElement = (elementId: number) => {
        const newSelectedIds = selectedElementIds.includes(elementId)
            ? selectedElementIds.filter(id => id !== elementId)
            : [...selectedElementIds, elementId];
        onChange(newSelectedIds);
    };

     // Resolve selected element objects whenever availableElements or selectedElementIds changes
     useEffect(() => {
         // We need a combined list of all potential elements across components if we want to display badges
         // for elements selected from components *other* than the currently searched one.
         // This is complex. A simpler approach: only display badges for elements belonging
         // to the currently selected searchComponentId.
        const currentlyVisibleSelected = availableElements.filter(el => selectedElementIds.includes(el.signatureElementId!));
        // If you need to show *all* selected regardless of current component search, you'd need
        // to fetch details for all selectedElementIds separately or maintain a global cache.
        setSelectedElementObjects(currentlyVisibleSelected);

     }, [selectedElementIds, availableElements]);


    return (
        <div className={cn('space-y-2 p-3 border rounded bg-muted/30', className)}>
            <Label>{label}</Label> {/* Use Label component */}
            {/* Component Selector */}
            <Select value={searchComponentId} onValueChange={setSearchComponentId} disabled={isLoadingComponents}>
                <SelectTrigger>
                    <SelectValue placeholder="Select Component to find parents..." />
                </SelectTrigger>
                <SelectContent>
                    {isLoadingComponents && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {availableComponents.map(comp => (
                        <SelectItem key={comp.signatureComponentId} value={String(comp.signatureComponentId)}>
                            {comp.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Element Multi-Select Popover */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between min-h-[36px]" // Ensure min height
                        disabled={isLoadingElements || !searchComponentId || !!error}
                    >
                        <span className='truncate'>
                            {isLoadingElements ? 'Loading elements...' :
                             selectedElementIds.length > 0 ? `${selectedElementIds.length} selected` : // Show total count
                             !searchComponentId ? 'Select component first' :
                             error ? 'Error loading elements' :
                             'Select elements...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Search elements..." />
                        <CommandList>
                             {isLoadingElements && <div className='text-center p-2 text-sm text-muted-foreground'>Loading...</div>}
                             <CommandEmpty>No elements found in this component.</CommandEmpty>
                             {!isLoadingElements && availableElements.length > 0 && (
                                 <CommandGroup>
                                    {availableElements.map((el) => (
                                        <CommandItem
                                            key={el.signatureElementId}
                                            value={`${el.index || ''} ${el.name}`} // Search by index + name
                                            onSelect={() => {
                                                handleSelectElement(el.signatureElementId!);
                                            }}
                                            className='cursor-pointer'
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedElementIds.includes(el.signatureElementId!) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className='font-mono text-xs w-10 mr-2 text-right'>{el.index || '-'}</span>
                                            <span>{el.name}</span>
                                        </CommandItem>
                                    ))}
                                 </CommandGroup>
                             )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Display Selected Badges - Show only those from the currently selected component */}
             {selectedElementObjects.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                    {selectedElementObjects.map(el => (
                        <Badge key={el.signatureElementId} variant="secondary">
                            {el.index ? `[${el.index}] ` : ''}{el.name}
                            <button
                                type="button"
                                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 p-0.5 hover:bg-muted"
                                onClick={() => handleSelectElement(el.signatureElementId!)}
                                aria-label={`Remove ${el.name}`}
                            >
                               <X className="h-3 w-3"/>
                            </button>
                        </Badge>
                    ))}
                     {/* Indicate if there are other selected elements not shown */}
                    {selectedElementIds.length > selectedElementObjects.length && (
                        <Badge variant="outline" className='italic text-muted-foreground'>
                            +{selectedElementIds.length - selectedElementObjects.length} more from other components
                        </Badge>
                    )}
                </div>
            )}

            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
};

export default ElementSelector;