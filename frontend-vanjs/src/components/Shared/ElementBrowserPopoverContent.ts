import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/Command";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup"; // Assuming ToggleGroup exists and is fixed
import LoadingSpinner from "./LoadingSpinner";
import ElementForm from "@/components/Signatures/ElementForm"; // To open for creation
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog"; // For create dialog
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { debounce } from "@/lib/utils"; // Import debounce utility
import type { SignatureComponent } from "../../../../backend/src/functionalities/signature/component/models";
import type { SignatureElement, CreateSignatureElementInput } from "../../../../backend/src/functionalities/signature/element/models";
import type { SearchRequest } from "../../../../backend/src/utils/search";
// Remove toast

const { div, span, p } = van.tags;

// --- Types ---
type SelectionMode = "free" | "hierarchical";

// --- Styles ---
const containerStyle = style([styles.spaceY3, styles.p4, styles.wFull]); // Added spaceY3
const modeToggleGroupStyle = style({ /* Base styles for ToggleGroup if needed */ });
const modeToggleItemStyle = style([styles.flexGrow, styles.gap1]); // flex-1, gap-1
const currentSigStyle = style([styles.flex, styles.flexWrap, styles.itemsCenter, styles.gap1, styles.border, styles.roundedMd, styles.p2, styles.bgMuted, { minHeight: '40px' }]);
const currentSigLabelStyle = style([styles.mr2, styles.flexShrink0, styles.textXs, styles.fontSemibold]); // Added mr2
const currentSigElementStyle = style([styles.fontMono, styles.textXs]);
const commandContainerStyle = style([styles.flexGrow, styles.overflowHidden, styles.flex, styles.flexCol, styles.gap2]);
const commandStyle = style([styles.roundedLg, styles.border, styles.shadowSm]);
const commandListStyle = style({ maxHeight: '200px' });
const commandItemStyle = style([styles.cursorPointer, styles.flex, styles.justifyBetween, styles.itemsCenter, styles.textSm]);
const commandItemIndexStyle = style([styles.fontMono, styles.textXs, styles.w10, styles.mr2, styles.textRight, styles.inlineBlock, styles.textMutedForeground]); // Added w10, mr2, inlineBlock
const actionContainerStyle = style([styles.flex, styles.justifyBetween, styles.itemsCenter, styles.mtAuto, styles.pt3, styles.borderT]); // Added mtAuto
const createButtonStyle = style([styles.wFull, styles.justifyStart, styles.textMutedForeground]); // Add text color

// --- Helper Functions ---
const compareElements = (a: SignatureElement, b: SignatureElement): number => {
    const valA = a.index ?? a.name ?? '';
    const valB = b.index ?? b.name ?? '';
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(valA).localeCompare(String(valB)); // Ensure string comparison
};

const MAX_SEARCH_RESULTS = 200;
const DEBOUNCE_DELAY = 300;

// --- Component Props ---
interface ElementBrowserPopoverContentProps {
    onSelectSignature: (signature: number[]) => void;
    onClose: () => void;
}

// --- Component ---
const ElementBrowserPopoverContent = ({
    onSelectSignature,
    onClose,
}: ElementBrowserPopoverContentProps) => {
    const { token } = authStore;

    // --- State ---
    const components = van.state<SignatureComponent[]>([]);
    const selectedComponentId = van.state<string>(''); // String for Select compatibility
    const elements = van.state<SignatureElement[]>([]);
    const currentSignatureElements = van.state<SignatureElement[]>([]);
    const isLoadingComponents = van.state(false);
    const isLoadingElements = van.state(false);
    const searchTerm = van.state(''); // Input value
    const debouncedSearchTerm = van.state(''); // Debounced value for fetching
    const mode = van.state<SelectionMode>("hierarchical");
    const error = van.state<string | null>(null);
    const isCreateElementDialogOpen = van.state(false);
    const componentForCreate = van.state<SignatureComponent | null>(null);
    const refetchElementsTrigger = van.state(0); // Trigger for refetching elements

    // --- Debounce Search Term ---
    const updateDebouncedSearch = debounce(() => {
        debouncedSearchTerm.val = searchTerm.val;
    }, DEBOUNCE_DELAY);

    van.derive(() => { // Use derive to react to searchTerm changes
        searchTerm.val; // Depend on the raw search term
        updateDebouncedSearch(); // Call the debounced function
    });


    // --- Fetch Components ---
    van.derive(() => { // Use derive to fetch components reactively
        if (!token.val) return;
        isLoadingComponents.val = true; error.val = null;
        api.getAllSignatureComponents(token.val)
            .then(comps => components.val = comps.sort((a, b) => a.name.localeCompare(b.name)))
            .catch(err => error.val = err.message || "Failed to load components")
            .finally(() => isLoadingComponents.val = false);
    });


    // --- Fetch Elements ---
    van.derive(() => { // Use derive to fetch elements reactively
        // Read dependency states
        const currentToken = token.val;
        const currentMode = mode.val;
        const compId = selectedComponentId.val;
        const sigElements = currentSignatureElements.val; // Read the array value
        const search = debouncedSearchTerm.val;
        refetchElementsTrigger.val; // Depend on the trigger

        error.val = null;
        const lastElementId = currentMode === 'hierarchical' && sigElements.length > 0
            ? sigElements[sigElements.length - 1].signatureElementId
            : undefined;

        let shouldFetch = false;
        const searchRequest: SearchRequest = { query: [], page: 1, pageSize: MAX_SEARCH_RESULTS };

        if (search.trim()) {
             searchRequest.query.push({ field: 'name', condition: 'FRAGMENT', value: search.trim(), not: false });
             shouldFetch = true;
        }

        if (currentMode === 'hierarchical') {
             if (lastElementId) {
                 searchRequest.query = searchRequest.query.filter(q => q.field !== 'parentIds'); // Ensure only one parent filter
                 searchRequest.query.push({ field: 'parentIds', condition: 'ANY_OF', value: [lastElementId], not: false });
                 shouldFetch = true;
             } else if (compId) {
                 searchRequest.query.push({ field: 'signatureComponentId', condition: 'EQ', value: parseInt(compId, 10), not: false });
                 searchRequest.query.push({ field: 'hasParents', condition: 'EQ', value: false, not: false }); // Root elements
                 shouldFetch = true;
             }
         } else { // Free mode
             if (compId) {
                 searchRequest.query.push({ field: 'signatureComponentId', condition: 'EQ', value: parseInt(compId, 10), not: false });
                 shouldFetch = true;
             } else if (!search.trim()) {
                 shouldFetch = false; // Don't fetch all elements in free mode without filter/component
             }
             // If only search term is present, shouldFetch is already true
        }

        if (!shouldFetch || !currentToken) {
            elements.val = []; isLoadingElements.val = false; return;
        }

        isLoadingElements.val = true;
        api.searchSignatureElements(searchRequest, currentToken)
            .then(response => elements.val = response.data.sort(compareElements))
            .catch(err => { error.val = err.message || "Failed to load elements"; elements.val = []; })
            .finally(() => isLoadingElements.val = false);
    });


    // --- Event Handlers ---
    const handleModeChange = (newMode: SelectionMode) => {
        if (newMode) {
            mode.val = newMode;
            currentSignatureElements.val = [];
            selectedComponentId.val = '';
            searchTerm.val = ''; // Also clears debounced term via effect
            error.val = null;
        }
    };

    const handleSelectElement = (element: SignatureElement) => {
        currentSignatureElements.val = [...currentSignatureElements.val, element];
        searchTerm.val = ''; // Clear search
        if (mode.val === 'free') {
            selectedComponentId.val = ''; // Reset component in free mode after selection
        }
    };

    const handleRemoveLastElement = () => {
        const newPath = currentSignatureElements.val.slice(0, -1);
        currentSignatureElements.val = newPath;
        if (mode.val === 'hierarchical' && newPath.length === 0) {
            // If hierarchical and back to root, keep component selected for choosing root elements again
            // selectedComponentId.val = ''; // Don't reset component here
        }
    };

    const handleConfirmSignature = () => {
        if (currentSignatureElements.val.length > 0) {
            onSelectSignature(currentSignatureElements.val.map(el => el.signatureElementId!));
            // Reset state after confirming
            currentSignatureElements.val = [];
            selectedComponentId.val = '';
            searchTerm.val = '';
            error.val = null;
            mode.val = 'hierarchical'; // Reset mode? Or keep it? Keep for now.
            onClose(); // Close the popover
        }
    };

    const handleOpenCreateElementDialog = () => {
        const component = components.val.find(c => String(c.signatureComponentId) === selectedComponentId.val);
        if (component) {
            componentForCreate.val = component;
            isCreateElementDialogOpen.val = true;
        } else {
            alert("Cannot create element: Select a valid component first.");
        }
    };

    const handleElementCreated = (createdElement: SignatureElement | null) => {
        isCreateElementDialogOpen.val = false;
        componentForCreate.val = null;
        if (createdElement) {
            // alert(`Element "${createdElement.name}" created.`); // Simple feedback
            refetchElementsTrigger.val++; // Trigger refetch
        } else {
            console.warn("Element creation/update reported failure or no change.");
        }
    };

    // --- Derived State ---
    const filteredElements = van.derive(() =>
        elements.val.filter(el =>
            !currentSignatureElements.val.some(p => p.signatureElementId === el.signatureElementId)
            // Filtering is now done by debounced fetch, just exclude selected
        )
    );
    const selectedComponentName = van.derive(() => components.val.find(c => String(c.signatureComponentId) === selectedComponentId.val)?.name);
    const componentOptions = van.derive(() => components.val.map(c => ({ value: String(c.signatureComponentId), label: c.name })));
    const canTriggerCreateElement = van.derive(() =>
        !!selectedComponentId.val && !isLoadingComponents.val &&
        (mode.val === 'free' || currentSignatureElements.val.length === 0)
    );
    const showElementSelector = van.derive(() =>
        (mode.val === 'hierarchical' && (currentSignatureElements.val.length > 0 || !!selectedComponentId.val)) ||
        (mode.val === 'free' && (!!selectedComponentId.val || !!debouncedSearchTerm.val.trim()))
    );
    const nextStepPrompt = van.derive(() => {
         if (mode.val === 'hierarchical') {
            if (currentSignatureElements.val.length === 0) return "1. Select Component to Start";
            return `2. Select Child of "${currentSignatureElements.val[currentSignatureElements.val.length - 1].name}"`;
        } else { // Free mode
            if (currentSignatureElements.val.length === 0 && !selectedComponentId.val) return "1. Select Component or Search";
            if (currentSignatureElements.val.length === 0 && selectedComponentId.val) return `1. Select Element from "${selectedComponentName.val || '...'}" or Search`;
            return "2. Select Next Element";
        }
    });
    const elementSelectorLabel = van.derive(() => {
         if (mode.val === 'hierarchical') {
             if (currentSignatureElements.val.length > 0) return `Select Child of "${currentSignatureElements.val[currentSignatureElements.val.length - 1].name}"`;
             return `Select Root Element in "${selectedComponentName.val || '...'}"`;
         } else { // Free mode
             if (selectedComponentName.val) return `Select Element from "${selectedComponentName.val}"`;
             return 'Search All Elements';
         }
    });


    // --- Render ---
    return div({ class: containerStyle },
        // Mode Selector
        div({ class: `${styles.flexCol} ${styles.gap1}` }, // Fixed duplicate class
            Label({ class: styles.textXs }, "Selection Mode"),
            // Ensure ToggleGroup component is correctly implemented/imported
            ToggleGroup({ type: "single", value: mode, onValueChange: handleModeChange, size: "sm" },
                ToggleGroupItem({ value: "hierarchical", 'aria-label': "Hierarchical", class: modeToggleItemStyle }, icons.NetworkIcon({ class: styles.h4 }), span({ class: () => mode.val === 'hierarchical' ? styles.fontBold : '' }, "Hierarchical")), // Added h4
                ToggleGroupItem({ value: "free", 'aria-label': "Free selection", class: modeToggleItemStyle }, icons.ArrowRightIcon({ class: styles.h4 }), span({ class: () => mode.val === 'free' ? styles.fontBold : '' }, "Free")) // Added h4
            ),
            p({ class: `${styles.textXs} ${styles.textMutedForeground} ${styles.px1}` }, () =>
                mode.val === 'hierarchical' ? 'Select elements based on parent-child relationships.' : 'Select elements from any component.'
            )
        ),

        // Current Signature Display
        div({ class: currentSigStyle },
            Label({ class: currentSigLabelStyle }, "Current Signature:"),
            // Use derive for reactive rendering
            van.derive(() => currentSignatureElements.val.map((el, index) => [ // Wrap map in derive
                index > 0 ? span({ class: `${styles.textXs} ${styles.textMutedForeground} ${styles.px1}` }, "/") : null,
                Badge({ key: el.signatureElementId, variant: "secondary", class: currentSigElementStyle },
                    el.index ? `[${el.index}] ${el.name}` : el.name
                )
            ])),
             () => currentSignatureElements.val.length === 0 ? span({ class: `${styles.textXs} ${styles.textMutedForeground} ${styles.italic}` }, "Build signature below...") : null
        ),

        // Component Selector (Always show in free mode, or when no elements selected in hierarchical)
        () => (currentSignatureElements.val.length === 0 || mode.val === 'free') ? Select({
            value: selectedComponentId, // Bind state
            onchange: (e: Event) => selectedComponentId.val = (e.target as HTMLSelectElement).value,
            options: componentOptions, // Use derived options
            placeholder: nextStepPrompt, // Reactive placeholder
            disabled: () => isLoadingComponents.val || (mode.val === 'hierarchical' && currentSignatureElements.val.length > 0), // Reactive disabled
            class: `${styles.wFull} ${styles.textSm} ${styles.h9}` // Ensure consistent height/width, Added h9
        }) : null,

        // Element Selector/Search
        () => showElementSelector.val ? div({ class: commandContainerStyle },
            Label({ class: `${styles.textXs} mb-1 block` }, elementSelectorLabel), // Added mb-1, block
            Command({}, // Pass empty props if none needed
                CommandInput({
                    value: searchTerm,
                    onValueChange: v => searchTerm.val = v, // Update raw search term
                    placeholder: "Search available elements...",
                    disabled: isLoadingElements
                }),
                CommandList({ class: commandListStyle },
                    () => isLoadingElements.val ? div({ class: `${styles.p4} ${styles.textCenter}` }, LoadingSpinner({ size: 'sm' })) : null,
                    () => error.val && !isLoadingElements.val ? CommandEmpty({ class: styles.textDestructive }, error.val) : null,
                    () => !error.val && !isLoadingElements.val && filteredElements.val.length === 0 ? CommandEmpty("No matching elements found.") : null,
                    () => !error.val && !isLoadingElements.val && filteredElements.val.length > 0 ? CommandGroup(
                        { heading: `Available Elements (${filteredElements.val.length}${elements.val.length >= MAX_SEARCH_RESULTS ? '+' : ''})` },
                        filteredElements.val.map((el) =>
                            CommandItem({
                                key: el.signatureElementId, value: `${el.index || ''} ${el.name}`,
                                onSelect: () => handleSelectElement(el),
                                class: commandItemStyle
                                },
                                div({ class: `${styles.flex} ${styles.itemsCenter}` }, // Fixed duplicate class
                                    span({ class: commandItemIndexStyle }, el.index || '-'),
                                    span(el.name)
                                ),
                                icons.PlusIcon({ class: `${styles.h4} ${styles.w4} ${styles.textMutedForeground}` }) // Added h4, w4
                            )
                        )
                    ) : null, // End CommandGroup conditional
                    () => elements.val.length >= MAX_SEARCH_RESULTS && !isLoadingElements.val ? div({ class: `${styles.textXs} ${styles.textMutedForeground} ${styles.textCenter} ${styles.p1} ${styles.italic}` }, "More elements may exist. Refine search.") : null
                ), // End CommandList
                // Create Element Button (Conditionally rendered)
                () => canTriggerCreateElement.val ? div({ class: `${styles.p2} ${styles.borderT}` },
                    Button({ type: "button", variant: "outline", size: "sm", class: createButtonStyle, onclick: handleOpenCreateElementDialog },
                        icons.PlusCircleIcon({ class: styles.pr2 }), `Create New Element in "${selectedComponentName.val}"...` // Pass class
                    )
                ) : null
            ) // End Command
        ) : null, // End Element Selector conditional


        // Action Buttons
        div({ class: actionContainerStyle },
            div({ class: `${styles.flex} ${styles.gap2}`},
                Button({ type: "button", variant: "outline", size: "sm", onclick: handleRemoveLastElement, disabled: () => currentSignatureElements.val.length === 0 }, icons.XIcon({ class: styles.pr1 }), "Remove Last"), // Pass class
                Button({ type: "button", variant: "ghost", size: "sm", onclick: onClose }, icons.BanIcon({ class: styles.pr1 }), "Cancel") // Pass class
            ),
            Button({ type: "button", size: "sm", onclick: handleConfirmSignature, disabled: () => currentSignatureElements.val.length === 0 }, "Add This Signature")
        ),

         // Create Element Dialog (Rendered based on state)
         Dialog({ open: isCreateElementDialogOpen, onOpenChange: v => isCreateElementDialogOpen.val = v },
             // DialogContent needs to be wrapped in a function for Dialog component
             () => isCreateElementDialogOpen.val && componentForCreate.val ? DialogContent({ class: "sm:max-w-[600px]" }, // Example width
                 DialogHeader(DialogTitle("Create New Element")),
                 // Ensure ElementForm receives the plain component object
                 ElementForm({ elementToEdit: null, currentComponent: componentForCreate.val, onSave: handleElementCreated })
             ) : null
         )

    ); // End container div
};

export default ElementBrowserPopoverContent;
