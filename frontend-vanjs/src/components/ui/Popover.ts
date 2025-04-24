import van, { State } from "vanjs-core"; // Import State
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";

const { div } = van.tags; // Only need div and button for this simplified version

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}
type VanChild = Node | State<Node | null> | string | number | boolean | null | undefined | readonly VanChild[];


// --- Styles ---
const popoverContentStyle = style([
    styles.absolute, // Use absolute positioning
    styles.z50, // Ensure it's above other content
    styles.w72, // Default width w-72
    styles.roundedMd,
    styles.border,
    styles.p4, // Default padding
    styles.shadowMd,
    styles.bgBackground, // Use theme background
    {
        borderColor: themeVars.color.border,
        outline: 'none',
        // Add animation styles if needed
        // Example: data-[state=open]:animate-in ...
        // These would require setting a data-state attribute via JS
    }
]);

// --- Components ---

// Helper to manage popover state and positioning (Simplified)
interface PopoverContainerProps {
    open: State<boolean>;
    triggerElement: State<HTMLElement | null>;
    onOpenChange: (isOpen: boolean) => void; // Added to handle outside click
    contentClass?: string;
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    children: VanChild | VanChild[];
}
const PopoverContainer = ({
    open,
    triggerElement,
    onOpenChange,
    contentClass = '',
    align = 'center',
    sideOffset = 4,
    children
}: PopoverContainerProps) => {

    const popoverContentRef = van.state<HTMLDivElement | null>(null); // Ref for the content div

    // Calculate position (basic implementation)
    const positionStyle = van.derive(() => {
        if (!open.val || !triggerElement.val) return { display: 'none' };

        const rect = triggerElement.val.getBoundingClientRect();
        const stylesObj: Record<string, string> = {
            position: 'absolute',
            display: 'block',
            top: `${rect.bottom + window.scrollY + sideOffset}px`,
        };
        if (align === 'center') {
            stylesObj.left = `${rect.left + window.scrollX + rect.width / 2}px`;
            stylesObj.transform = 'translateX(-50%)';
        } else if (align === 'start') {
            stylesObj.left = `${rect.left + window.scrollX}px`;
        } else { // end
            stylesObj.left = `${rect.right + window.scrollX}px`;
             stylesObj.transform = 'translateX(-100%)';
        }
        // Convert style object to string
        return Object.entries(stylesObj).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v};`).join('');
    });

    // Effect to close on outside click
    van.derive(() => { // Replaced effect with derive
        if (!open.val) return () => {}; // Return empty cleanup if not open

        const handleClickOutside = (event: MouseEvent) => {
            if (
                triggerElement.val && !triggerElement.val.contains(event.target as Node) &&
                popoverContentRef.val && !popoverContentRef.val.contains(event.target as Node)
            ) {
                onOpenChange(false); // Close if click is outside trigger and content
            }
        };
        // Use setTimeout to ensure the click handler is added after the current event loop
        // This prevents the popover from closing immediately when the trigger is clicked
        const timeoutId = setTimeout(() => {
             document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        // Return cleanup function
        return () => {
             clearTimeout(timeoutId);
             document.removeEventListener('mousedown', handleClickOutside);
        };
    });


    // Derive attributes for the content div, including the ref
    const contentAttrs = van.derive(() => ({
        class: `${popoverContentStyle} ${contentClass}`.trim(),
        style: positionStyle.val,
        'data-state': open.val ? 'open' : 'closed',
        ref: (el: HTMLDivElement) => popoverContentRef.val = el // Assign ref
    }));

    return div(() => contentAttrs.val, // Pass derived attrs as function
        children
    );
};


// --- Exported Components ---

// Marker interfaces
interface PopoverChildMarker { _isPopoverChild?: boolean; }
interface PopoverTriggerProps extends VanTag<HTMLElement>, PopoverChildMarker { _isPopoverTrigger?: true; }
interface PopoverContentProps extends Omit<VanTag<HTMLDivElement>, 'children'>, PopoverChildMarker { // Use Omit for standard props
     align?: 'start' | 'center' | 'end';
     sideOffset?: number;
     _isPopoverContent?: true;
     children?: VanChild | VanChild[]; // Make children optional here
}


interface PopoverProps {
    open: State<boolean>; // Controlled externally
    onOpenChange: (isOpen: boolean) => void;
    children: VanChild[]; // Should contain Trigger and Content
}
export const Popover = ({ open, onOpenChange, children }: PopoverProps) => {
    const triggerElement = van.state<HTMLElement | null>(null);

    // Find trigger and content (simple search, assumes direct children)
    let triggerNode: VanChild | null = null;
    let contentNodeProps: PopoverContentProps = { _isPopoverContent: true };
    let contentChildren: VanChild[] = [];

    children.forEach((child: any) => {
        if (child && child._isPopoverTrigger) {
            triggerNode = child;
        } else if (child && child._isPopoverContent) {
            contentNodeProps = child.props || { _isPopoverContent: true };
            contentChildren = child.children || [];
        }
    });

     // Wrap the original trigger's onclick to update state and capture element
    if (triggerNode && (triggerNode as any).props) {
        const originalTriggerOnclick = (triggerNode as any).props.onclick;
        (triggerNode as any).props.onclick = (e: Event) => {
             triggerElement.val = e.currentTarget as HTMLElement; // Store trigger ref
             onOpenChange(!open.val); // Toggle open state
             if (typeof originalTriggerOnclick === 'function') originalTriggerOnclick(e); // Call original handler if exists
         };
    }


    return [ // Render trigger and the container (which handles visibility)
        triggerNode,
        PopoverContainer({
            open: open,
            triggerElement: triggerElement,
            onOpenChange: onOpenChange, // Pass handler
            children: contentChildren,
            contentClass: contentNodeProps.class ?? '',
            align: contentNodeProps.align,
            sideOffset: contentNodeProps.sideOffset,
        })
    ];
};

// Mark trigger/content components so Popover can find them
export const PopoverTrigger = (props: VanTag<HTMLElement>, ...children: VanChild[]) => {
    const { tag = 'button', ...rest } = props; // Default to button if no tag specified
    // Return an object structure that Popover can identify
    return { _isPopoverTrigger: true, props: rest, children: children, tag: tag, _isVanNode: true, render: () => tag(rest, children) };
};

// Content acts as a configuration holder with a marker
export const PopoverContent = (props: PopoverContentProps, ...children: VanChild[]) => {
    // This doesn't render directly, Popover extracts its props/children
    return { _isPopoverContent: true, props: props, children: children, _isVanNode: false }; // Not a direct VanNode
};