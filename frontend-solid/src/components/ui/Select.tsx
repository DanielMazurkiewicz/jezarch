import { Component, JSX, createContext, useContext, createMemo, splitProps, For, Show, createSignal, createEffect, onCleanup, Accessor, Setter, onMount, createUniqueId, children } from 'solid-js'; // Removed Match, Switch
import { Portal } from 'solid-js/web';
import { Icon } from '@/components/shared/Icon';
import { cn } from '@/lib/utils';
import styles from './Select.module.css';

// Define Setter type explicitly
type SolidSetter<T> = (value: T | ((prev: T) => T)) => T;

// --- Context for Select ---
interface SelectContextType {
    isOpen: Accessor<boolean>;
    setIsOpen: SolidSetter<boolean>;
    selectedValue: Accessor<string | number | undefined>;
    // FIX: Store selected label text reactively
    selectedLabelText: Accessor<string | undefined>;
    // FIX: Update signature to accept label
    updateSelectedValue: (value: string | number | undefined, labelText: string | undefined) => void;
    triggerRef: Accessor<HTMLButtonElement | undefined>;
    setTriggerRef: SolidSetter<HTMLButtonElement | undefined>;
    contentRef: Accessor<HTMLDivElement | undefined>;
    setContentRef: SolidSetter<HTMLDivElement | undefined>;
    baseId: string;
    placeholder?: Accessor<string | undefined>;
    // FIX: Removed map and registration - no longer needed
}
const SelectContext = createContext<SelectContextType>();

const useSelectContext = () => {
    const context = useContext(SelectContext);
    if (!context) throw new Error("Select components must be used within a Select provider");
    return context;
};

// --- Select Root ---
export interface SelectProps {
    children: JSX.Element;
    value?: string | number | undefined; // Controlled value
    onChange?: (value: string | number | undefined) => void; // Controlled change handler
    defaultValue?: string | number | undefined; // Uncontrolled initial value
    onOpenChange?: (open: boolean) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string; // For label association
    name?: string; // For forms
    "aria-invalid"?: boolean; // Allow passing aria-invalid
    "aria-errormessage"?: string;
}
export const Select: Component<SelectProps> = (props) => {
    const baseId = createUniqueId();
    const [isOpen, setIsOpenSignal] = createSignal(false);
    const [internalValue, setInternalValue] = createSignal<string | number | undefined>(props.defaultValue);
    // FIX: Add state for the selected label text
    const [selectedLabelText, setSelectedLabelText] = createSignal<string | undefined>(undefined);
    const [triggerRef, setTriggerRef] = createSignal<HTMLButtonElement>();
    const [contentRef, setContentRef] = createSignal<HTMLDivElement>();
    const resolvedChildren = children(() => props.children); // Still needed for initial label lookup

    const selectedValue = createMemo(() => props.value !== undefined ? props.value : internalValue());
    const placeholder = createMemo(() => props.placeholder ?? "Select...");

    // FIX: Find initial label text on mount or when defaultValue/value changes
    createEffect(() => {
        const currentVal = selectedValue();
        let initialLabel: string | undefined = undefined;
        if (currentVal !== undefined) {
            const findLabel = (node: JSX.Element) => {
                if (initialLabel) return;
                if (Array.isArray(node)) { node.forEach(findLabel); }
                else if (node && typeof node === 'object' && 'component' in node && node.component === SelectItem) {
                    if (node.props.value === currentVal) {
                        // Attempt to get text content (might still be limited)
                        const getText = (el: JSX.Element): string => {
                            if (typeof el === 'string') return el;
                            if (typeof el === 'number') return String(el);
                            if (Array.isArray(el)) return el.map(getText).join('');
                            if (el && typeof el === 'object' && 'children' in el) return getText(el.children);
                            return '';
                        }
                        initialLabel = getText(node.props.children);
                    }
                } else if (node && typeof node === 'object' && 'children' in node) {
                     findLabel(node.children);
                }
            };
            findLabel(resolvedChildren());
        }
        setSelectedLabelText(initialLabel);
    });


    const setIsOpen: SolidSetter<boolean> = (value) => {
        const open = typeof value === 'function' ? value(isOpen()) : value;
        if (props.disabled && open) return isOpen();
        const finalOpen = !!open;
        setIsOpenSignal(finalOpen);
        props.onOpenChange?.(finalOpen);
        return finalOpen;
    };

    // FIX: updateSelectedValue now accepts and sets the label text
    const updateSelectedValue = (value: string | number | undefined, labelText: string | undefined) => {
        if (props.onChange) {
            props.onChange(value); // Controlled component
        } else {
            setInternalValue(value); // Uncontrolled component
        }
        setSelectedLabelText(labelText); // Store the label text
        setIsOpen(false);
        triggerRef()?.focus();
    };

    // Close on click outside
    createEffect(() => {
        if (!isOpen()) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef()?.contains(event.target as Node) || contentRef()?.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        };
        const timerId = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
        onCleanup(() => { clearTimeout(timerId); document.removeEventListener('mousedown', handleClickOutside); });
    });

     // Close on Escape key & handle keyboard nav
     createEffect(() => {
        if (!isOpen()) return;
        let lastFocusedItem: HTMLElement | null = null;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                return;
            }

            if (!contentRef()) return;
            const items = Array.from(contentRef()!.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'));
            if (items.length === 0) return;

            const currentFocus = document.activeElement as HTMLElement;
            let currentIndex = items.findIndex(item => item === currentFocus);

            if (event.key === 'ArrowDown') {
                currentIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items[currentIndex]?.focus(); event.preventDefault();
            } else if (event.key === 'ArrowUp') {
                currentIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[currentIndex]?.focus(); event.preventDefault();
            } else if (event.key === 'Enter' || event.key === ' ') {
                if (currentFocus && currentFocus.getAttribute('role') === 'option') {
                    lastFocusedItem = currentFocus; currentFocus.click(); event.preventDefault();
                }
            } else if (event.key === 'Home') {
                 items[0]?.focus(); event.preventDefault();
            } else if (event.key === 'End') {
                 items[items.length - 1]?.focus(); event.preventDefault();
            } else if (/^[a-zA-Z0-9]$/.test(event.key)) {
                 const char = event.key.toLowerCase();
                 const startIndex = Math.max(0, currentIndex);
                 for (let i = startIndex + 1; i < items.length; i++) { if (items[i].textContent?.trim().toLowerCase().startsWith(char)) { items[i].focus(); return; } }
                 for (let i = 0; i < startIndex; i++) { if (items[i].textContent?.trim().toLowerCase().startsWith(char)) { items[i].focus(); return; } }
             }
        };
         document.addEventListener('keydown', handleKeyDown);
         onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
    });

    const contextValue: SelectContextType = {
        isOpen, setIsOpen, selectedValue, selectedLabelText, // Pass selectedLabelText
        updateSelectedValue, // Pass modified update function
        triggerRef, setTriggerRef, contentRef, setContentRef,
        baseId, placeholder,
        // Removed map and registration
        selectChildren: resolvedChildren // Keep for initial label finding
    };

    return (
        <SelectContext.Provider value={contextValue}>
            <Show when={props.name}>
                <input type="hidden" name={props.name} value={selectedValue() ?? ''} disabled={props.disabled} />
            </Show>
            {props.children}
        </SelectContext.Provider>
    );
};

// --- Select Trigger ---
type SelectTriggerSize = 'sm';
export interface SelectTriggerProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
    class?: string;
    size?: SelectTriggerSize;
    children?: JSX.Element; // MUST contain SelectValue
    id?: string;
    "aria-invalid"?: boolean;
    "aria-errormessage"?: string;
}
export const SelectTrigger: Component<SelectTriggerProps> = (props) => {
    const { isOpen, setIsOpen, triggerRef, setTriggerRef, baseId, selectedValue } = useSelectContext();
    const [local, rest] = splitProps(props, ['class', 'size', 'children', 'disabled', 'id']);
    const triggerElementId = () => local.id ?? `${baseId}-trigger`;
    // FIX: Use selectedValue directly to check for placeholder state
    const hasSelection = createMemo(() => selectedValue() !== undefined);
    const sizeClass = createMemo(() => local.size === 'sm' ? styles.sizeSm : '');

    return (
        <button
            ref={setTriggerRef}
            type="button"
            role="combobox"
            aria-controls={`${baseId}-listbox`}
            aria-expanded={isOpen()}
            aria-haspopup="listbox"
            aria-disabled={local.disabled}
            disabled={local.disabled}
            id={triggerElementId()}
            class={cn(styles.selectTriggerBase, sizeClass(), local.class)}
            // Use hasSelection derived from selectedValue, not children presence
            data-placeholder={!hasSelection() ? true : undefined}
            onClick={() => setIsOpen(!isOpen())}
            {...rest}
        >
            <span class={styles.selectValue}>
                 {local.children} {/* Expect SelectValue here */}
            </span>
            <span class={styles.selectIcon}>
                 <Icon name="ChevronDown" size="1em" />
            </span>
        </button>
    );
};

// --- Select Value (Displays selected label from context) ---
interface SelectValueProps {}
export const SelectValue: Component<SelectValueProps> = () => {
    // FIX: Read selectedLabelText and placeholder from context
    const { selectedLabelText, placeholder } = useSelectContext();
    return <>{selectedLabelText() ?? placeholder?.()}</>;
};


// --- Select Content ---
interface SelectContentProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'id'> {
    class?: string;
}
export const SelectContent: Component<SelectContentProps> = (props) => {
    const { isOpen, contentRef, setContentRef, baseId, triggerRef } = useSelectContext();
    const [local, rest] = splitProps(props, ['class', 'children']);
    const [style, setStyle] = createSignal({});

    createEffect(() => {
         if (isOpen() && triggerRef() && contentRef()) {
             const triggerRect = triggerRef()!.getBoundingClientRect();
             const scrollY = window.scrollY;
             const spaceBelow = window.innerHeight - triggerRect.bottom;
             const contentHeightEstimate = 200;
             let topPosition = triggerRect.bottom + scrollY + 4;
             if (spaceBelow < contentHeightEstimate && triggerRect.top > contentHeightEstimate) {
                 topPosition = triggerRect.top + scrollY - contentHeightEstimate - 4;
             }
             setStyle({
                 position: 'absolute',
                 width: `${triggerRect.width}px`,
                 top: `${topPosition}px`,
                 left: `${triggerRect.left + window.scrollX}px`,
                 'z-index': '9999',
             });
         }
     });

    return (
        <Show when={isOpen()}>
            <Portal mount={document.body}>
                <div
                    ref={setContentRef}
                    role="listbox"
                    id={`${baseId}-listbox`}
                    aria-labelledby={`${baseId}-trigger`}
                    tabindex={-1}
                    class={cn(styles.selectContent, local.class)}
                    data-state={isOpen() ? "open" : "closed"}
                    style={style()}
                    data-dialog-ignore-outside-click="true"
                    {...rest}
                >
                    <div class={styles.selectViewport}>
                        {local.children}
                    </div>
                </div>
            </Portal>
        </Show>
    );
};

// --- Select Item ---
interface SelectItemProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'id' | 'value'> {
    class?: string;
    value: string | number;
    children: JSX.Element;
    disabled?: boolean;
}
export const SelectItem: Component<SelectItemProps> = (props) => {
     // FIX: No longer need registration functions
     const { selectedValue, updateSelectedValue, baseId } = useSelectContext();
     const [local, rest] = splitProps(props, ['class', 'value', 'children', 'disabled']);
     const isSelected = createMemo(() => selectedValue() === local.value);
     let itemRef: HTMLDivElement | undefined;

     const handleClick = () => {
        if (!local.disabled) {
             // FIX: Pass textContent to updateSelectedValue
             const labelText = itemRef?.textContent ?? undefined;
             updateSelectedValue(local.value, labelText);
        }
     };

     // Removed registration effects

    return (
        <div
            ref={itemRef} // Keep ref to get textContent
            role="option"
            id={`${baseId}-item-${local.value}`}
            aria-selected={isSelected()}
            data-selected={isSelected() ? '' : undefined}
            data-disabled={local.disabled ? '' : undefined}
            aria-disabled={local.disabled}
            tabIndex={local.disabled ? -1 : 0}
            class={cn(styles.selectItemBase, local.class)}
            onClick={handleClick}
            onKeyDown={(e) => { if (!local.disabled && (e.key === 'Enter' || e.key === ' ')) { handleClick(); e.preventDefault(); } }}
            {...rest}
        >
             {local.children}
             <Show when={isSelected()}>
                <span class={styles.selectItemIndicator}>
                    <Icon name="Check" class={styles.selectCheckIcon} />
                </span>
             </Show>
        </div>
    );
};

// --- Select Label ---
interface SelectLabelProps extends JSX.HTMLAttributes<HTMLDivElement> { class?: string; }
export const SelectLabel: Component<SelectLabelProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <div class={cn(styles.selectLabel, local.class)} {...rest}>{local.children}</div>;
};

// --- Select Separator ---
interface SelectSeparatorProps extends JSX.HTMLAttributes<HTMLDivElement> { class?: string; }
export const SelectSeparator: Component<SelectSeparatorProps> = (props) => {
    const [local, rest] = splitProps(props, ['class']);
    return <div class={cn(styles.selectSeparator, local.class)} {...rest} />;
};

// --- Select Group (Optional) ---
interface SelectGroupProps extends JSX.HTMLAttributes<HTMLDivElement> { class?: string; }
export const SelectGroup: Component<SelectGroupProps> = (props) => {
     const [local, rest] = splitProps(props, ['class', 'children']);
     return <div class={local.class} role="group" {...rest}>{local.children}</div>;
};