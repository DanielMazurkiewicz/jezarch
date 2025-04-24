import van, { State } from "vanjs-core"; // Import State
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";
import * as icons from "./icons"; // Assuming icons exist

const { div, button, span } = van.tags; // Added span

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
const dialogOverlayStyle = style([
    styles.fixed, styles.inset0, styles.z50,
    {
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black overlay
        backdropFilter: 'blur(4px)', // Optional blur effect
        // Add fade-in/out animations if desired using @keyframes and animation properties
    }
]);

const dialogContentStyle = style([
    styles.fixed,
    styles.z50, // Ensure content is above overlay
    styles.grid, // Use grid for layout
    styles.gap4,
    styles.p6,
    styles.shadowLg,
    styles.border,
    styles.roundedLg, // Match Card rounding
    styles.bgBackground, // Use theme background
    {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90vw', // Responsive width
        maxWidth: '500px', // Default max-width (sm:max-w-lg approx)
        maxHeight: '90vh', // Max height
        overflowY: 'auto', // Make content area scrollable if needed
        borderColor: themeVars.color.border,
        // Add animations if desired
    }
]);

const dialogHeaderStyle = style([
    styles.flex,
    styles.flexCol,
    styles.gap2, // Space between title and description
    styles.textCenter,
    {
        '@media': { 'screen and (min-width: 640px)': { textAlign: "left" } }, // sm:text-left
        paddingRight: themeVars.spacing.xl, // pr-6 approx, to account for close button space
    }
]);

const dialogFooterStyle = style([
    styles.flex,
    styles.flexCol, // Stack buttons on small screens
    styles.gap2,
    { '@media': { 'screen and (min-width: 640px)': { flexDirection: 'row', justifyContent: 'flex-end' } } } // sm:flex-row sm:justify-end
]);

const dialogTitleStyle = style([
    styles.textLg, // text-lg
    styles.fontSemibold,
    styles.textForeground, // Use standard foreground color
    { lineHeight: 1.2 } // leading-none approx
]);

const dialogDescriptionStyle = style([
    styles.textSm,
    styles.textMutedForeground,
]);

const closeButtonStyle = style([
    styles.absolute,
    {
        top: themeVars.spacing.md, // p-4 top
        right: themeVars.spacing.md, // p-4 right
    },
    styles.roundedMd, // rounded-sm approx
    styles.opacity70,
    styles.transitionColors, // transition-opacity approx
    {
        color: themeVars.color.mutedForeground, // Use muted foreground for icon color
        ':hover': {
            opacity: 1,
            color: themeVars.color.foreground, // Darken on hover
        },
        ':focus-visible': { // Standard focus ring
             outline: `2px solid ${themeVars.color.ring}`,
             outlineOffset: '2px',
             opacity: 1,
        },
         // Ensure icon size
         '& > svg': {
             width: '1rem', // size-4 value
             height: '1rem',
         }
    }
]);


// --- Components ---

// Helper to manage dialog state and rendering portal-like behavior
interface DialogContainerProps {
    open: State<boolean>;
    onOpenChange: (isOpen: boolean) => void;
    contentClass?: string;
    contentMaxWidth?: string;
    children: VanChild[];
}
const DialogContainer = ({ open, onOpenChange, contentClass = '', contentMaxWidth, children }: DialogContainerProps) => {
    const closeDialog = () => onOpenChange(false);

    // Effect to handle Esc key press
    van.derive(() => { // Replaced effect with derive, it should re-run when 'open' changes
        if (!open.val) return () => {}; // Return empty cleanup if not open

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeDialog();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        // Return cleanup function for when 'open' becomes false or component unmounts
        return () => document.removeEventListener('keydown', handleKeyDown);
    });

    // Conditionally render the dialog based on the open state
    return van.derive(() => {
        if (!open.val) return null; // Render nothing if closed

        return div( // Use a wrapper div; actual portal is complex
            // Overlay
            div({ class: dialogOverlayStyle, onclick: closeDialog }),
            // Content
            div({
                class: `${dialogContentStyle} ${contentClass}`.trim(),
                style: contentMaxWidth ? `max-width: ${contentMaxWidth};` : '',
                role: "dialog",
                'aria-modal': "true",
                 // Add aria-labelledby/describedby if DialogHeader/Title/Desc are used
            },
                children, // Render children passed to the container
                // Close Button (rendered inside content)
                button({
                    class: closeButtonStyle,
                    onclick: closeDialog,
                    'aria-label': "Close"
                    },
                    icons.XIcon(),
                    span({ class: styles.srOnly }, "Close")
                )
            )
        );
    });
};


// --- Exported Components ---

// Marker interface for type checking children
interface DialogChildMarker { _isDialogChild?: boolean; }
interface DialogTriggerProps extends VanTag<HTMLElement>, DialogChildMarker { _isPopoverTrigger?: never; _isDialogTrigger?: true; } // Disallow popover trigger marker
interface DialogContentProps extends VanTag<HTMLDivElement>, DialogChildMarker { maxWidth?: string; _isDialogContent?: true; }

// Root component manages the state (via props) and portal rendering
export const Dialog = (props: { open: State<boolean>; onOpenChange: (isOpen: boolean) => void; }, children: VanChild | VanChild[]) => {
    const { open, onOpenChange } = props;
    const childrenArray = Array.isArray(children) ? children : [children];

    // Find trigger and content using marker properties
    let triggerNode: VanChild | null = null;
    let contentNode: DialogContentProps | null = null;
    let contentChildren: VanChild[] = [];

    childrenArray.forEach((child: any) => {
        if (child && child._isDialogTrigger) {
            triggerNode = child;
        } else if (child && child._isDialogContent) {
            contentNode = child.props || {};
            contentChildren = child.children || [];
        }
    });

     // Wrap the original trigger's onclick to update state
    if (triggerNode && (triggerNode as any).props) {
        const originalTriggerOnclick = (triggerNode as any).props.onclick;
        (triggerNode as any).props.onclick = (e: Event) => {
             onOpenChange(!open.val); // Toggle open state
             if (typeof originalTriggerOnclick === 'function') originalTriggerOnclick(e); // Call original handler if exists
         };
    }

     return [ // Return array: trigger + dialog container (when open)
         triggerNode, // Render trigger etc.
         DialogContainer({
             open: open,
             onOpenChange: onOpenChange,
             contentClass: contentNode?.class ?? '',
             contentMaxWidth: contentNode?.maxWidth,
             children: contentChildren // Render content's children
         })
     ];
};

// Trigger is just a passthrough that adds a marker property
export const DialogTrigger = (props: VanTag<HTMLElement>, ...children: VanChild[]) => {
     const { tag = button, ...rest } = props; // Default to button
     // We need to return an object structure that Dialog can recognize
     return { _isDialogTrigger: true, props: rest, children: children, tag: tag, render: () => tag(rest, children), _isVanNode: true };
};

// Content acts as a configuration holder with a marker
export const DialogContent = (props: Omit<DialogContentProps, '_isDialogContent'>, ...children: VanChild[]) => {
     // This doesn't render directly. Dialog reads its props/children.
     // Use an object structure that Dialog can identify
     return { _isDialogContent: true, props: props, children: children, _isVanNode: false };
};


// Header, Footer, Title, Description are simple styled divs
interface DialogHeaderProps extends VanTag<HTMLDivElement> {}
export const DialogHeader = (props: DialogHeaderProps | State<DialogHeaderProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<DialogHeaderProps>).val : props as DialogHeaderProps;
    return div({ class: `${dialogHeaderStyle} ${className}`.trim(), ...rest }, children);
};

interface DialogFooterProps extends VanTag<HTMLDivElement> {}
export const DialogFooter = (props: DialogFooterProps | State<DialogFooterProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<DialogFooterProps>).val : props as DialogFooterProps;
    return div({ class: `${dialogFooterStyle} ${className}`.trim(), ...rest }, children);
};

interface DialogTitleProps extends VanTag<HTMLHeadingElement> {}
export const DialogTitle = (props: DialogTitleProps | State<DialogTitleProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', tag = 'h2', ...rest } = isPropsState ? (props as State<DialogTitleProps>).val : props as DialogTitleProps;
    return tag({ class: `${dialogTitleStyle} ${className}`.trim(), ...rest }, children);
};

interface DialogDescriptionProps extends VanTag<HTMLParagraphElement> {}
export const DialogDescription = (props: DialogDescriptionProps | State<DialogDescriptionProps>, ...children: VanChild[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', tag = 'p', ...rest } = isPropsState ? (props as State<DialogDescriptionProps>).val : props as DialogDescriptionProps;
    return tag({ class: `${dialogDescriptionStyle} ${className}`.trim(), ...rest }, children);
};