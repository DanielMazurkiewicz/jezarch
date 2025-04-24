import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover"; // Assuming Popover exists
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/Command"; // Assuming Command exists
import { Badge } from "@/components/ui/Badge"; // Assuming Badge exists
import LoadingSpinner from "./LoadingSpinner";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css"; // Import theme vars
import type { Tag } from "../../../../backend/src/functionalities/tag/models";

const { div, span, button, p } = van.tags; // Added p, button

// --- Styles ---
const tagSelectorContainerStyle = style([styles.spaceY2]);
const triggerButtonStyle = style([styles.wFull, styles.justifyBetween, styles.h9, styles.fontNormal]); // Added h9
const popoverContentStyle = style({ width: 'var(--radix-popover-trigger-width)', padding: 0 }); // Match trigger width
const commandItemStyle = style([styles.cursorPointer]);
const checkIconStyle = style([styles.pr2, { opacity: 0 }]); // mr-2
const checkIconVisibleStyle = style({ opacity: 1 });
const selectedBadgeStyle = style([styles.itemsCenter]);
const removeBadgeButtonStyle = style([
    styles.p1, // ml-1, p-0.5 approx
    styles.roundedLg, // rounded-full approx -> rounded-lg matches better
    styles.textMutedForeground,
    {
        marginLeft: themeVars.spacing.xs, // ml-1 (was p1.padding)
        ':hover': {
             color: themeVars.color.foreground,
             backgroundColor: themeVars.color.background + '80', // bg-background/50
        },
         // Add focus styles if needed
    }
]);
const removeBadgeIconStyle = style([styles.h3, styles.w3]); // Added h3, w3

// --- Component Props ---
interface TagSelectorProps {
    selectedTagIds: State<number[]>; // Expect a VanJS state for reactivity
    onChange: (selectedIds: number[]) => void; // Keep callback for notifying parent
    class?: string;
    availableTags?: Tag[]; // Optional pre-fetched tags
}

// --- Component ---
const TagSelector = ({
    selectedTagIds,
    onChange,
    class: className = '',
    availableTags: preFetchedTags
}: TagSelectorProps) => {
    const { token } = authStore;
    const internalTags = van.state<Tag[]>(preFetchedTags ?? []);
    const isLoading = van.state<boolean>(!preFetchedTags);
    const error = van.state<string | null>(null);
    const open = van.state(false);
    const searchTerm = van.state("");

    const tagsToUse = preFetchedTags ? van.state(preFetchedTags) : internalTags;

    // Fetch tags if not provided
    van.derive(() => { // Replaced effect with derive
        if (preFetchedTags || !token.val) {
            isLoading.val = false;
            return;
        }
        // Fetch only if token changes or initially
        isLoading.val = true;
        error.val = null;
        api.getAllTags(token.val)
            .then(tags => internalTags.val = tags.sort((a, b) => a.name.localeCompare(b.name)))
            .catch(err => {
                error.val = err.message || "Failed to load tags";
                console.error("TagSelector: Failed to load tags:", err);
            })
            .finally(() => isLoading.val = false);
    });


    const handleSelect = (tagId: number) => {
        const currentSelected = selectedTagIds.val;
        const newSelectedIds = currentSelected.includes(tagId)
            ? currentSelected.filter(id => id !== tagId)
            : [...currentSelected, tagId];
        selectedTagIds.val = newSelectedIds; // Update the state directly
        onChange(newSelectedIds); // Notify parent if needed (e.g., for RHF sync)
        searchTerm.val = "";
        // Keep popover open for multi-select
    };

    const selectedTags = van.derive(() =>
        tagsToUse.val
            .filter(tag => selectedTagIds.val.includes(tag.tagId!))
            .sort((a, b) => a.name.localeCompare(b.name))
    );

    const filteredDropdownTags = van.derive(() =>
        tagsToUse.val
            .filter(tag => tag.name.toLowerCase().includes(searchTerm.val.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name))
    );

    return div({ class: `${tagSelectorContainerStyle} ${className}`.trim() },
        Popover({ open: open, onOpenChange: v => open.val = v }, // Link state to Popover
            PopoverTrigger({ class: 'w-full' }, // Wrap trigger if needed
                Button({
                    variant: "outline",
                    role: "combobox",
                    'aria-expanded': open,
                    class: triggerButtonStyle,
                    disabled: isLoading, // Use state value directly
                    onclick: (e: Event) => { open.val = !open.val; (e.currentTarget as HTMLElement).focus(); } // Added manual toggle + focus
                    },
                    span({ class: styles.truncate }, () => // Reactive span content
                        isLoading.val ? 'Loading tags...' :
                        error.val ? 'Error loading tags' :
                        selectedTags.val.length > 0 ? `${selectedTags.val.length} tags selected` :
                        'Select tags...'
                    ),
                    () => isLoading.val // Reactive icon
                        ? LoadingSpinner({ size: "sm", class: styles.ml2 }) // Added ml2
                        : icons.ChevronsUpDownIcon({ class: `${styles.ml2} ${styles.h4} ${styles.w4} ${styles.flexShrink0} ${styles.opacity50}` }) // Added ml2, h4, w4
                )
            ),
            PopoverContent({ class: popoverContentStyle, align: "start" },
                Command({}, // Pass empty props
                    CommandInput({ // Pass state and handler correctly
                        value: searchTerm,
                        onValueChange: (v: string) => searchTerm.val = v,
                        placeholder: "Search tags...",
                    }),
                    CommandList(
                        () => isLoading.val ? div(LoadingSpinner({ size: 'sm' })) : null, // Loading indicator
                        () => !isLoading.val && filteredDropdownTags.val.length === 0 ? CommandEmpty("No tags found.") : null,
                        () => !isLoading.val ? CommandGroup(
                            filteredDropdownTags.val.map((tag) =>
                                CommandItem({
                                    key: tag.tagId,
                                    value: tag.name,
                                    onSelect: () => handleSelect(tag.tagId!),
                                    class: commandItemStyle
                                    },
                                    // Reactive Check Icon visibility
                                    icons.CheckIcon({
                                        class: () => selectedTagIds.val.includes(tag.tagId!)
                                                    ? `${checkIconStyle} ${checkIconVisibleStyle}`
                                                    : checkIconStyle
                                    }), // Pass class
                                    tag.name
                                )
                            )
                        ) : null // End CommandGroup conditional
                    ) // End CommandList
                ) // End Command
            ) // End PopoverContent
        ), // End Popover
        // Display selected tags as Badges (Reactive)
        div({ class: `${styles.flex} ${styles.flexWrap} ${styles.gap1} ${styles.pt1}` },
            van.derive(() => selectedTags.val.map(tag => // Wrap map in derive
                Badge({ key: tag.tagId, variant: "secondary", class: selectedBadgeStyle },
                    span(tag.name),
                    button({ // Use button for accessibility
                        type: "button",
                        class: removeBadgeButtonStyle,
                        onclick: () => handleSelect(tag.tagId!),
                        'aria-label': `Remove ${tag.name} tag`
                        },
                        icons.XIcon({ class: removeBadgeIconStyle }) // Pass class
                    )
                )
            ))
        ),
        // Error display
        () => error.val ? p({ class: `${styles.textXs} ${styles.textDestructive} ${styles.mt1}` }, error.val) : null // Added mt1
    );
};

export default TagSelector;