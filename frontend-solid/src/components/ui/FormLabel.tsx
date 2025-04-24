import { Component, JSX, splitProps } from 'solid-js';
// import { formLabelRecipe, FormLabelVariants } from './FormLabel.css'; // Removed VE import
import styles from './FormLabel.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';

// Extend Label attributes and add variants
interface FormLabelProps extends JSX.LabelHTMLAttributes<HTMLLabelElement> {
    class?: string;
    required?: boolean;
    invalid?: boolean;
}

export const FormLabel: Component<FormLabelProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'required', 'invalid']);

    return (
        <label
            class={cn(
                styles.formLabelBase, // Apply base styles
                local.required && styles.formLabelRequired, // Apply required style conditionally
                local.class
            )}
            data-invalid={local.invalid ? true : undefined} // Pass data attribute for CSS selector
            {...rest} // Spread standard label attributes (for, children, etc.)
        />
    );
};