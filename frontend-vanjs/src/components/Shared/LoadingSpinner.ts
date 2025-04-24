import van from "vanjs-core";
import * as icons from "@/components/ui/icons"; // Assuming icons are here
import { style, keyframes } from "@vanilla-extract/css"; // Import keyframes
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css"; // Import utils for potential use

const { span } = van.tags; // Using span, but could be div

// --- Styles ---
// Define keyframes using vanilla-extract helper
const spinKeyframes = keyframes({
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
});

const spinAnimation = style({
    animation: `${spinKeyframes} 1s linear infinite`, // Use the defined keyframes
});

const baseSpinnerStyle = style([
    spinAnimation,
    {
        display: 'inline-block', // Important for sizing and layout
        color: themeVars.color.primary,
    }
]);

const sizeStyles = {
    sm: style([styles.h4, styles.w4]), // h-4 w-4
    md: style([styles.h8, styles.w8]), // h-8 w-8
    lg: style([styles.h12, styles.w12]), // h-12 w-12
};

// --- Component ---
interface LoadingSpinnerProps extends Omit<IconProps, 'children'> { // Inherit IconProps excluding children
    size?: keyof typeof sizeStyles;
    class?: string; // Allow passing extra classes
}

// --- Component ---
export const LoadingSpinner = (props: LoadingSpinnerProps | State<LoadingSpinnerProps> = {}) => { // Add default empty object
    // Handle potential state props
    const isPropsState = props instanceof van.state().constructor;
    const resolvedProps = isPropsState ? (props as State<LoadingSpinnerProps>).val : props as LoadingSpinnerProps;

    const {
        size = 'md',
        class: className = '',
        ...rest // Capture rest of the props for the icon
    } = resolvedProps;

    // Combine styles reactively
    const combinedClass = van.derive(() => {
         const currentSize = isPropsState ? (props as State<LoadingSpinnerProps>).val.size || 'md' : size;
         const currentClassName = isPropsState ? (props as State<LoadingSpinnerProps>).val.class || '' : className;
         return `${baseSpinnerStyle} ${sizeStyles[currentSize]} ${currentClassName}`;
    });

    // Combine attributes reactively
    const attrs = van.derive(() => ({
        ...rest,
        class: combinedClass.val,
    }));


    // Render the Loader2 icon from the icons library
    return icons.Loader2Icon(attrs); // Pass derived attributes
};

export default LoadingSpinner;

// Helper type from icons.ts if needed, or define locally
interface IconProps extends VanTag<SVGSVGElement> {
    size?: number | string;
    class?: string | State<string>; // Allow class to be a state
}