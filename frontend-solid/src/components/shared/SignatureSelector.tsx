import { Component, createSignal, createEffect, createMemo, For, Show, onCleanup, splitProps, JSX } from 'solid-js'; // Added splitProps, JSX
import { Portal } from 'solid-js/web'; // Import Portal
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SearchRequest } from '../../../../backend/src/utils/search'; // Import SearchRequest

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel'; // Use FormLabel
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/Select';
import LoadingSpinner from './LoadingSpinner';
import { Icon } from './Icon';
import useDebounce from './useDebounce'; // Assuming useDebounce exists
import { cn } from '@/lib/utils';
// Merged styles into one import for SignatureSelector itself
import styles from './SignatureSelector.module.css'; // Import CSS Module (Typed)

type ResolvedSignature = { idPath: number[]; display: string };
const MAX_BROWSER_SEARCH_RESULTS = 50;
const DEBOUNCE_DELAY = 300;

// Helper for sorting elements
const compareElements = (a: SignatureElement, b: SignatureElement): number => {
    const valA = a.index ?? a.name ?? ''; const valB = b.index ?? b.name ?? '';
    const numA = Number(valA); const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(valA).localeCompare(String(valB));
};


interface SignatureSelectorProps {
    label: string;
    signatures: number[][]; // Array of ID paths, e.g., [[1, 5], [1, 8, 3]]
    onChange: (newSignatures: number[][]) => void;
    class?: string;
    disabled?: boolean;
}

const SignatureSelector: Component<SignatureSelectorProps> = (props) => {
    const [local, rest] = splitProps(props, ['label', 'signatures', 'onChange', 'class', 'disabled']); // Split props
    const [authState] = useAuth();
    const [resolvedSignatures, setResolvedSignatures] = createSignal<ResolvedSignature[]>([]);
    const [isLoadingSignatures, setIsLoadingSignatures] = createSignal(false);
    const [isBrowserOpen, setIsBrowserOpen] = createSignal(false);

    // Browser state
    const [browserComponents, setBrowserComponents] = createSignal<SignatureComponent[]>([]);
    const [browserSelectedComponentId, setBrowserSelectedComponentId] = createSignal<string>('');
    const [browserElements, setBrowserElements] = createSignal<SignatureElement[]>([]);
    const [browserCurrentSignatureElements, setBrowserCurrentSignatureElements] = createSignal<SignatureElement[]>([]);
    const [isBrowserLoadingComponents, setIsBrowserLoadingComponents] = createSignal(false);
    const [isBrowserLoadingElements, setIsBrowserLoadingElements] = createSignal(false);
    const [browserSearchTerm, setBrowserSearchTerm] = createSignal('');
    const [browserError, setBrowserError] = createSignal<string | null>(null);
    const debouncedBrowserSearchTerm = useDebounce(browserSearchTerm, DEBOUNCE_DELAY);
    const [triggerRef, setTriggerRef] = createSignal<HTMLButtonElement>();
    const [contentRef, setContentRef] = createSignal<HTMLDivElement>();
    const [contentStyle, setContentStyle] = createSignal({}); // For dynamic positioning


    // --- Resolve Display Signatures ---
    createEffect(async () => {
        const sigs = local.signatures; // Use local prop accessor
        const token = authState.token;
        if (!token || sigs.length === 0) { setResolvedSignatures([]); return; }
        setIsLoadingSignatures(true);
        try {
            const promises = sigs.map(idPath => resolveSignaturePath(idPath, token));
            const resolved = await Promise.all(promises);
            setResolvedSignatures(resolved.sort((a, b) => a.display.localeCompare(b.display)));
        } catch (error) {
             console.error("Error resolving all signature paths:", error);
             setResolvedSignatures(sigs.map(p => ({idPath: p, display: `[${p.join(' / ')}] (Resolve Error)`})));
        } finally { setIsLoadingSignatures(false); }
    });

    // --- Browser Logic ---
     // Fetch Components for Browser
     createEffect(() => {
         if (!isBrowserOpen()) return; // Only fetch when browser is open
         const token = authState.token;
         if (!token) return;
         setIsBrowserLoadingComponents(true); setBrowserError(null);
         api.getAllSignatureComponents(token)
             .then(comps => setBrowserComponents(comps.sort((a,b) => a.name.localeCompare(b.name))))
             .catch(err => setBrowserError(err.message || "Failed to load components"))
             .finally(() => setIsBrowserLoadingComponents(false));
     });

    // Fetch Elements for Browser (Hierarchical only)
    createEffect(async () => {
        if (!isBrowserOpen()) return;
        const token = authState.token;
        const currentPath = browserCurrentSignatureElements();
        const currentCompId = browserSelectedComponentId();
        const currentSearch = debouncedBrowserSearchTerm(); // Use debounced term for API search

        setBrowserError(null);
        const lastElementId = currentPath.length > 0 ? currentPath[currentPath.length - 1].signatureElementId : undefined;

        let shouldFetch = false;
        const searchRequest: SearchRequest = { query: [], page: 1, pageSize: MAX_BROWSER_SEARCH_RESULTS };

        // Add search term filter if present
        if (currentSearch.trim()) {
             searchRequest.query.push({ field: 'name', condition: 'FRAGMENT', value: currentSearch.trim(), not: false });
        }

        if (lastElementId) { // Fetch children of last element
             searchRequest.query.push({ field: 'parentIds', condition: 'ANY_OF', value: [lastElementId], not: false });
             shouldFetch = true;
         } else if (currentCompId) { // Fetch root elements of selected component
             const compIdNum = parseInt(currentCompId, 10);
             searchRequest.query.push({ field: 'signatureComponentId', condition: 'EQ', value: compIdNum, not: false });
             searchRequest.query.push({ field: 'hasParents', condition: 'EQ', value: false, not: false });
             shouldFetch = true;
         } else {
             shouldFetch = false; // Don't fetch if no component/parent selected
         }

        // Don't fetch if search term is active but no component/parent is selected (global search not supported here)
        if (currentSearch.trim() && !lastElementId && !currentCompId) {
             shouldFetch = false;
        }


        if (!shouldFetch || !token) { setBrowserElements([]); setIsBrowserLoadingElements(false); return; }

        setIsBrowserLoadingElements(true);
        try {
             const response = await api.searchSignatureElements(searchRequest, token);
             setBrowserElements(response.data.sort(compareElements));
        } catch (err: any) { setBrowserError(err.message || "Failed to load elements"); setBrowserElements([]); }
        finally { setIsBrowserLoadingElements(false); }
    });

     // Filter available elements for browser display (API does main filtering)
     const filteredBrowserElementsForDisplay = createMemo(() => {
         // Now API does the search, so just return the results
         return browserElements();
     });

    const browserSelectedComponentName = createMemo(() => browserComponents().find(c => String(c.signatureComponentId) === browserSelectedComponentId())?.name);

    // --- FIX: Modify handleBrowserSelectElement to stop propagation ---
    const handleBrowserSelectElement = (element: SignatureElement, event?: MouseEvent | KeyboardEvent) => { // Accept KeyboardEvent too
        event?.stopPropagation(); // Stop the click event from bubbling up
        setBrowserCurrentSignatureElements(prev => [...prev, element]);
        setBrowserSearchTerm(''); // Clear search after selecting
    };
    const handleBrowserRemoveLastElement = () => {
        setBrowserCurrentSignatureElements(prev => prev.slice(0, -1));
         // No special logic needed when removing first element now
    };
    const handleConfirmSignature = () => {
        const currentPath = browserCurrentSignatureElements();
        if (currentPath.length > 0) {
            addSignature(currentPath.map(el => el.signatureElementId!));
        }
        resetBrowserState();
        setIsBrowserOpen(false); // Close popover
    };
    const resetBrowserState = () => {
         setBrowserCurrentSignatureElements([]);
         setBrowserSelectedComponentId('');
         setBrowserSearchTerm('');
         setBrowserError(null);
         setBrowserElements([]);
    };

    // --- Add/Remove Signature ---
    const addSignature = (newSignature: number[]) => {
        const currentSignatures = local.signatures;
        const newSignatureStr = JSON.stringify(newSignature);
        if (!currentSignatures.some(p => JSON.stringify(p) === newSignatureStr)) {
            local.onChange([...currentSignatures, newSignature]); // Use local.onChange
        }
    };
    const removeSignature = (signatureToRemove: number[]) => {
        const signatureToRemoveStr = JSON.stringify(signatureToRemove);
        local.onChange(local.signatures.filter(p => JSON.stringify(p) !== signatureToRemoveStr)); // Use local.onChange and local.signatures
    };

    // --- Popover Management ---
     createEffect(() => { if (!isBrowserOpen()) { resetBrowserState(); } });
     // Positioning and Close on click outside
     createEffect(() => {
        if (!isBrowserOpen()) return;
         // Position content below trigger
         if (triggerRef() && contentRef()) {
              const triggerRect = triggerRef()!.getBoundingClientRect();
              const bodyRect = document.body.getBoundingClientRect();
              const scrollY = window.scrollY; // Account for page scroll
              setContentStyle({
                  position: 'absolute',
                  width: `500px`, // Fixed width for browser
                  top: `${triggerRect.bottom + scrollY + 4}px`,
                  left: `${triggerRect.left + window.scrollX}px`,
                  'max-width': `calc(100vw - 2rem)`,
                  'max-height': `70vh`, // Limit height
                 // Add checks to flip position if near bottom of viewport
              });
         }

         const handleClickOutside = (event: MouseEvent) => {
             if (triggerRef() && !triggerRef()!.contains(event.target as Node) &&
                 contentRef() && !contentRef()!.contains(event.target as Node)) {
                 setIsBrowserOpen(false);
             }
         };
         document.addEventListener('mousedown', handleClickOutside);
         onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
     });
       // Close on Escape key
       createEffect(() => {
           if (!isBrowserOpen()) return;
           const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsBrowserOpen(false); };
           document.addEventListener('keydown', handleKeyDown);
           onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
       });


    return (
        <div class={cn(styles.signatureSelectorContainer, local.class)}>
            <div class={styles.headerRow}>
                <FormLabel class={styles.selectorLabel}>{local.label}</FormLabel>
                {/* Popover Trigger */}
                <button
                    ref={setTriggerRef}
                    type="button"
                    onClick={() => !local.disabled && setIsBrowserOpen(o => !o)}
                    class={cn(styles.addButton)}
                    disabled={local.disabled}
                     aria-haspopup="dialog"
                     aria-expanded={isBrowserOpen()}
                     aria-controls="signature-browser-content"
                >
                    <Icon name="Plus" size="0.8em" style={{"margin-right": "0.2rem"}}/> Add Signature
                </button>
            </div>

            {/* Display Area */}
            <div class={styles.signaturesDisplayArea}>
                 <Show when={isLoadingSignatures()} fallback={
                     <For each={resolvedSignatures()} fallback={<p class={styles.emptyText}>No signatures added.</p>}>
                         {(resolved) => (
                            <div class={styles.signatureRow}>
                                <span class={styles.signatureText} title={resolved.display}>
                                    {resolved.display}
                                </span>
                                <button
                                type="button"
                                class={styles.removeSignatureButton}
                                onClick={() => removeSignature(resolved.idPath)}
                                aria-label={`Remove signature ${resolved.display}`}
                                disabled={local.disabled}
                                >
                                    <Icon name="X" class={styles.removeSignatureIcon}/>
                                </button>
                            </div>
                         )}
                     </For>
                 }>
                    <div class={styles.loadingContainer}><LoadingSpinner size='sm' /></div>
                 </Show>
            </div>

             {/* Popover Content (Browser) */}
             <Show when={isBrowserOpen()}>
                <Portal mount={document.body}>
                     <div // Simulate Popover/Dialog Content
                         ref={setContentRef}
                         role="dialog"
                         id="signature-browser-content"
                         aria-modal="true"
                         tabIndex={-1}
                         class={styles.browserContainer} // Apply browser container style
                         style={contentStyle()} // Dynamic positioning
                         data-state={isBrowserOpen() ? "open" : "closed"}
                     >
                        {/* --- Browser Content START --- */}

                          {/* Current Signature Path Display */}
                          <div class={styles.currentPathContainer}>
                              <span class={styles.currentPathLabel}>Current:</span>
                              <For each={browserCurrentSignatureElements()}>
                                  {(el, index) => (
                                      <>
                                        <Show when={index() > 0}><span class={styles.pathSeparator}>/</span></Show>
                                        <Badge variant="secondary" class={styles.currentPathBadge}>{el.index ? `[${el.index}] ` : ''}{el.name}</Badge>
                                      </>
                                  )}
                              </For>
                              <Show when={browserCurrentSignatureElements().length === 0}>
                                 <span class={styles.emptyPathText}>Build signature below...</span>
                              </Show>
                         </div>

                         {/* Component Selector (Hierarchical start) */}
                          <Show when={browserCurrentSignatureElements().length === 0}>
                              <div style={{"padding": "var(--spacing-sm)", "border-bottom": "1px solid var(--color-border)"}}> {/* Wrapper for padding */}
                                  <Select
                                      value={browserSelectedComponentId()}
                                      onChange={setBrowserSelectedComponentId}
                                      disabled={isBrowserLoadingComponents()}
                                      id="browser-component-selector"
                                  >
                                       <SelectTrigger placeholder="1. Select Component to Start">
                                          {/* Use SelectValue component */}
                                          <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <Show when={isBrowserLoadingComponents()} fallback={
                                              <For each={browserComponents()}>
                                                 {(comp) => ( <SelectItem value={String(comp.signatureComponentId)}>{comp.name}</SelectItem> )}
                                              </For>
                                          }>
                                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                                          </Show>
                                           <Show when={!isBrowserLoadingComponents() && browserComponents().length === 0}>
                                              <SelectItem value="no-comps" disabled>No components found</SelectItem>
                                           </Show>
                                      </SelectContent>
                                  </Select>
                              </div>
                          </Show>

                          {/* Element Selector / Search Area */}
                         <Show when={browserCurrentSignatureElements().length > 0 || browserSelectedComponentId()}>
                            <div class={styles.elementSelectionArea}>
                                <FormLabel class={styles.elementSelectionLabel}>
                                    {browserCurrentSignatureElements().length > 0
                                        ? `Select Child of "${browserCurrentSignatureElements().slice(-1)[0]?.name}"`
                                        : `Select Root Element in "${browserSelectedComponentName() || '...'}"`
                                    }
                                </FormLabel>

                                 {/* Simulate Command Root */}
                                 <div class={styles.elementCommand}>
                                     <Input
                                        type="search" // Use search type
                                        placeholder="Search available elements..."
                                        value={browserSearchTerm()}
                                        onInput={(e) => setBrowserSearchTerm(e.currentTarget.value)}
                                        disabled={isBrowserLoadingElements()}
                                        style={{ "margin-bottom": "var(--spacing-xs)", "height": "32px" }}
                                     />
                                     <div class={styles.elementCommandList}> {/* Use correct style */}
                                         <Show when={isBrowserLoadingElements()}>
                                             <div class={styles.commandLoading}><LoadingSpinner size='sm' /></div>
                                         </Show>
                                         <Show when={browserError() && !isBrowserLoadingElements()}>
                                            <div class={styles.commandError}>{browserError()}</div>
                                         </Show>
                                          <Show when={!browserError() && !isBrowserLoadingElements() && filteredBrowserElementsForDisplay().length === 0}>
                                              <div class={styles.commandEmpty}>No matching elements found.</div>
                                          </Show>
                                         <Show when={!browserError() && !isBrowserLoadingElements() && filteredBrowserElementsForDisplay().length > 0}>
                                              <For each={filteredBrowserElementsForDisplay()}>
                                                  {(el) => (
                                                     <div // Simulate Command Item
                                                         role="option"
                                                         tabIndex={0}
                                                         class={styles.elementCommandItem} // Use correct style
                                                         // --- FIX: Pass event to handler ---
                                                         onClick={(e) => handleBrowserSelectElement(el, e)}
                                                         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBrowserSelectElement(el, e); }}
                                                         aria-label={`Select ${el.name}`}
                                                     >
                                                         <div class={styles.elementItemContent}>
                                                             <span class={styles.elementItemIndex}>{el.index || '-'}</span>
                                                             <span class={styles.elementItemName}>{el.name}</span>
                                                         </div>
                                                         <Icon name="Plus" class={styles.elementItemAddIcon}/>
                                                      </div>
                                                  )}
                                              </For>
                                         </Show>
                                         <Show when={browserElements().length >= MAX_BROWSER_SEARCH_RESULTS && !isBrowserLoadingElements()}>
                                            <div class={styles.moreElementsText}>More elements exist. Refine search.</div>
                                         </Show>
                                     </div>
                                 </div>
                             </div>
                        </Show>

                        {/* Action Buttons Footer */}
                         <div class={styles.actionsFooter}>
                             <div class={styles.footerActionGroup}>
                                 <Button type="button" variant="outline" size="sm" onClick={handleBrowserRemoveLastElement} disabled={browserCurrentSignatureElements().length === 0}>
                                     <Icon name="X" style={{"margin-right":"0.2rem"}} size="0.8em"/> Remove Last
                                 </Button>
                                 <Button type="button" variant="ghost" size="sm" onClick={() => setIsBrowserOpen(false)}>
                                     <Icon name="Ban" style={{"margin-right":"0.2rem"}} size="0.8em"/> Cancel
                                 </Button>
                             </div>
                             <Button type="button" size="sm" onClick={handleConfirmSignature} disabled={browserCurrentSignatureElements().length === 0}>
                                 Add Signature
                             </Button>
                         </div>

                         {/* --- Browser Content END --- */}
                     </div>
                 </Portal>
             </Show>
        </div>
    );
};

// Helper to resolve a single path (copied, ensure API call is correct)
const resolveSignaturePath = async (idPath: number[], token: string): Promise<ResolvedSignature> => {
    if (idPath.length === 0) return { idPath, display: '[Empty Path]' };
    try {
        const elementsInPath: (SignatureElement | null)[] = await Promise.all(
            idPath.map(id => api.getSignatureElementById(id, [], token).catch(() => null))
        );
        const displayParts = elementsInPath.map((el, index) => {
            if (el) return `${el.index ? `[${el.index}]` : ''}${el.name}`;
            else return `[Error ID: ${idPath[index]}]`;
        });
        return { idPath, display: displayParts.join(' / ') };
    } catch (error) {
         console.error(`Error resolving path [${idPath.join(', ')}]:`, error);
         return { idPath, display: `[${idPath.join(' / ')}] (Resolve Error)` };
    }
};


export default SignatureSelector;