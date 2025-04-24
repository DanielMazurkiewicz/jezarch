import { Component, JSX, splitProps } from 'solid-js';
// import { textareaRecipe, TextareaVariants } from './Textarea.css'; // Removed VE import
import styles from './Textarea.module.css'; // Import CSS Module
import { cn } from '@/lib/utils';

type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

// Extend standard Textarea attributes and add recipe variants
// Export the interface
export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
    class?: string;
    resize?: TextareaResize;
}

// Map resize prop to CSS module class
const resizeClasses: { [key in TextareaResize]: string } = {
    none: styles.resizeNone,
    vertical: styles.resizeVertical,
    horizontal: styles.resizeHorizontal,
    both: styles.resizeBoth,
};

export const Textarea: Component<TextareaProps> = (props) => {
    // Split props: variants, class, and the rest
    const [local, rest] = splitProps(props, ['resize', 'class']);
    const resize = () => local.resize ?? 'vertical'; // Default to vertical

    return (
        <textarea
            class={cn(
                styles.textareaBase, // Apply base styles
                resizeClasses[resize()], // Apply resize class
                local.class
            )}
            {...rest} // Spread standard textarea attributes (value, placeholder, rows, etc.)
        />
    );
};