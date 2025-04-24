import { BaseComponent } from '../base-component';
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import { formatDate, escapeHtml } from '../../lib/utils'; // Import escapeHtml
// Import component definitions to ensure they are loaded
import '../ui/app-dialog';
import '../ui/app-badge';
import '../ui/app-button';
// Import type if needed
import type { AppDialog } from '../ui/app-dialog';

export class NotePreviewDialog extends BaseComponent {
    private _note: NoteWithDetails | null = null;
    private dialog: AppDialog | null = null;

    set note(value: NoteWithDetails | null) {
        this._note = value;
        this.updateContent(); // Update dialog content when note changes
    }
    get note(): NoteWithDetails | null { return this._note; }

    set open(isOpen: boolean) {
        if (this.dialog) this.dialog.open = isOpen;
    }
    get open(): boolean {
        return this.dialog?.open ?? false;
    }

    protected get styles(): string {
        return `
            :host { display: contents; } /* Let dialog handle layout */
            .dialog-description {
                 font-size: 0.875rem;
                 color: var(--color-muted-foreground);
                 padding-bottom: var(--spacing-2);
            }
            .tags-container {
                 display: flex;
                 flex-wrap: wrap;
                 gap: var(--spacing-1);
                 padding-top: var(--spacing-2);
                 border-top: 1px solid var(--color-border); /* Separator */
                 margin-top: var(--spacing-2);
             }
             .note-content {
                 font-family: var(--font-sans); /* Ensure standard font */
                 white-space: pre-wrap; /* Preserve whitespace and wrap */
                 font-size: 0.875rem; /* text-sm */
                 line-height: 1.5;
                 max-height: 60vh; /* Limit height */
                 overflow-y: auto; /* Scroll if needed */
                 padding: var(--spacing-1); /* Small padding */
             }
              .note-content i { /* Style for empty content */
                   color: var(--color-muted-foreground);
                   font-style: normal;
              }
             .dialog-footer {
                 display: flex; /* Use flex for footer layout */
                 justify-content: flex-end; /* Push button right */
             }
             .header-content {
                padding-bottom: var(--spacing-2);
                border-bottom: 1px solid var(--color-border);
                margin-bottom: var(--spacing-3);
             }
             pre { margin: 0; }
             code { display: block; font-family: inherit; } /* Inherit font, don't force mono */
        `;
    }

    // Content is rendered dynamically into the dialog slots
    protected get template(): string {
        return `<app-dialog id="preview-dialog" size="lg"></app-dialog>`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.dialog = this.qs<AppDialog>('#preview-dialog');
        this.addEventListeners(); // Add listeners specific to this component
        this.dialog?.addEventListener('close', () => {
             this.dispatchEvent(new CustomEvent('close')); // Forward close event
             // Clean up note data when dialog closes
             this.note = null;
        });
        this.updateContent(); // Initial content render
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Base class removes listeners
    }

    // Listeners specific to buttons inside the dialog's dynamic content
    addEventListeners(): void {
        // No static listeners needed here, they are added in updateContent
    }

    removeEventListeners(): void {
        // No static listeners to remove here
    }

    private updateContent(): void {
        if (!this.dialog || !this.isConnected) return;

        if (!this._note) {
            this.dialog.innerHTML = ''; // Clear if no note
            return;
        }

        const tagsHtml = (this._note.tags || [])
            .map(tag => `<app-badge variant="secondary">${escapeHtml(tag.name)}</app-badge>`)
            .join('');

        const safeContent = this._note.content ? escapeHtml(this._note.content) : '<i>No content.</i>';

        this.dialog.innerHTML = `
            <div slot="header" class="header-content">
                 <h2 class="dialog-title">${escapeHtml(this._note.title)}</h2>
                 <p class="dialog-description">
                     By ${escapeHtml(this._note.ownerLogin ?? 'Unknown')} on ${formatDate(this._note.createdOn)}
                     ${this._note.shared ? '<app-badge variant="outline" style="margin-left: 8px;">Shared</app-badge>' : ''}
                 </p>
                 ${tagsHtml ? `<div class="tags-container">${tagsHtml}</div>` : ''}
             </div>

             <pre class="note-content"><code>${safeContent}</code></pre>

            <div slot="footer" class="dialog-footer">
                 <app-button variant="outline" id="close-preview-button">Close</app-button>
             </div>
        `;

        // Re-attach listener for the new close button
        this.dialog.querySelector('#close-preview-button')?.addEventListener('click', () => {
            this.open = false;
        });
    }

    // --- Public Methods ---
    show(note: NoteWithDetails): void {
        this.note = note;
        this.open = true;
    }
    hide(): void {
        this.open = false;
        // Keep note data until the close event listener clears it
    }
}

// Define the component unless already defined
if (!customElements.get('note-preview-dialog')) {
    customElements.define('note-preview-dialog', NotePreviewDialog);
}