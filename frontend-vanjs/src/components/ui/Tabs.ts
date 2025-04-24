import van, { State } from "vanjs-core"; // Import State
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";

const { div, button } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}
type VanChild = Node | State<Node | null> | string | number | boolean | null | undefined | readonly VanChild[];


// --- Styles ---
const tabsRootStyle = style([styles.flex, styles.flexCol, styles.gap2]);

const tabsListStyle = style([
    styles.inlineFlex,
    styles.h9, // Match button height
    styles.itemsCenter,
    styles.justifyCenter,
    styles.roundedLg,
    styles.bgMuted, // Use muted background
    styles.p1, // Internal padding like p-[3px]
    {
        // Allow shrinking on small screens if needed, used with overflow wrapper
        // flexShrink: 0,
    }
]);

const tabsTriggerStyle = style([
    styles.inlineFlex,
    styles.itemsCenter,
    styles.justifyCenter,
    styles.whitespaceNowrap,
    styles.roundedMd, // Slightly smaller radius than list
    styles.px3,
    styles.py1, // Approx py-1.5
    styles.textSm,
    styles.fontMedium,
    styles.transitionColors,
    {
        flex: '1', // Allow triggers to grow
        height: 'calc(100% - 2px)', // Fit within list padding
        outline: 'none',
        color: themeVars.color.mutedForeground, // Default text color
        border: '1px solid transparent', // Maintain layout space
        userSelect: 'none',
        cursor: 'pointer',
        ':disabled': {
            pointerEvents: 'none',
            opacity: 0.5,
        },
        ':focus-visible': {
             borderColor: themeVars.color.ring,
             boxShadow: `0 0 0 2px ${themeVars.color.background}, 0 0 0 3px ${themeVars.color.ring}`, // Smaller ring
        },
        selectors: {
            // Active state
            '&[data-state="active"]': {
                backgroundColor: themeVars.color.background, // Active uses main background
                color: themeVars.color.foreground,
                boxShadow: styles.shadowSm, // Use shadowSm directly
            },
            // Hover state (only when not active)
            '&:not([data-state="active"]):hover': {
                 color: themeVars.color.foreground, // Darken text on hover
            }
        }
    }
]);

const tabsContentStyle = style([
    styles.flexGrow, // Allow content to take space if needed
    {
        outline: 'none',
        // Add focus styling if needed
        // ':focus-visible': { ... }
    }
]);


// --- Components ---

interface TabsProps extends VanTag<HTMLDivElement> {
    defaultValue?: string;
    value: State<string>; // Controlled component: requires state for value
    onValueChange: (value: string) => void;
}
// Root component manages state interaction
export const Tabs = ({ defaultValue, value, onValueChange, class: className = '', ...rest }: TabsProps, ...children: VanChild[]) => {
    // Initialize state if defaultValue is provided and value state is empty initially
    van.derive(() => { // Replaced effect with derive
        if (defaultValue && value.val === undefined) { // Basic check, might need refinement
            onValueChange(defaultValue); // Call the change handler to set initial value
        }
    });

    // Pass state and handler down (e.g., via context or direct prop drilling)
    // For simplicity, we'll assume children (TabList, TabContent) can access `value` state
    // and `onValueChange` function, or the parent component manages rendering based on `value`.
    return div({ class: `${tabsRootStyle} ${className}`.trim(), ...rest }, children);
};

interface TabListProps extends VanTag<HTMLDivElement> {}
export const TabList = (props: TabListProps, ...children: VanChild[]) => {
    // Check if props is a state and resolve it, otherwise use directly
    const resolvedProps = props instanceof van.state().constructor ? (props as State<TabListProps>).val : props;
    const { class: className = '', ...rest } = resolvedProps;
    return div({ role: "tablist", class: `${tabsListStyle} ${className}`.trim(), ...rest }, children);
};


interface TabTriggerProps extends Omit<VanTag<HTMLButtonElement>, 'onclick' | 'value'> {
    value: string; // The value associated with this trigger/tab
    // Rely on parent Tabs component's state for active check and setting value
    activeValueState: State<string>; // Passed from Tabs or parent
    onValueChange: (value: string) => void; // Passed from Tabs or parent
}
export const TabTrigger = (props: TabTriggerProps, ...children: VanChild[]) => {
    const { class: className = '', value, activeValueState, onValueChange, ...rest } = props;

    const isActive = van.derive(() => activeValueState.val === value);

    const handleClick = () => {
        if (activeValueState.val !== value) {
            onValueChange(value); // Update the shared state
        }
    };

    const attrs = van.derive(() => ({
        ...rest,
        role: "tab",
        type: "button",
        'aria-selected': isActive.val,
        'data-state': isActive.val ? "active" : "inactive",
        tabindex: isActive.val ? 0 : -1, // Manage focusability
        class: `${tabsTriggerStyle} ${className}`.trim(),
        onclick: handleClick,
    }));

    // Pass derived attrs as function
    return button(() => attrs.val, children);
};

interface TabContentProps extends VanTag<HTMLDivElement> {
    value: string; // The value this content corresponds to
    // We'll control visibility externally based on the active tab state for simplicity
}
// Simple TabContent: Renders its children. Visibility controlled by parent logic.
export const TabContent = (props: TabContentProps, ...children: VanChild[]) => {
     const { class: className = '', value, ...rest } = props;
     // In a more complex setup, this would read active state and conditionally render or hide
     // For now, parent component (e.g., AdminPage) will conditionally render the content based on active tab.
     return div({
         role: "tabpanel",
         'data-state': 'active', // Assume it's rendered only when active by parent
         // 'hidden': () => activeValueState.val !== value, // Alternative: use hidden attribute
         class: `${tabsContentStyle} ${className}`.trim(),
         ...rest
     }, children);
};