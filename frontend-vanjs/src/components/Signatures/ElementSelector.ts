import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/Command";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/Label";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css"; // Import theme vars
import type { SignatureComponent } from "../../../../backend/src/functionalities/signature/component/models";
import type { SignatureElement } from "../../../../backend/src/functionalities/signature/element/models";

const { div, span, p, button } = van.tags; // Added button, p

// --- Styles ---
const selectorContainerStyle = style([styles.spaceY2, styles.p3, styles.border, styles.roundedMd, styles.bgMuted]); // Use bg-muted for container
const triggerButtonStyle = style([styles.wFull, styles.justifyBetween, styles.h9, styles.fontNormal, styles.bgBackground]); // Trigger bg = main background, Added h9
const popoverContentStyle = style({ width: 'var(--radix-popover-trigger-width)', padding: 0 }); // Match trigger width
const commandItemStyle = style([styles.cursorPointer, styles.textSm]);
const checkIconStyle = style([styles.pr2, { opacity: 0 }]);
const checkIconVisibleStyle = style({ opacity: 1 });
const selectedBadgeStyle = style([styles.itemsCenter]);
const removeBadgeButtonStyle = style([styles.p1, styles.roundedLg, styles.textMutedForeground, {
    marginLeft: themeVars.spacing.xs, // ml-1
    ':hover': { color: themeVars.color.foreground, backgroundColor: themeVars.color.background + '80' }
}]);
const removeBadgeIconStyle = style([styles.h3, styles.w3]); // Added h3, w3
const indexSpanStyle = style([styles.fontMono, styles.textXs, styles.w10, styles.mr2, styles.textRight, styles.inlineBlock]); // Added w10, mr2, inlineBlock

// --- Component Props ---
interface ElementSelectorProps {
    selectedElementIds: State<number[]>; // Expect VanJS state
    onChange: (selectedIds: number[]) => void; // Callback for parent
    currentComponentId?: number; // Optional: Exclude elements from this component (passed during fetch)
    currentElementId?: number; // Optional: Exclude the element itself
    label?: string;
    class?: string;
}

// --- Component ---
const ElementSelector = ({
    selectedElementIds,
    onChange,
    currentComponentId, // Not directly used in rendering, but for fetching
    currentElementId,
    label = "Select Parent Elements",
    class: className = ''
}: ElementSelectorProps) => {
    const { token } = authStore;

    // --- State ---
    const availableComponents = van.state<SignatureComponent[]>([]);
    const searchComponentId = van.state<string>(""); // Component ID to search within
    const availableElements = van.state<SignatureElement[]>([]);
    const isLoadingComponents = van.state(false);
    const isLoadingElements = van.state(false);
    const isLoadingSelectedDetails = van.state(false);
    const error = van.state<string | null>(null);
    const open = van.state(false); // Popover state
    const selectedElementObjects = van.state<SignatureElement[]>([]); // For badges
    const searchTerm = van.state(""); // Search within popover

    // --- Fetch Components ---
    van.derive(() => { // Use derive
        if (!token.val) return;
        isLoadingComponents.val = true; error.val = null;
        api.getAllSignatureComponents(token.val)
            .then(comps => availableComponents.val = comps.sort((a, b) => a.name.localeCompare(b.name)))
            .catch(err => error.val = err.message || "Failed to load components")
            .finally(() => isLoadingComponents.val = false);
    });


    // --- Fetch Elements ---
    van.derive(() => { // Use derive
        if (!token.val || !searchComponentId.val) {
            availableElements.val = []; return;
        }
        isLoadingElements.val = true; error.val = null;
        api.getElementsByComponent(parseInt(searchComponentId.val, 10), token.val)
            .then(elems => {
                availableElements.val = elems
                    .filter(el => el.signatureElementId !== currentElementId) // Exclude self
                    .sort((a, b) => (a.index ?? a.name).localeCompare(b.index ?? b.name));
            })
            .catch(err => { error.val = err.message || "Failed to load elements"; availableElements.val = []; })
            .finally(() => isLoadingElements.val = false);
    });


    // --- Fetch Selected Element Details (for Badges) ---
    van.derive(async () => { // Use derive with async
        const idsToFetch = selectedElementIds.val; // Depend on the state value
        if (!token.val || idsToFetch.length === 0) {
            selectedElementObjects.val = []; return;
        }
        // Avoid fetching if already loading
        if (isLoadingSelectedDetails.val) return;

        isLoadingSelectedDetails.val = true;
        try {
             const results = await Promise.all(idsToFetch.map(id => api.getSignatureElementById(id, [], token.val!).catch(() => null)))
             selectedElementObjects.val = results
                    .filter((el): el is SignatureElement => el !== null)
                    .sort((a, b) => a.name.localeCompare(b.name));
        } catch (err) {
             console.error("Failed to fetch selected element details:", err)
             // Optionally set an error state here
        } finally {
             isLoadingSelectedDetails.val = false;
        }
    });



    // --- Event Handlers ---
    const handleSelectElement = (elementId: number) => {
        const currentSelected = selectedElementIds.val;
        const newSelectedIds = currentSelected.includes(elementId)
            ? currentSelected.filter(id => id !== elementId)
            : [...currentSelected, elementId];
        selectedElementIds.val = newSelectedIds; // Update state
        onChange(newSelectedIds); // Notify parent
        searchTerm.val = ""; // Clear search in popover
        // Keep popover open for multi-select
    };

    // --- Derived State ---
    const filteredDropdownElements = van.derive(() =>
        availableElements.val.filter(el =>
            (el.name.toLowerCase().includes(searchTerm.val.toLowerCase()) ||
            el.index?.toLowerCase().includes(searchTerm.val.toLowerCase()))
        )
    );
    const componentOptions = van.derive(() => availableComponents.val.map(c => ({ value: String(c.signatureComponentId), label: c.name })));

    // --- Render ---
    return div({ class: `${selectorContainerStyle} ${className}`.trim() },
        Label({ class: styles.textSm }, label),
        // Component Selector
        Select({
            value: searchComponentId, // Bind state
            onchange: (e: Event) => searchComponentId.val = (e.target as HTMLSelectElement).value,
            options: componentOptions, // Use derived options
            placeholder: "Select Component...",
            disabled: isLoadingComponents, // Use state value
        }),

        // Element Multi-Select Popover
        Popover({ open: open, onOpenChange: v => open.val = v },
            PopoverTrigger({ class: 'w-full' }, // Wrap trigger
                Button({
                    variant: "outline", role: "combobox", 'aria-expanded': open,
                    class: triggerButtonStyle,
                    disabled: () => isLoadingElements.val || !searchComponentId.val || !!error.val, // Reactive disabled
                    onclick: (e: Event) => { open.val = !open.val; (e.currentTarget as HTMLElement).focus(); } // Added manual toggle + focus
                    },
                    span({ class: styles.truncate }, () => // Reactive text
                        isLoadingElements.val ? 'Loading elements...' :
                        !searchComponentId.val ? 'Select component first' :
                        error.val ? 'Error loading elements' :
                        'Select elements...'
                    ),
                    () => isLoadingElements.val // Reactive icon
                        ? LoadingSpinner({ size: "sm", class: styles.ml2 }) // Added ml2
                        : icons.ChevronsUpDownIcon({ class: `${styles.ml2} ${styles.h4} ${styles.w4} ${styles.flexShrink0} ${styles.opacity50}` }) // Added ml2, h4, w4
                )
            ),
            PopoverContent({ class: popoverContentStyle, align: "start" },
                Command({ }, // Empty props
                    CommandInput({ value: searchTerm, onValueChange: v => searchTerm.val = v, placeholder: "Search elements..." }), // Corrected binding
                    CommandList(
                        () => isLoadingElements.val ? div({ class: `${styles.textCenter} ${styles.p2} ${styles.textSm} ${styles.textMutedForeground}` }, LoadingSpinner({ size: 'sm' })) : null,
                        () => !isLoadingElements.val && filteredDropdownElements.val.length === 0 ? CommandEmpty('No elements found.') : null,
                        () => !isLoadingElements.val && filteredDropdownElements.val.length > 0 ? CommandGroup(
                            filteredDropdownElements.val.map((el) =>
                                CommandItem({
                                    key: el.signatureElementId, value: `${el.index || ''} ${el.name}`,
                                    onSelect: () => handleSelectElement(el.signatureElementId!),
                                    class: commandItemStyle
                                    },
                                    icons.CheckIcon({ class: () => selectedElementIds.val.includes(el.signatureElementId!) ? `${checkIconStyle} ${checkIconVisibleStyle}` : checkIconStyle }), // Pass class
                                    span({ class: indexSpanStyle }, el.index || '-'),
                                    span(el.name)
                                )
                            )
                        ) : null // End Group conditional
                    ) // End List
                ) // End Command
            ) // End Content
        ), // End Popover

        // Display Selected Badges
        div({ class: `${styles.flex} ${styles.flexWrap} ${styles.gap1} ${styles.pt1} ${styles.minH22}` }, // Added minH22
             () => isLoadingSelectedDetails.val ? LoadingSpinner({ size: 'sm' }) : null,
             // Use derive for reactive badge list
             van.derive(() => !isLoadingSelectedDetails.val && selectedElementObjects.val.length > 0
                 ? selectedElementObjects.val.map(el =>
                     Badge({ key: el.signatureElementId, variant: "secondary", class: selectedBadgeStyle },
                         span(el.index ? `[${el.index}] ${el.name}` : el.name),
                         button({ type: "button", class: removeBadgeButtonStyle, onclick: () => handleSelectElement(el.signatureElementId!), 'aria-label': `Remove ${el.name}` },
                             icons.XIcon({ class: removeBadgeIconStyle }) // Pass class
                         )
                     )
                   )
                 : null),
              () => !isLoadingSelectedDetails.val && selectedElementIds.val.length === 0
                  ? span({ class: `${styles.textXs} ${styles.textMutedForeground} ${styles.italic}` }, "No parents selected")
                  : null
        ),

        // Error display for component/element loading
        () => error.val ? p({ class: `${styles.textXs} ${styles.textDestructive} ${styles.mt1}` }, error.val) : null // Added mt1
    );
};

export default ElementSelector;