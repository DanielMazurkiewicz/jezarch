import { Component, JSX, splitProps, Show, createMemo, createEffect, createSignal, onCleanup } from 'solid-js'; // Added signals, effect, cleanup
import { Icon } from '@/components/shared/Icon'; // Import Icon component
import { cn } from '@/lib/utils';
// import * as styles from './Checkbox.css'; // Removed VE import
import styles from './Checkbox.module.css'; // Import CSS Module (Typed)

// Define a more precise type for the onClick handler
type CheckboxEventHandler = JSX.EventHandler<HTMLButtonElement, MouseEvent>;

// Define the props interface extending the base Button attributes, omitting conflicting/managed ones
// Use JSX.HTMLAttributes<HTMLButtonElement> for broader compatibility
interface CheckboxProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'checked' | 'id' | 'role' | 'type' | 'aria-checked' | 'aria-disabled'> {
    class?: string;
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (checked: boolean | 'indeterminate') => void;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    value?: string; // Standard form value
    id: string; // Required for label association
    // Explicitly include event handlers that might be passed through 'rest' otherwise
    onClick?: CheckboxEventHandler;
    onKeyDown?: JSX.EventHandlerUnion<HTMLButtonElement, KeyboardEvent>;
    onFocus?: JSX.EventHandlerUnion<HTMLButtonElement, FocusEvent>;
    onBlur?: JSX.EventHandlerUnion<HTMLButtonElement, FocusEvent>;
    // Add common aria attributes explicitly if they might be passed via 'rest'
    'aria-invalid'?: boolean;
    'aria-errormessage'?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
}

export const Checkbox: Component<CheckboxProps> = (props) => {
    // Split out only the props explicitly defined in CheckboxProps
    const [local, rest] = splitProps(props, [
        'class', 'id', 'checked', 'onCheckedChange', 'disabled', 'required', 'name', 'value',
        'onClick', 'onKeyDown', 'onFocus', 'onBlur',
        'aria-invalid', 'aria-errormessage', 'aria-label', 'aria-labelledby',
        'children'
    ]);

    // Internal state to mirror checked status for uncontrolled components or indeterminate state changes
    const [internalChecked, setInternalChecked] = createSignal<boolean | 'indeterminate'>(local.checked ?? false);

    // Determine the actual checked state (controlled or internal)
    const isChecked = createMemo(() => local.checked !== undefined ? local.checked : internalChecked());

    // Sync internal state if controlled prop changes
    createEffect(() => {
        if (local.checked !== undefined) {
            setInternalChecked(local.checked);
        }
    });

    const handleClick = (e: MouseEvent & { currentTarget: HTMLButtonElement; target: Element }) => {
        if (local.disabled) return;
        const currentState = isChecked();
        let nextState: boolean; // Indeterminate transitions to checked

        if (currentState === 'indeterminate') {
            nextState = true;
        } else {
            nextState = !currentState;
        }

        if (local.onCheckedChange) {
            local.onCheckedChange(nextState);
        } else {
            setInternalChecked(nextState);
        }
        // Call external onClick if provided and ensure it's callable
        if (typeof local.onClick === 'function') {
            local.onClick(e);
        }
    };

    // Define the specific attributes we want to pass to the button
    // This avoids spreading potentially incompatible props from `rest`.
    // Moved data-state application to the button element itself
    const buttonAttributes: JSX.ButtonHTMLAttributes<HTMLButtonElement> = {
        type: "button",
        role: "checkbox",
        'aria-checked': isChecked() === 'indeterminate' ? 'mixed' : (isChecked() ? 'true' : 'false'),
        'aria-disabled': local.disabled,
        'aria-invalid': local['aria-invalid'],
        'aria-errormessage': local['aria-errormessage'],
        'aria-label': local['aria-label'],
        'aria-labelledby': local['aria-labelledby'],
        disabled: local.disabled,
        class: cn(styles.checkboxRoot, local.class),
        onClick: handleClick,
        onKeyDown: local.onKeyDown,
        onFocus: local.onFocus,
        onBlur: local.onBlur,
        ...rest // Spread remaining valid attributes
    };


    return (
        // Use a button visually, but include a hidden input for form submission & label association
        <>
            <input
                type="checkbox"
                id={local.id}
                name={local.name}
                value={local.value}
                checked={isChecked() === true} // HTML checked attribute only takes boolean
                required={local.required}
                disabled={local.disabled}
                aria-hidden="true"
                tabIndex={-1}
                style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', 'pointer-events': 'none' }}
                // Link internal change to this input if needed for framework integration, though not strictly necessary for basic forms
                // onChange={() => { /* State managed by button click */ }}
            />
             {/* Apply data-state directly to the element */}
            <button {...buttonAttributes} data-state={isChecked() === 'indeterminate' ? 'indeterminate' : isChecked() ? 'checked' : 'unchecked'}>
                <span class={styles.checkboxIndicator}>
                    <Show when={isChecked() === 'indeterminate'}>
                        <Icon name="Minus" class={styles.minusIcon} />
                    </Show>
                    <Show when={isChecked() === true}>
                        <Icon name="Check" class={styles.checkIcon} />
                    </Show>
                    {/* No icon shown when unchecked */}
                </span>
            </button>
        </>
    );
};