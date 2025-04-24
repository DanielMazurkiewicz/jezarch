import { Component, Show, For, createMemo } from 'solid-js'; // Added createMemo
import { A } from "@solidjs/router"; // Use A for internal links
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/Dialog'; // Added DialogBody
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/shared/Icon';
import type { ArchiveDocument, ArchiveDocumentSearchResult } from '../../../../backend/src/functionalities/archive/document/models';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import styles from './DocumentPreviewDialog.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

// Local type including potentially resolved signatures
type PreviewDocumentType = ArchiveDocumentSearchResult & {
    resolvedTopographicSignatures?: string[];
    resolvedDescriptiveSignatures?: string[];
};

interface DocumentPreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    document: ArchiveDocumentSearchResult | null;
    onEdit: (doc: ArchiveDocument) => void;
    onDisable: (docId: number) => void;
    parentUnitTitle?: string | null; // Optional parent title for link display
}

const DocumentPreviewDialog: Component<DocumentPreviewDialogProps> = (props) => {
    const [authState] = useAuth();

    // Memoize derived values
    const previewingDoc = createMemo(() => props.document as PreviewDocumentType | null);
    const user = createMemo(() => authState.user);
    const isOwnerOrAdmin = createMemo(() => {
        const doc = previewingDoc();
        const currentUser = user();
        if (!doc || !currentUser) return false;
        return currentUser.role === 'admin' || currentUser.userId === doc.ownerUserId;
    });

    const handleEditClick = () => {
        const doc = previewingDoc();
        if (doc) {
            props.onOpenChange(false); // Close preview
            props.onEdit(doc as ArchiveDocument); // Pass base type if form expects it
        }
    };

    const handleDisableClick = () => {
        const doc = previewingDoc();
        if (doc?.archiveDocumentId) {
            props.onDisable(doc.archiveDocumentId);
            // Optionally close dialog after confirmation within onDisable, or keep open
            // props.onOpenChange(false);
        }
    };

    return (
        <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
            {/* Content renders when document signal has value */}
            <Show when={previewingDoc()}>
                {(doc) => ( // doc() is the accessor
                    <DialogContent size="lg" class={styles.previewDialogContent}>
                        <DialogHeader class={styles.previewHeader}>
                            <DialogTitle class={styles.previewTitleContainer}>
                                <Icon name={doc().type === 'unit' ? 'Folder' : 'FileText'} class={styles.previewIcon} style={{ color: doc().type === 'unit' ? 'var(--color-primary)' : 'hsl(145 63% 40%)' }} />
                                {doc().title}
                            </DialogTitle>
                            <DialogDescription class={styles.previewDialogDescription}>
                                <div class={styles.detailGroup}>
                                    <span class={styles.detailLabel}>Creator:</span>{doc().creator}
                                    <span class={styles.detailLabel} style={{"margin-left": "0.5rem"}}>Date:</span>{doc().creationDate}
                                </div>
                                <Show when={doc().parentUnitArchiveDocumentId}>
                                    <div class={styles.detailGroup}>
                                        <span class={styles.detailLabel}>Parent Unit:</span>
                                        <A href={`/archive?unitId=${doc().parentUnitArchiveDocumentId}`} class={styles.detailLink} onClick={() => props.onOpenChange(false)}>
                                            {props.parentUnitTitle || `ID ${doc().parentUnitArchiveDocumentId}`}
                                        </A>
                                    </div>
                                </Show>
                                <div class={styles.detailGroup}>
                                    <span class={styles.detailLabel}>Owner:</span>{doc().ownerLogin ?? 'N/A'} (ID: {doc().ownerUserId})
                                </div>
                            </DialogDescription>
                            {/* Tags */}
                            <Show when={doc().tags && doc().tags!.length > 0}>
                                <div class={styles.tagsContainer}>
                                    <span class={styles.detailLabel}>Tags:</span>
                                    <For each={doc().tags}>{(tag) => <Badge variant="secondary">{tag.name}</Badge>}</For>
                                </div>
                            </Show>
                             {/* Signatures */}
                            <Show when={doc().resolvedTopographicSignatures && doc().resolvedTopographicSignatures!.length > 0}>
                                <div class={styles.tagsContainer}>
                                    <span class={styles.detailLabel}>Topo Sigs:</span>
                                    <For each={doc().resolvedTopographicSignatures}>{(sig) => <Badge variant="outline" class="font-mono">{sig}</Badge>}</For>
                                </div>
                            </Show>
                             <Show when={doc().resolvedDescriptiveSignatures && doc().resolvedDescriptiveSignatures!.length > 0}>
                                <div class={styles.tagsContainer}>
                                    <span class={styles.detailLabel}>Desc Sigs:</span>
                                    <For each={doc().resolvedDescriptiveSignatures}>{(sig) => <Badge variant="outline" class="font-mono">{sig}</Badge>}</For>
                                </div>
                            </Show>
                        </DialogHeader>

                        {/* Scrollable Content using DialogBody */}
                         <DialogBody class={styles.previewContentArea}> {/* Apply layout styles to DialogBody */}
                            {/* Content Description */}
                            <Show when={doc().contentDescription}>
                                <section class={styles.detailSection}>
                                    <h4 class={styles.detailSectionTitle}>Content Description</h4>
                                    {/* Use pre or div with whitespace style */}
                                    <div style={{"white-space": "pre-wrap"}}>{doc().contentDescription}</div>
                                </section>
                            </Show>
                            {/* Physical Details */}
                            <Show when={doc().numberOfPages || doc().documentType || doc().dimensions || doc().binding || doc().condition || doc().documentLanguage}>
                                 <section class={styles.detailSection}>
                                    <h4 class={styles.detailSectionTitle}>Physical Details</h4>
                                    <ul class={styles.detailList}>
                                        <Show when={doc().numberOfPages}><li>Pages: {doc().numberOfPages}</li></Show>
                                        <Show when={doc().documentType}><li>Type: {doc().documentType}</li></Show>
                                        <Show when={doc().dimensions}><li>Dimensions: {doc().dimensions}</li></Show>
                                        <Show when={doc().binding}><li>Binding: {doc().binding}</li></Show>
                                        <Show when={doc().condition}><li>Condition: {doc().condition}</li></Show>
                                        <Show when={doc().documentLanguage}><li>Language: {doc().documentLanguage}</li></Show>
                                    </ul>
                                 </section>
                            </Show>
                            {/* Other Details */}
                            <Show when={doc().remarks || doc().accessLevel || doc().additionalInformation || doc().relatedDocumentsReferences || doc().isDigitized !== null || doc().isDigitized !== undefined}>
                                  <section class={styles.detailSection}>
                                    <h4 class={styles.detailSectionTitle}>Other Details</h4>
                                    {/* Use divs instead of p for better structure */}
                                    <div class="space-y-1 text-sm"> {/* Utility class or plain CSS */}
                                         <Show when={doc().remarks}><div><strong class={styles.detailLabel}>Remarks:</strong> {doc().remarks}</div></Show>
                                         <Show when={doc().accessLevel}><div><strong class={styles.detailLabel}>Access:</strong> {doc().accessLevel} {doc().accessConditions ? `(${doc().accessConditions})` : ''}</div></Show>
                                         <Show when={doc().additionalInformation}><div><strong class={styles.detailLabel}>Additional Info:</strong> {doc().additionalInformation}</div></Show>
                                         <Show when={doc().relatedDocumentsReferences}><div><strong class={styles.detailLabel}>Related Docs:</strong> {doc().relatedDocumentsReferences}</div></Show>
                                         <Show when={doc().isDigitized !== null && doc().isDigitized !== undefined}>
                                            <div><strong class={styles.detailLabel}>Digitized:</strong> {doc().isDigitized ? 'Yes' : 'No'}
                                                 <Show when={doc().digitizedVersionLink}>
                                                    {' - Link: '} <a href={doc().digitizedVersionLink!} target="_blank" rel="noopener noreferrer" class={styles.detailLink}>{doc().digitizedVersionLink}</a>
                                                 </Show>
                                            </div>
                                        </Show>
                                    </div>
                                 </section>
                            </Show>
                            {/* Add fallback for no details? */}
                             <Show when={!doc().contentDescription && !doc().numberOfPages /* add other fields... */}>
                                 <p class={styles.noContentText}>No additional details available for this item.</p>
                             </Show>
                         </DialogBody>

                        <DialogFooter class={styles.previewFooter}>
                            <div class={styles.footerActionLeft}>
                                <Show when={isOwnerOrAdmin()}>
                                    <Button variant="destructive" /* Changed variant */ size="sm" onClick={handleDisableClick}>
                                        <Icon name="Trash2" size="0.9em" style={{"margin-right": "0.5rem"}}/> Disable Item
                                    </Button>
                                </Show>
                            </div>
                            <div class={styles.footerActionRight}>
                                <Show when={isOwnerOrAdmin()}>
                                    <Button variant="secondary" size="sm" onClick={handleEditClick}>
                                         <Icon name="Edit" size="0.9em" style={{"margin-right": "0.5rem"}}/> Edit
                                    </Button>
                                </Show>
                                <Button variant="outline" size="sm" onClick={() => props.onOpenChange(false)}>Close</Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Show>
        </Dialog>
    );
};

export default DocumentPreviewDialog;