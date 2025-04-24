import van, { State } from "vanjs-core"; // Import State
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";

const { div } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// --- Styles ---
const cardStyle = style([
    styles.flex,
    styles.flexCol,
    styles.gap6, // Default gap between sections
    styles.roundedXl, // Use larger radius
    styles.border,
    styles.py6, // Default vertical padding
    styles.shadowSm,
    {
        backgroundColor: themeVars.color.card,
        color: themeVars.color.cardForeground,
        borderColor: themeVars.color.border,
    }
]);

const cardHeaderStyle = style([
    styles.grid, // Using grid for potential actions
    styles.px6, // Default horizontal padding
    styles.gap2, // Gap within header (title/desc)
    {
        gridTemplateRows: 'auto auto', // Ensure title/desc stack
        alignItems: 'flex-start',
        // Handle case with action button
        selectors: {
            '&:has([data-slot="card-action"])': {
                gridTemplateColumns: '1fr auto',
            }
        },
        // Add padding bottom if followed by content with top border
        // This is hard to detect reliably with VE, maybe handle via spacing utilities
    }
]);

const cardTitleStyle = style([
    styles.fontSemibold,
    {
        lineHeight: 'none', // Prevent extra space
    }
]);

const cardDescriptionStyle = style([
    styles.textSm,
    styles.textMutedForeground,
]);

// Optional Action slot styling
const cardActionStyle = style({
    gridColumnStart: 2,
    gridRowStart: 1,
    gridRowEnd: 3, // Span both title and description rows
    alignSelf: 'start', // Align action to the top
    justifySelf: 'end',
});


const cardContentStyle = style([
    styles.px6, // Default horizontal padding
    // Remove gap here, let content inside define its spacing
]);

const cardFooterStyle = style([
    styles.flex,
    styles.itemsCenter,
    styles.px6, // Default horizontal padding
    {
       // Add padding top if previous element created a top border (hard to detect)
       // Usually handled by spacing utilities between sections
    }
]);

// --- Components ---
interface CardProps extends VanTag<HTMLDivElement> {}
export const Card = (props: CardProps | State<CardProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CardProps>).val : props;
    return div({ class: `${cardStyle} ${className}`.trim(), ...rest }, children);
};

interface CardHeaderProps extends VanTag<HTMLDivElement> {}
export const CardHeader = (props: CardHeaderProps | State<CardHeaderProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CardHeaderProps>).val : props;
    return div({ class: `${cardHeaderStyle} ${className}`.trim(), ...rest }, children);
};

interface CardTitleProps extends VanTag<HTMLDivElement> {} // Typically holds text directly
export const CardTitle = (props: CardTitleProps | State<CardTitleProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CardTitleProps>).val : props;
    // Shadcn uses div, but h3 might be more semantic if appropriate
    return div({ class: `${cardTitleStyle} ${className}`.trim(), ...rest }, children);
};

interface CardDescriptionProps extends VanTag<HTMLDivElement> {} // Typically holds text directly
export const CardDescription = (props: CardDescriptionProps | State<CardDescriptionProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CardDescriptionProps>).val : props;
    return div({ class: `${cardDescriptionStyle} ${className}`.trim(), ...rest }, children);
};

// Optional Action slot
interface CardActionProps extends VanTag<HTMLDivElement> {}
export const CardAction = (props: CardActionProps | State<CardActionProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CardActionProps>).val : props;
    return div({ 'data-slot': 'card-action', class: `${cardActionStyle} ${className}`.trim(), ...rest }, children);
};

interface CardContentProps extends VanTag<HTMLDivElement> {}
export const CardContent = (props: CardContentProps | State<CardContentProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CardContentProps>).val : props;
    return div({ class: `${cardContentStyle} ${className}`.trim(), ...rest }, children);
};

interface CardFooterProps extends VanTag<HTMLDivElement> {}
export const CardFooter = (props: CardFooterProps | State<CardFooterProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<CardFooterProps>).val : props;
    return div({ class: `${cardFooterStyle} ${className}`.trim(), ...rest }, children);
};