import { Component, JSX, splitProps } from 'solid-js';
import { cn } from '@/lib/utils';
// import * as styles from './Card.css'; // Removed VE import
import styles from './Card.module.css'; // Import CSS Module (Typed)

// Card Container
interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
    class?: string;
}
export const Card: Component<CardProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return (
        <div class={cn(styles.card, local.class)} {...rest}>
            {local.children}
        </div>
    );
};

// Card Header
interface CardHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> {
    class?: string;
}
export const CardHeader: Component<CardHeaderProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return (
        <div class={cn(styles.cardHeader, local.class)} {...rest}>
            {local.children}
        </div>
    );
};

// Card Title - Now using h3 and correct props
interface CardTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> {
    class?: string;
    children?: JSX.Element;
}
export const CardTitle: Component<CardTitleProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return (
        <h3 class={cn(styles.cardTitle, local.class)} {...rest} >
            {local.children}
        </h3>
    );
};


// Card Description
interface CardDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> {
    class?: string;
}
export const CardDescription: Component<CardDescriptionProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return (
        <p class={cn(styles.cardDescription, local.class)} {...rest}>
            {local.children}
        </p>
    );
};

// Card Content
interface CardContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
    class?: string;
}
export const CardContent: Component<CardContentProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return (
        <div class={cn(styles.cardContent, local.class)} {...rest}>
            {local.children}
        </div>
    );
};

// Card Footer
interface CardFooterProps extends JSX.HTMLAttributes<HTMLDivElement> {
    class?: string;
}
export const CardFooter: Component<CardFooterProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    // Add marker for CSS :has selector in CardContent
    return <div data-card-footer class={cn(styles.cardFooter, local.class)} {...rest}>{local.children}</div>;
};

// Card Action (Optional area in header)
interface CardActionProps extends JSX.HTMLAttributes<HTMLDivElement> {
    class?: string;
}
export const CardAction: Component<CardActionProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    // Add the specific class marker used in CardHeader CSS selector
    return (
        <div class={cn(styles.cardAction, 'cardAction', local.class)} {...rest}> {/* Use class name 'cardAction' */}
            {local.children}
        </div>
    );
};