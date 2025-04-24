import { Component, JSX, splitProps } from 'solid-js';
import styles from './Badge.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; // Export type

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    class?: string;
}

// Map variant prop to CSS module class
const variantClasses: { [key in BadgeVariant]: string } = {
    default: styles.variantDefault,
    secondary: styles.variantSecondary,
    destructive: styles.variantDestructive,
    outline: styles.variantOutline,
    success: styles.variantSuccess,
    warning: styles.variantWarning,
};

export const Badge: Component<BadgeProps> = (props) => {
    const [local, rest] = splitProps(props, ['variant', 'class', 'children']);
    const variant = () => local.variant ?? 'default';

    return (
        <span
            class={cn(
                styles.badgeBase, // Apply base styles
                variantClasses[variant()], // Apply variant class
                local.class
            )}
            {...rest}
        >
            {local.children}
        </span>
    );
};