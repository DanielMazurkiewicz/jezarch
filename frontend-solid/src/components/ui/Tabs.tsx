import { Component, JSX, createContext, useContext, createSignal, For, Show, splitProps, Accessor, Setter, createUniqueId, createMemo } from 'solid-js'; // Added createMemo, createUniqueId
import { cn } from '@/lib/utils';
// import * as styles from './Tabs.css'; // Removed VE import
import styles from './Tabs.module.css'; // Import CSS Module

// --- Context ---
interface TabsContextType {
    value: Accessor<string>;
    setValue: Setter<string>;
    baseId: string;
    orientation: Accessor<'horizontal' | 'vertical'>;
}
const TabsContext = createContext<TabsContextType>();

const useTabsContext = () => {
    const context = useContext(TabsContext);
    if (!context) throw new Error("Tabs components must be used within a TabsRoot");
    return context;
};

// --- Tabs Root ---
interface TabsRootProps {
    children: JSX.Element;
    defaultValue: string;
    class?: string;
    orientation?: 'horizontal' | 'vertical';
}
export const Tabs: Component<TabsRootProps> = (props) => {
    const [local, rest] = splitProps(props, ['children', 'defaultValue', 'class', 'orientation']);
    const [activeValue, setActiveValue] = createSignal(local.defaultValue);
    const baseId = createUniqueId();
    const orientation = createMemo(() => local.orientation ?? 'horizontal');

    const contextValue: TabsContextType = {
        value: activeValue,
        setValue: setActiveValue,
        baseId,
        orientation
    };

    return (
        <TabsContext.Provider value={contextValue}>
            <div
                class={cn(styles.tabsRoot, local.class)}
                data-orientation={orientation()}
                {...rest}
            >
                {local.children}
            </div>
        </TabsContext.Provider>
    );
};

// --- Tabs List ---
interface TabsListProps extends JSX.HTMLAttributes<HTMLDivElement> {
    children: JSX.Element;
    class?: string;
}
export const TabsList: Component<TabsListProps> = (props) => {
    const { orientation } = useTabsContext();
    const [local, rest] = splitProps(props, ['children', 'class']);
    return (
        <div
            role="tablist"
            aria-orientation={orientation()}
            class={cn(styles.tabsList, local.class)}
            {...rest}
        >
            {local.children}
        </div>
    );
};

// --- Tabs Trigger ---
interface TabsTriggerProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
    class?: string;
}
export const TabsTrigger: Component<TabsTriggerProps> = (props) => {
    const { value, setValue, baseId, orientation } = useTabsContext();
    const [local, rest] = splitProps(props, ['value', 'class', 'children', 'disabled']);
    const isActive = () => value() === local.value;

    const handleClick = () => {
        if (!local.disabled) {
            setValue(local.value);
        }
    };

    // Keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
        const isVertical = orientation() === 'vertical';
        const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
        const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

        if (event.key === nextKey || event.key === prevKey) {
             const currentTarget = event.currentTarget as HTMLButtonElement;
             const list = currentTarget.closest('[role="tablist"]');
             if (!list) return;

             const triggers = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
             const currentIndex = triggers.indexOf(currentTarget);
             let nextIndex = -1;

             if (event.key === nextKey) {
                 nextIndex = currentIndex < triggers.length - 1 ? currentIndex + 1 : 0;
             } else { // prevKey
                 nextIndex = currentIndex > 0 ? currentIndex - 1 : triggers.length - 1;
             }

             if (nextIndex !== -1) {
                 triggers[nextIndex].focus();
                 // Optional: Activate on focus
                 // setValue(triggers[nextIndex].dataset.value!);
             }
             event.preventDefault();
        } else if (event.key === 'Enter' || event.key === ' ') {
            if (!local.disabled && document.activeElement === event.currentTarget) {
                setValue(local.value);
                event.preventDefault();
            }
        }
    };

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive()}
            aria-controls={`${baseId}-content-${local.value}`}
            id={`${baseId}-trigger-${local.value}`}
            data-value={local.value}
            tabIndex={isActive() ? 0 : -1}
            disabled={local.disabled}
            class={cn(
                styles.tabsTriggerBase,
                isActive() ? styles.tabsTriggerActive : styles.tabsTriggerInactive,
                local.class
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            {...rest}
        >
            {local.children}
        </button>
    );
};

// --- Tabs Content ---
interface TabsContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
    value: string;
    class?: string;
}
export const TabsContent: Component<TabsContentProps> = (props) => {
    const { value, baseId } = useTabsContext();
    const [local, rest] = splitProps(props, ['value', 'class', 'children']);
    const isActive = () => value() === local.value;

    return (
        <Show when={isActive()}>
            <div
                role="tabpanel"
                aria-labelledby={`${baseId}-trigger-${local.value}`}
                id={`${baseId}-content-${local.value}`}
                tabIndex={0}
                class={cn(styles.tabsContent, local.class)}
                {...rest}
            >
                {local.children}
            </div>
        </Show>
    );
};