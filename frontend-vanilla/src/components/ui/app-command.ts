import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';
import { debounce } from '../../lib/utils';

// --- AppCommandGroup Definition ---
export class AppCommandGroup extends HTMLElement {
     static styles = `
         :host { display: block; /* Ensure group takes block space */ }
         :host([hidden]) { display: none; }
         .command-group-heading {
             padding: var(--spacing-1) var(--spacing-2); /* Adjusted padding */
             margin: var(--spacing-1) 0; /* Add some margin */
             font-size: 0.75rem; /* text-xs */
             font-weight: 500;
             color: var(--color-muted-foreground);
             user-select: none;
         }
     `;
     constructor() {
         super();
         const shadow = this.attachShadow({ mode: 'open' });
         const style = document.createElement('style');
         style.textContent = AppCommandGroup.styles;
         shadow.appendChild(style);
         const slot = document.createElement('slot');
         shadow.appendChild(slot);
         // Heading will be added in connectedCallback
     }
     connectedCallback() {
         this.setAttribute('role', 'group');
         const shadow = this.shadowRoot;
         if (!shadow) return;

         // Add heading if 'heading' attribute exists and not already added
         const headingAttr = this.getAttribute('heading');
         if (headingAttr && !shadow.querySelector('.command-group-heading')) {
             const headingElement = document.createElement('div');
             headingElement.classList.add('command-group-heading');
             headingElement.textContent = headingAttr;
             headingElement.setAttribute('aria-hidden', 'true'); // Non-interactive heading
             // Prepend heading within shadow DOM, before the slot
             shadow.prepend(headingElement);
         }
     }
}
// Define Group element immediately
if (!customElements.get('app-command-group')) {
     customElements.define('app-command-group', AppCommandGroup);
}


// --- AppCommandItem Definition ---
export class AppCommandItem extends HTMLElement {
    static observedAttributes = ['disabled', 'value', 'filter-text', 'data-active'];
     static styles = `
         :host {
             display: flex;
             align-items: center;
             gap: var(--spacing-2, 0.5rem);
             padding: var(--spacing-1) var(--spacing-2); /* Reduced padding slightly */
             border-radius: calc(var(--radius) - 2px);
             font-size: 0.875rem;
             cursor: default;
             user-select: none;
             outline: none;
             transition: background-color 100ms, color 100ms;
             margin: 0 var(--spacing-1); /* Margin for visual spacing */
         }
          :host([hidden]) { display: none; } /* Hide element when hidden */
          :host([data-active]) {
              background-color: var(--color-secondary);
              color: var(--color-secondary-foreground);
          }
          :host([disabled]) {
              opacity: 0.5;
              pointer-events: none;
              cursor: not-allowed;
          }
     `;
     constructor() {
         super();
         const shadow = this.attachShadow({ mode: 'open' });
         const style = document.createElement('style');
         style.textContent = AppCommandItem.styles;
         shadow.appendChild(style);
         const slot = document.createElement('slot'); // Default slot for content
         // Add slots for potential left/right icons
         const leftIconSlot = document.createElement('slot');
         leftIconSlot.name = 'icon-left';
         const rightIconSlot = document.createElement('slot');
         rightIconSlot.name = 'icon-right';
         shadow.append(leftIconSlot, slot, rightIconSlot); // Structure: left-icon, content, right-icon
     }
    get value(): string { return this.getAttribute('value') || this.textContent || ''; }
    get filterText(): string { return this.getAttribute('filter-text') || this.textContent || ''; }
    get disabled(): boolean { return this.hasAttribute('disabled'); } // Getter for property access
    set disabled(isDisabled: boolean) { this.toggleAttribute('disabled', isDisabled); }

    connectedCallback() {
         this.setAttribute('role', 'option');
         this.updateAccessibilityAttributes();
    }
     attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue !== newValue) {
             this.updateAccessibilityAttributes();
        }
     }
     private updateAccessibilityAttributes(): void {
         this.setAttribute('aria-disabled', String(this.hasAttribute('disabled')));
         this.setAttribute('aria-selected', String(this.hasAttribute('data-active')));
     }
}
// Define Item element immediately
if (!customElements.get('app-command-item')) {
    customElements.define('app-command-item', AppCommandItem);
}

/**
 * Simple Command Palette Component (mimics basic cmdk behavior).
 * Relies on AppCommandItem and AppCommandGroup being defined.
 */
export class AppCommand extends BaseComponent {
    static get observedAttributes() { return ['placeholder', 'filter-locally', 'loading']; }

    private inputElement: HTMLInputElement | null = null;
    private listWrapperElement: HTMLElement | null = null; // Wrapper for scrolling
    private listSlotElement: HTMLSlotElement | null = null; // Slot for items
    private items: AppCommandItem[] = []; // Store reference to slotted items
    private groups: AppCommandGroup[] = []; // Store reference to slotted groups
    private debouncedInputHandler: (value: string) => void;
    private currentFilter: string = '';

    constructor() {
        super();
        this.debouncedInputHandler = debounce(this.handleDebouncedInput, 200); // Debounce input event
        // Bind methods
        this.handleInput = this.handleInput.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleItemClick = this.handleItemClick.bind(this);
        this.handleSlotChange = this.handleSlotChange.bind(this);
    }

    protected get styles(): string {
        return `
            :host {
                display: flex;
                flex-direction: column;
                overflow: hidden; /* Contained component */
                border: 1px solid var(--color-border);
                border-radius: var(--radius);
                background-color: var(--color-popover-bg); /* Use popover bg */
                color: var(--color-popover-foreground);
            }
            .input-wrapper {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                padding: 0 var(--spacing-3);
                border-bottom: 1px solid var(--color-border);
                flex-shrink: 0;
            }
            .input-wrapper svg {
                width: 1rem;
                height: 1rem;
                color: var(--color-muted-foreground);
                opacity: 0.7;
            }
            input {
                flex-grow: 1;
                height: 2.5rem; /* ~h-10 */
                border: none;
                outline: none;
                background: transparent;
                color: inherit;
                font-size: 0.875rem;
            }
            input::placeholder {
                color: var(--color-muted-foreground);
            }
            .list-wrapper {
                max-height: 300px; /* Default max height */
                overflow-y: auto;
                padding: var(--spacing-1) 0; /* Padding around groups/items */
            }
            /* Styling for slotted elements */
            /* Group/Item styles are defined in their own classes now */

            ::slotted([slot="empty"]), ::slotted([slot="loading"]) {
                padding: var(--spacing-6) 0;
                text-align: center;
                font-size: 0.875rem;
                color: var(--color-muted-foreground);
            }
            /* Hide/show slots based on host attributes */
             slot { display: none; } /* Hide all slots by default */
             slot[name="list"] { display: block; } /* Show list slot by default */

            :host([loading]) slot[name="loading"] { display: block; }
            :host([loading]) slot[name="list"] { display: none; }
            :host([loading]) slot[name="empty"] { display: none; }

            :host([data-empty="true"]:not([loading])) slot[name="empty"] { display: block; }
            :host([data-empty="true"]:not([loading])) slot[name="list"] { display: none; }
            :host([data-empty="true"]:not([loading])) slot[name="loading"] { display: none; }

            :host(:not([loading]):not([data-empty="true"])) slot[name="list"] { display: block; }
            :host(:not([loading]):not([data-empty="true"])) slot[name="loading"] { display: none; }
            :host(:not([loading]):not([data-empty="true"])) slot[name="empty"] { display: none; }

            /* Footer */
            slot[name="footer"] {
                display: block; /* Make footer always potentially visible */
                border-top: 1px solid var(--color-border);
                padding: var(--spacing-2);
                flex-shrink: 0;
            }
        `;
    }

    protected get template(): string {
        const placeholder = this.getAttribute('placeholder') || 'Search...';
        const searchIcon = icons.search ?? '';
        return `
            <div class="input-wrapper">
                ${searchIcon}
                <input type="text" placeholder="${placeholder}" aria-label="Command search input" />
            </div>
            <div class="list-wrapper" role="listbox" aria-label="Command results">
                <slot name="loading"></slot>
                <slot name="empty"></slot>
                <slot name="list"></slot>
            </div>
            <slot name="footer"></slot>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.inputElement = this.shadow.querySelector('input');
        this.listWrapperElement = this.shadow.querySelector('.list-wrapper');
        this.listSlotElement = this.shadow.querySelector('slot[name="list"]');

        this.handleSlotChange(); // Initial setup for items/groups
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (name === 'placeholder' && this.inputElement) {
            this.inputElement.placeholder = newValue || 'Search...';
        }
        if (name === 'filter-locally') {
            this.applyFilter(); // Re-apply filter if mode changes
        }
        if (name === 'loading') {
             this.updateEmptyState(); // Update visibility based on loading state
        }
    }

    addEventListeners(): void {
        this.inputElement?.addEventListener('input', this.handleInput);
        this.inputElement?.addEventListener('keydown', this.handleKeydown);
        // Listen for clicks on the wrapper and delegate to items
        this.listWrapperElement?.addEventListener('click', this.handleItemClick);
        // Listen for slot changes to update item list
        this.listSlotElement?.addEventListener('slotchange', this.handleSlotChange);
    }

    removeEventListeners(): void {
        this.inputElement?.removeEventListener('input', this.handleInput);
        this.inputElement?.removeEventListener('keydown', this.handleKeydown);
        this.listWrapperElement?.removeEventListener('click', this.handleItemClick);
        this.listSlotElement?.removeEventListener('slotchange', this.handleSlotChange);
    }

    private handleInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.currentFilter = value.toLowerCase();
        this.setAttribute('value', value); // Reflect value
        this.debouncedInputHandler(value);
        if (this.hasAttribute('filter-locally')) {
             this.applyFilter(); // Apply local filter immediately if enabled
        }
    }

    private handleDebouncedInput(value: string): void {
        // Dispatch debounced input event for external filtering/loading
        if (!this.hasAttribute('filter-locally')) {
            this.dispatchEvent(new CustomEvent('input', { detail: { value }, bubbles: true, composed: true }));
        }
    }

     private handleSlotChange(): void {
         // Update items list whenever slotted content changes
         if (!this.listSlotElement) return;
         // Get directly assigned nodes first
         const assignedNodes = this.listSlotElement.assignedNodes();

         // Then query within those nodes (e.g., if items are wrapped in groups)
         const itemsFromNodes = (nodes: Node[]): AppCommandItem[] => {
             let items: AppCommandItem[] = [];
             nodes.forEach(node => {
                 if (node instanceof AppCommandItem) {
                     items.push(node);
                 } else if (node instanceof AppCommandGroup) {
                     // Query slotted elements within the group's light DOM
                     items = items.concat(Array.from(node.querySelectorAll('app-command-item')));
                 } else if (node instanceof Element) {
                     // If items are nested deeper, query recursively (less common)
                     items = items.concat(Array.from(node.querySelectorAll('app-command-item')));
                 }
             });
             return items;
         };

         const groupsFromNodes = (nodes: Node[]): AppCommandGroup[] => {
             let groups: AppCommandGroup[] = [];
             nodes.forEach(node => {
                if (node instanceof AppCommandGroup) {
                     groups.push(node);
                } else if (node instanceof Element) {
                    groups = groups.concat(Array.from(node.querySelectorAll('app-command-group')));
                }
             });
             return groups;
         }


         this.items = itemsFromNodes(assignedNodes);
         this.groups = groupsFromNodes(assignedNodes);
         //console.log(`Slot change detected. Items: ${this.items.length}, Groups: ${this.groups.length}`);

         this.applyFilter(); // Re-apply filter to new items
         this.setActiveItem(-1); // Reset focus/active state
     }


    private handleItemClick(event: MouseEvent): void {
        const item = (event.target as HTMLElement)?.closest('app-command-item');
        if (item instanceof AppCommandItem && !item.disabled) { // Use disabled property
            this.selectItem(item);
        }
    }

     private handleKeydown(event: KeyboardEvent): void {
         const visibleItems = this.items.filter(item => !item.hidden && !item.disabled); // Use disabled property
         if (!visibleItems.length) return;

         let activeIndex = visibleItems.findIndex(item => item.hasAttribute('data-active'));

         switch (event.key) {
             case 'ArrowDown':
                 event.preventDefault();
                 activeIndex = (activeIndex + 1) % visibleItems.length;
                 this.setActiveItem(activeIndex, visibleItems);
                 break;
             case 'ArrowUp':
                 event.preventDefault();
                 activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
                 this.setActiveItem(activeIndex, visibleItems);
                 break;
             case 'Enter':
                 event.preventDefault();
                 if (activeIndex > -1) {
                     // Ensure the item exists before selecting
                     const selectedItem = visibleItems[activeIndex];
                     if (selectedItem) this.selectItem(selectedItem);
                 }
                 break;
              case 'Home':
                   event.preventDefault();
                   this.setActiveItem(0, visibleItems);
                   break;
              case 'End':
                   event.preventDefault();
                   this.setActiveItem(visibleItems.length - 1, visibleItems);
                   break;
              default:
                 // Allow typing in the input
                 return;
         }
     }

    private setActiveItem(index: number, itemsToUse?: AppCommandItem[]) {
         const items = itemsToUse || this.items.filter(item => !item.hidden && !item.disabled); // Use disabled property
         items.forEach((item, i) => {
             item.toggleAttribute('data-active', i === index);
             item.setAttribute('aria-selected', String(i === index));
         });
         if (index > -1 && items[index]) {
             items[index].scrollIntoView({ block: 'nearest' });
             this.inputElement?.setAttribute('aria-activedescendant', items[index].id || '');
         } else {
             this.inputElement?.removeAttribute('aria-activedescendant');
         }
    }

     private selectItem(item: AppCommandItem): void {
         const value = item.value;
         this.dispatchEvent(new CustomEvent('select', {
             detail: { value, element: item },
             bubbles: true,
             composed: true
         }));
         // Optional: Clear input after selection?
         // if (this.inputElement) this.inputElement.value = '';
         // this.currentFilter = '';
         // this.applyFilter();
     }

    private applyFilter(): void {
        let hasVisibleItems = false;
        const shouldFilter = this.hasAttribute('filter-locally');

        if (!this.items) return;

        this.items.forEach((item, index) => {
            // Ensure item has an ID for aria-activedescendant
            if (!item.id) item.id = `command-item-${Date.now()}-${index}`; // Ensure unique ID

            const itemText = item.filterText?.toLowerCase() || item.textContent?.toLowerCase() || '';
            const isMatch = !shouldFilter || itemText.includes(this.currentFilter);
            item.hidden = !isMatch;
            if (isMatch) hasVisibleItems = true;
        });

        // Show/hide groups based on whether they contain visible items
        this.groups.forEach(group => {
             // Check items *directly assigned* to the group in the light DOM
             const groupItems = Array.from(group.children).filter(el => el instanceof AppCommandItem) as AppCommandItem[];
             const hasVisibleGroupItems = groupItems.some(item => !item.hidden);
             group.hidden = !hasVisibleGroupItems;
              // Also check if the group itself contains the filter text in its heading
             // const groupHeading = group.getAttribute('heading')?.toLowerCase() || '';
             // if (shouldFilter && groupHeading.includes(this.currentFilter)) {
             //     group.hidden = false; // Show group if heading matches, even if items don't (might be confusing)
             //     // If showing group due to heading match, ensure all its items are visible *if filtering locally*
             //     // groupItems.forEach(item => item.hidden = false); // This might override item filtering - careful!
             // }
        });

         // Recalculate overall visibility after potentially hiding groups
         hasVisibleItems = this.items.some(item => !item.hidden);


        this.updateEmptyState(hasVisibleItems);
        // Reset active item on filter change
        this.setActiveItem(-1);
    }

     public updateEmptyState(forceHasVisible?: boolean): void { // Allow forcing visible state
         const hasVisibleItems = forceHasVisible ?? this.items.some(item => !item.hidden);
         const isLoading = this.hasAttribute('loading');
         this.toggleAttribute('data-empty', !isLoading && !hasVisibleItems);
    }

    // --- Public Methods ---
    filterItems(searchTerm: string): void {
        if (this.inputElement) this.inputElement.value = searchTerm; // Update input visually
        this.currentFilter = searchTerm.toLowerCase();
        this.setAttribute('value', searchTerm);
        this.applyFilter();
    }

     setLoading(isLoading: boolean): void {
        this.toggleAttribute('loading', isLoading);
        // attributeChangedCallback handles updating empty state display logic
     }
}


// Define AppCommand last, after its dependencies
if (!customElements.get('app-command')) {
    customElements.define('app-command', AppCommand);
}