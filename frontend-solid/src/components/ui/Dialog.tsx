import { Component, JSX, createContext, useContext, createSignal, onCleanup, Show, splitProps, createEffect, Accessor, Setter, onMount, createUniqueId, createMemo } from 'solid-js'; // Added createMemo
import { Portal } from 'solid-js/web';
import { Icon } from '@/components/shared/Icon';
import { cn } from '@/lib/utils';
// import * as styles from './Dialog.css'; // Removed VE import
import styles from './Dialog.module.css'; // Import CSS Module
import { Button } from './Button';

// --- Context ---
interface DialogContextType {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>; // Ensure this matches the type used in provider
    triggerId: Accessor<string>;
    contentId: Accessor<string>;
    titleId: Accessor<string>;
    descriptionId: Accessor<string>;
}
const DialogContext = createContext<DialogContextType>();

const useDialogContext = () => {
    const context = useContext(DialogContext);
    if (!context) throw new Error("Dialog components must be used within a Dialog provider");
    return context;
};

// --- Dialog Root (Provider) ---
interface DialogProps {
    children: JSX.Element;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    initialOpen?: boolean;
}
export const Dialog: Component<DialogProps> = (props) => {
    const baseId = createUniqueId();
    const triggerId = () => `dialog-${baseId}-trigger`;
    const contentId = () => `dialog-${baseId}-content`;
    const titleId = () => `dialog-${baseId}-title`;
    const descriptionId = () => `dialog-${baseId}-description`;

    const [internalOpen, setInternalOpen] = createSignal(props.initialOpen ?? false);

    const isOpen = createMemo(() => props.open !== undefined ? props.open : internalOpen());

    // Define the setter function with the correct type matching Solid's Setter
    const setIsOpenContext: Setter<boolean> = (value) => {
        // Resolve the value if it's a function
        const open = typeof value === 'function' ? value(isOpen()) : value;
        if (props.onOpenChange) {
            props.onOpenChange(open);
        } else {
            // Explicitly cast to boolean for the signal setter
            setInternalOpen(open as boolean);
        }
    };

    // Body overflow lock
    createEffect(() => {
        const originalOverflow = document.body.style.overflow;
        if (isOpen()) {
            document.body.style.overflow = 'hidden';
        } else {
            // Only reset if no *other* dialogs are open
            // Query *all* open dialog contents, not just this specific one
            const otherDialogsOpen = document.querySelectorAll('[role="dialog"][data-state="open"]');
             if (otherDialogsOpen.length === 0) { // Only reset if this was the last one closed
                document.body.style.overflow = originalOverflow || ''; // Restore original or remove
            }
        }
        onCleanup(() => {
            // Check again on cleanup in case the component unmounts while open
            // Use the same logic to check if *any* dialog remains open
             const otherDialogsOpen = document.querySelectorAll('[role="dialog"][data-state="open"]');
             if (otherDialogsOpen.length === 0) {
                 document.body.style.overflow = originalOverflow || ''; // Restore on cleanup too
             }
        });
    });

    // Escape key listener
    createEffect(() => {
        if (!isOpen()) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) setIsOpenContext(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
    });

    const contextValue: DialogContextType = {
        isOpen, setIsOpen: setIsOpenContext, triggerId, contentId, titleId, descriptionId,
    };

    return (
        <DialogContext.Provider value={contextValue}>
            {props.children}
        </DialogContext.Provider>
    );
};

// --- Dialog Trigger ---
interface DialogTriggerProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    class?: string;
    asChild?: boolean;
}
export const DialogTrigger: Component<DialogTriggerProps> = (props) => {
    const { isOpen, setIsOpen, triggerId, contentId } = useDialogContext();
    const [local, rest] = splitProps(props, ['class', 'onClick', 'children', 'asChild']);

    const handleClick = (e: MouseEvent) => {
        setIsOpen(!isOpen());
        if (typeof local.onClick === 'function') {
             // Cast event type if necessary or ensure handler accepts base MouseEvent
             (local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent>)(e as MouseEvent & { currentTarget: HTMLButtonElement; target: Element });
        }
    };

    if (local.asChild) {
        const child = local.children;
        if (child instanceof HTMLElement) {
            // Use setAttribute for standard HTML attributes
            child.setAttribute('aria-haspopup', 'dialog');
            child.setAttribute('aria-expanded', String(isOpen()));
            child.setAttribute('aria-controls', contentId());
            child.setAttribute('id', triggerId());
            child.addEventListener('click', handleClick); // Add event listener

            // Pass through other standard attributes, filtering out potentially problematic ones
            Object.entries(rest).forEach(([key, value]) => {
                if (!key.startsWith('on') && key !== 'ref' && key !== 'style' && key !== 'classList' && typeof value === 'string') {
                    try { child.setAttribute(key, value); } catch { /* Ignore */ }
                }
            });
            return child;
        }

        console.warn("DialogTrigger 'asChild' works best with simple HTMLElement children.");
        // Fallback: Wrap the component/element, apply only basic props
        return (
            <div class={local.class} onClick={handleClick} /* {...rest} - Avoid spreading non-div props */ >
                {child}
            </div>
        );
    }


    return (
        <Button // Use Button component by default
            type="button"
            class={local.class}
            onClick={handleClick}
            aria-haspopup="dialog"
            aria-expanded={isOpen()}
            aria-controls={contentId()}
            id={triggerId()}
            {...rest}
        >
            {local.children}
        </Button>
    );
};

// --- Dialog Portal and Content ---
type DialogSize = 'sm' | 'md' | 'lg' | 'xl';
interface DialogContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
    class?: string;
    size?: DialogSize;
    onOpenAutoFocus?: (e: Event) => void;
    onCloseAutoFocus?: (e: Event) => void;
    onPointerDownOutside?: (e: MouseEvent) => void;
    onInteractOutside?: (e: Event) => void;
}
export const DialogContent: Component<DialogContentProps> = (props) => {
    const { isOpen, setIsOpen, contentId, triggerId, titleId, descriptionId } = useDialogContext();
    const [local, rest] = splitProps(props, [
        'class', 'size', 'children', 'onOpenAutoFocus', 'onCloseAutoFocus',
        'onPointerDownOutside', 'onInteractOutside'
    ]);
    let contentRef: HTMLDivElement | undefined;
    let previouslyFocusedElement: HTMLElement | null = null;

    // Focus management effect
    onMount(() => { previouslyFocusedElement = document.activeElement as HTMLElement; });
    createEffect(() => {
        if (isOpen() && contentRef) {
            previouslyFocusedElement = document.activeElement as HTMLElement; // Store focus on open
            const focusableElements = contentRef.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];

            requestAnimationFrame(() => {
                local.onOpenAutoFocus?.(new Event('focus'));
                firstFocusable?.focus();
            });

            const handleFocusTrap = (event: KeyboardEvent) => {
                 if (!contentRef?.contains(document.activeElement)) {
                     // If focus somehow escapes, bring it back
                     firstFocusable?.focus();
                     return;
                 }
                 if (event.key === 'Tab') {
                     if (event.shiftKey) {
                         if (document.activeElement === firstFocusable) { lastFocusable?.focus(); event.preventDefault(); }
                     } else {
                         if (document.activeElement === lastFocusable) { firstFocusable?.focus(); event.preventDefault(); }
                     }
                 }
            };
            contentRef.addEventListener('keydown', handleFocusTrap);
            onCleanup(() => contentRef?.removeEventListener('keydown', handleFocusTrap));
        } else if (!isOpen() && previouslyFocusedElement) {
            local.onCloseAutoFocus?.(new Event('focus'));
            // Only restore focus if the element still exists and is focusable
            if (previouslyFocusedElement.isConnected && previouslyFocusedElement.focus) {
                 previouslyFocusedElement?.focus();
            }
            previouslyFocusedElement = null;
        }
    });

    // Click outside handler effect
    createEffect(() => {
        if (!isOpen()) return;
        const handleClickOutside = (event: MouseEvent) => {
            const targetElement = event.target as Node;
             // Check if click is inside the main content OR inside an element marked to be ignored (like a select dropdown)
            if (contentRef && !contentRef.contains(targetElement) &&
                !(targetElement instanceof Element && targetElement.closest('[data-dialog-ignore-outside-click="true"]')))
            {
                local.onPointerDownOutside?.(event);
                if (event.defaultPrevented) return;
                local.onInteractOutside?.(event);
                if (event.defaultPrevented) return;
                setIsOpen(false);
            }
        };
        // Delay attachment to avoid capturing the opening click
        const timerId = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
        onCleanup(() => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', handleClickOutside);
        });
    });

    // Map size prop to CSS module class
    const sizeClass = createMemo(() => {
        switch (local.size) {
            case 'sm': return styles.sizeSm;
            case 'md': return styles.sizeMd;
            case 'lg': return styles.sizeLg;
            case 'xl': return styles.sizeXl;
            default: return styles.sizeMd; // Default to md
        }
    });


    return (
        <Show when={isOpen()}>
            <Portal mount={document.body}>
                <div class={styles.dialogOverlay} data-state={isOpen() ? "open" : "closed"} />
                <div
                    ref={contentRef}
                    role="dialog"
                    id={contentId()}
                    aria-labelledby={titleId()}
                    aria-describedby={descriptionId()}
                    aria-modal="true"
                    tabIndex={-1}
                    class={cn(styles.dialogContentBase, sizeClass(), local.class)} // Combine base, size, and custom classes
                    data-state={isOpen() ? "open" : "closed"}
                    // data-dialog-content // Removed this specific attribute, use role="dialog" instead
                    {...rest}
                >
                    {/* Children are expected to include Header/Body/Footer */}
                    {local.children}

                    {/* Close Button (renders inside content) */}
                    <button
                        type="button"
                        class={styles.dialogCloseButton}
                        aria-label="Close"
                        onClick={() => setIsOpen(false)}
                    >
                        <Icon name="X" size="1em" /> {/* Corrected icon name */}
                    </button>
                </div>
            </Portal>
        </Show>
    );
};

// --- Dialog Header ---
interface DialogHeaderProps extends JSX.HTMLAttributes<HTMLDivElement> { class?: string; }
export const DialogHeader: Component<DialogHeaderProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <div class={cn(styles.dialogHeader, local.class)} {...rest}>{local.children}</div>;
};

// --- Dialog Body (Added) ---
interface DialogBodyProps extends JSX.HTMLAttributes<HTMLDivElement> { class?: string; }
export const DialogBody: Component<DialogBodyProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <div class={cn(styles.dialogBody, local.class)} {...rest}>{local.children}</div>;
};

// --- Dialog Footer ---
interface DialogFooterProps extends JSX.HTMLAttributes<HTMLDivElement> { class?: string; }
export const DialogFooter: Component<DialogFooterProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    // Add marker for CSS :has selector in CardContent
    return <div data-card-footer class={cn(styles.dialogFooter, local.class)} {...rest}>{local.children}</div>;
};

// --- Dialog Title ---
interface DialogTitleProps extends JSX.HTMLAttributes<HTMLHeadingElement> { class?: string; }
export const DialogTitle: Component<DialogTitleProps> = (props) => {
    const { titleId } = useDialogContext();
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <h2 id={titleId()} class={cn(styles.dialogTitle, local.class)} {...rest}>{local.children}</h2>;
};

// --- Dialog Description ---
interface DialogDescriptionProps extends JSX.HTMLAttributes<HTMLParagraphElement> { class?: string; }
export const DialogDescription: Component<DialogDescriptionProps> = (props) => {
    const { descriptionId } = useDialogContext();
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <p id={descriptionId()} class={cn(styles.dialogDescription, local.class)} {...rest}>{local.children}</p>;
};

// --- Dialog Close (alternative button) ---
interface DialogCloseProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> { class?: string; }
export const DialogClose: Component<DialogCloseProps> = (props) => {
    const { setIsOpen } = useDialogContext();
    const [local, rest] = splitProps(props, ['class', 'onClick', 'children']);
    const handleClick = (e: MouseEvent) => {
        setIsOpen(false);
         if (typeof local.onClick === 'function') {
              (local.onClick as JSX.EventHandler<HTMLButtonElement, MouseEvent>)(e as MouseEvent & { currentTarget: HTMLButtonElement; target: Element });
         }
    };
    return <Button type="button" onClick={handleClick} class={local.class} {...rest}>{local.children}</Button>;
};