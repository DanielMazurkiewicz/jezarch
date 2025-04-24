import { Component, splitProps } from 'solid-js';
import styles from './LoadingSpinner.module.css'; // Import CSS Module (Typed)
import { Icon } from './Icon';
import { cn } from '@/lib/utils'; // For combining classes

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  class?: string;
}

// Map size prop to CSS module class
const sizeClasses: { [key in SpinnerSize]: string } = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
};

const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const [local, rest] = splitProps(props, ["size", "class"]);
  const size = () => local.size ?? 'md';

  return (
    <Icon
        name="Loader2" // Use the imported name
        class={cn(
            styles.spinnerBase, // Base animation style
            sizeClasses[size()], // Size class
            local.class // Apply additional classes passed via props
        )}
        aria-label="Loading..." // Accessibility
        {...rest} // Pass any other attributes
    />
  );
};

export default LoadingSpinner;