import van, { State } from "vanjs-core"; // Import State
import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css"; // Import base utility styles

const { button } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}


// Base button style
const base = style([
    styles.inlineFlex,
    styles.itemsCenter,
    styles.justifyCenter,
    styles.gap2,
    styles.whitespaceNowrap,
    styles.roundedMd,
    styles.textSm,
    styles.fontMedium,
    styles.transitionColors, // Use specific transition name if defined, else general colors
    styles.flexShrink0, // Ensure button doesn't shrink unexpectedly
    {
        outline: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        ':disabled': {
            pointerEvents: 'none',
            opacity: 0.5,
        },
        // Base focus visible (can be enhanced)
        ':focus-visible': {
            borderColor: themeVars.color.ring, // Reuse ring color for focus border
            boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.ring}`, // Ring effect
        },
        // Ensure icons size correctly
        selectors: {
            '& > svg:not([class*="size-"])': { // Target svgs without explicit size class
                width: '1em', // Default to font size
                height: '1em',
            }
        }
    }
]);

// Variants
const variantStyles = styleVariants({
    default: [ styles.shadowSm, {
        backgroundColor: themeVars.color.primary,
        color: themeVars.color.primaryForeground,
        ':hover': { backgroundColor: themeVars.color.primary + 'd9' }, // Approx 90% opacity
    }],
    destructive: [ styles.shadowSm, {
        backgroundColor: themeVars.color.destructive,
        color: themeVars.color.destructiveForeground, // Typically white/light
        ':hover': { backgroundColor: themeVars.color.destructive + 'd9' }, // Approx 90% opacity
    }],
    outline: [ styles.border, styles.shadowSm, {
        backgroundColor: themeVars.color.background, // Use card/popover bg if on those surfaces
        borderColor: themeVars.color.input, // Use input border color
        color: themeVars.color.foreground,
        ':hover': {
            backgroundColor: themeVars.color.accent,
            color: themeVars.color.accentForeground,
        },
    }],
    secondary: [ styles.shadowSm, {
        backgroundColor: themeVars.color.secondary,
        color: themeVars.color.secondaryForeground,
        ':hover': { backgroundColor: themeVars.color.secondary + 'cc' }, // Approx 80% opacity
    }],
    ghost: {
        backgroundColor: 'transparent',
        color: themeVars.color.foreground,
        ':hover': {
            backgroundColor: themeVars.color.accent,
            color: themeVars.color.accentForeground,
        },
    },
    link: {
        color: themeVars.color.primary,
        textDecoration: 'none',
        padding: 0, // Remove padding for link-like appearance
        height: 'auto', // Allow height to be determined by content
        ':hover': { textDecoration: 'underline', backgroundColor: 'transparent' },
    },
});

// Sizes
const sizeStyles = styleVariants({
    default: [ styles.h9, styles.px4, styles.py2, { // h-9 is approx 36px
        // Specific padding adjustments if icon is present (complex selector, might skip for simplicity)
    }],
    sm: [ styles.h8, styles.px3, styles.gap1, { // h-8 is approx 32px, gap-1.5 approx
         fontSize: '0.875rem' // text-sm value
    }],
    lg: [ styles.h10, styles.px6, { // h-10 is approx 40px
        // Larger padding
    }],
    icon: [ styles.h9, styles.w9, { // size-9
         padding: 0, // No padding for icon buttons
         selectors: {
             '> svg': { // Ensure icon inside fits well
                 width: `calc(${styles.h9} / 2)`, // Use h9 value directly
                 height: `calc(${styles.h9} / 2)`,
             }
         }
    }],
});


// --- Component Props ---
// Can't directly use VariantProps with VanJS function components easily.
// We'll use simple string props.
interface ButtonProps extends Omit<VanTag<HTMLButtonElement>, 'children'> {
    variant?: keyof typeof variantStyles;
    size?: keyof typeof sizeStyles;
    class?: string; // Allow passing extra classes
    disabled?: boolean | State<boolean>; // Allow state for disabled
    // VanJS children type is complex, use any[] for simplicity here
    children?: any[];
}

// --- Component ---
export const Button = (props: ButtonProps | State<ButtonProps>, ...children: any[]) => {
    // Handle potential state props
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps: ButtonProps = isPropsState ? (props as State<ButtonProps>).val : props as ButtonProps;

    const {
        variant = "default",
        size = "default",
        class: className = "",
        disabled = false,
        children: propChildren, // Capture children from props if passed
        ...rest
    } = resolvedProps;

    // Combine children from args and props
    const finalChildren = propChildren ? [...propChildren, ...children] : children;

    // Combine styles
    const combinedClass = van.derive(() => {
        const currentVariant = (isPropsState ? (props as State<ButtonProps>).val.variant || 'default' : variant) as keyof typeof variantStyles;
        const currentSize = (isPropsState ? (props as State<ButtonProps>).val.size || 'default' : size) as keyof typeof sizeStyles;
        const currentClassName = isPropsState ? (props as State<ButtonProps>).val.class || '' : className;
        return `${base} ${variantStyles[currentVariant]} ${sizeStyles[currentSize]} ${currentClassName}`.trim();
    });


    // Handle disabled state which might be a VanJS state
    const isDisabled = typeof disabled === 'object' && 'val' in disabled ? disabled : van.state(disabled);

    // Use derived attributes for reactive updates
    const attrs = van.derive(() => ({
        ...rest,
        class: combinedClass.val,
        disabled: isDisabled.val,
        // Add other attributes derived from props if needed
    }));

    // Unwrap attrs state before passing to button tag function
    return button(() => attrs.val, finalChildren);
};