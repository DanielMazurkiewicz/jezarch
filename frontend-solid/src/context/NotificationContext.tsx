import { createContext, useContext, createSignal, Component, JSX, For, onCleanup } from 'solid-js'; // Added onCleanup
import { createStore, produce, type Store } from 'solid-js/store'; // Import Store type
import { Portal } from 'solid-js/web'; // Import Portal
import { cn } from '@/lib/utils'; // Import cn
// import * as styles from './NotificationContext.css'; // Removed VE import
import styles from './NotificationContext.module.css'; // Import CSS Module
import { Icon, IconName } from '@/components/shared/Icon'; // Import IconName

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
    id: number;
    message: string;
    type: NotificationType;
    duration?: number; // Duration in ms, defaults later
    removing?: boolean; // Added state for removal animation
}

interface NotificationContextState {
    notifications: Notification[];
}

interface NotificationContextActions {
    addNotification: (notification: Omit<Notification, 'id' | 'removing'>) => void; // Adjusted input type
    removeNotification: (id: number) => void;
}

// Ensure Store type is used correctly
type NotificationContextType = [Store<NotificationContextState>, NotificationContextActions];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const DEFAULT_DURATION = 5000; // 5 seconds
const REMOVAL_ANIMATION_DURATION = 200; // ms, match CSS fadeOut

// Map notification types to icons - Correct icon names
const notificationIcons: { [key in NotificationType]: IconName } = {
    info: 'Info',
    success: 'CheckCircle',
    warning: 'AlertTriangle',
    error: 'AlertCircle',
};

// Map notification type to CSS module variant class
const variantClasses: { [key in NotificationType]: string } = {
    info: styles.variantInfo,
    success: styles.variantSuccess,
    warning: styles.variantWarning,
    error: styles.variantError,
};

export const NotificationProvider: Component<{ children: JSX.Element }> = (props) => {
    const [state, setState] = createStore<NotificationContextState>({ notifications: [] });
    let nextId = 0;
    const timeoutIds = new Map<number, number>(); // Explicitly type as number

    const triggerRemoval = (id: number) => {
        // Set removing state to trigger fade-out animation
        setState('notifications', notification => notification.id === id, 'removing', true);
        // Actually remove from DOM after animation
        setTimeout(() => {
            removeNotification(id);
        }, REMOVAL_ANIMATION_DURATION);
    };


    const removeNotification = (id: number) => {
        const timeoutId = timeoutIds.get(id);
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutIds.delete(id);
        }
        setState(
            'notifications',
            (notifications) => notifications.filter(n => n.id !== id)
        );
    };

    const addNotification = (notification: Omit<Notification, 'id' | 'removing'>) => {
        const id = nextId++;
        const duration = notification.duration ?? DEFAULT_DURATION;

        setState(produce(s => {
            s.notifications.push({ ...notification, id, removing: false }); // Add with removing: false
        }));

        // Cast setTimeout return value to number
        const timeoutId = setTimeout(() => {
            triggerRemoval(id); // Trigger removal animation first
        }, duration) as unknown as number;
        timeoutIds.set(id, timeoutId);

    };

    onCleanup(() => {
        timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
        timeoutIds.clear();
    });


    const actions: NotificationContextActions = {
        addNotification,
        removeNotification: triggerRemoval, // Public remove triggers animation
    };

    // Provide the state store and actions as a tuple
    const contextValue: NotificationContextType = [state, actions];

    return (
        <NotificationContext.Provider value={contextValue}>
            {props.children}
            <NotificationsDisplay />
        </NotificationContext.Provider>
    );
};

export function useNotifications(): NotificationContextActions {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context[1];
}

// --- Display Component ---
const NotificationsDisplay: Component = () => {
    const context = useContext(NotificationContext);
    if (!context) return null;

    const [state, { removeNotification }] = context;

    return (
        <Portal mount={document.body}>
            <div class={styles.notificationsContainer}>
                <For each={state.notifications}>
                    {(notification) => (
                        <div
                            role="status"
                            aria-live="polite"
                            class={cn(
                                styles.notificationBase, // Base class
                                variantClasses[notification.type as NotificationType], // Variant class - assert type
                                notification.removing && styles.removing // Apply removing class for animation
                            )}
                            data-type={notification.type}
                        >
                            <div class={styles.notificationContent}>
                                 {/* Assert type for indexing */}
                                 <Icon name={notificationIcons[notification.type as NotificationType]} class={styles.notificationIcon} />
                                <span>{notification.message}</span>
                            </div>
                            <button
                                onClick={() => removeNotification(notification.id)}
                                class={styles.closeButton}
                                aria-label="Dismiss notification"
                            >
                                <Icon name="X" size="0.8em" /> {/* Corrected icon name */}
                            </button>
                        </div>
                    )}
                </For>
            </div>
        </Portal>
    );
};