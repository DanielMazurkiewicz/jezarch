import van, { State } from "vanjs-core"; // Import State
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";

const { label } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// --- Styles ---
const labelStyle = style([
    styles.textSm,
    styles.fontMedium,
    styles.flex, // Allow alignment if needed
    styles.itemsCenter, // Vertically align if used with checkbox/radio
    styles.gap2,
    {
        color: themeVars.color.foreground,
        lineHeight: 'none', // Prevent extra space below label
        userSelect: 'none', // Standard label behavior
        // Styling for when associated input is disabled (using peer-disabled in Tailwind)
        // requires specific HTML structure or JS logic. This is a basic disabled style.
        selectors: {
            // Example: If label wraps a disabled input/button directly
            '&:has([disabled])': {
                 opacity: 0.7,
                 cursor: 'not-allowed',
            },
            // Example: If label is sibling to a disabled input with specific class/attr
            // '[disabled] + &': { ... }
        }
    }
]);

// Style for when the label is associated with an invalid input
const invalidLabelStyle = style({
    color: themeVars.color.destructive,
});

// --- Component Props ---
// Use Van's built-in HTML props, extend if needed
interface LabelProps extends VanTag<HTMLLabelElement> {
    // Add custom props if necessary, e.g., for error state
    isInvalid?: boolean | State<boolean>;
}

// --- Component ---
export const Label = (props: LabelProps | State<LabelProps>, ...children: any[]) => {
    // Handle potential state props
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps = isPropsState ? (props as State<LabelProps>).val : props as LabelProps;

    const { class: className = '', isInvalid: invalidProp, ...rest } = resolvedProps;

    // Derive class based on invalid state
    const isInvalid = typeof invalidProp === 'object' && 'val' in invalidProp
                      ? invalidProp
                      : van.state(Boolean(invalidProp));

    const combinedClass = van.derive(() =>
        `${labelStyle} ${isInvalid.val ? invalidLabelStyle : ''} ${className}`.trim()
    );

    const attrs = van.derive(() => ({
        ...rest,
        class: combinedClass.val,
    }));

    // Pass derived attrs as function
    return label(() => attrs.val, children);
};