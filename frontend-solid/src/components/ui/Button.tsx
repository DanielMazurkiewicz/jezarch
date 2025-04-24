import { Component, JSX, splitProps } from 'solid-js';
// import { buttonRecipe, ButtonVariants } from './Button.css'; // Removed VE import
import styles from './Button.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

// Extend HTMLButtonElement attributes
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    class?: string;
    children?: JSX.Element;
}

// Map variant/size props to CSS module classes
const variantClasses: { [key in ButtonVariant]: string } = {
    default: styles.variantDefault,
    destructive: styles.variantDestructive,
    outline: styles.variantOutline,
    secondary: styles.variantSecondary,
    ghost: styles.variantGhost,
    link: styles.variantLink,
};
const sizeClasses: { [key in ButtonSize]: string } = {
    default: styles.sizeDefault,
    sm: styles.sizeSm,
    lg: styles.sizeLg,
    icon: styles.sizeIcon,
};

export const Button: Component<ButtonProps> = (props) => {
    // Split props to separate recipe variants and standard HTML attributes
    const [local, rest] = splitProps(props, ['variant', 'size', 'class', 'children']);
    const variant = () => local.variant ?? 'default';
    const size = () => local.size ?? 'default';

    return (
        <button
            class={cn(
                styles.buttonBase, // Base styles
                variantClasses[variant()], // Variant class
                sizeClasses[size()], // Size class
                local.class // Allow overriding styles
            )}
            {...rest} // Spread remaining button attributes (type, disabled, onClick, etc.)
        >
            {local.children}
        </button>
    );
};