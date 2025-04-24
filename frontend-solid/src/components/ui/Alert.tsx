import { Component, JSX, Show, splitProps } from 'solid-js';
import { Icon, IconName } from '@/components/shared/Icon';
import { cn } from '@/lib/utils';
import styles from './Alert.module.css'; // Import CSS Module (Typed)

type AlertVariant = 'default' | 'destructive' | 'success' | 'warning';

// Extend AlertVariants to include non-recipe props
interface AlertProps extends JSX.HTMLAttributes<HTMLDivElement> {
    class?: string;
    variant?: AlertVariant;
    icon?: IconName | false; // Optional custom icon or disable default icon
}

// Define default icons per variant
const defaultIcons: { [key in AlertVariant]: IconName } = {
    default: 'Info', // Example default icon
    destructive: 'AlertCircle',
    success: 'CheckCircle',
    warning: 'AlertTriangle', // Ensure alertTriangle is in icons.ts
};

// Map variant prop to CSS module class
const variantClasses: { [key in AlertVariant]: string } = {
    default: styles.variantDefault,
    destructive: styles.variantDestructive,
    success: styles.variantSuccess,
    warning: styles.variantWarning,
};


export const Alert: Component<AlertProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'variant', 'icon', 'children']);
    const variant = () => local.variant ?? 'default';
    const iconToShow = () => local.icon === false ? null : local.icon ?? defaultIcons[variant()];

    return (
        <div
            role="alert"
            class={cn(
                styles.alertBase,
                variantClasses[variant()], // Apply variant class
                local.class
            )}
            // Removed data-variant, using direct class application
            {...rest}
        >
            <Show when={iconToShow()}>
                {(iconName) => <Icon name={iconName()} class={styles.alertIcon} />}
            </Show>
            {/* Assume children contain AlertTitle and AlertDescription */}
            <div class={styles.alertContent}>
                {local.children}
            </div>
        </div>
    );
};

// Optional: Export Title and Description components for structure
interface AlertTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> { class?: string; }
export const AlertTitle: Component<AlertTitleProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    // Use h5 or h6 for semantics within an alert
    return <h5 class={cn(styles.alertTitle, local.class)} {...rest}>{local.children}</h5>;
};

interface AlertDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> { class?: string; }
export const AlertDescription: Component<AlertDescriptionProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <p class={cn(styles.alertDescription, local.class)} {...rest}>{local.children}</p>;
};