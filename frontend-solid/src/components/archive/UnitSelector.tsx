import { Component, createSignal, createEffect, createMemo, For, Show, onCleanup, JSX, splitProps } from 'solid-js'; // Added JSX, splitProps
import { Portal } from 'solid-js/web'; // Added Portal
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { ArchiveDocument } from '../../../../backend/src/functionalities/archive/document/models';
import type { SearchRequest } from '../../../../backend/src/utils/search';

import { Input } from '@/components/ui/Input';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Icon } from '@/components/shared/Icon';
import { cn } from '@/lib/utils';
import styles from './UnitSelector.module.css'; // Import CSS Module (Typed)

// Renamed FormLabel inside this file to avoid conflict if ui/FormLabel is also imported
const UnitSelectorFormLabel: Component<JSX.LabelHTMLAttributes<HTMLLabelElement>> = (props) => {
    const [local, rest] = splitProps(props, ["class", "children"]);
    return <label class={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", local.class)} {...rest}>{local.children}</label>;
}


interface UnitSelectorProps {
    selectedUnitId: number | null;
    onChange: (selectedId: number | null) => void;
    class?: string;
    /** Prevent selecting the document that contains this selector */
    currentDocumentId?: number;
}

const UnitSelector: Component<UnitSelectorProps> = (props) => {
    const [authState] = useAuth();
    const [availableUnits, setAvailableUnits] = createSignal<ArchiveDocument[]>([]);
    const [isLoading, setIsLoading] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const [isOpen, setIsOpen] = createSignal(false);
    const [searchTerm, setSearchTerm] = createSignal("");
    const [triggerRef, setTriggerRef] = createSignal<HTMLButtonElement>();
    const [contentRef, setContentRef] = createSignal<HTMLDivElement>();
    const [contentStyle, setContentStyle] = createSignal({}); // For dynamic positioning

    // Fetch Units
    createEffect(async () => {
        const token = authState.token;
        if (!token) return;
        setIsLoading(true); setError(null);
        try {
            const searchRequest: SearchRequest = {
                query: [ { field: 'type', condition: 'EQ', value: 'unit', not: false } ],
                page: 1, pageSize: 500, // Adjust fetch size as needed
            };
            const response = await api.searchArchiveDocuments(searchRequest, token);
            const sortedUnits = response.data
                .filter(unit => unit.archiveDocumentId !== props.currentDocumentId) // Exclude self
                .sort((a, b) => a.title.localeCompare(b.title));
            setAvailableUnits(sortedUnits);
        } catch (err: any) {
            setError(err.message || "Failed to load units");
        } finally { setIsLoading(false); }
    });

    const handleSelect = (unitId: number | null) => {
        props.onChange(unitId);
        setIsOpen(false);
        setSearchTerm(""); // Clear search on select
        triggerRef()?.focus(); // Return focus to trigger
    };

    const selectedUnit = createMemo(() => {
        return availableUnits().find(unit => unit.archiveDocumentId === props.selectedUnitId);
    });

    // Filter units for dropdown manually
    const filteredDropdownUnits = createMemo(() => {
        const term = searchTerm().trim().toLowerCase();
        if (!term) return availableUnits();
        return availableUnits().filter(unit => unit.title.toLowerCase().includes(term));
    });

     const triggerText = createMemo(() => {
         if (isLoading()) return "Loading units...";
         if (error()) return "Error loading units";
         return selectedUnit()?.title ?? "Select parent unit...";
     });

     // Positioning and Close on click outside
     createEffect(() => {
        if (!isOpen()) return;
         // Position content below trigger
         if (triggerRef() && contentRef()) {
              const triggerRect = triggerRef()!.getBoundingClientRect();
              const scrollY = window.scrollY; // Account for page scroll
              setContentStyle({
                  position: 'absolute', // Use absolute for positioning relative to nearest positioned ancestor or body
                  width: `${triggerRect.width}px`,
                  top: `${triggerRect.bottom + scrollY + 4}px`, // Position below trigger
                  left: `${triggerRect.left + window.scrollX}px`, // Align with trigger left
                  // Add checks to flip position if near bottom of viewport
              });
         }

        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef() && !triggerRef()!.contains(event.target as Node) &&
                contentRef() && !contentRef()!.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
    });

    // Close on Escape key & handle keyboard nav
     createEffect(() => {
        if (!isOpen()) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                triggerRef()?.focus();
            }
             // Basic keyboard navigation (can be expanded)
             if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                 if (contentRef()) {
                     const focusableItems = Array.from(contentRef()!.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'));
                     if (focusableItems.length === 0) return;
                     const currentIndex = focusableItems.findIndex(item => item === document.activeElement);
                     let nextIndex = -1;
                     if (event.key === 'ArrowDown') nextIndex = currentIndex < focusableItems.length - 1 ? currentIndex + 1 : 0;
                     else nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableItems.length - 1;
                     focusableItems[nextIndex]?.focus();
                     event.preventDefault();
                 }
            }
            if (event.key === 'Enter' || event.key === ' ') {
                 if (document.activeElement?.getAttribute('role') === 'option') {
                     (document.activeElement as HTMLElement).click();
                     event.preventDefault();
                 }
            }
        };
         document.addEventListener('keydown', handleKeyDown);
         onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
    });


    return (
        <div class={cn(styles.unitSelectorContainer, props.class)}>
            <UnitSelectorFormLabel for="unit-selector-trigger">Parent Unit</UnitSelectorFormLabel> {/* Changed ID matching */}
            {/* Replace PopoverPrimitive.Root with a simple div or fragment */}
            <div style={{ position: 'relative' }}> {/* Add relative positioning if needed */}
                <button
                    ref={setTriggerRef}
                    type="button"
                    role="combobox"
                    aria-controls="unit-listbox"
                    aria-expanded={isOpen()}
                    aria-haspopup="listbox"
                    class={styles.unitSelectorTrigger}
                    disabled={isLoading() || !!error()}
                    onClick={() => setIsOpen(!isOpen())}
                    aria-label="Select parent unit"
                    id="unit-selector-trigger" // Ensure ID matches label 'for'
                >
                    <span data-placeholder={!selectedUnit() ? true : undefined}>
                        {triggerText()}
                    </span>
                    <Show when={isLoading()} fallback={<Icon name="ChevronsUpDown" class={styles.unitSelectorIcon} />}>
                        <LoadingSpinner size="sm" />
                    </Show>
                </button>
                 {/* Popover Content using Portal */}
                 <Show when={isOpen()}>
                     <Portal mount={document.body}>
                         <div
                             ref={setContentRef}
                             role="listbox"
                             id="unit-listbox"
                             tabIndex={-1}
                             class={styles.unitSelectorPopoverContent}
                             style={contentStyle()} // Apply dynamic style
                             data-state={isOpen() ? "open" : "closed"}
                         >
                            {/* Simulate CommandPrimitive Root */}
                            <div>
                                 <div class={styles.unitSelectorCommandInput}>
                                     <Input
                                         type="search"
                                         placeholder="Search units by title..."
                                         value={searchTerm()}
                                         onInput={(e) => setSearchTerm(e.currentTarget.value)}
                                         style={{ "height": "32px", "font-size": "0.875rem" }}
                                     />
                                 </div>
                                 <div class={styles.unitSelectorCommandList}>
                                      <Show when={isLoading() && !filteredDropdownUnits().length}>
                                         <div style={{"text-align":"center", "padding":"0.5rem"}}><LoadingSpinner size="sm"/></div>
                                      </Show>
                                      <Show when={!isLoading() && filteredDropdownUnits().length === 0}>
                                         <p style={{"text-align":"center", "font-size":"0.875rem", "padding":"0.5rem"}}>No units found.</p>
                                      </Show>
                                      {/* Option to clear selection */}
                                      <div
                                          role="option"
                                          tabIndex={0}
                                          class={styles.unitSelectorCommandItem}
                                          onClick={() => handleSelect(null)}
                                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(null); }}
                                          data-clear-selection={true} // For specific styling
                                          aria-selected={props.selectedUnitId === null}
                                          data-selected={props.selectedUnitId === null ? '' : undefined}
                                      >
                                          <span class={styles.unitSelectorItemIcon}><Icon name="X" size="1em"/></span>
                                          Clear Selection
                                      </div>
                                      {/* Unit Items */}
                                      <For each={filteredDropdownUnits()}>
                                         {(unit) => (
                                            <div
                                                role="option"
                                                tabIndex={0}
                                                class={styles.unitSelectorCommandItem}
                                                onClick={() => handleSelect(unit.archiveDocumentId!)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(unit.archiveDocumentId!); }}
                                                aria-selected={props.selectedUnitId === unit.archiveDocumentId}
                                                data-selected={props.selectedUnitId === unit.archiveDocumentId ? '' : undefined}
                                            >
                                                 <span class={styles.unitSelectorItemIcon}>
                                                     <Show when={props.selectedUnitId === unit.archiveDocumentId}>
                                                         <Icon name="Check" size="1em" />
                                                     </Show>
                                                 </span>
                                                {unit.title}
                                             </div>
                                         )}
                                     </For>
                                  </div>
                            </div>
                        </div>
                    </Portal>
                </Show>
            </div>
            <Show when={error()}><p class={styles.unitSelectorErrorText}>{error() ?? 'Unknown error'}</p></Show> {/* Ensure message */}
        </div>
    );
};

export default UnitSelector;