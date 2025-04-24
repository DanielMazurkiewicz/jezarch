import van, { State } from "vanjs-core"; // Import State
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";

const { input } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// --- Styles ---
const inputStyle = style([
    styles.flex,
    styles.h9, // default height
    styles.wFull,
    styles.roundedMd,
    styles.border,
    styles.px3, // default padding
    styles.py1, // adjusted vertical padding
    styles.textBase, // default text size
    styles.bgBackground, // Ensure background for contrast
    styles.shadowSm, // subtle shadow
    styles.transitionColors,
    {
        borderColor: themeVars.color.input,
        color: themeVars.color.foreground,
        outline: 'none',
        '::placeholder': {
            color: themeVars.color.mutedForeground,
            opacity: 1, // Ensure placeholder is visible
        },
        // Add other pseudo-classes as needed
        ':disabled': {
            cursor: 'not-allowed',
            opacity: 0.5,
        },
        ':focus-visible': {
            borderColor: themeVars.color.ring,
            boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.ring}`,
        },
        // Styling for specific types like file inputs (optional)
        selectors: {
            '&[type="file"]': {
                paddingTop: themeVars.spacing.sm, // py-2 value
                paddingBottom: themeVars.spacing.sm,
            },
            '&[type="file"]::file-selector-button': {
                 // Style the file selector button if needed
                 // Example: border: 'none', background: themeVars.color.primary, color: themeVars.color.primaryForeground
            }
        }
    }
]);

// Style for invalid state
const invalidInputStyle = style({
    borderColor: `${themeVars.color.destructive} !important`, // Ensure override
     boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.destructive} !important`,
    // ':focus-visible': { // Override focus for invalid state
    //     borderColor: themeVars.color.destructive,
    //     boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.destructive}`,
    // }
});

// --- Component Props ---
// Use Van's built-in HTML props, extend if needed
export interface InputProps extends VanTag<HTMLInputElement> { // Export for CommandInput
    'aria-invalid'?: boolean | State<boolean>; // Make aria-invalid reactive
}

// --- Component ---
export const Input = (props: InputProps | State<InputProps>) => {
    // Handle potential state props
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps = isPropsState ? (props as State<InputProps>).val : props as InputProps;

    const { class: className = '', 'aria-invalid': ariaInvalid, ...rest } = resolvedProps;

    // Derive class based on aria-invalid state
    const isInvalid = typeof ariaInvalid === 'object' && 'val' in ariaInvalid
                      ? ariaInvalid
                      : van.state(Boolean(ariaInvalid));

    const combinedClass = van.derive(() =>
        `${inputStyle} ${isInvalid.val ? invalidInputStyle : ''} ${className}`.trim()
    );

    // Derive attributes for reactive updates
    const attrs = van.derive(() => ({
        ...rest,
        class: combinedClass.val,
        'aria-invalid': isInvalid.val || undefined, // Set attribute only if true
    }));

    // Pass derived attrs as function
    return input(() => attrs.val);
};