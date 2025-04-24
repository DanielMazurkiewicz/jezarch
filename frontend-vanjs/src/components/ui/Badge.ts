import van, { State } from "vanjs-core"; // Import State
import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";

const { span } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// Base badge style
const base = style([
    styles.inlineFlex,
    styles.itemsCenter,
    styles.roundedMd, // Use md radius
    styles.border,
    styles.px2, // px-2
    {
        paddingTop: '1px', // py-0.5 approx
        paddingBottom: '1px', // py-0.5 approx
        fontSize: '0.75rem', // text-xs value
        lineHeight: '1rem', // text-xs line-height value
        fontWeight: 500, // font-medium value
        whiteSpace: 'nowrap', // Prevent wrapping
        userSelect: 'none',
    }
]);

// Variants
const variantStyles = styleVariants({
    default: {
        borderColor: 'transparent',
        backgroundColor: themeVars.color.primary,
        color: themeVars.color.primaryForeground,
    },
    secondary: {
        borderColor: 'transparent',
        backgroundColor: themeVars.color.secondary,
        color: themeVars.color.secondaryForeground,
    },
    destructive: {
        borderColor: 'transparent',
        backgroundColor: themeVars.color.destructive,
        color: themeVars.color.destructiveForeground, // Usually white/light
    },
    outline: {
        borderColor: themeVars.color.border, // Use default border color
        backgroundColor: 'transparent',
        color: themeVars.color.foreground,
    },
});

// --- Component Props ---
interface BadgeProps extends VanTag<HTMLSpanElement> {
    variant?: keyof typeof variantStyles;
}

// --- Component ---
export const Badge = (props: BadgeProps | State<BadgeProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps = isPropsState ? (props as State<BadgeProps>).val : props;

    const {
        variant = "default",
        class: className = "",
        ...rest
    } = resolvedProps;

    const combinedClass = van.derive(() => {
        const currentVariant = (isPropsState ? (props as State<BadgeProps>).val.variant || 'default' : variant) as keyof typeof variantStyles; // Ensure type
        return `${base} ${variantStyles[currentVariant]} ${className}`.trim();
    });

    const attrs = van.derive(() => ({
        ...rest,
        class: combinedClass.val,
    }));

    return span(attrs, children);
};