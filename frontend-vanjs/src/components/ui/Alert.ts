import van, { State } from "vanjs-core"; // Import State
import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";
import * as icons from "./icons"; // Assuming icons are here

const { div } = van.tags;

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
const alertBaseStyle = style([
    styles.relative,
    styles.wFull,
    styles.roundedLg,
    styles.border,
    styles.p4, // Use p4 for default padding
    styles.textSm,
    {
        display: 'grid', // Use grid for layout with icon
        gridTemplateColumns: `calc(${themeVars.spacing.lg} + ${themeVars.spacing.sm}) 1fr`, // Icon width + gap, then content
        gap: `0 ${themeVars.spacing.md}`, // Column gap, no row gap initially
        alignItems: 'start', // Align items to the top
        // Default icon styling
        selectors: {
            '& > svg:first-child': { // Target the icon if it's the first child
                gridColumn: 1,
                gridRow: '1 / span 2', // Span title and description rows
                marginTop: '1px', // Fine-tune alignment
                width: '1rem', // size-4
                height: '1rem',
                color: 'currentColor', // Inherit color from variant
            }
        }
    }
]);

const alertVariantStyles = styleVariants({
    default: {
        backgroundColor: themeVars.color.background, // Use background, not card
        borderColor: themeVars.color.border,
        color: themeVars.color.foreground,
    },
    destructive: {
        backgroundColor: themeVars.color.background, // Use background
        borderColor: themeVars.color.destructive + '80', // destructive/50
        color: themeVars.color.destructive,
        selectors: {
            '& > svg:first-child': { // Icon color for destructive
                color: themeVars.color.destructive,
            },
            // Optional: Adjust description color if needed
            // '& [data-slot="alert-description"]': {
            //     color: themeVars.color.destructive + 'e6' // destructive/90
            // }
        }
    },
    // Add other variants if needed (e.g., success, warning)
    success: { // Example success variant
        backgroundColor: themeVars.color.background,
        borderColor: 'hsl(140, 60%, 80%)', // Light green border
        color: 'hsl(140, 80%, 30%)', // Dark green text
        selectors: {
            '& > svg:first-child': { color: 'hsl(140, 80%, 30%)' }
        }
    }
});

const alertTitleStyle = style([
    styles.fontMedium,
    styles.textBase, // Slightly larger title
    {
        gridColumn: 2, // Place in the second column
        lineHeight: 1.4, // Adjust line height
    }
]);

const alertDescriptionStyle = style([
    styles.textSm,
    styles.textMutedForeground, // Use muted for description by default
    {
        gridColumn: 2, // Place in the second column
        marginTop: themeVars.spacing.xs, // Add space below title if both exist
        selectors: {
            // Adjust color for destructive variant if title color isn't enough contrast
            '[data-variant="destructive"] &': {
                color: themeVars.color.destructive + 'd9', // ~90% opacity
            }
        }
    }
]);

// --- Components ---
interface AlertProps extends VanTag<HTMLDivElement> {
    variant?: keyof typeof alertVariantStyles;
}
export const Alert = (props: AlertProps | State<AlertProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', variant = 'default', ...rest } = isPropsState ? (props as State<AlertProps>).val : props as AlertProps;

    const combinedClass = van.derive(() => {
        const currentVariant = (isPropsState ? (props as State<AlertProps>).val.variant || 'default' : variant) as keyof typeof alertVariantStyles;
        const currentClassName = isPropsState ? (props as State<AlertProps>).val.class || '' : className;
        return `${alertBaseStyle} ${alertVariantStyles[currentVariant]} ${currentClassName}`.trim();
    });

    const attrs = van.derive(() => ({
        ...rest,
        role: 'alert',
        'data-variant': (isPropsState ? (props as State<AlertProps>).val.variant || 'default' : variant) as keyof typeof alertVariantStyles,
        class: combinedClass.val,
    }));

    // Automatically add AlertCircle icon for destructive variant if no icon provided
    const autoIcon = van.derive(() => {
        const currentVariant = (isPropsState ? (props as State<AlertProps>).val.variant || 'default' : variant) as keyof typeof alertVariantStyles;
        const hasExplicitIcon = children.some((child: any) => child?.tagName?.toLowerCase() === 'svg');
        return currentVariant === 'destructive' && !hasExplicitIcon ? icons.AlertCircleIcon({ class: styles.h4 }) : null; // Add default class if needed
    })

    return div(attrs, () => autoIcon.val, children);
};

interface AlertTitleProps extends VanTag<HTMLDivElement> {}
export const AlertTitle = (props: AlertTitleProps | State<AlertTitleProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<AlertTitleProps>).val : props as AlertTitleProps;
    // Use div for styling consistency, though h5 might be more semantic
    return div({ 'data-slot': 'alert-title', class: `${alertTitleStyle} ${className}`.trim(), ...rest }, children);
};

interface AlertDescriptionProps extends VanTag<HTMLDivElement> {}
export const AlertDescription = (props: AlertDescriptionProps | State<AlertDescriptionProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<AlertDescriptionProps>).val : props as AlertDescriptionProps;
    return div({ 'data-slot': 'alert-description', class: `${alertDescriptionStyle} ${className}`.trim(), ...rest }, children);
};