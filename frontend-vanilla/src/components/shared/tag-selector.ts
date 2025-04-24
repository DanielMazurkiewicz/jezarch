import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';
import api from '../../lib/api'; // For fetching tags if needed
import type { Tag } from '../../../../backend/src/functionalities/tag/models'; // Adjust path
// Import specific component types needed
import type { AppPopover } from '../ui/app-popover';
import type { AppCommand, AppCommandItem } from '../ui/app-command';
import type { AppButton } from '../ui/app-button';
import type { AppBadge } from '../ui/app-badge';
import type { ErrorDisplay } from '../ui/error-display'; // Import error display
// Import definitions to ensure they are loaded
import '../ui/app-popover';
import '../ui/app-command';
import '../ui/app-button';
import '../ui/app-badge';
import '../ui/error-display'; // Ensure error display is defined
import '../ui/loading-spinner'; // Ensure loading spinner is defined

export class TagSelector extends BaseComponent {
    static observedAttributes = ['selected-ids', 'disabled', 'available-tags']; // Observe available-tags

    private _selectedTagIds: number[] = [];
    private _availableTags: Tag[] = [];
    private isLoading: boolean = false;
    private error: string | null = null;
    // Use imported types
    private _popover: AppPopover | null = null; // Renamed to avoid conflict
    private triggerButton: AppButton | null = null;
    private command: AppCommand | null = null;
    private badgeContainer: HTMLElement | null = null;
    // Flag to track if availableTags were set externally
    private _tagsSetExternally: boolean = false;

    // --- Properties with Getters/Setters ---

    get selectedTagIds(): number[] { return this._selectedTagIds; }
    set selectedTagIds(ids: number[] | string) {
        let newIds: number[] = [];
        if (typeof ids === 'string') {
            try {
                const parsed = JSON.parse(ids);
                if (Array.isArray(parsed) && parsed.every(id => typeof id === 'number')) {
                    newIds = parsed;
                } else { console.warn("TagSelector: Invalid string format for selected-ids. Expected JSON array of numbers."); }
            } catch (e) { console.warn("TagSelector: Failed to parse selected-ids string:", e); }
        } else if (Array.isArray(ids)) {
            newIds = ids.filter(id => typeof id === 'number');
        }

        const sortedIds = newIds.sort((a, b) => a - b);
        const changed = JSON.stringify(this._selectedTagIds) !== JSON.stringify(sortedIds);

        if (changed) {
            this._selectedTagIds = sortedIds;
            this.reflectSelectedIdsAttribute();
            this.updateDisplay();
            this.updateCommandItems(); // Update checks in dropdown
            // Ensure event name matches listener in NoteEditor/etc.
            this.dispatchEvent(new CustomEvent('tag-selection-change', {
                detail: { selectedIds: this._selectedTagIds },
                bubbles: true,
                composed: true
            }));
        }
    }

    // Allow setting available tags programmatically (e.g., from parent component)
    set availableTags(tags: Tag[] | string) {
        if (typeof tags === 'string') {
            try { this._availableTags = JSON.parse(tags); }
            catch(e) { console.error("TagSelector: Failed to parse available-tags attribute.", e); this._availableTags = []; }
        } else {
            this._availableTags = Array.isArray(tags) ? tags : [];
        }
        this._tagsSetExternally = true; // Mark as externally set
        this.isLoading = false; // Assume loaded if set programmatically
        this.error = null;
        this.updateCommandItems();
        this.updateDisplay(); // Update badges based on new available tags
    }
    get availableTags(): Tag[] { return this._availableTags; }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(isDisabled: boolean) { this.toggleAttribute('disabled', isDisabled); }

    // --- Component Lifecycle & Rendering ---

    protected get styles(): string {
        return `
            :host { display: block; }
            /* Part for styling the trigger button from outside */
            :host #trigger-button, ::part(trigger-button) {
                width: 100%;
                justify-content: space-between;
                text-align: left;
                font-weight: normal;
                height: 2.25rem; /* Match input height */
                /* Add default outline styles */
                border: 1px solid var(--color-input-border, #cbd5e0);
                background-color: var(--color-input-bg, white);
                color: var(--color-foreground, #1a202c);
                box-shadow: var(--shadow-sm);
            }
             :host #trigger-button:hover, ::part(trigger-button):hover {
                 border-color: var(--color-input-border); /* Keep border same */
                 background-color: var(--color-muted); /* Subtle hover */
             }
              :host #trigger-button span { /* Ensure text doesn't overflow */
                 flex-grow: 1; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
             }
              /* Style trigger button placeholder text */
              :host #trigger-button span[data-placeholder="true"] {
                 color: var(--color-muted-foreground);
              }

            .badge-container {
                 display: flex;
                 flex-wrap: wrap;
                 gap: var(--spacing-1);
                 padding: var(--spacing-1); /* Add padding */
                 margin-top: var(--spacing-1); /* Add margin */
                 min-height: 2.5rem; /* min-h-10, adjusted */
                 border: 1px solid var(--color-border); /* Add border */
                 background-color: var(--color-background); /* Use standard background */
                 border-radius: var(--radius);
                 max-height: 100px; /* Limit height */
                 overflow-y: auto;
             }
             /* Adjust popover content width */
             app-popover::part(content) { /* Assuming AppPopover uses parts */
                width: var(--trigger-width); /* Use variable set by JS */
                min-width: 200px;
                padding: 0 !important; /* Override default padding for command */
             }
             /* Ensure command input is visible */
             app-command { max-height: 400px; }
             app-badge { flex-shrink: 0; } /* Prevent badges shrinking weirdly */
             app-badge app-button { /* Style the close button inside badge */
                 margin-left: var(--spacing-1);
                 padding: 1px;
                 line-height: 0;
                 height: auto;
                 width: auto;
                 border-radius: 50%;
                 color: var(--color-muted-foreground);
             }
              app-badge app-button:hover {
                  background-color: hsla(from var(--color-foreground) h s l / 0.1);
                  color: var(--color-foreground);
              }
              .placeholder-text { font-size: 0.75rem; color: var(--color-muted-foreground); font-style: italic; padding: var(--spacing-1); }
              .error-container { padding: var(--spacing-1); } /* Style error display container */
        `;
    }

    protected get template(): string {
        const chevronsUpDownIcon = typeof icons.chevronsUpDown === 'function' ? icons.chevronsUpDown() : icons.chevronsUpDown ?? '';
        // Popover contains the command palette for selection
        return `
            <app-popover id="popover">
                <app-button slot="trigger" variant="outline" class="trigger-button" id="trigger-button" aria-label="Select tags" part="trigger-button"> <!-- Add part -->
                    <span id="button-text" data-placeholder="true">Select tags...</span>
                    ${chevronsUpDownIcon}
                </app-button>
                <app-command slot="content" id="command" filter-locally placeholder="Search tags...">
                     <!-- Items added dynamically -->
                     <div slot="empty">No tags found.</div>
                     <div slot="loading"><loading-spinner size="sm"></loading-spinner> Loading...</div>
                 </app-command>
            </app-popover>
            <div class="badge-container"></div>
             <div class="error-container"> <!-- Container for error -->
                <error-display id="error-display" hidden></error-display>
             </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        // Use imported types
        this._popover = this.qs<AppPopover>('#popover');
        this.triggerButton = this.qs<AppButton>('#trigger-button');
        this.command = this.qs<AppCommand>('#command');
        this.badgeContainer = this.qs('.badge-container') as HTMLElement; // Assert type

        // Parse initial selected-ids
        this.selectedTagIds = this.getAttribute('selected-ids') || '[]';
        // Check if available-tags was set via attribute
        if (this.hasAttribute('available-tags')) {
             this.availableTags = this.getAttribute('available-tags') || '[]';
        }
        this.updateDisabledState(); // Set initial disabled state

        // Fetch only if tags weren't provided programmatically or via attribute
        if (!this._tagsSetExternally) {
             this.fetchAvailableTags();
        } else {
             // If tags were provided, render immediately
             this.updateCommandItems();
             this.updateDisplay();
        }


         // Set popover width based on trigger width
         this.setPopoverWidth();
         window.addEventListener('resize', this.setPopoverWidth);
         // Add event listeners *after* potentially fetching tags
         this.addEventListeners();
    }

     disconnectedCallback() {
         super.disconnectedCallback();
         window.removeEventListener('resize', this.setPopoverWidth);
         // Listeners removed by base class
    }


    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (name === 'selected-ids' && oldValue !== newValue) {
             this.selectedTagIds = newValue || '[]';
        }
        if (name === 'available-tags' && oldValue !== newValue) {
            this.availableTags = newValue || '[]'; // Update available tags if attribute changes
        }
        if (name === 'disabled') {
            this.updateDisabledState();
        }
    }

    addEventListeners(): void {
        this.registerListener(this.command, 'select', this.handleTagSelect);
        this.registerListener(this.badgeContainer, 'click', this.handleBadgeRemoveClick);
    }
    // removeEventListeners handled by BaseComponent


     private setPopoverWidth = () => {
        if (this.triggerButton && this._popover) {
            const width = this.triggerButton.offsetWidth;
            this._popover.style.setProperty('--trigger-width', `${width}px`);
        }
    }

    // --- Data Fetching ---
    private async fetchAvailableTags() {
        if (this._tagsSetExternally || this._availableTags.length > 0 || this.isLoading) return; // Don't fetch if set externally or already have tags

        this.isLoading = true;
        this.error = null;
        this.updateErrorDisplay();
        this.command?.setLoading(true);
        this.updateCommandItems(); // Show loading state in command
        this.updateDisplay(); // Update button text

        try {
            const fetchedTags = await api.getAllTags();
            this.availableTags = fetchedTags.sort((a, b) => a.name.localeCompare(b.name));
        } catch (err: any) {
            this.error = err.message || "Failed to load tags";
            console.error("TagSelector fetch error:", this.error);
            this.availableTags = []; // Ensure it's an empty array on error
        } finally {
            this.isLoading = false;
            this.command?.setLoading(false);
            this.updateCommandItems(); // Update with fetched tags or empty state
            this.updateDisplay(); // Update button/badges
            this.updateErrorDisplay(); // Show/hide error message
        }
    }

    // --- Event Handlers ---
    private handleTagSelect = (event: Event) => {
        if (this.disabled) return; // Prevent selection if disabled
        const customEvent = event as CustomEvent;
        const selectedValue = customEvent.detail.value; // The 'value' of app-command-item is the tag ID string
        const tagId = parseInt(selectedValue, 10);

        if (!isNaN(tagId)) {
             let newSelectedIds;
             if (this._selectedTagIds.includes(tagId)) {
                 newSelectedIds = this._selectedTagIds.filter(id => id !== tagId);
             } else {
                 newSelectedIds = [...this._selectedTagIds, tagId];
             }
             this.selectedTagIds = newSelectedIds; // Use setter to update state and trigger events/renders
        }
         // Keep popover open after selection for multi-select
         // this._popover?.hide();
    }

     private handleBadgeRemoveClick = (event: MouseEvent) => {
        if (this.disabled) return; // Prevent removal if disabled
        const target = event.target as HTMLElement;
        // Use imported type
        const button = target.closest<AppButton>('app-button[data-tag-id]');
        if (button) {
            const tagIdToRemove = parseInt(button.dataset.tagId || '', 10);
            if (!isNaN(tagIdToRemove)) {
                this.selectedTagIds = this._selectedTagIds.filter(id => id !== tagIdToRemove);
            }
        }
     }

    // --- Rendering & Updates ---

    private reflectSelectedIdsAttribute() {
        // Store sorted array as JSON string
        this.setAttribute('selected-ids', JSON.stringify(this._selectedTagIds));
    }

    private updateDisplay() {
        this.updateButtonText();
        this.renderBadges();
    }

    private updateButtonText() {
        const buttonTextEl = this.shadowRoot?.querySelector('#button-text');
        if (!buttonTextEl) return;

        let textContent = 'Select tags...';
        let isPlaceholder = true;

        if (this.isLoading) {
            textContent = 'Loading tags...';
            isPlaceholder = false;
        } else if (this.error) {
            textContent = 'Error loading tags';
            isPlaceholder = false;
        } else if (this._selectedTagIds.length === 1) {
            const selectedTag = this._availableTags.find(t => t.tagId === this._selectedTagIds[0]);
            textContent = selectedTag?.name || `ID: ${this._selectedTagIds[0]}`;
            isPlaceholder = false;
        } else if (this._selectedTagIds.length > 1) {
            textContent = `${this._selectedTagIds.length} tags selected`;
            isPlaceholder = false;
        }

        buttonTextEl.textContent = textContent;
        buttonTextEl.setAttribute('data-placeholder', String(isPlaceholder));
    }

    private renderBadges() {
        if (!this.badgeContainer) return;
        this.badgeContainer.innerHTML = ''; // Clear existing badges

        if (this.isLoading) {
            this.badgeContainer.innerHTML = `<span class="placeholder-text">Loading...</span>`;
            return;
        }
        // Error display is handled separately

        const selectedTags = this._availableTags.filter(tag => this._selectedTagIds.includes(tag.tagId!));
        const xIconStr = typeof icons.x === 'function' ? icons.x() : icons.x ?? 'X';

        if (selectedTags.length > 0) {
             selectedTags.sort((a, b) => a.name.localeCompare(b.name)).forEach(tag => {
                const badge = this.createElement('app-badge') as AppBadge;
                badge.variant = 'secondary';
                const badgeText = this.createElement('span'); // Wrap text
                badgeText.textContent = tag.name;
                badge.appendChild(badgeText);

                const removeButton = this.createElement('app-button') as AppButton;
                removeButton.variant = 'ghost';
                removeButton.size = 'icon'; // Make it small
                removeButton.dataset.tagId = String(tag.tagId);
                removeButton.innerHTML = xIconStr; // Render icon string
                removeButton.style.cssText = 'height: auto; width: auto; padding: 1px; margin-left: var(--spacing-1);'; // Inline style for simplicity
                removeButton.setAttribute('aria-label', `Remove ${tag.name} tag`);
                 // Disable remove button if the whole component is disabled
                if (this.disabled) removeButton.disabled = true;

                badge.appendChild(removeButton);
                this.badgeContainer?.appendChild(badge);
            });
        } else {
             // Add placeholder if no tags selected
             this.badgeContainer.innerHTML = `<span class="placeholder-text">No tags selected</span>`;
        }
    }

    private updateCommandItems() {
        if (!this.command) return;

        // Clear existing items first (important!)
        const existingItems = this.command.querySelectorAll('app-command-item');
        existingItems.forEach(item => item.remove());

        if (this.isLoading || this.error) {
            // Loading/error state handled by command's slots
            this.command.setLoading(this.isLoading);
            this.command.updateEmptyState(!this.isLoading && !!this.error); // Show empty if error
            return;
        }

        this.command.setLoading(false);
        const checkIconStr = typeof icons.check === 'function' ? icons.check() : icons.check ?? '✓';

        this._availableTags.forEach(tag => {
            // Use imported type
            const item = document.createElement('app-command-item') as AppCommandItem;
            item.setAttribute('value', String(tag.tagId)); // Store ID as value using setAttribute
            item.textContent = tag.name;
            // Add checkmark if selected
            if (this._selectedTagIds.includes(tag.tagId!)) {
                 const checkIcon = document.createElement('span');
                 checkIcon.innerHTML = checkIconStr; // Render icon string
                 checkIcon.slot = "icon-left"; // Assuming app-command-item supports icon slots
                 checkIcon.style.opacity = "1"; // Make check visible
                 item.prepend(checkIcon); // Add check icon
                 item.setAttribute('aria-selected', 'true');
                 item.setAttribute('data-active', ''); // Mark as active for potential styling
            } else {
                 // Add placeholder for alignment if needed, or adjust item style
                 const placeholder = document.createElement('span');
                 placeholder.style.width = '1rem'; // Same width as icon
                 placeholder.style.display = 'inline-block';
                 placeholder.slot="icon-left";
                 item.prepend(placeholder);
                 item.setAttribute('aria-selected', 'false');
                 item.removeAttribute('data-active'); // Remove active marker
            }
            this.command?.appendChild(item);
        });
         this.command.updateEmptyState(this._availableTags.length === 0); // Update empty state based on results
    }

    private updateDisabledState() {
        const isDisabled = this.disabled;
        this.triggerButton?.toggleAttribute('disabled', isDisabled);
        // Disable remove buttons on badges
        this.shadow.querySelectorAll<AppButton>('.badge-container app-button').forEach(btn => btn.disabled = isDisabled);
     }

     private updateErrorDisplay() {
        const errorDisplay = this.qsOptional<ErrorDisplay>('#error-display');
        if (errorDisplay) {
            errorDisplay.message = this.error;
            errorDisplay.hidden = !this.error;
        }
     }
}

// Define the component unless already defined
if (!customElements.get('tag-selector')) {
    customElements.define('tag-selector', TagSelector);
}