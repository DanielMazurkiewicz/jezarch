import van, { State } from "vanjs-core"; // Import State
import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";
import * as icons from "./icons"; // Import icons

const { button, span } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// --- Styles ---
const checkboxRootStyle = style([
    styles.inlineFlex, // Use inline-flex for alignment with labels
    styles.itemsCenter,
    styles.justifyCenter,
    styles.border,
    styles.shadowSm,
    styles.transitionColors,
    {
        height: '1rem', // size-4
        width: '1rem', // size-4
        flexShrink: 0,
        borderRadius: '4px', // rounded-[4px]
        borderColor: themeVars.color.input,
        backgroundColor: themeVars.color.background, // Default background
        color: themeVars.color.primaryForeground, // Color for the checkmark
        outline: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        verticalAlign: 'middle', // Align nicely with text
        selectors: {
            '&:disabled': {
                cursor: 'not-allowed',
                opacity: 0.5,
            },
            '&:focus-visible': {
                 borderColor: themeVars.color.ring,
                 boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.ring}`,
            },
            '&[data-state="checked"]': {
                backgroundColor: themeVars.color.primary,
                borderColor: themeVars.color.primary,
            },
            '&[data-state="indeterminate"]': { // If you need indeterminate state
                 backgroundColor: themeVars.color.primary,
                 borderColor: themeVars.color.primary,
            },
             // Styling for invalid state
            '&[aria-invalid="true"]': {
                 borderColor: `${themeVars.color.destructive} !important`,
                 boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.destructive} !important`,
            },
        }
    }
]);

const checkboxIndicatorStyle = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    color: 'inherit', // Inherit color from parent (set based on state)
    // Hide indicator by default, show when checked/indeterminate
    selectors: {
        '[data-state="unchecked"] > &': {
            display: 'none',
        }
    }
});

const checkIconStyle = style({
    height: '0.875rem', // size-3.5
    width: '0.875rem',
});

// --- Component Props ---
interface CheckboxProps extends Omit<VanTag<HTMLButtonElement>, 'children' | 'checked' | 'onclick'> {
    checked: boolean | 'indeterminate' | State<boolean | 'indeterminate'>;
    onCheckedChange?: (checked: boolean) => void; // Callback expects boolean
    disabled?: boolean | State<boolean>;
    'aria-invalid'?: boolean | State<boolean>;
}

// --- Component ---
export const Checkbox = (props: CheckboxProps | State<CheckboxProps>) => {
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps = isPropsState ? (props as State<CheckboxProps>).val : props as CheckboxProps;

    const {
        checked,
        onCheckedChange,
        class: className = '',
        disabled = false,
        'aria-invalid': ariaInvalid,
        ...rest
    } = resolvedProps;

    // Ensure states are VanJS states
    const checkedState = typeof checked === 'object' && 'val' in checked ? checked : van.state(checked);
    const isDisabled = typeof disabled === 'object' && 'val' in disabled ? disabled : van.state(disabled);
    const isInvalid = typeof ariaInvalid === 'object' && 'val' in ariaInvalid ? ariaInvalid : van.state(Boolean(ariaInvalid));

    const handleClick = () => {
        if (isDisabled.val) return;
        // Cycle through states: unchecked -> checked -> unchecked
        // If indeterminate is supported, logic would be: indeterminate -> checked -> unchecked -> indeterminate? (Depends on desired UX)
        const currentState = checkedState.val;
        const nextChecked = currentState === true ? false : true;
        checkedState.val = nextChecked; // Update internal state first
        onCheckedChange?.(nextChecked); // Call callback
    };

    const dataState = van.derive(() => {
        const val = checkedState.val;
        return val === 'indeterminate' ? 'indeterminate' : val ? 'checked' : 'unchecked';
    });

    const combinedClass = van.derive(() => `${checkboxRootStyle} ${className}`.trim());

    const attrs = van.derive(() => ({
        ...rest,
        type: 'button', // Use button for better accessibility
        role: 'checkbox',
        'aria-checked': checkedState.val === 'indeterminate' ? 'mixed' : String(!!checkedState.val),
        'data-state': dataState.val,
        'aria-invalid': isInvalid.val || undefined,
        disabled: isDisabled.val,
        class: combinedClass.val,
        onclick: handleClick,
    }));

    // Pass derived attrs as a function to the button tag
    return button(() => attrs.val,
        span({ class: checkboxIndicatorStyle },
            // Render icon based on state
            () => checkedState.val === true ? icons.CheckIcon({ class: checkIconStyle })
                : checkedState.val === 'indeterminate' ? icons.MinusIcon({ class: checkIconStyle }) // Example for indeterminate
                : null
        )
    );
};