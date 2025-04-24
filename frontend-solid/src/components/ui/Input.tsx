import { Component, JSX, splitProps } from 'solid-js';
// import { inputRecipe, InputVariants } from './Input.css'; // Removed VE import
import styles from './Input.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';

// Extend standard Input attributes and add recipe variants
// Export the interface
export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    class?: string;
    // size?: InputVariants['size']; // Include if size variant exists
}

export const Input: Component<InputProps> = (props) => {
    // Split props: variants, class, and the rest
    const [local, rest] = splitProps(props, [/* 'size', */ 'class']); // Add 'size' if variant exists

    return (
        <input
            class={cn(
                styles.inputBase, // Apply base styles
                // Add size class if variant exists: styles[`size${local.size}`]
                local.class
            )}
            {...rest} // Spread standard input attributes (type, value, placeholder, etc.)
        />
    );
};