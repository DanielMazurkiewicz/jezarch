import { Component, Show, splitProps } from 'solid-js';
import styles from './ErrorDisplay.module.css'; // Import CSS Module (Typed)
import { Icon } from './Icon';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  message: string | null | undefined;
  class?: string;
}

const ErrorDisplay: Component<ErrorDisplayProps> = (props) => {
  const [local, rest] = splitProps(props, ["message", "class"]);

  return (
    // Ensure message is treated as a string, fallback for null/undefined
    <Show when={local.message}>
        {(msg) => ( // msg is the Accessor for the message
            <div class={cn(styles.errorDisplayContainer, local.class)} role="alert" {...rest}>
                <Icon name="AlertCircle" class={styles.errorIconStyle} />
                <span>{msg()}</span> {/* Access the signal value */}
            </div>
        )}
    </Show>
  );
};

export default ErrorDisplay;