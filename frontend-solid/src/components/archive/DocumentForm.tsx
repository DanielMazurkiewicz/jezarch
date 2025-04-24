import { Component, createSignal, createEffect, Show, createMemo, JSX, For } from 'solid-js';
// Removed @modular-forms/solid imports
import { z, ZodIssue } from 'zod';
import { createArchiveDocumentFormSchema, CreateArchiveDocumentFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { ArchiveDocument, ArchiveDocumentType, CreateArchiveDocumentInput, UpdateArchiveDocumentInput } from '../../../../backend/src/functionalities/archive/document/models';

import { Button } from '@/components/ui/Button';
import { Input, type InputProps } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Textarea, type TextareaProps } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import TagSelector from '@/components/shared/TagSelector';
import SignatureSelector from '@/components/shared/SignatureSelector';
import UnitSelector from './UnitSelector';
import styles from './DocumentForm.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';


interface DocumentFormProps {
    docToEdit: ArchiveDocument | null;
    onSave: () => void;
    forceType?: ArchiveDocumentType;
    forcedParentId?: number;
    forcedParentTitle?: string;
}

// Helper to safely get initial form data
const getInitialFormData = (doc: ArchiveDocument | null, props: DocumentFormProps): Partial<CreateArchiveDocumentFormData> => {
    const tagIds = doc?.tags?.map(t => t.tagId!) ?? [];
    const topoSignatures = doc?.topographicSignatureElementIds ?? [];
    const descSignatures = doc?.descriptiveSignatureElementIds ?? [];
    const parentId = props.forcedParentId ?? doc?.parentUnitArchiveDocumentId ?? null;

    return {
        parentUnitArchiveDocumentId: parentId,
        type: props.forceType ?? doc?.type ?? "document",
        title: doc?.title ?? '',
        creator: doc?.creator ?? '',
        creationDate: doc?.creationDate ?? '',
        numberOfPages: doc?.numberOfPages?.toString() ?? null, // Keep string for form
        documentType: doc?.documentType ?? null,
        binding: doc?.binding ?? null,
        condition: doc?.condition ?? null,
        documentLanguage: doc?.documentLanguage ?? null,
        contentDescription: doc?.contentDescription ?? null,
        remarks: doc?.remarks ?? null,
        accessLevel: doc?.accessLevel ?? null,
        accessConditions: doc?.accessConditions ?? null,
        additionalInformation: doc?.additionalInformation ?? null,
        relatedDocumentsReferences: doc?.relatedDocumentsReferences ?? null,
        isDigitized: doc?.isDigitized ?? false,
        digitizedVersionLink: doc?.digitizedVersionLink ?? null,
        tagIds: tagIds,
        topographicSignatureElementIds: topoSignatures,
        descriptiveSignatureElementIds: descSignatures,
        // FIX: dimensions was missing from initial data
        dimensions: doc?.dimensions ?? null,
    };
};


const DocumentForm: Component<DocumentFormProps> = (props) => {
    const [authState] = useAuth();
    const [apiError, setApiError] = createSignal<string | null>(null);
    const [isSubmitting, setIsSubmitting] = createSignal(false);
    const [isFetchingDetails, setIsFetchingDetails] = createSignal(false);
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof CreateArchiveDocumentFormData, string>>>({});

    // Individual state signals for form fields
    const [type, setType] = createSignal<ArchiveDocumentType>(props.forceType ?? props.docToEdit?.type ?? 'document');
    const [title, setTitle] = createSignal(props.docToEdit?.title ?? '');
    const [creator, setCreator] = createSignal(props.docToEdit?.creator ?? '');
    const [creationDate, setCreationDate] = createSignal(props.docToEdit?.creationDate ?? '');
    const [numberOfPages, setNumberOfPages] = createSignal<string | null>(props.docToEdit?.numberOfPages?.toString() ?? null); // Use string for input
    const [documentType, setDocumentType] = createSignal<string | null>(props.docToEdit?.documentType ?? null);
    const [dimensions, setDimensions] = createSignal<string | null>(props.docToEdit?.dimensions ?? null);
    const [binding, setBinding] = createSignal<string | null>(props.docToEdit?.binding ?? null);
    const [condition, setCondition] = createSignal<string | null>(props.docToEdit?.condition ?? null);
    const [documentLanguage, setDocumentLanguage] = createSignal<string | null>(props.docToEdit?.documentLanguage ?? null);
    const [contentDescription, setContentDescription] = createSignal<string | null>(props.docToEdit?.contentDescription ?? null);
    const [remarks, setRemarks] = createSignal<string | null>(props.docToEdit?.remarks ?? null);
    const [accessLevel, setAccessLevel] = createSignal<string | null>(props.docToEdit?.accessLevel ?? null);
    const [accessConditions, setAccessConditions] = createSignal<string | null>(props.docToEdit?.accessConditions ?? null);
    const [additionalInformation, setAdditionalInformation] = createSignal<string | null>(props.docToEdit?.additionalInformation ?? null);
    const [relatedDocumentsReferences, setRelatedDocumentsReferences] = createSignal<string | null>(props.docToEdit?.relatedDocumentsReferences ?? null);
    const [isDigitized, setIsDigitized] = createSignal(props.docToEdit?.isDigitized ?? false);
    const [digitizedVersionLink, setDigitizedVersionLink] = createSignal<string | null>(props.docToEdit?.digitizedVersionLink ?? null);

    // State for complex selectors
    const [selectedTagIds, setSelectedTagIds] = createSignal<number[]>(props.docToEdit?.tags?.map(t => t.tagId!) ?? []);
    const [topographicSignatures, setTopographicSignatures] = createSignal<number[][]>(props.docToEdit?.topographicSignatureElementIds ?? []);
    const [descriptiveSignatures, setDescriptiveSignatures] = createSignal<number[][]>(props.docToEdit?.descriptiveSignatureElementIds ?? []);
    const [selectedParentUnitId, setSelectedParentUnitId] = createSignal<number | null>(props.forcedParentId ?? props.docToEdit?.parentUnitArchiveDocumentId ?? null);

    // Keep track of initial state for dirty checking
    const [initialFormData, setInitialFormData] = createSignal<Partial<CreateArchiveDocumentFormData>>(getInitialFormData(props.docToEdit, props));

    // REMOVED hasErrors check

    // Dirty check
    const isDirty = createMemo(() => {
        const initial = initialFormData();
        const current: Partial<CreateArchiveDocumentFormData> = {
            parentUnitArchiveDocumentId: selectedParentUnitId(),
            type: type(), title: title(), creator: creator(), creationDate: creationDate(),
            numberOfPages: numberOfPages(), documentType: documentType(), dimensions: dimensions(), binding: binding(), condition: condition(),
            documentLanguage: documentLanguage(), contentDescription: contentDescription(), remarks: remarks(), accessLevel: accessLevel(),
            accessConditions: accessConditions(), additionalInformation: additionalInformation(), relatedDocumentsReferences: relatedDocumentsReferences(),
            isDigitized: isDigitized(), digitizedVersionLink: digitizedVersionLink(),
            tagIds: selectedTagIds(), topographicSignatureElementIds: topographicSignatures(), descriptiveSignatureElementIds: descriptiveSignatures(),
        };
        // Simple string comparison, adjust for deep comparison if needed
        return JSON.stringify(initial) !== JSON.stringify(current);
    });


    // Update form state when docToEdit changes
    createEffect(async () => {
        const doc = props.docToEdit;
        const token = authState.token;
        setIsFetchingDetails(true);
        setApiError(null);
        setFormErrors({}); // Clear errors

        let loadedData: Partial<CreateArchiveDocumentFormData> = {};
        let loadedParentPaths: number[][] = []; // For signature selector

        if (doc?.archiveDocumentId && token) {
            try {
                // Fetch full details if editing
                const fullDoc = await api.getArchiveDocumentById(doc.archiveDocumentId, token);
                loadedData = getInitialFormData(fullDoc, props); // Use helper to populate base data
                // Fetch/set parent paths for SignatureSelector if needed
                // loadedParentPaths = ...; // Placeholder
            } catch (err: any) {
                console.error("Load Error:", err);
                setApiError(`Failed to load details: ${err.message}`);
                loadedData = getInitialFormData(doc, props); // Fallback to potentially incomplete data
            }
        } else {
             // Reset for create mode
             loadedData = getInitialFormData(null, props);
        }

        // Set individual signals from loaded data
        setType(loadedData.type ?? 'document');
        setTitle(loadedData.title ?? '');
        setCreator(loadedData.creator ?? '');
        setCreationDate(loadedData.creationDate ?? '');
        setNumberOfPages(loadedData.numberOfPages?.toString() ?? null);
        setDocumentType(loadedData.documentType ?? null);
        setDimensions(loadedData.dimensions ?? null);
        setBinding(loadedData.binding ?? null);
        setCondition(loadedData.condition ?? null);
        setDocumentLanguage(loadedData.documentLanguage ?? null);
        setContentDescription(loadedData.contentDescription ?? null);
        setRemarks(loadedData.remarks ?? null);
        setAccessLevel(loadedData.accessLevel ?? null);
        setAccessConditions(loadedData.accessConditions ?? null);
        setAdditionalInformation(loadedData.additionalInformation ?? null);
        setRelatedDocumentsReferences(loadedData.relatedDocumentsReferences ?? null);
        setIsDigitized(loadedData.isDigitized ?? false);
        setDigitizedVersionLink(loadedData.digitizedVersionLink ?? null);
        setSelectedTagIds(loadedData.tagIds ?? []);
        setTopographicSignatures(loadedData.topographicSignatureElementIds ?? []);
        setDescriptiveSignatures(loadedData.descriptiveSignatureElementIds ?? []);
        setSelectedParentUnitId(loadedData.parentUnitArchiveDocumentId ?? null);

        // Update initial state for dirty checking
        setInitialFormData(loadedData);

        setIsFetchingDetails(false);
        setIsSubmitting(false); // Ensure submitting is reset
    });

    // Validation function
    const validateForm = (): boolean => {
         setFormErrors({}); // Clear previous errors
         const formData: CreateArchiveDocumentFormData = {
            parentUnitArchiveDocumentId: selectedParentUnitId(),
            type: type(),
            title: title(),
            creator: creator(),
            creationDate: creationDate(),
            numberOfPages: numberOfPages(), // Keep as string/null for direct input handling
            documentType: documentType(),
            dimensions: dimensions(),
            binding: binding(),
            condition: condition(),
            documentLanguage: documentLanguage(),
            contentDescription: contentDescription(),
            remarks: remarks(),
            accessLevel: accessLevel(),
            accessConditions: accessConditions(),
            additionalInformation: additionalInformation(),
            relatedDocumentsReferences: relatedDocumentsReferences(),
            isDigitized: isDigitized(),
            digitizedVersionLink: digitizedVersionLink(),
            tagIds: selectedTagIds(),
            topographicSignatureElementIds: topographicSignatures(),
            descriptiveSignatureElementIds: descriptiveSignatures(),
        };

         // Use safeParse to get detailed errors
         const result = createArchiveDocumentFormSchema.safeParse(formData);
         if (!result.success) {
            const errors: Partial<Record<keyof CreateArchiveDocumentFormData, string>> = {};
            result.error.errors.forEach((err: ZodIssue) => {
                 if (err.path.length > 0) {
                     // Handle nested paths if necessary, for now just take the first segment
                     errors[err.path[0] as keyof CreateArchiveDocumentFormData] = err.message;
                 }
            });
            setFormErrors(errors);
            console.log("Form validation errors:", errors);
            return false;
        }
        return true;
    };


    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        const token = authState.token;
        if (!token || !validateForm()) { // Validate on submit
            setApiError("Authentication required or form invalid.");
            return;
        }
        setApiError(null);
        setIsSubmitting(true);
        let savedElement: ArchiveDocument | null = null;

        const finalParentId = props.forcedParentId !== undefined ? props.forcedParentId : selectedParentUnitId();
        const finalTagIds = selectedTagIds();
        const finalTopoSignatures = topographicSignatures();
        const finalDescSignatures = descriptiveSignatures();

        // Helper to convert empty string/null to undefined for optional fields
        const undefinedIfEmpty = (val: string | null | undefined) => val?.trim() ? val.trim() : undefined;

        try {
            if (props.docToEdit?.archiveDocumentId) {
                // Update logic
                const doc = props.docToEdit;
                const initial = initialFormData(); // Use memoized initial state

                const updatePayload: UpdateArchiveDocumentInput = {
                    // Always send arrays
                    tagIds: finalTagIds,
                    topographicSignatureElementIds: finalTopoSignatures,
                    descriptiveSignatureElementIds: finalDescSignatures,
                };
                let hasChanges = false;

                // Compare and add changed fields
                if (finalParentId !== (initial.parentUnitArchiveDocumentId ?? null)) { updatePayload.parentUnitArchiveDocumentId = finalParentId ?? undefined; hasChanges = true; }
                if (title() !== initial.title) { updatePayload.title = title(); hasChanges = true; }
                if (creator() !== initial.creator) { updatePayload.creator = creator(); hasChanges = true; }
                if (creationDate() !== initial.creationDate) { updatePayload.creationDate = creationDate(); hasChanges = true; }
                if ((numberOfPages() ?? null) !== (initial.numberOfPages ?? null)) { updatePayload.numberOfPages = undefinedIfEmpty(numberOfPages()); hasChanges = true; }
                if ((documentType() ?? null) !== (initial.documentType ?? null)) { updatePayload.documentType = undefinedIfEmpty(documentType()); hasChanges = true; }
                if ((dimensions() ?? null) !== (initial.dimensions ?? null)) { updatePayload.dimensions = undefinedIfEmpty(dimensions()); hasChanges = true; }
                if ((binding() ?? null) !== (initial.binding ?? null)) { updatePayload.binding = undefinedIfEmpty(binding()); hasChanges = true; }
                if ((condition() ?? null) !== (initial.condition ?? null)) { updatePayload.condition = undefinedIfEmpty(condition()); hasChanges = true; }
                if ((documentLanguage() ?? null) !== (initial.documentLanguage ?? null)) { updatePayload.documentLanguage = undefinedIfEmpty(documentLanguage()); hasChanges = true; }
                if ((contentDescription() ?? null) !== (initial.contentDescription ?? null)) { updatePayload.contentDescription = undefinedIfEmpty(contentDescription()); hasChanges = true; }
                if ((remarks() ?? null) !== (initial.remarks ?? null)) { updatePayload.remarks = undefinedIfEmpty(remarks()); hasChanges = true; }
                if ((accessLevel() ?? null) !== (initial.accessLevel ?? null)) { updatePayload.accessLevel = undefinedIfEmpty(accessLevel()); hasChanges = true; }
                if ((accessConditions() ?? null) !== (initial.accessConditions ?? null)) { updatePayload.accessConditions = undefinedIfEmpty(accessConditions()); hasChanges = true; }
                if ((additionalInformation() ?? null) !== (initial.additionalInformation ?? null)) { updatePayload.additionalInformation = undefinedIfEmpty(additionalInformation()); hasChanges = true; }
                if ((relatedDocumentsReferences() ?? null) !== (initial.relatedDocumentsReferences ?? null)) { updatePayload.relatedDocumentsReferences = undefinedIfEmpty(relatedDocumentsReferences()); hasChanges = true; }
                if (isDigitized() !== initial.isDigitized) { updatePayload.isDigitized = isDigitized(); hasChanges = true; }
                if ((digitizedVersionLink() ?? null) !== (initial.digitizedVersionLink ?? null)) { updatePayload.digitizedVersionLink = undefinedIfEmpty(digitizedVersionLink()); hasChanges = true; }

                const tagsChanged = JSON.stringify(finalTagIds.sort()) !== JSON.stringify((initial.tagIds ?? []).sort());
                const topoChanged = JSON.stringify(finalTopoSignatures) !== JSON.stringify(initial.topographicSignatureElementIds ?? []);
                const descChanged = JSON.stringify(finalDescSignatures) !== JSON.stringify(initial.descriptiveSignatureElementIds ?? []);


                if (hasChanges || tagsChanged || topoChanged || descChanged) {
                     console.log("Updating archive doc:", props.docToEdit.archiveDocumentId, updatePayload);
                     savedElement = await api.updateArchiveDocument(doc.archiveDocumentId!, updatePayload, token);
                 } else {
                     console.log("No changes detected for archive item update.");
                     savedElement = props.docToEdit;
                 }

            } else {
                // Create logic
                 const createPayload: CreateArchiveDocumentInput = {
                    type: type(),
                    parentUnitArchiveDocumentId: finalParentId ?? undefined,
                    title: title(), creator: creator(), creationDate: creationDate(),
                    numberOfPages: undefinedIfEmpty(numberOfPages()), documentType: undefinedIfEmpty(documentType()),
                    dimensions: undefinedIfEmpty(dimensions()), binding: undefinedIfEmpty(binding()),
                    condition: undefinedIfEmpty(condition()), documentLanguage: undefinedIfEmpty(documentLanguage()),
                    contentDescription: undefinedIfEmpty(contentDescription()), remarks: undefinedIfEmpty(remarks()),
                    accessLevel: undefinedIfEmpty(accessLevel()), accessConditions: undefinedIfEmpty(accessConditions()),
                    additionalInformation: undefinedIfEmpty(additionalInformation()), relatedDocumentsReferences: undefinedIfEmpty(relatedDocumentsReferences()),
                    isDigitized: isDigitized() ?? false, digitizedVersionLink: undefinedIfEmpty(digitizedVersionLink()),
                    tagIds: finalTagIds,
                    topographicSignatureElementIds: finalTopoSignatures,
                    descriptiveSignatureElementIds: finalDescSignatures,
                 };
                 console.log("Creating archive doc:", createPayload);
                 savedElement = await api.createArchiveDocument(createPayload, token);
            }
            props.onSave();
        } catch (err: any) {
            const msg = err.message || 'Failed to save item';
            setApiError(msg); console.error("Save Archive Item Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper Grid Item component
    const GridItem: Component<{ children: JSX.Element; class?: string }> = (gProps) => (
        <div class={cn(styles.formGroup, gProps.class)}>{gProps.children}</div>
    );

    return (
         <Show when={!isFetchingDetails()} fallback={<div class="flex justify-center p-20"><LoadingSpinner size="lg"/></div>}>
             <form onSubmit={handleSubmit} class={styles.documentFormContainer}>
                 <Show when={apiError()}><ErrorDisplay message={apiError() ?? 'Unknown API error'} /></Show> {/* Ensure message */}
                 <Show when={isSubmitting()}><div class={styles.loadingOverlay}><LoadingSpinner /></div></Show>

                {/* --- Basic Information Section --- */}
                <Card class={styles.formSectionCard}>
                    <CardHeader class={styles.formSectionHeader}><CardTitle class={styles.formSectionTitle}>Basic Information</CardTitle></CardHeader>
                    <CardContent class={styles.formSectionContent}>
                        {/* Type Select */}
                        <GridItem>
                            <FormLabel for="doc-type" required invalid={!!formErrors().type}>Type</FormLabel>
                             {/* --- FIX: Removed validateForm() call --- */}
                            <Select value={type()} onChange={(v) => { setType(v as ArchiveDocumentType); }} id="doc-type" disabled={!!props.forceType} aria-invalid={!!formErrors().type} aria-errormessage="doc-type-error" placeholder="Select type...">
                                {/* FIX: Add SelectValue inside SelectTrigger */}
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="document">Document</SelectItem>
                                    <SelectItem value="unit">Unit</SelectItem>
                                </SelectContent>
                            </Select>
                            <Show when={formErrors().type}><p id="doc-type-error" class={styles.errorMessage}>{formErrors().type}</p></Show>
                        </GridItem>

                         {/* Parent Unit Selector/Display */}
                         <Show when={type() === 'document'}>
                             <Show when={props.forcedParentId === undefined}
                                fallback={
                                    <GridItem>
                                         <FormLabel>Parent Unit</FormLabel>
                                         <Input value={props.forcedParentTitle ? `"${props.forcedParentTitle}" (Set)` : `ID: ${props.forcedParentId} (Set)`} disabled class={styles.disabledParentInput}/>
                                    </GridItem>
                                }
                             >
                                 <GridItem>
                                     {/* --- FIX: Removed validateForm() call --- */}
                                    <UnitSelector selectedUnitId={selectedParentUnitId()} onChange={ (id) => { setSelectedParentUnitId(id); }} currentDocumentId={props.docToEdit?.archiveDocumentId}/>
                                     <Show when={formErrors().parentUnitArchiveDocumentId}><p class={styles.errorMessage}>{formErrors().parentUnitArchiveDocumentId}</p></Show>
                                 </GridItem>
                             </Show>
                         </Show>

                         {/* Title Input */}
                         <GridItem class={styles.gridSpanFull}>
                            <FormLabel for="doc-title" required invalid={!!formErrors().title}>Title</FormLabel>
                             {/* --- FIX: Removed validateForm() call --- */}
                            <Input id="doc-title" value={title()} onInput={(e) => { setTitle(e.currentTarget.value); }} required aria-invalid={!!formErrors().title} aria-errormessage="doc-title-error"/>
                            <Show when={formErrors().title}><p id="doc-title-error" class={styles.errorMessage}>{formErrors().title}</p></Show>
                         </GridItem>

                         {/* Creator Input */}
                         <GridItem>
                            <FormLabel for="doc-creator" required invalid={!!formErrors().creator}>Creator</FormLabel>
                             {/* --- FIX: Removed validateForm() call --- */}
                            <Input id="doc-creator" value={creator()} onInput={(e) => { setCreator(e.currentTarget.value); }} required aria-invalid={!!formErrors().creator} aria-errormessage="doc-creator-error"/>
                            <Show when={formErrors().creator}><p id="doc-creator-error" class={styles.errorMessage}>{formErrors().creator}</p></Show>
                         </GridItem>

                         {/* Creation Date Input */}
                          <GridItem>
                            <FormLabel for="doc-creationDate" required invalid={!!formErrors().creationDate}>Creation Date</FormLabel>
                             {/* --- FIX: Removed validateForm() call --- */}
                            <Input id="doc-creationDate" value={creationDate()} onInput={(e) => { setCreationDate(e.currentTarget.value); }} required placeholder="e.g., 2023-10-26, ca. 1950" aria-invalid={!!formErrors().creationDate} aria-errormessage="doc-creationDate-error"/>
                            <Show when={formErrors().creationDate}><p id="doc-creationDate-error" class={styles.errorMessage}>{formErrors().creationDate}</p></Show>
                          </GridItem>
                    </CardContent>
                </Card>

                 {/* --- Physical Description --- */}
                <Card class={styles.formSectionCard}>
                    <CardHeader class={styles.formSectionHeader}><CardTitle class={styles.formSectionTitle}>Physical Description</CardTitle></CardHeader>
                    <CardContent class={styles.formSectionContent}>
                         {/* --- FIX: Removed validateForm() calls from all inputs below --- */}
                        <GridItem><FormLabel for="doc-numberOfPages">Number of Pages</FormLabel><Input id="doc-numberOfPages" type="text" value={numberOfPages() ?? ''} onInput={(e) => setNumberOfPages(e.currentTarget.value || null)} /></GridItem>
                        <GridItem><FormLabel for="doc-documentType">Document Type</FormLabel><Input id="doc-documentType" value={documentType() ?? ''} onInput={(e) => setDocumentType(e.currentTarget.value || null)} placeholder="e.g., Letter, Report" /></GridItem>
                        <GridItem><FormLabel for="doc-dimensions">Dimensions</FormLabel><Input id="doc-dimensions" value={dimensions() ?? ''} onInput={(e) => setDimensions(e.currentTarget.value || null)} placeholder="e.g., 21x30 cm" /></GridItem>
                        <GridItem><FormLabel for="doc-binding">Binding</FormLabel><Input id="doc-binding" value={binding() ?? ''} onInput={(e) => setBinding(e.currentTarget.value || null)} placeholder="e.g., Bound volume" /></GridItem>
                        <GridItem class={styles.gridSpanFull}><FormLabel for="doc-condition">Condition</FormLabel><Input id="doc-condition" value={condition() ?? ''} onInput={(e) => setCondition(e.currentTarget.value || null)} placeholder="e.g., Good, Fragile" /></GridItem>
                    </CardContent>
                </Card>

                {/* --- Content & Context --- */}
                 <Card class={styles.formSectionCard}>
                    <CardHeader class={styles.formSectionHeader}><CardTitle class={styles.formSectionTitle}>Content & Context</CardTitle></CardHeader>
                    <CardContent class={styles.formSectionContent}>
                         {/* --- FIX: Removed validateForm() calls from all inputs below --- */}
                        <GridItem><FormLabel for="doc-language">Language</FormLabel><Input id="doc-language" value={documentLanguage() ?? ''} onInput={(e) => setDocumentLanguage(e.currentTarget.value || null)} placeholder="e.g., English" /></GridItem>
                        <GridItem class={styles.gridSpanFull}><FormLabel for="doc-contentDesc">Content Description</FormLabel><Textarea id="doc-contentDesc" value={contentDescription() ?? ''} onInput={(e) => setContentDescription(e.currentTarget.value || null)} rows={4} /></GridItem>
                        <GridItem class={styles.gridSpanFull}><FormLabel for="doc-remarks">Remarks</FormLabel><Textarea id="doc-remarks" value={remarks() ?? ''} onInput={(e) => setRemarks(e.currentTarget.value || null)} rows={2} /></GridItem>
                        <GridItem class={styles.gridSpanFull}><FormLabel for="doc-relatedDocs">Related Docs References</FormLabel><Textarea id="doc-relatedDocs" value={relatedDocumentsReferences() ?? ''} onInput={(e) => setRelatedDocumentsReferences(e.currentTarget.value || null)} rows={2} /></GridItem>
                        <GridItem class={styles.gridSpanFull}><FormLabel for="doc-additionalInfo">Additional Information</FormLabel><Textarea id="doc-additionalInfo" value={additionalInformation() ?? ''} onInput={(e) => setAdditionalInformation(e.currentTarget.value || null)} rows={2} /></GridItem>
                    </CardContent>
                 </Card>

                 {/* --- Access & Digitization --- */}
                <Card class={styles.formSectionCard}>
                    <CardHeader class={styles.formSectionHeader}><CardTitle class={styles.formSectionTitle}>Access & Digitization</CardTitle></CardHeader>
                    <CardContent class={styles.formSectionContent}>
                         {/* --- FIX: Removed validateForm() calls from all inputs below --- */}
                        <GridItem><FormLabel for="doc-accessLevel">Access Level</FormLabel><Input id="doc-accessLevel" value={accessLevel() ?? ''} onInput={(e) => setAccessLevel(e.currentTarget.value || null)} placeholder="e.g., Public, Restricted" /></GridItem>
                        <GridItem><FormLabel for="doc-accessConditions">Access Conditions</FormLabel><Input id="doc-accessConditions" value={accessConditions() ?? ''} onInput={(e) => setAccessConditions(e.currentTarget.value || null)} placeholder="e.g., Requires permission" /></GridItem>
                         {/* isDigitized Checkbox */}
                        <div class={cn(styles.checkboxGroup, styles.gridSpanFull)}>
                            <Checkbox id="doc-isDigitized" checked={isDigitized()} onCheckedChange={(checked) => { setIsDigitized(!!checked); /* Removed validateForm */ }} />
                            <FormLabel for="doc-isDigitized" class={styles.checkboxLabel}>Is Digitized?</FormLabel>
                        </div>
                        {/* digitizedVersionLink Input */}
                         <Show when={isDigitized()}>
                             <GridItem class={styles.gridSpanFull}>
                                <FormLabel for="doc-digitizedLink" invalid={!!formErrors().digitizedVersionLink}>Digitized Version Link</FormLabel>
                                <Input id="doc-digitizedLink" type="url" value={digitizedVersionLink() ?? ''} onInput={(e) => { setDigitizedVersionLink(e.currentTarget.value || null); /* Removed validateForm */ }} placeholder="https://..." aria-invalid={!!formErrors().digitizedVersionLink} aria-errormessage="doc-digitizedLink-error"/>
                                <Show when={formErrors().digitizedVersionLink}><p id="doc-digitizedLink-error" class={styles.errorMessage}>{formErrors().digitizedVersionLink}</p></Show>
                             </GridItem>
                         </Show>
                    </CardContent>
                </Card>

                 {/* --- Indexing --- */}
                <Card class={styles.formSectionCard}>
                    <CardHeader class={styles.formSectionHeader}><CardTitle class={styles.formSectionTitle}>Indexing</CardTitle></CardHeader>
                    <CardContent class={cn(styles.formSectionContent, styles.gridSpanFull)}>
                         {/* Signature Selectors */}
                        <SignatureSelector label="Topographic Signatures" signatures={topographicSignatures()} onChange={setTopographicSignatures} disabled={isSubmitting()} />
                        <Show when={formErrors().topographicSignatureElementIds}><p class={styles.errorMessage}>{formErrors().topographicSignatureElementIds}</p></Show>

                        <SignatureSelector label="Descriptive Signatures" signatures={descriptiveSignatures()} onChange={setDescriptiveSignatures} disabled={isSubmitting()} />
                        <Show when={formErrors().descriptiveSignatureElementIds}><p class={styles.errorMessage}>{formErrors().descriptiveSignatureElementIds}</p></Show>

                        {/* Tag Selector */}
                        <div class={styles.formGroup}>
                             <TagSelector selectedTagIds={selectedTagIds()} onChange={setSelectedTagIds} disabled={isSubmitting()} />
                             <Show when={formErrors().tagIds}><p class={styles.errorMessage}>{formErrors().tagIds}</p></Show>
                         </div>
                    </CardContent>
                </Card>

                 {/* Submit Button */}
                <div class={styles.formActions}>
                    {/* --- FIX: Simplified disabled check --- */}
                     <Button type="submit" disabled={isSubmitting() || isFetchingDetails() /* || !isDirty() - Re-enable if needed */}>
                        <Show when={isSubmitting()} fallback={props.docToEdit ? 'Update Item' : 'Create Item'}>
                            <LoadingSpinner size="sm" class={styles.iconMargin}/> Saving...
                        </Show>
                    </Button>
                </div>
            </form>
         </Show>
    );
};

export default DocumentForm;