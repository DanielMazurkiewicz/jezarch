import { authService } from '../index';
// Use typeof to get the type of the singleton instance
// No change needed here, using typeof authService directly works

/**
 * Base class for all custom elements.
 * Provides common functionality like shadow DOM handling, authentication access,
 * attribute parsing, and basic lifecycle logging.
 */
export abstract class BaseComponent extends HTMLElement {
    protected shadow: ShadowRoot;
    // Use typeof the singleton instance directly for the type
    protected auth: typeof authService = authService;
    protected _isLoading: boolean = false;
    protected _error: string | null = null;

    // Store listeners for easy removal
    private eventListeners: { element: EventTarget | null; type: string; listener: EventListenerOrEventListenerObject }[] = [];

    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
    }

    // --- Abstract Methods ---
    /**
     * Returns the CSS styles for the component.
     * Should be implemented by subclasses.
     */
    protected abstract get styles(): string;

    /**
     * Returns the HTML template string for the component's shadow DOM.
     * Should be implemented by subclasses.
     */
    protected abstract get template(): string;

    // --- Lifecycle Callbacks ---
    connectedCallback() {
        // Initial render
        this.render();
        // Add auth state listener AFTER initial render
        this.addAuthListener();
        // Subclasses might fetch data here, ensure render happens first
        if (this.isConnected) {
            // console.log(`${this.constructor.name} connected`);
        }
    }

    disconnectedCallback() {
        // console.log(`${this.constructor.name} disconnected`);
        // Remove all registered listeners
        this.removeEventListeners();
        // Remove auth state listener specifically
        this.removeAuthListener();
    }

    // BaseComponent does not observe attributes by default,
    // so the base attributeChangedCallback is usually not needed unless
    // subclasses call super.attributeChangedCallback() for some reason.
    // If subclasses need specific attribute handling, they implement it directly.
    // attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    //     console.log(`${this.constructor.name} attribute changed: ${name} from ${oldValue} to ${newValue}`);
    // }

    // --- Rendering ---
    /**
     * Renders the component's styles and template into the shadow DOM.
     * Also attaches event listeners defined in `addEventListeners`.
     */
    protected render(): void {
        if (!this.shadow) return;

        // Preserve focused element within shadow DOM before re-rendering
        let activeElement: Element | null = null;
        let selectionStart: number | null = null;
        let selectionEnd: number | null = null;

        if (this.shadow.activeElement) {
            activeElement = this.shadow.activeElement;
             // Store selection range if it's an input/textarea
             if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
                 try {
                     selectionStart = activeElement.selectionStart;
                     selectionEnd = activeElement.selectionEnd;
                 } catch (e) { /* Ignore errors like 'The input element's type ('...') does not support selection' */ }
             }
        }

        this.shadow.innerHTML = `
            <style>
                /* Common base styles can go here if needed */
                *, *::before, *::after { box-sizing: border-box; }
                :host { display: block; } /* Default display */
                ${this.styles}
            </style>
            ${this.template}
        `;

        // Restore focus and selection if possible
        if (activeElement && typeof (activeElement as HTMLElement).focus === 'function') {
            // Try to find the equivalent element in the new DOM structure
            const newElement = activeElement.id ? this.shadow.getElementById(activeElement.id) : null;
             if (newElement && typeof (newElement as HTMLElement).focus === 'function') {
                 try {
                     (newElement as HTMLElement).focus();
                     // Restore selection range if applicable
                     if ((newElement instanceof HTMLInputElement || newElement instanceof HTMLTextAreaElement) &&
                         selectionStart !== null && selectionEnd !== null) {
                         newElement.setSelectionRange(selectionStart, selectionEnd);
                     }
                 } catch (e) { /* Ignore focus/selection errors */ }
             }
        }


        // Ensure listeners are (re)attached after rendering
        this.removeEventListeners(); // Remove previously attached listeners
        this.addEventListeners(); // Re-attach listeners based on the new template
    }

    // --- Authentication Handling ---
    private handleAuthStateChange = (): void => {
        // console.log(`${this.constructor.name} received auth state change`);
        // Re-render the component when auth state changes
        // Subclasses might need more specific updates
        this.render();
    }

    private addAuthListener(): void {
        authService.addEventListener('authStateChanged', this.handleAuthStateChange);
        // console.log(`${this.constructor.name} added auth listener`);
    }

    private removeAuthListener(): void {
        authService.removeEventListener('authStateChanged', this.handleAuthStateChange);
        // console.log(`${this.constructor.name} removed auth listener`);
    }

    // --- DOM Querying Helpers ---
    /**
     * Query selector within the component's shadow DOM.
     */
    protected qs<E extends Element = Element>(selector: string): E {
        const element = this.shadow.querySelector<E>(selector);
        if (!element) {
            throw new Error(`Element matching selector "${selector}" not found in ${this.constructor.name}`);
        }
        return element;
    }

    /**
     * Optional query selector within the component's shadow DOM.
     * Returns null if the element is not found, instead of throwing an error.
     */
    protected qsOptional<E extends Element = Element>(selector: string): E | null {
        return this.shadow.querySelector<E>(selector);
    }

    /**
     * Query selector all within the component's shadow DOM.
     */
    protected qsa<E extends Element = Element>(selector: string): NodeListOf<E> {
        return this.shadow.querySelectorAll<E>(selector);
    }

    // --- Attribute Parsing Helpers ---
    protected getStringAttribute(name: string, defaultValue: string = ''): string {
        return this.getAttribute(name) ?? defaultValue;
    }

    protected getNumAttribute(name: string, defaultValue: number | null = null): number | null {
        const value = this.getAttribute(name);
        if (value === null) return defaultValue;
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    }

    protected getBoolAttribute(name: string): boolean {
        return this.hasAttribute(name);
    }

    // --- Event Listener Management ---
    /**
     * Subclasses should implement this method to add their specific event listeners.
     * Use `this.registerListener` to ensure they are tracked for removal.
     * This method is called automatically after `render`.
     */
    protected addEventListeners(): void {
        // Example: this.registerListener(this.qs('#my-button'), 'click', this.handleClick);
    }

    /**
     * Registers an event listener and keeps track of it for later removal.
     * Should only be called within `addEventListeners`.
     * @param element - The target element (or null to skip).
     * @param type - The event type.
     * @param listener - The event listener function or object.
     */
    protected registerListener(element: EventTarget | null, type: string, listener: EventListenerOrEventListenerObject): void {
        if (!element) return;
        element.addEventListener(type, listener);
        this.eventListeners.push({ element, type, listener });
    }

    /**
     * Removes all registered event listeners.
     * Called automatically before `addEventListeners` during `render` and in `disconnectedCallback`.
     */
    protected removeEventListeners(): void {
        // console.log(`${this.constructor.name} removing ${this.eventListeners.length} listeners`);
        this.eventListeners.forEach(({ element, type, listener }) => {
            element?.removeEventListener(type, listener);
        });
        this.eventListeners = []; // Clear the list
    }

    // --- Helper for Creating Elements ---
    /**
     * Creates an HTML element with optional text content, classes, and attributes.
     * @param tagName The tag name of the element to create.
     * @param options Optional configuration for the element.
     * @param options.text Text content for the element.
     * @param options.classes CSS classes to add (space-separated string or array).
     * @param options.attributes Key-value pairs for attributes.
     * @param options.html Inner HTML content (use with caution).
     * @returns The created HTMLElement.
     */
    protected createElement<K extends keyof HTMLElementTagNameMap>(
        tagName: K,
        options: {
            text?: string;
            classes?: string | string[];
            attributes?: { [key: string]: string };
            html?: string;
        } = {}
    ): HTMLElementTagNameMap[K] {
        const element = document.createElement(tagName);

        if (options.text) {
            element.textContent = options.text;
        } else if (options.html) {
            element.innerHTML = options.html; // Be careful with XSS if html is user-provided
        }

        if (options.classes) {
            if (Array.isArray(options.classes)) {
                element.classList.add(...options.classes);
            } else {
                element.classList.add(...options.classes.split(' ').filter(Boolean));
            }
        }

        if (options.attributes) {
            for (const [key, value] of Object.entries(options.attributes)) {
                element.setAttribute(key, value);
            }
        }

        return element;
    }

}