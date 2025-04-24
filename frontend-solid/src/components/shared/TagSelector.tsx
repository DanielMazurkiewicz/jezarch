import { Component, createSignal, createEffect, createMemo, For, Show, onCleanup, splitProps } from 'solid-js'; // Removed Accessor
import { Portal } from 'solid-js/web';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input'; // For search input
import LoadingSpinner from './LoadingSpinner';
import { Icon } from './Icon';
import { cn } from '@/lib/utils';
import styles from './TagSelector.module.css'; // Import CSS Module (Typed)

interface TagSelectorProps {
    selectedTagIds: number[];
    onChange: (selectedIds: number[]) => void;
    class?: string;
    /** Optional: Provide pre-fetched tags to avoid internal fetching */
    availableTags?: Tag[];
    placeholder?: string;
    disabled?: boolean;
}

const TagSelector: Component<TagSelectorProps> = (props) => {
    const [local, rest] = splitProps(props, ['selectedTagIds', 'onChange', 'class', 'availableTags', 'placeholder', 'disabled']); // Split props
    const [authState] = useAuth();
    const [internalTags, setInternalTags] = createSignal<Tag[]>(local.availableTags ?? []);
    const [isLoading, setIsLoading] = createSignal(!local.availableTags);
    const [error, setError] = createSignal<string | null>(null);
    const [searchTerm, setSearchTerm] = createSignal("");
    const [isOpen, setIsOpen] = createSignal(false);
    const [triggerRef, setTriggerRef] = createSignal<HTMLButtonElement>();
    const [contentRef, setContentRef] = createSignal<HTMLDivElement>();
    const [contentStyle, setContentStyle] = createSignal({}); // For dynamic positioning


    const tagsToUse = createMemo(() => local.availableTags ?? internalTags());

    // Fetch tags if not provided externally
    createEffect(() => {
        if (local.availableTags || !authState.token) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        api.getAllTags(authState.token)
            .then(tags => setInternalTags(tags.sort((a, b) => a.name.localeCompare(b.name))))
            .catch(err => {
                setError(err.message || "Failed to load tags");
                console.error("TagSelector: Failed to load tags:", err);
            })
            .finally(() => setIsLoading(false));
    });

     // Positioning and Close on click outside
     createEffect(() => {
        if (!isOpen()) return;
        // Position content below trigger
        if (triggerRef() && contentRef()) {
             const triggerRect = triggerRef()!.getBoundingClientRect();
             setContentStyle({
                 position: 'absolute',
                 width: `${triggerRect.width}px`,
                 top: `${triggerRect.bottom + window.scrollY + 4}px`,
                 left: `${triggerRect.left + window.scrollX}px`,
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
                triggerRef()?.focus(); // Return focus to trigger
            }
            // Basic keyboard navigation
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

    const handleSelect = (tagId: number) => {
        const currentSelected = local.selectedTagIds;
        const newSelectedIds = currentSelected.includes(tagId)
            ? currentSelected.filter(id => id !== tagId)
            : [...currentSelected, tagId];
        local.onChange(newSelectedIds);
    };

    const selectedTagsDetails = createMemo(() => {
        const tagMap = new Map(tagsToUse().map(tag => [tag.tagId, tag]));
        return local.selectedTagIds
            .map(id => tagMap.get(id))
            .filter((tag): tag is Tag => tag !== undefined)
            .sort((a, b) => a.name.localeCompare(b.name)); // Ensure sorted display
    });

    // Manual client-side filtering
    const filteredDropdownTags = createMemo(() => {
        const term = searchTerm().trim().toLowerCase();
        if (!term) return tagsToUse();
        return tagsToUse().filter(tag => tag.name.toLowerCase().includes(term));
    });

    const triggerText = createMemo(() => {
         if (isLoading()) return "Loading tags...";
         if (error()) return "Error loading tags";
         const count = selectedTagsDetails().length;
         if (count > 0) return `${count} tag${count > 1 ? 's' : ''} selected`;
         return local.placeholder ?? "Select tags...";
    });

    return (
        <div class={cn(styles.tagSelectorContainer, local.class)}>
            {/* Popover Root Simulation */}
            <div>
                <button
                    ref={setTriggerRef}
                    type="button"
                    role="combobox"
                    aria-controls="tag-listbox"
                    aria-expanded={isOpen()}
                    aria-haspopup="listbox"
                    aria-disabled={local.disabled || isLoading() || !!error()}
                    disabled={local.disabled || isLoading() || !!error()}
                    class={styles.tagSelectorTrigger}
                    onClick={() => setIsOpen(!isOpen())}
                    aria-label="Select tags"
                >
                     <span data-placeholder={selectedTagsDetails().length === 0 ? true : undefined}>
                         {triggerText()}
                     </span>
                     <Show when={isLoading()} fallback={<Icon name="ChevronsUpDown" class={styles.tagSelectorIcon} />}>
                         <LoadingSpinner size="sm" />
                     </Show>
                </button>

                {/* Popover Content using Portal */}
                <Show when={isOpen()}>
                     <Portal mount={document.body}>
                         <div
                             ref={setContentRef}
                             role="listbox"
                             id="tag-listbox"
                             tabIndex={-1}
                             class={styles.tagSelectorPopoverContent}
                             style={contentStyle()} // Dynamic positioning
                             data-state={isOpen() ? "open" : "closed"}
                         >
                            <div class={styles.tagSelectorCommandInput}>
                                <Input
                                    type="search"
                                    placeholder="Search tags..."
                                    value={searchTerm()}
                                    onInput={(e) => setSearchTerm(e.currentTarget.value)}
                                    style={{ "height": "32px", "font-size": "0.875rem" }}
                                />
                            </div>
                            <div class={styles.tagSelectorCommandList}>
                                <Show when={!isLoading() && filteredDropdownTags().length === 0}>
                                    <p style={{"text-align": "center", "font-size": "0.875rem", "color": "var(--color-muted-foreground)", "padding": "0.5rem"}}>
                                        No tags found.
                                    </p>
                                </Show>
                                <For each={filteredDropdownTags()}>
                                    {(tag) => (
                                        <div // Use div for CommandItem behavior
                                            role="option"
                                            aria-selected={local.selectedTagIds.includes(tag.tagId!)}
                                            data-selected={local.selectedTagIds.includes(tag.tagId!) ? '' : undefined}
                                            tabIndex={0} // Make items focusable
                                            class={styles.tagSelectorCommandItem}
                                            onClick={() => handleSelect(tag.tagId!)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(tag.tagId!); }}
                                        >
                                            <span>{tag.name}</span>
                                            <Show when={local.selectedTagIds.includes(tag.tagId!)}>
                                                 <Icon name="Check" class={styles.tagSelectorItemCheckIcon} />
                                             </Show>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </div>
                    </Portal>
                </Show>
            </div>

            {/* Display selected tags */}
             <div class={styles.selectedTagsArea}>
                 <For each={selectedTagsDetails()} fallback={
                     <Show when={!isLoading() && !error() && local.selectedTagIds.length === 0}>
                        <span class={styles.emptyText}>No tags selected</span>
                     </Show>
                 }>
                     {(tag) => (
                        <Badge variant="secondary" class={styles.selectedTagBadge}>
                            <span>{tag.name}</span>
                            <button
                                type="button"
                                class={styles.removeTagButton}
                                onClick={() => handleSelect(tag.tagId!)}
                                aria-label={`Remove ${tag.name} tag`}
                                disabled={local.disabled}
                            >
                                <Icon name="X" class={styles.removeTagIcon} />
                            </button>
                        </Badge>
                     )}
                 </For>
             </div>
             {/* --- FIX: Access the accessor value err() --- */}
             <Show when={error()}>
                {(err) => <p class={styles.errorText}>{err()}</p>}
             </Show>
        </div>
    );
};

export default TagSelector;