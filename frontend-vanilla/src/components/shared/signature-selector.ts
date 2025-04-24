import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';
import api from '../../lib/api';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
// Import specific component types needed
import type { AppButton } from '../ui/app-button';
import type { AppBadge } from '../ui/app-badge';
import type { AppPopover } from '../ui/app-popover';
import type { AppLabel } from '../ui/app-label';
// Import the specific popover content element - Import class, not just type
import { ElementBrowserPopoverContent } from './element-browser-popover-content';
// Ensure popover content element is defined
import './element-browser-popover-content';
// Import loading spinner definition
import '../ui/loading-spinner';
// Import showToast function
import { showToast } from '../ui/toast-handler';

type ResolvedSignature = { idPath: number[]; display: string };

export class SignatureSelector extends BaseComponent {
    static observedAttributes = ['signatures', 'label', 'disabled'];

    // --- State & Properties ---
    private _signatures: number[][] = []; // Array of ID paths, e.g., [[1, 5], [1, 8, 3]]
    private resolvedSignatures: ResolvedSignature[] = [];
    private isLoadingSignatures: boolean = false;
    // Use imported types
    private _popover: AppPopover | null = null; // Renamed to avoid base class conflict
    private badgeContainer: HTMLElement | null = null;
    private labelElement: AppLabel | null = null;
    private browserContent: ElementBrowserPopoverContent | null = null;

    // Bind methods in constructor
    constructor() {
        super();
        this.handleSignatureAdd = this.handleSignatureAdd.bind(this);
        this.handleBrowserClose = this.handleBrowserClose.bind(this);
        this.handleBadgeRemoveClick = this.handleBadgeRemoveClick.bind(this);
    }

    // --- Properties ---
    get signatures(): number[][] { return this._signatures; }
    set signatures(paths: number[][] | string) {
        let newPaths: number[][] = [];
        if (typeof paths === 'string') {
            try {
                const parsed = JSON.parse(paths);
                if (Array.isArray(parsed) && parsed.every(p => Array.isArray(p) && p.every(id => typeof id === 'number'))) {
                    newPaths = parsed;
                } else { console.warn("SignatureSelector: Invalid string format for signatures. Expected JSON array of number arrays."); }
            } catch (e) { console.warn("SignatureSelector: Failed to parse signatures string:", e); }
        } else if (Array.isArray(paths)) {
            // Basic validation
            newPaths = paths.filter(p => Array.isArray(p) && p.every(id => typeof id === 'number'));
        }

        // Sort outer and inner arrays for consistent comparison/storage
        // IMPORTANT: Don't sort inner paths, order matters for signatures!
        const canonicalPaths = newPaths.map(p => JSON.stringify(p)); // Convert paths to strings for comparison
        const uniqueCanonicalPaths = [...new Set(canonicalPaths)]; // Remove duplicate paths
        const sortedUniquePaths = uniqueCanonicalPaths
            .map(pStr => JSON.parse(pStr) as number[])
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))); // Sort based on string representation

        const changed = JSON.stringify(this._signatures) !== JSON.stringify(sortedUniquePaths);


        if (changed) {
            this._signatures = sortedUniquePaths;
            this.reflectSignaturesAttribute();
            this.resolveAllSignatures(); // Fetch display names
            this.dispatchEvent(new CustomEvent('change', {
                detail: { signatures: this._signatures },
                bubbles: true, composed: true
            }));
        }
    }

    get label(): string { return this.getAttribute('label') || 'Signatures'; }
    set label(value: string) { this.setAttribute('label', value); }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(isDisabled: boolean) { this.toggleAttribute('disabled', isDisabled); }

    // --- Styles & Template ---
    protected get styles(): string {
        return `
            :host {
                display: block;
                /* Similar container style to ParentElementSelector */
                background-color: var(--color-muted);
                padding: var(--spacing-3);
                border: 1px solid var(--color-border);
                border-radius: var(--radius);
            }
             :host([disabled]) { opacity: 0.7; pointer-events: none; }

             .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-2); }
             app-label { font-size: 0.875rem; font-weight: 500; } /* Match form label */

            .badge-container {
                 display: flex;
                 flex-direction: column; /* Stack badges vertically */
                 gap: var(--spacing-1);
                 margin-top: var(--spacing-1);
                 min-height: 40px; /* Ensure some height */
                 max-height: 150px; /* Limit height and scroll */
                 overflow-y: auto;
                 background-color: var(--color-background);
                 padding: var(--spacing-2);
                 border-radius: var(--radius);
                 border: 1px solid var(--color-border);
            }
            .signature-badge {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--spacing-2);
                background-color: var(--color-muted); /* Use muted for badge bg */
                padding: var(--spacing-1) var(--spacing-2);
                border-radius: var(--radius);
                border: 1px solid transparent; /* Add border for consistency */
            }
             .signature-badge span {
                 font-family: var(--font-mono);
                 font-size: 0.75rem; /* text-xs */
                 flex-grow: 1;
                 word-break: break-word; /* Allow long paths to wrap */
                 min-width: 0; /* Prevent overflow issues in flex */
             }

             .signature-badge app-button { /* Style the close button */
                 flex-shrink: 0;
                 margin-left: var(--spacing-1);
                 padding: 1px;
                 line-height: 0;
                 height: auto;
                 width: auto;
                 border-radius: 50%;
                 color: var(--color-muted-foreground);
             }
             .signature-badge app-button:hover {
                 background-color: hsla(from var(--color-foreground) h s l / 0.1);
                 color: var(--color-foreground);
             }
             .placeholder-text { font-size: 0.75rem; color: var(--color-muted-foreground); font-style: italic; text-align: center; padding: var(--spacing-2); }
             .loading-indicator { text-align: center; padding: var(--spacing-2); }

             /* Popover Content Size */
             app-popover { --popover-max-width: 500px; } /* Set max width */
             app-popover::part(content) { padding: 0 !important; } /* Remove padding for browser */
        `;
    }

    protected get template(): string {
        const plusIconStr = typeof icons.plus === 'function' ? icons.plus() : icons.plus ?? '+';
        return `
            <div class="header">
                <app-label id="main-label">${this.label}</app-label>
                <app-popover id="popover">
                    <app-button slot="trigger" variant="outline" size="sm" id="add-button" aria-label="Add new signature path">
                        ${plusIconStr} Add Path
                    </app-button>
                    <element-browser-popover-content slot="content" id="browser-content">
                    </element-browser-popover-content>
                </app-popover>
            </div>
            <div class="badge-container">
                 <!-- Badges added dynamically -->
                 <span class="placeholder-text">No signatures added.</span>
            </div>
        `;
    }

    // --- Lifecycle & Event Handling ---
    connectedCallback() {
        super.connectedCallback();
        // Use imported types
        this._popover = this.qsOptional<AppPopover>('#popover');
        this.badgeContainer = this.qsOptional<HTMLElement>('.badge-container');
        this.labelElement = this.qsOptional<AppLabel>('#main-label');
        this.browserContent = this.qsOptional<ElementBrowserPopoverContent>('#browser-content');

        // Parse initial signatures
        this.signatures = this.getAttribute('signatures') || '[]';
        this.updateDisabledState();
        // Add listeners after initial setup
        this.addEventListeners();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        // Listeners are removed by BaseComponent
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
         super.attributeChangedCallback(name, oldValue, newValue); // Call base class method
         if (oldValue === newValue) return;
         switch(name) {
            case 'signatures':
                this.signatures = newValue || '[]';
                break;
             case 'label':
                if(this.labelElement) this.labelElement.textContent = this.label;
                break;
             case 'disabled':
                 this.updateDisabledState();
                 break;
         }
    }

    addEventListeners() {
        // Use specific event names from ElementBrowserPopoverContent
        this.browserContent?.addEventListener(ElementBrowserPopoverContent.E_SELECT_SIGNATURE, this.handleSignatureAdd);
        this.browserContent?.addEventListener(ElementBrowserPopoverContent.E_CLOSE, this.handleBrowserClose);
        this.badgeContainer?.addEventListener('click', this.handleBadgeRemoveClick);
    }

    removeEventListeners() {
        // Base class handles removal
    }

    private handleSignatureAdd = (event: Event): void => {
        const customEvent = event as CustomEvent;
        const newSignature = customEvent.detail.signature as number[]; // Signature is the array of IDs
        if (Array.isArray(newSignature) && newSignature.length > 0) {
            const newSignatureStr = JSON.stringify(newSignature); // Don't sort inner path
            // Prevent adding exact duplicates
            if (!this._signatures.some(p => JSON.stringify(p) === newSignatureStr)) {
                 this.signatures = [...this._signatures, newSignature]; // Use setter
            } else {
                 showToast("Signature path already added.", "info");
            }
        }
        this._popover?.hide();
    }

    private handleBrowserClose = (): void => {
        this._popover?.hide();
    }

     private handleBadgeRemoveClick = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;
        // Use imported type
        const button = target.closest<AppButton>('app-button[data-signature-path]');
        if (button?.dataset.signaturePath) {
            try {
                const pathToRemove = JSON.parse(button.dataset.signaturePath) as number[];
                if (Array.isArray(pathToRemove)) {
                    const pathToRemoveStr = JSON.stringify(pathToRemove); // Don't sort inner path
                    this.signatures = this._signatures.filter(p => JSON.stringify(p) !== pathToRemoveStr);
                }
            } catch (e) {
                console.error("Error parsing signature path from badge button:", e);
            }
        }
     }

    // --- Data Fetching & Updates ---
    private async resolveAllSignatures() {
         if (this._signatures.length === 0) {
             this.resolvedSignatures = [];
             this.renderBadges();
             return;
         }
         if (!this.auth.token) return; // Need token

         this.isLoadingSignatures = true;
         this.renderBadges(); // Show loading

         const resolved: ResolvedSignature[] = [];
         try {
             // Create a set of unique element IDs needed across all paths
             const uniqueElementIds = new Set<number>();
             this._signatures.forEach(path => path.forEach(id => uniqueElementIds.add(id)));

             // Fetch details for all unique required elements in parallel
             const elementDetailsMap = new Map<number, SignatureElement | null>();
             const fetchPromises = Array.from(uniqueElementIds).map(id =>
                api.getSignatureElementById(id).then(el => {
                    elementDetailsMap.set(id, el);
                }).catch(() => {
                    elementDetailsMap.set(id, null); // Store null on error
                })
             );
             await Promise.all(fetchPromises);

             // Construct display paths using the fetched details
             this._signatures.forEach(idPath => {
                 if (idPath.length === 0) return;
                 const displayParts = idPath.map(id => {
                     const el = elementDetailsMap.get(id);
                     if (el) return `${el.index ? `[${el.index}]` : ''}${el.name}`;
                     else return `[ID:${id}?]`; // Indicate missing/error
                 });
                 resolved.push({ idPath, display: displayParts.join(' / ') });
             });

             // Sort resolved paths alphabetically by display string
             this.resolvedSignatures = resolved.sort((a, b) => a.display.localeCompare(b.display));
         } catch (error) {
              console.error("Error resolving signatures:", error);
              // Keep unresolved data with error indication
              this.resolvedSignatures = this._signatures.map(p => ({idPath: p, display: `[${p.join(' / ')}] (Resolve Error)`}));
         } finally {
             this.isLoadingSignatures = false;
             this.renderBadges(); // Render final result
         }
     }

     private renderBadges() {
         if (!this.badgeContainer) return;
         this.badgeContainer.innerHTML = ''; // Clear previous
         const xIconStr = typeof icons.x === 'function' ? icons.x() : icons.x ?? 'X';


         if (this.isLoadingSignatures) {
             this.badgeContainer.innerHTML = `<div class="loading-indicator"><loading-spinner size="sm"></loading-spinner></div>`;
             return;
         }

         if (this.resolvedSignatures.length === 0) {
             this.badgeContainer.innerHTML = `<span class="placeholder-text">No signatures added.</span>`;
             return;
         }

         this.resolvedSignatures.forEach((resolved) => {
             const badgeDiv = document.createElement('div');
             badgeDiv.className = 'signature-badge';
             badgeDiv.innerHTML = `
                 <span>${resolved.display || '<Empty Path>'}</span>
                 <app-button variant="ghost" size="icon" data-signature-path='${JSON.stringify(resolved.idPath)}' aria-label="Remove signature ${resolved.display}">
                     ${xIconStr}
                 </app-button>
             `;
             this.badgeContainer?.appendChild(badgeDiv);
         });
     }


    private reflectSignaturesAttribute() {
        // Store canonical paths (sorted unique strings parsed back to arrays) as JSON string
        this.setAttribute('signatures', JSON.stringify(this._signatures));
    }

     private updateDisabledState() {
        const isDisabled = this.disabled;
        // Use imported type
        this.qsOptional<AppButton>('#add-button')?.toggleAttribute('disabled', isDisabled);
        // Also disable remove buttons on badges
        this.shadow.querySelectorAll<AppButton>('.signature-badge app-button').forEach(btn => btn.disabled = isDisabled);
     }
}

// Define the component unless already defined
if (!customElements.get('signature-selector')) {
    customElements.define('signature-selector', SignatureSelector);
}