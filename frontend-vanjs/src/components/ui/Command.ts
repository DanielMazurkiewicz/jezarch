import van, { State } from "vanjs-core"; // Import State
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";
import * as icons from "./icons";
import { Input, InputProps } from "./Input"; // Use Input component and its props type

const { div, ul, li, span, input } = van.tags;

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
const commandStyle = style([
    styles.flex, styles.flexCol, styles.hFull, styles.wFull, styles.overflowHidden, styles.roundedMd,
    styles.bgBackground, // Use theme background
    styles.textForeground
]);

const commandInputWrapperStyle = style([
    styles.flex, styles.itemsCenter, styles.gap2, styles.borderB, styles.px3,
    { height: '3rem' } // h-12 approx
]);

const commandInputStyle = style([ // Style applied to the Input component's class prop
    styles.hFull, // Take full height of wrapper
    styles.bgTransparent,
    styles.borderNone, // Remove Input's default border
    styles.shadowSm, // Remove Input's default shadow
    {
        // borderWidth: 0, // Covered by borderNone
        boxShadow: 'none', // Remove shadow specifically
        outline: 'none',
        flexGrow: 1,
        paddingLeft: 0, // Remove Input's default padding
        paddingRight: 0,
         ':focus-visible': { // Remove Input's focus ring inside Command
            boxShadow: 'none',
            borderColor: 'transparent'
         }
    }
]);

const commandListStyle = style([
    styles.overflowYAuto, styles.overflowHidden, // Use overflowHidden for X
    { maxHeight: '300px', scrollPaddingTop: themeVars.spacing.xs, scrollPaddingBottom: themeVars.spacing.xs } // Use theme vars for padding
]);

const commandEmptyStyle = style([styles.py6, styles.textCenter, styles.textSm, styles.textMutedForeground]);

const commandGroupStyle = style([
    styles.overflowHidden, styles.p1,
    // Heading styles (use a specific element/class for heading)
    {
        selectors: {
            '& > [data-command-heading]': {
                 paddingLeft: themeVars.spacing.sm, // Use theme vars
                 paddingRight: themeVars.spacing.sm,
                 paddingTop: themeVars.spacing.xs, // py-1 approx
                 paddingBottom: themeVars.spacing.xs,
                 fontSize: '0.75rem', // text-xs value
                 fontWeight: 500, // font-medium value
                 color: themeVars.color.mutedForeground, // text-muted-foreground value
            }
        }
    }
]);

const commandItemStyle = style([
    styles.relative, styles.flex, styles.itemsCenter, styles.gap2, styles.roundedMd, // rounded-sm approx
    styles.px2, styles.py1, // py-1.5 approx
    styles.textSm,
    styles.cursorPointer, // cursor-default approx
    {
        outline: 'none',
        userSelect: 'none',
        selectors: {
             '&[data-selected="true"]': { // Use data attribute for selected state
                 backgroundColor: themeVars.color.accent,
                 color: themeVars.color.accentForeground,
             },
             '&[data-disabled="true"]': {
                 pointerEvents: 'none',
                 opacity: 0.5,
             },
             '&:active': { // Basic active state
                  backgroundColor: themeVars.color.accent + 'cc', // Slightly darker accent
             },
             // Icon styling
             '& > svg:not([class*="text-"])': {
                  color: themeVars.color.mutedForeground,
             },
             '& > svg': {
                 pointerEvents: 'none',
                 flexShrink: 0,
                 width: '1rem', // size-4 value
                 height: '1rem',
             }
        }
    }
]);

const commandSeparatorStyle = style([styles.bgBackground, styles.mxN1, styles.my1, { height: '1px', pointerEvents: 'none' }]); // -mx-1, my-1

// --- Components ---

interface CommandProps extends VanTag<HTMLDivElement> {
    // shouldFilter prop is handled internally now based on input value
    // filter?: (value: string, search: string) => number; // Optional custom filter
}
export const Command = (props: CommandProps | State<CommandProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CommandProps>).val : props as CommandProps;
    // We need to pass state down (e.g., search term) or use context if structure is complex
    return div({ class: `${commandStyle} ${className}`.trim(), ...rest }, children);
};

interface CommandInputProps extends Omit<InputProps, 'type'> { // Inherit from Input props
    value: State<string>; // Expect a state for binding
    onValueChange: (value: string) => void; // Callback on change
}
export const CommandInput = ({ value, onValueChange, class: className = '', placeholder = "Search...", ...rest }: CommandInputProps) => {
    return div({ class: commandInputWrapperStyle },
        icons.SearchIcon({ class: styles.opacity50 }), // size-4 already applied by base icon style?
        Input({ // Use the Input component
            value: value, // Bind state
            oninput: (e: Event) => {
                const newValue = (e.target as HTMLInputElement).value;
                value.val = newValue; // Update state directly
                onValueChange?.(newValue); // Call callback
            },
            placeholder: placeholder,
            class: `${commandInputStyle} ${className}`.trim(), // Apply specific command input styles
            ...rest // Pass other Input props
        })
    );
};


interface CommandListProps extends VanTag<HTMLDivElement> {}
export const CommandList = (props: CommandListProps | State<CommandListProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CommandListProps>).val : props as CommandListProps;
    return div({ class: `${commandListStyle} ${className}`.trim(), ...rest }, children); // Use div instead of ul for flexibility
};

interface CommandEmptyProps extends VanTag<HTMLDivElement> {}
export const CommandEmpty = (props: CommandEmptyProps | State<CommandEmptyProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CommandEmptyProps>).val : props as CommandEmptyProps;
    return div({ class: `${commandEmptyStyle} ${className}`.trim(), ...rest }, children);
};

interface CommandGroupProps extends VanTag<HTMLDivElement> {
    heading?: string | State<string>;
}
export const CommandGroup = (props: CommandGroupProps | State<CommandGroupProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', heading, ...rest } = isPropsState ? (props as State<CommandGroupProps>).val : props as CommandGroupProps;

    const headingContent = typeof heading === 'object' && heading !== null && 'val' in heading ? heading : van.state(heading);

    return div({ class: `${commandGroupStyle} ${className}`.trim(), ...rest },
        // Render heading reactively if provided
        () => headingContent.val ? div({ 'data-command-heading': true }, headingContent.val) : null,
        children
    );
};

interface CommandItemProps extends Omit<VanTag<HTMLLIElement>, 'onSelect'> { // Use li for semantics? Or div?
    value: string; // Value used for filtering/selection
    onSelect?: (value: string) => void;
    disabled?: boolean | State<boolean>;
    selected?: boolean | State<boolean>; // Add selected state
}
export const CommandItem = (props: CommandItemProps | State<CommandItemProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps = isPropsState ? (props as State<CommandItemProps>).val : props as CommandItemProps;
    const {
        class: className = '',
        value,
        onSelect,
        disabled = false,
        selected = false,
        ...rest
    } = resolvedProps;

     // Ensure states are VanJS states
    const isDisabled = typeof disabled === 'object' && 'val' in disabled ? disabled : van.state(disabled);
    const isSelected = typeof selected === 'object' && 'val' in selected ? selected : van.state(selected);

    const handleClick = () => {
        if (!isDisabled.val) {
            onSelect?.(value);
        }
    };

    const attrs = van.derive(() => ({
        ...rest,
        class: `${commandItemStyle} ${className}`.trim(),
        onclick: handleClick,
        role: "option",
        'aria-selected': isSelected.val,
        'data-selected': isSelected.val,
        'data-disabled': isDisabled.val,
        'aria-disabled': isDisabled.val,
        // Add value attribute for potential filtering?
        'data-value': value,
    }));

    // Pass derived attrs as a function
    return li(() => attrs.val, children); // Using li for semantics
};

interface CommandSeparatorProps extends VanTag<HTMLDivElement> {}
export const CommandSeparator = (props: CommandSeparatorProps | State<CommandSeparatorProps>) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CommandSeparatorProps>).val : props as CommandSeparatorProps;
    return div({ class: `${commandSeparatorStyle} ${className}`.trim(), ...rest });
};

// CommandShortcut is just a styled span
interface CommandShortcutProps extends VanTag<HTMLSpanElement> {}
export const CommandShortcut = (props: CommandShortcutProps | State<CommandShortcutProps>, ...children: VanChild[]) => {
     // Simple span for shortcuts, styling needed
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CommandShortcutProps>).val : props as CommandShortcutProps;
    const shortcutStyle = style([styles.mlAuto, styles.textXs, styles.textMutedForeground, {letterSpacing: '0.1em'}]);
    return span({ class: `${shortcutStyle} ${className}`.trim(), ...rest }, children);
};