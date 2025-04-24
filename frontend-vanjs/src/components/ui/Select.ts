import van, { State } from "vanjs-core"; // Import State
import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";
import * as icons from "./icons";

const { div, select, option, button, span } = van.tags; // Added span, button

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}


// --- Styles ---
// Basic native select styling - less control than custom implementations
const selectStyle = style([
    styles.h9, // Match input height
    styles.wFull, // Default to full width, adjust via props if needed
    styles.roundedMd,
    styles.border,
    styles.px3, // Padding for text
    styles.textSm,
    styles.bgBackground,
    styles.shadowSm,
    styles.transitionColors,
    {
        borderColor: themeVars.color.input,
        color: themeVars.color.foreground,
        outline: 'none',
        appearance: 'none', // Remove default system appearance
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, // Basic chevron down icon
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right ${themeVars.spacing.md} center`, // Use theme var for position (px-3 value)
        backgroundSize: '1em', // Icon size
        paddingRight: `calc(1em + ${themeVars.spacing.md} * 2)`, // Use theme var for padding (px-3 * 2)
        ':disabled': {
            cursor: 'not-allowed',
            opacity: 0.5,
        },
        ':focus-visible': {
             borderColor: themeVars.color.ring,
             boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.ring}`,
        },
        // Style for invalid state
        selectors: {
             '&[aria-invalid="true"]': {
                 borderColor: `${themeVars.color.destructive} !important`,
                 boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.destructive} !important`,
             }
        }
    }
]);

// --- Component Props ---
// Using native select, props match HTMLSelectElement attributes
// We add `options` for convenience
interface SelectProps extends Omit<VanTag<HTMLSelectElement>, 'children' | 'value'> { // Omit children and value
    options: { value: string | number; label: string; disabled?: boolean }[];
    placeholder?: string;
    value: State<string | number | undefined> | string | number | undefined; // Allow state or direct value
    onchange: (e: Event) => void; // Standard onchange handler
     'aria-invalid'?: boolean | State<boolean>;
}

// --- Component ---
// This uses a native <select> element for simplicity.
// A custom dropdown (like Shadcn's using Popover/Command) is more complex to build.
export const Select = (props: SelectProps | State<SelectProps>) => {
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps = isPropsState ? (props as State<SelectProps>).val : props as SelectProps;

    const {
        options,
        placeholder,
        value: valueProp, // Rename to avoid conflict
        onchange,
        class: className = '',
        'aria-invalid': ariaInvalid,
        ...rest
    } = resolvedProps;

    // Handle stateful value binding
    const valueState = typeof valueProp === 'object' && valueProp !== null && 'val' in valueProp
        ? valueProp
        : van.state(valueProp); // Create state if not provided

    // Derive aria-invalid state
     const isInvalid = typeof ariaInvalid === 'object' && 'val' in ariaInvalid
                      ? ariaInvalid
                      : van.state(Boolean(ariaInvalid));

    const combinedClass = van.derive(() => `${selectStyle} ${className}`.trim());

     const attrs = van.derive(() => ({
         ...rest,
         class: combinedClass.val,
         value: valueState.val ?? "", // Bind to state value, use "" for placeholder/undefined
         oninput: (e: Event) => { // Use oninput for better binding with VanJS state
             const target = e.target as HTMLSelectElement;
             const selectedVal = target.value;
             // Coerce back to number if original options used numbers
             const originalOption = options.find(opt => String(opt.value) === selectedVal);
             valueState.val = originalOption && typeof originalOption.value === 'number' ? Number(selectedVal) : selectedVal;
             onchange?.(e); // Call original onchange handler if provided
         },
         'aria-invalid': isInvalid.val || undefined,
     }));

    return select(() => attrs.val, // Pass derived attrs as function
        // Add placeholder option if provided
        placeholder ? option({ value: "", disabled: true, selected: valueState.val === undefined || valueState.val === "" }, placeholder) : null,
        // Map options array
        options.map(opt =>
            option(
                {
                    value: String(opt.value),
                    disabled: opt.disabled,
                    // Set selected based on comparison with state value
                    // selected: () => String(opt.value) === String(valueState.val), // This might cause issues, rely on <select value>
                },
                opt.label
            )
        )
    );
};

// Simpler exports for now, matching Shadcn structure slightly
export const SelectTrigger = (props: any, ...children: any[]) => button({ ...props, 'aria-haspopup': 'listbox' }, children); // Placeholder
export const SelectValue = (props: any, ...children: any[]) => span(props, children); // Placeholder
export const SelectContent = (props: any, ...children: any[]) => div(props, children); // Placeholder
export const SelectItem = (props: any, ...children: any[]) => div({ role: 'option', ...props }, children); // Placeholder