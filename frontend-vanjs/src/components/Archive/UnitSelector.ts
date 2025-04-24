import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/Command";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { ArchiveDocument } from "../../../../backend/src/functionalities/archive/document/models";
import type { SearchRequest } from "../../../../backend/src/utils/search";

const { div, span, p } = van.tags;

// --- Styles ---
const containerStyle = style([styles.spaceY2]);
const triggerButtonStyle = style([styles.wFull, styles.justifyBetween, styles.h9, styles.fontNormal]); // Added h9
const popoverContentStyle = style({ width: 'var(--radix-popover-trigger-width)', padding: 0 });
const commandItemStyle = style([styles.cursorPointer]);
const checkIconStyle = style([styles.pr2, { opacity: 0 }]);
const checkIconVisibleStyle = style({ opacity: 1 });
const clearItemStyle = style([styles.cursorPointer, styles.textMutedForeground, styles.italic]);

// --- Component Props ---
interface UnitSelectorProps {
    selectedUnitId: State<number | null>; // Expect a state
    onChange: (selectedId: number | null) => void; // Callback
    class?: string;
    currentDocumentId?: number; // ID of the doc being edited (to exclude)
}

// --- Component ---
const UnitSelector = ({
    selectedUnitId,
    onChange,
    class: className = '',
    currentDocumentId
}: UnitSelectorProps) => {
    const { token } = authStore;

    // --- State ---
    const availableUnits = van.state<ArchiveDocument[]>([]);
    const isLoading = van.state(false);
    const error = van.state<string | null>(null);
    const open = van.state(false);
    const searchTerm = van.state("");

    // --- Fetch Units ---
    van.derive(() => { // Replaced effect with derive
        if (!token.val) {
            availableUnits.val = []; // Clear if no token
            return;
        }
        // Fetch only if token changes or initially
        isLoading.val = true; error.val = null;
        const searchRequest: SearchRequest = {
            query: [{ field: 'type', condition: 'EQ', value: 'unit', not: false }],
            page: 1, pageSize: 500, // Adjust size as needed
        };
        api.searchArchiveDocuments(searchRequest, token.val)
            .then(response => {
                availableUnits.val = response.data
                    .filter(unit => unit.archiveDocumentId !== currentDocumentId) // Exclude self
                    .sort((a, b) => a.title.localeCompare(b.title));
            })
            .catch(err => error.val = err.message || "Failed to load units")
            .finally(() => isLoading.val = false);
    });


    // --- Event Handlers ---
    const handleSelect = (unitId: number | null) => {
        selectedUnitId.val = unitId; // Update state
        onChange(unitId); // Notify parent
        open.val = false;
        searchTerm.val = "";
    };

    // --- Derived State ---
    const selectedUnit = van.derive(() =>
        availableUnits.val.find(unit => unit.archiveDocumentId === selectedUnitId.val)
    );
    const filteredDropdownUnits = van.derive(() =>
        availableUnits.val.filter(unit =>
            unit.title.toLowerCase().includes(searchTerm.val.toLowerCase())
        )
    );

    // --- Render ---
    return div({ class: `${containerStyle} ${className}`.trim() },
        Popover({ open: open, onOpenChange: v => open.val = v },
            PopoverTrigger({ class: 'w-full' }, // Wrap trigger in div/span if needed for full width styling
                Button({
                    variant: "outline", role: "combobox", 'aria-expanded': open,
                    class: triggerButtonStyle,
                    disabled: isLoading, // Use state value
                    onclick: (e: Event) => { open.val = !open.val; (e.currentTarget as HTMLElement).focus(); } // Added manual toggle + focus
                    },
                    span({ class: styles.truncate }, () => // Reactive text
                        isLoading.val ? 'Loading units...' :
                        error.val ? 'Error loading units' :
                        selectedUnit.val ? selectedUnit.val.title :
                        'Select parent unit...'
                    ),
                    () => isLoading.val // Reactive icon
                        ? LoadingSpinner({ size: "sm", class: styles.ml2 }) // Added ml2
                        : icons.ChevronsUpDownIcon({ class: `${styles.ml2} ${styles.h4} ${styles.w4} ${styles.flexShrink0} ${styles.opacity50}` }) // Added ml2, h4, w4
                )
            ),
            PopoverContent({ class: popoverContentStyle, align: "start" },
                Command({ shouldFilter: false },
                    CommandInput({ // Pass state and handler correctly
                        value: searchTerm,
                        onValueChange: (v: string) => searchTerm.val = v,
                        placeholder: "Search units by title...",
                    }),
                    CommandList(
                        () => isLoading.val ? div(LoadingSpinner({ size: 'sm' })) : null,
                        () => !isLoading.val && filteredDropdownUnits.val.length === 0 ? CommandEmpty('No units found.') : null,
                        () => !isLoading.val ? CommandGroup(
                            // Clear Selection Item
                            CommandItem({ key: "clear-unit", value: "--clear--", onSelect: () => handleSelect(null), class: clearItemStyle },
                                icons.XIcon({ class: `${styles.mr2} ${styles.h4} ${styles.w4} ${styles.opacity50}` }), // Added mr2, h4, w4
                                "Clear Selection"
                            ),
                            // Unit Items
                            filteredDropdownUnits.val.map((unit) =>
                                CommandItem({
                                    key: unit.archiveDocumentId, value: unit.title,
                                    onSelect: () => handleSelect(unit.archiveDocumentId!),
                                    class: commandItemStyle
                                    },
                                    icons.CheckIcon({ class: () => selectedUnitId.val === unit.archiveDocumentId ? `${checkIconStyle} ${checkIconVisibleStyle}` : checkIconStyle }), // Pass class
                                    unit.title
                                )
                            )
                        ) : null // End Group conditional
                    ) // End List
                ) // End Command
            ) // End Content
        ), // End Popover
         // Error display
        () => error.val ? p({ class: `${styles.textXs} ${styles.textDestructive} ${styles.mt1}` }, error.val) : null // Added mt1
    );
};

export default UnitSelector;
