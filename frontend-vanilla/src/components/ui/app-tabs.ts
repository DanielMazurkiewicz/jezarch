import { BaseComponent } from '../base-component';

export class AppTabs extends BaseComponent {
    static observedAttributes = ['value']; // Observe active tab value

    private tabsList: HTMLElement | null = null;
    private triggerSlot: HTMLSlotElement | null = null;
    private contentSlot: HTMLSlotElement | null = null;
    private activeValue: string | null = null;

    // Bind method in constructor
    constructor() {
        super();
        this.handleSlotChange = this.handleSlotChange.bind(this);
    }

    protected get styles(): string {
        return `
            :host {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-4, 1rem); /* Space between list and content */
            }
            .tabs-list {
                display: inline-flex; /* Fit content width */
                height: 2.25rem; /* h-9 */
                align-items: center;
                justify-content: center;
                border-radius: var(--radius, 0.5rem);
                background-color: var(--color-muted);
                padding: 3px; /* Inner padding */
                border: 1px solid var(--color-border);
                overflow-x: auto; /* Allow horizontal scroll on small screens */
                 scrollbar-width: thin; /* Firefox */
            }
            /* Hide scrollbar visually */
             .tabs-list::-webkit-scrollbar { height: 4px; }
             .tabs-list::-webkit-scrollbar-track { background: transparent; }
             .tabs-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px;}
             .tabs-list::-webkit-scrollbar-thumb:hover { background: var(--color-muted-foreground); }


            ::slotted(button[slot="trigger"]) {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: var(--spacing-1, 0.25rem);
                white-space: nowrap;
                border-radius: calc(var(--radius) - 2px); /* Slightly smaller radius */
                padding: var(--spacing-1, 0.25rem) var(--spacing-3, 0.75rem); /* py-1 px-3 adjusted */
                font-size: 0.875rem; /* text-sm */
                font-weight: 500; /* font-medium */
                color: var(--color-muted-foreground);
                background-color: transparent;
                border: none; /* Remove default button border */
                cursor: pointer;
                transition: all 150ms ease-out;
                outline: none;
                height: calc(100% - 2px); /* Fill height minus padding */
                flex-shrink: 0; /* Prevent shrinking when scrolling */
            }
            ::slotted(button[slot="trigger"]:hover) {
                color: var(--color-foreground);
            }
            ::slotted(button[slot="trigger"][aria-selected="true"]) {
                background-color: var(--color-background);
                color: var(--color-foreground);
                box-shadow: var(--shadow-sm);
            }
            ::slotted(button[slot="trigger"]:focus-visible) {
                 box-shadow: 0 0 0 2px var(--color-ring);
            }
            ::slotted(button[slot="trigger"]:disabled) {
                 opacity: 0.5;
                 cursor: not-allowed;
            }


            ::slotted([slot="content"]) {
                display: none; /* Hide inactive content panels */
                outline: none;
                flex: 1; /* Allow content to grow if needed */
            }
             ::slotted([slot="content"][data-state="active"]) {
                display: block; /* Show active content panel */
            }
        `;
    }

    protected get template(): string {
        // Uses slots for triggers and content
        return `
            <div class="tabs-list" role="tablist">
                <slot name="trigger"></slot>
            </div>
            <slot name="content"></slot>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.tabsList = this.shadow.querySelector('.tabs-list');
        this.triggerSlot = this.shadow.querySelector('slot[name="trigger"]');
        this.contentSlot = this.shadow.querySelector('slot[name="content"]');
        this.upgradeProperties();
        this.handleSlotChange(); // Initial setup
        this.triggerSlot?.addEventListener('slotchange', this.handleSlotChange);
        this.contentSlot?.addEventListener('slotchange', this.handleSlotChange);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.triggerSlot?.removeEventListener('slotchange', this.handleSlotChange);
        this.contentSlot?.removeEventListener('slotchange', this.handleSlotChange);
        // Remove button listeners if needed (though they are on slotted elements)
    }


    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
         super.attributeChangedCallback(name, oldValue, newValue);
         if (name === 'value' && oldValue !== newValue) {
            this.activeValue = newValue;
            this.updateTabsState();
         }
    }

     // Ensure properties reflect attributes if set before upgrade
    private upgradeProperties() {
         if (this.hasOwnProperty('value')) {
             const value = (this as any).value; // Grab value set before upgrade
             delete (this as any)['value']; // Delete temporary property
             this.value = value; // Set via setter
         } else {
             this.activeValue = this.getAttribute('value'); // Sync internal state
         }
     }

     get value(): string | null {
         return this.activeValue;
     }
     set value(newValue: string | null) {
        const oldValue = this.activeValue;
         if (oldValue !== newValue) {
            if (newValue === null) {
                this.removeAttribute('value');
            } else {
                this.setAttribute('value', newValue);
            }
             // Note: attributeChangedCallback handles the update logic
         }
     }

     // Gets all slotted trigger buttons
    private getTabButtons(): HTMLButtonElement[] {
        return this.triggerSlot?.assignedElements({ flatten: true })
                   .filter(el => el instanceof HTMLButtonElement) as HTMLButtonElement[] ?? [];
    }

    // Gets all slotted content panels
    private getContentPanels(): HTMLElement[] {
        return this.contentSlot?.assignedElements({ flatten: true })
                   .filter(el => el instanceof HTMLElement) as HTMLElement[] ?? [];
    }

    private handleSlotChange(): void {
        this.setupTabs();
    }

    private setupTabs(): void {
        const tabButtons = this.getTabButtons();
        const contentPanels = this.getContentPanels();

        tabButtons.forEach(button => {
            button.setAttribute('role', 'tab');
            // Ensure initial aria-selected state is correct
            button.setAttribute('aria-selected', 'false');
            // Get associated content panel ID
            const value = button.dataset.value;
            if (value) {
                const panelId = `content-${value}`;
                button.setAttribute('aria-controls', panelId);
                 // Remove old listener before adding new one
                 button.removeEventListener('click', this.handleTabClickWrapper);
                 button.addEventListener('click', this.handleTabClickWrapper);
            } else {
                 console.warn("Tab trigger button missing data-value attribute:", button);
            }
        });

        contentPanels.forEach(panel => {
            panel.setAttribute('role', 'tabpanel');
             const value = panel.dataset.value;
             if (value) {
                 panel.id = `content-${value}`; // Set ID for aria-controls
                 panel.setAttribute('aria-labelledby', `trigger-${value}`); // Assume trigger has data-value for ID basis
             } else {
                 console.warn("Tab content panel missing data-value attribute:", panel);
             }
             panel.setAttribute('tabindex', '0'); // Make panel focusable
             panel.dataset.state = 'inactive'; // Initial state
        });

        // Set initial active tab or default to first
        const initialValue = this.getAttribute('value');
        const firstButtonValue = tabButtons[0]?.dataset.value;

        if (initialValue && this.hasTabWithValue(initialValue, tabButtons)) {
             this.activeValue = initialValue;
        } else if (firstButtonValue) {
             this.activeValue = firstButtonValue;
             if (!this.hasAttribute('value')) { // Set attribute only if not already set
                this.setAttribute('value', this.activeValue); // Reflect default
             }
        } else {
            this.activeValue = null; // No tabs found
        }

        this.updateTabsState(); // Apply initial state
    }

    // Wrapper to pass value to handleTabClick
    private handleTabClickWrapper = (event: MouseEvent) => {
         const button = event.currentTarget as HTMLButtonElement;
         if (button.dataset.value) {
             this.handleTabClick(button.dataset.value);
         }
    };

     private hasTabWithValue(value: string, buttons: HTMLButtonElement[]): boolean {
        return buttons.some(button => button.dataset.value === value);
     }

    private handleTabClick(value: string): void {
         this.value = value; // Use setter to trigger attribute update and state change
         // Optionally dispatch a change event
         this.dispatchEvent(new CustomEvent('change', { detail: { value }, bubbles: true, composed: true }));
    }

    private updateTabsState(): void {
        const tabButtons = this.getTabButtons();
        const contentPanels = this.getContentPanels();

        tabButtons.forEach(button => {
            const isSelected = button.dataset.value === this.activeValue;
            button.setAttribute('aria-selected', String(isSelected));
            button.setAttribute('tabindex', isSelected ? '0' : '-1');
             // Optionally add ID for aria-labelledby on panel
             if (!button.id && button.dataset.value) {
                 button.id = `trigger-${button.dataset.value}`;
             }
        });

        contentPanels.forEach(panel => {
            const isActive = panel.dataset.value === this.activeValue;
            panel.dataset.state = isActive ? 'active' : 'inactive';
             // panel.hidden = !isActive; // Alternative using hidden attribute
        });
    }
}

// Define the component unless already defined
if (!customElements.get('app-tabs')) {
    customElements.define('app-tabs', AppTabs);
}