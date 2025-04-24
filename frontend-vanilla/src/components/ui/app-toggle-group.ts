import { BaseComponent } from '../base-component';

// --- Toggle Group Item Definition ---
export class AppToggleGroupItem extends BaseComponent {
    static observedAttributes = ['value', 'disabled', 'pressed'];

    private buttonElement: HTMLButtonElement | null = null;

    constructor() {
        super();
        this.handleSelfClick = this.handleSelfClick.bind(this);
    }

     // Use button styles directly by setting button tag in template
     protected get styles(): string { return `
        :host { display: inline-flex; } /* Needed for layout within group */
        /* Button inherits styles from parent group via ::slotted */
        button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-1);
            border: none; /* Reset button border */
            background: none; /* Reset button background */
            padding: 0; /* Reset button padding */
            margin: 0; /* Reset button margin */
            font: inherit; /* Inherit font */
            cursor: pointer;
            height: 100%; /* Fill host height */
            width: 100%; /* Fill host width */
            color: inherit; /* Inherit color */
            outline: none; /* Remove outline, parent group might handle focus */
            /* Inherit radius, border etc from parent ::slotted */
             border-radius: inherit;
             border: inherit;
             background-color: inherit;
             box-shadow: inherit;
             transition: inherit;
        }
        /* Apply hover/active styles directly to the button within the shadow dom if needed */
         /* button:hover { ... } */
         /* button:active { ... } */
     `; }

    protected get template(): string {
        // Using a plain button inside, styled by the parent group via ::slotted
        return `<button type="button" role="radio" aria-pressed="false"><slot></slot></button>`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.buttonElement = this.shadow.querySelector('button');
        this.updateItemAttributes(); // Set initial attributes
    }

     attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (this.buttonElement) {
            this.updateItemAttributes();
        }
     }

     addEventListeners() {
         this.buttonElement?.addEventListener('click', this.handleSelfClick);
     }
     removeEventListeners() {
         this.buttonElement?.removeEventListener('click', this.handleSelfClick);
     }

     private handleSelfClick() {
         if (this.disabled) return;
         // Don't toggle 'pressed' directly, let the group handle it
         // Dispatch event to notify the parent group
         this.dispatchEvent(new CustomEvent('toggle-item-click', {
             detail: {
                 value: this.value,
                 pressed: !this.pressed // Signal the *intended* new state
             },
             bubbles: true, // Bubble up to the group
             composed: true // Cross shadow boundary
         }));
     }


     // --- Properties with Getters/Setters ---
     get value(): string | null { return this.getAttribute('value'); }
     set value(val: string | null) { if (val === null) this.removeAttribute('value'); else this.setAttribute('value', val); }

     get disabled(): boolean { return this.hasAttribute('disabled'); }
     set disabled(isDisabled: boolean) { this.toggleAttribute('disabled', isDisabled); }

     get pressed(): boolean { return this.hasAttribute('pressed'); }
     set pressed(isPressed: boolean) { this.toggleAttribute('pressed', isPressed); }


     private updateItemAttributes(): void {
         if (!this.buttonElement) return;
         const isDisabled = this.hasAttribute('disabled');
         const isPressed = this.hasAttribute('pressed');
         const value = this.getAttribute('value');
         const parentGroup = this.closest('app-toggle-group'); // Check parent type
         const role = parentGroup?.type === 'single' ? 'radio' : 'checkbox';

         this.buttonElement.setAttribute('role', role); // Set role based on parent type
         this.buttonElement.setAttribute('aria-pressed', String(isPressed));
         this.setAttribute('aria-pressed', String(isPressed)); // Reflect on host for ::slotted selector
         this.setAttribute('aria-disabled', String(isDisabled)); // Reflect on host for ::slotted selector

         if (value !== null) this.buttonElement.setAttribute('value', value);
         else this.buttonElement.removeAttribute('value');

         // Sync native disabled property - ESSENTIAL for preventing clicks
         this.buttonElement.disabled = isDisabled;
     }
}

// Define Item element immediately
if (!customElements.get('app-toggle-group-item')) {
    customElements.define('app-toggle-group-item', AppToggleGroupItem);
}


// --- Toggle Group Container ---
type ToggleGroupType = 'single' | 'multiple';
export class AppToggleGroup extends BaseComponent {
    static observedAttributes = ['value', 'type', 'disabled'];

    private _value: string | string[] | null = null;
    private _type: ToggleGroupType = 'single';
    private _disabled: boolean = false;

    constructor() {
        super();
        this._value = this._type === 'multiple' ? [] : null; // Initialize based on default type
        // Bind methods
        this.handleSlotChange = this.handleSlotChange.bind(this);
        this.handleItemClick = this.handleItemClick.bind(this);
    }

    protected get styles(): string {
        return `
            :host {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: var(--spacing-1, 0.25rem);
                /* Inherit styles or add specific background/border if needed */
                 /* background-color: var(--color-muted); */
                 /* padding: 3px; */
                 /* border-radius: var(--radius); */
            }
            ::slotted(app-toggle-group-item) {
                /* Apply base button styles, outline variant by default */
                --base-height: 2.25rem; /* Default button height */
                --base-padding-x: var(--spacing-3);
                --base-font-size: 0.875rem;
                --base-radius: calc(var(--radius) - 2px);

                height: var(--base-height);
                padding: 0 var(--base-padding-x);
                font-size: var(--base-font-size);
                border-radius: var(--base-radius);

                border: 1px solid var(--color-input-border);
                background-color: var(--color-background);
                color: var(--color-muted-foreground);
                box-shadow: var(--shadow-sm);
                /* Remove default toggle item focus ring if group manages focus */
                outline: none;
                transition: background-color 150ms, color 150ms, border-color 150ms; /* Add transitions */
            }
            :host([size="sm"]) ::slotted(app-toggle-group-item) {
                --base-height: 2rem;
                 --base-padding-x: var(--spacing-2);
                 --base-font-size: 0.8rem;
            }
            :host([size="lg"]) ::slotted(app-toggle-group-item) {
                 --base-height: 2.5rem;
                 --base-padding-x: var(--spacing-4);
            }

            ::slotted(app-toggle-group-item:hover:not([aria-disabled="true"]):not([aria-pressed="true"])) {
                 background-color: var(--color-secondary);
                 color: var(--color-secondary-foreground);
             }
             /* Pressed state */
             ::slotted(app-toggle-group-item[aria-pressed="true"]) {
                 background-color: var(--color-primary); /* Use primary for selected */
                 color: var(--color-primary-foreground);
                 border-color: var(--color-primary);
             }
              /* Disabled state */
             ::slotted(app-toggle-group-item[aria-disabled="true"]) {
                 opacity: 0.5;
                 cursor: not-allowed;
                 pointer-events: none;
             }
             /* Focus state for the group container */
             :host(:focus-within) {
                /* Optional: Add focus ring to the group */
                 /* box-shadow: 0 0 0 2px var(--color-ring); */
             }
        `;
    }

    protected get template(): string {
        const role = this.type === 'single' ? 'radiogroup' : 'group';
        return `<div role="${role}"><slot></slot></div>`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.upgradeProperties();
        this.shadow.querySelector('slot')?.addEventListener('slotchange', this.handleSlotChange);
        this.addEventListener('toggle-item-click', this.handleItemClick as EventListener); // Cast needed
        this.handleSlotChange(); // Initial setup
    }

     disconnectedCallback() {
        super.disconnectedCallback();
        this.shadow.querySelector('slot')?.removeEventListener('slotchange', this.handleSlotChange);
        this.removeEventListener('toggle-item-click', this.handleItemClick as EventListener);
    }

     // Ensure properties reflect attributes if set before upgrade
    private upgradeProperties() {
         // TYPE
         if (this.hasAttribute('type')) { this._type = (this.getAttribute('type') as ToggleGroupType) || 'single'; }
         // VALUE
         this.parseValueAttribute(); // Parse initial value from attribute
         // DISABLED
         this._disabled = this.hasAttribute('disabled');
     }

     get value(): string | string[] | null { return this._value; }
     set value(newValue: string | string[] | null) {
         const valueChanged = JSON.stringify(this._value) !== JSON.stringify(newValue);
         if (valueChanged) {
             this._value = newValue;
             this.reflectValueAttribute();
             this.updateItemStates();
             this.dispatchEvent(new CustomEvent('change', { detail: { value: this._value }, bubbles: true, composed: true }));
         }
     }

     get type(): ToggleGroupType { return this._type; }
     set type(newType: ToggleGroupType) {
         if (this._type !== newType) {
             this._type = newType;
             this.setAttribute('type', newType);
             // Reset value when type changes
             this.value = newType === 'multiple' ? [] : null;
              // Update role of container
              const container = this.shadowRoot?.querySelector('div');
              if (container) container.setAttribute('role', newType === 'single' ? 'radiogroup' : 'group');
              // Update roles of children
              this.updateItemRoles();
         }
     }

     get disabled(): boolean { return this._disabled; }
     set disabled(isDisabled: boolean) {
         if (this._disabled !== isDisabled) {
             this._disabled = isDisabled;
             this.toggleAttribute('disabled', isDisabled);
             this.updateItemDisabledStates();
         }
     }

     attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
         super.attributeChangedCallback(name, oldValue, newValue);
         if (oldValue === newValue) return;
         switch (name) {
             case 'type':
                 this.type = (newValue as ToggleGroupType) || 'single';
                 break;
             case 'value':
                 this.parseValueAttribute(newValue);
                 break;
             case 'disabled':
                 this.disabled = newValue !== null;
                 break;
         }
     }

     private handleSlotChange(): void {
         this.updateItemStates();
         this.updateItemDisabledStates();
         this.updateItemRoles(); // Ensure roles are correct after slot change
     }

    private handleItemClick(event: Event): void {
         const customEvent = event as CustomEvent;
         const itemValue = customEvent.detail.value;
         const itemPressed = customEvent.detail.pressed; // New pressed state *after* click

         if (!itemValue) return;

         if (this.type === 'single') {
             this.value = itemPressed ? itemValue : null;
         } else { // Multiple
             const currentValues = Array.isArray(this._value) ? this._value : [];
             if (itemPressed) { // Add value
                 if (!currentValues.includes(itemValue)) {
                     this.value = [...currentValues, itemValue];
                 }
             } else { // Remove value
                 this.value = currentValues.filter(v => v !== itemValue);
             }
         }
     }

     private getItems(): AppToggleGroupItem[] {
        const slot = this.shadowRoot?.querySelector('slot');
        return slot?.assignedElements({ flatten: true }).filter(el => el instanceof AppToggleGroupItem) as AppToggleGroupItem[] || [];
     }

    private updateItemStates(): void {
         const items = this.getItems();
         items.forEach(item => {
             const itemValue = item.value;
             if (!itemValue) return;

             let isPressed = false;
             if (this.type === 'single') {
                 isPressed = this._value === itemValue;
             } else if (Array.isArray(this._value)) {
                 isPressed = this._value.includes(itemValue);
             }
             item.pressed = isPressed; // Set pressed property on item
         });
     }

     private updateItemDisabledStates(): void {
         const items = this.getItems();
         items.forEach(item => {
             item.disabled = this._disabled; // Propagate group disabled state
         });
     }

      private updateItemRoles(): void {
          const items = this.getItems();
          const role = this.type === 'single' ? 'radio' : 'checkbox';
          items.forEach(item => {
             // Access the button inside the item's shadow DOM
             const button = item.shadowRoot?.querySelector('button');
             button?.setAttribute('role', role);
          });
      }

     // --- Value Attribute Handling ---
     private reflectValueAttribute() {
         if (this.type === 'single') {
             if (this._value) {
                 this.setAttribute('value', String(this._value));
             } else {
                 this.removeAttribute('value');
             }
         } else { // Multiple
             if (Array.isArray(this._value) && this._value.length > 0) {
                 this.setAttribute('value', JSON.stringify(this._value)); // Store array as JSON string
             } else {
                 this.removeAttribute('value');
             }
         }
     }

     private parseValueAttribute(attrValue: string | null = this.getAttribute('value')) {
         let newValue: string | string[] | null = null;
         if (attrValue !== null) {
             if (this.type === 'single') {
                 newValue = attrValue;
             } else { // Multiple - try parsing JSON
                 try {
                     const parsed = JSON.parse(attrValue);
                     if (Array.isArray(parsed)) {
                         newValue = parsed.map(String); // Ensure strings
                     } else {
                         console.warn(`ToggleGroup (multiple): Invalid JSON in value attribute: ${attrValue}`);
                         newValue = [];
                     }
                 } catch (e) {
                     console.warn(`ToggleGroup (multiple): Failed to parse value attribute: ${attrValue}`, e);
                     newValue = [];
                 }
             }
         } else {
              newValue = this.type === 'multiple' ? [] : null;
         }

         // Only update internal state if parsed value differs
         if (JSON.stringify(this._value) !== JSON.stringify(newValue)) {
             this._value = newValue;
             this.updateItemStates(); // Sync items after parsing attribute
         }
     }
}

// Define Group element last, after Item
if (!customElements.get('app-toggle-group')) {
    customElements.define('app-toggle-group', AppToggleGroup);
}