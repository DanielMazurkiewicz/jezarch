import van from "vanjs-core";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";

const { textarea } = van.tags;

// --- Styles ---
const textareaStyle = style([
    styles.flex,
    styles.wFull,
    styles.roundedMd,
    styles.border,
    styles.px3,
    styles.py2,
    styles.textBase, // Default text size
    styles.bgBackground, // Ensure background
    styles.shadowSm,
    styles.transitionColors,
    {
        minHeight: '4rem', // min-h-16 approx
        borderColor: themeVars.color.input,
        color: themeVars.color.foreground,
        outline: 'none',
        lineHeight: 1.5, // Match input/body line-height
        '::placeholder': {
            color: themeVars.color.mutedForeground,
            opacity: 1,
        },
        ':disabled': {
            cursor: 'not-allowed',
            opacity: 0.5,
        },
        ':focus-visible': {
            borderColor: themeVars.color.ring,
             boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.ring}`,
        },
        // Allow textarea to grow based on content if desired (like Shadcn's field-sizing-content)
        // Note: field-sizing CSS property has limited browser support currently
        // Fallback is manual height adjustment via JS or fixed rows attribute
        // fieldSizing: 'content', // Experimental
    }
]);

// Style for invalid state
const invalidTextareaStyle = style({
    borderColor: `${themeVars.color.destructive} !important`,
    boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 4px ${themeVars.color.destructive} !important`,
});

// --- Component Props ---
interface TextareaProps extends VanTag<HTMLTextAreaElement> {
    'aria-invalid'?: boolean | State<boolean>;
}

// --- Component ---
export const Textarea = (props: TextareaProps | State<TextareaProps>) => {
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps = isPropsState ? (props as State<TextareaProps>).val : props;

    const { class: className = '', 'aria-invalid': ariaInvalid, ...rest } = resolvedProps;

    const isInvalid = typeof ariaInvalid === 'object' && 'val' in ariaInvalid
                      ? ariaInvalid
                      : van.state(Boolean(ariaInvalid));

    const combinedClass = van.derive(() =>
        `${textareaStyle} ${isInvalid.val ? invalidTextareaStyle : ''} ${className}`.trim()
    );

    const attrs = van.derive(() => ({
        ...rest,
        class: combinedClass.val,
        'aria-invalid': isInvalid.val || undefined,
    }));

    return textarea(attrs);
};