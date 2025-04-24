import { BaseComponent } from '../base-component';

/**
 * Simple Popover Component.
 * Uses absolute positioning relative to the trigger.
 * **MODIFIED:** Appends content to document.body (portalling).
 *
 * Attributes:
 * - open: Boolean attribute to control visibility.
 * - align: 'start' | 'center' | 'end' (default: 'center') - Horizontal alignment relative to trigger.
 * - side: 'top' | 'bottom' | 'left' | 'right' (default: 'bottom') - Preferred side.
 * - side-offset: Number (default: 4) - Gap between trigger and content.
 *
 * Slots:
 * - trigger: The element that triggers the popover.
 * - content: The content to display in the popover.
 */
export class AppPopover extends BaseComponent {
    static get observedAttributes() { return ['open', 'align', 'side', 'side-offset']; }

    private triggerSlot: HTMLSlotElement | null = null;
    private contentSlot: HTMLSlotElement | null = null;
    private contentWrapperElement: HTMLElement | null = null; // The portalled wrapper
    private triggerElement: HTMLElement | null = null;
    private clickOutsideHandler: ((event: MouseEvent) => void) | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private isPositioned: boolean = false; // Track if positioned after opening

    get open(): boolean {
        return this.hasAttribute('open');
    }
    set open(isOpen: boolean) {
        if (isOpen) this.setAttribute('open', '');
        else this.removeAttribute('open');
    }

    protected get styles(): string {
        // Styles for the host remain minimal as content is portalled
        return `
            :host {
                display: inline-block; /* Or block depending on usage */
                position: relative; /* Still needed for initial calculations potentially */
            }
            /* Styles for the portalled content wrapper */
            .popover-content-wrapper {
                 position: absolute; /* Changed from fixed to absolute */
                 top: 0; /* Initial position, updated by JS */
                 left: 0; /* Initial position, updated by JS */
                 z-index: 51; /* High z-index */
                 width: max-content;
                 max-width: var(--popover-max-width, 90vw);
                 border: 1px solid var(--color-popover-border, var(--color-border));
                 background-color: var(--color-popover-bg, white);
                 color: var(--color-popover-foreground, inherit);
                 border-radius: var(--radius, 0.5rem);
                 box-shadow: var(--shadow-md);
                 padding: var(--spacing-4, 1rem);
                 opacity: 0;
                 transform: scale(0.95);
                 transform-origin: var(--radix-popover-content-transform-origin, center center);
                 transition: opacity 150ms ease-out, transform 150ms ease-out;
                 pointer-events: none;
                 visibility: hidden;
                 /* Default origin if JS fails */
             }
            .popover-content-wrapper[data-state="open"] {
                 opacity: 1;
                 transform: scale(1);
                 pointer-events: auto;
                 visibility: visible;
             }

            /* Basic animation hints based on side (can be enhanced) */
            .popover-content-wrapper[data-side="top"] { animation: slide-in-from-bottom 0.2s ease-out; }
            .popover-content-wrapper[data-side="bottom"] { animation: slide-in-from-top 0.2s ease-out; }
            .popover-content-wrapper[data-side="left"] { animation: slide-in-from-right 0.2s ease-out; }
            .popover-content-wrapper[data-side="right"] { animation: slide-in-from-left 0.2s ease-out; }

            @keyframes slide-in-from-top { from { transform: translateY(-5px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            @keyframes slide-in-from-bottom { from { transform: translateY(5px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            @keyframes slide-in-from-left { from { transform: translateX(-5px) scale(0.95); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
            @keyframes slide-in-from-right { from { transform: translateX(5px) scale(0.95); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
        `;
    }

    protected get template(): string {
        // Only the trigger slot remains in the shadow DOM
        return `<slot name="trigger"></slot>`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.triggerSlot = this.shadow.querySelector('slot[name="trigger"]');
        // Get the content slot *from the light DOM* before it's potentially moved
        this.contentSlot = this.querySelector('[slot="content"]');

        this.triggerSlot?.addEventListener('slotchange', this.handleTriggerSlotChange);
        this.handleTriggerSlotChange(); // Initial setup for trigger

        this.clickOutsideHandler = this.handleClickOutside.bind(this);

        // Ensure content wrapper exists (portalled)
        this.ensureContentWrapper();

        // Initial state update
        this.updateOpenState();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.triggerElement?.removeEventListener('click', this.toggle);
        this.removeClickOutsideListener();
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        // Remove the portalled content element when the host disconnects
        this.contentWrapperElement?.remove();
        this.contentWrapperElement = null;
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (name === 'open') {
             this.updateOpenState();
        } else if (this.open && ['align', 'side', 'side-offset'].includes(name)) {
            // Reposition immediately if already open and alignment changes
            requestAnimationFrame(() => this.positionContent());
        }
    }

    private ensureContentWrapper() {
        if (this.contentWrapperElement) return; // Already created

        this.contentWrapperElement = document.createElement('div');
        this.contentWrapperElement.className = 'popover-content-wrapper';
        this.contentWrapperElement.part.add('content'); // Expose as part

        // Apply initial styles needed before positioning
        this.applyContentWrapperStyles();

        // Move the slotted content into the wrapper
        if (this.contentSlot) {
            // Move children from light DOM slot to the wrapper
            while (this.contentSlot.firstChild) {
                this.contentWrapperElement.appendChild(this.contentSlot.firstChild);
            }
            // Remove the original slot from light DOM if desired (optional)
            // this.contentSlot.remove();
        } else {
            // If content was somehow already moved or defined differently, handle it here
             console.warn("AppPopover: Could not find light DOM content slot to move.");
        }


        document.body.appendChild(this.contentWrapperElement);

        // Observe the portalled element for size changes
        this.resizeObserver = new ResizeObserver(() => {
             if (this.open) requestAnimationFrame(() => this.positionContent());
        });
        this.resizeObserver.observe(this.contentWrapperElement);
    }

     // Apply styles from shadow DOM to the portalled element
     private applyContentWrapperStyles() {
        if (!this.contentWrapperElement) return;
         // Copy relevant CSS variables or styles if needed, though classes should cover most
         // Example: this.contentWrapperElement.style.setProperty('--popover-max-width', this.style.getPropertyValue('--popover-max-width'));
         // Reset inline styles that might conflict before positioning
         this.contentWrapperElement.style.top = '0px';
         this.contentWrapperElement.style.left = '0px';
     }

    private handleTriggerSlotChange = () => {
        // Remove listener from old trigger
        this.triggerElement?.removeEventListener('click', this.toggle);

        const assignedElements = this.triggerSlot?.assignedElements({ flatten: true });
        this.triggerElement = (assignedElements?.[0] as HTMLElement) || null;

        if (this.triggerElement) {
            this.triggerElement.addEventListener('click', this.toggle);
            if (!this.triggerElement.hasAttribute('tabindex') && !(this.triggerElement instanceof HTMLButtonElement || this.triggerElement instanceof HTMLInputElement || this.triggerElement instanceof HTMLAnchorElement)) {
                 this.triggerElement.setAttribute('tabindex', '0');
            }
            this.triggerElement.setAttribute('aria-haspopup', 'dialog');
            this.triggerElement.setAttribute('aria-expanded', String(this.open));
            if(this.contentWrapperElement?.id) { // Link to portalled element if it has an ID
                this.triggerElement.setAttribute('aria-controls', this.contentWrapperElement.id);
            }
        }
    }

    private updateOpenState(): void {
        if (!this.contentWrapperElement) {
             // Try ensuring wrapper exists if state is updated before connection finishes
             if(this.isConnected) this.ensureContentWrapper();
             if (!this.contentWrapperElement) {
                console.error("AppPopover: Content wrapper not available.");
                return;
             }
        }

        const isOpen = this.open;
        this.contentWrapperElement.setAttribute('data-state', isOpen ? 'open' : 'closed');
        if (this.triggerElement) this.triggerElement.setAttribute('aria-expanded', String(isOpen));

        if (isOpen) {
            this.isPositioned = false; // Reset positioned flag
             requestAnimationFrame(() => {
                 this.positionContent();
                 this.isPositioned = true;
                 // Focus content after positioning (optional)
                 // this.focusFirstElementInContent();
             });
            this.addClickOutsideListener();
            this.dispatchEvent(new CustomEvent('open', { bubbles: true, composed: true }));
        } else {
            this.removeClickOutsideListener();
             this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        }
    }

    private toggle = (event?: MouseEvent) => {
         console.log("AppPopover: Toggle called."); // Debug log
        event?.stopPropagation();
        this.open = !this.open;
    }

    private handleClickOutside(event: MouseEvent) {
        if (!this.open || !this.contentWrapperElement || !this.isPositioned) return;

        const target = event.target as Node;

        // Check if click is outside the portalled content AND outside the trigger
        if (!this.contentWrapperElement.contains(target) && !this.triggerElement?.contains(target)) {
            console.log("AppPopover: Click detected outside trigger and content."); // Debug log
            this.open = false;
        }
    }

    private addClickOutsideListener() {
        if (!this.clickOutsideHandler) return;
        // Use setTimeout to avoid the listener catching the click that opened the popover
        setTimeout(() => {
             document.removeEventListener('click', this.clickOutsideHandler!); // Remove previous before adding
             document.addEventListener('click', this.clickOutsideHandler!);
             console.log("AppPopover: Click outside listener added."); // Debug log
        }, 0);
    }

    private removeClickOutsideListener() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
             console.log("AppPopover: Click outside listener removed."); // Debug log
        }
    }

    private positionContent() {
        if (!this.triggerElement || !this.contentWrapperElement) return;

        const triggerRect = this.triggerElement.getBoundingClientRect();
        const contentRect = this.contentWrapperElement.getBoundingClientRect(); // Get size of portalled element

        // Note: hostRect is not needed as we position relative to viewport now
        // const hostRect = this.getBoundingClientRect();

        const align = this.getAttribute('align') || 'center';
        const side = this.getAttribute('side') || 'bottom';
        const sideOffset = this.getNumAttribute('side-offset') || 4;
        const scrollX = window.scrollX; // Add scroll offsets
        const scrollY = window.scrollY;

        let top = 0;
        let left = 0;
        let transformOrigin = '';

        // Calculate position relative to the *viewport*
        const triggerTopVP = triggerRect.top + scrollY;
        const triggerLeftVP = triggerRect.left + scrollX;

        switch (side) {
            case 'top':
                top = triggerTopVP - contentRect.height - sideOffset;
                transformOrigin = 'center bottom';
                break;
            case 'bottom':
                top = triggerTopVP + triggerRect.height + sideOffset;
                transformOrigin = 'center top';
                break;
            case 'left':
                left = triggerLeftVP - contentRect.width - sideOffset;
                transformOrigin = 'right center';
                break;
            case 'right':
                left = triggerLeftVP + triggerRect.width + sideOffset;
                transformOrigin = 'left center';
                break;
        }

        if (side === 'top' || side === 'bottom') {
            switch (align) {
                case 'start':
                    left = triggerLeftVP;
                    transformOrigin = `left ${side === 'top' ? 'bottom' : 'top'}`;
                    break;
                case 'end':
                    left = triggerLeftVP + triggerRect.width - contentRect.width;
                     transformOrigin = `right ${side === 'top' ? 'bottom' : 'top'}`;
                    break;
                case 'center':
                default:
                    left = triggerLeftVP + (triggerRect.width / 2) - (contentRect.width / 2);
                    transformOrigin = `center ${side === 'top' ? 'bottom' : 'top'}`;
                    break;
            }
        } else { // side is left or right
            switch (align) {
                case 'start':
                    top = triggerTopVP;
                    transformOrigin = `${side === 'left' ? 'right' : 'left'} top`;
                    break;
                case 'end':
                    top = triggerTopVP + triggerRect.height - contentRect.height;
                     transformOrigin = `${side === 'left' ? 'right' : 'left'} bottom`;
                    break;
                case 'center':
                default:
                    top = triggerTopVP + (triggerRect.height / 2) - (contentRect.height / 2);
                    transformOrigin = `${side === 'left' ? 'right' : 'left'} center`;
                    break;
            }
        }

        // Basic viewport collision adjustment (can be made more sophisticated)
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;

         // Adjust left position
         if (left + contentRect.width > viewportWidth + scrollX - sideOffset) { // Check right edge collision
             left = viewportWidth + scrollX - contentRect.width - sideOffset;
         }
         if (left < scrollX + sideOffset) { // Check left edge collision
             left = scrollX + sideOffset;
         }

         // Adjust top position
         if (top + contentRect.height > viewportHeight + scrollY - sideOffset) { // Check bottom edge collision
             top = viewportHeight + scrollY - contentRect.height - sideOffset;
             // Potentially flip side if colliding heavily? (more complex)
         }
         if (top < scrollY + sideOffset) { // Check top edge collision
             top = scrollY + sideOffset;
         }

        this.contentWrapperElement.style.top = `${Math.round(top)}px`;
        this.contentWrapperElement.style.left = `${Math.round(left)}px`;
        this.contentWrapperElement.style.setProperty('--radix-popover-content-transform-origin', transformOrigin);
        this.contentWrapperElement.setAttribute('data-side', side); // For animations
    }

    private focusFirstElementInContent(): void {
        if (!this.contentWrapperElement) return;
        const focusableSelector = 'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
        const firstFocusable = this.contentWrapperElement.querySelector<HTMLElement>(focusableSelector);
        firstFocusable?.focus();
    }

     // --- Public Methods ---
    show(): void { this.open = true; }
    hide(): void { this.open = false; }
}

// Define the component unless already defined
if (!customElements.get('app-popover')) {
    customElements.define('app-popover', AppPopover);
}