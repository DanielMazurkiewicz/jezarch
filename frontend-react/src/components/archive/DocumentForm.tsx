import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form'; // Import SubmitHandler
import { zodResolver } from '@hookform/resolvers/zod';
import { createArchiveDocumentFormSchema } from '@/lib/zodSchemas'; // Schema updated here
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import TagSelector from '@/components/shared/TagSelector';
// --- UPDATED: Removed SignatureSelector import for topographic ---
import SignatureSelector from '@/components/shared/SignatureSelector'; // Keep for descriptive
import UnitSelector from './UnitSelector'; // Added UnitSelector import
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
// Import ArchiveDocumentType
import type { ArchiveDocument, ArchiveDocumentType } from '../../../../backend/src/functionalities/archive/document/models';
import type { CreateArchiveDocumentInput, UpdateArchiveDocumentInput } from '../../../../backend/src/functionalities/archive/document/models';
// Removed unused imports
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { z } from 'zod';


type CreateArchiveDocumentFormData = z.infer<typeof createArchiveDocumentFormSchema>;

interface DocumentFormProps {
  docToEdit: ArchiveDocument | null;
  onSave: () => void;
  forceType?: ArchiveDocumentType;
  forcedParentId?: number;
  // Added prop to pass the parent unit's title when creating inside a unit
  forcedParentTitle?: string;
  onTypeChange?: (type: ArchiveDocumentType) => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({
    docToEdit,
    onSave,
    forceType,
    forcedParentId,
    // Destructure the new prop
    forcedParentTitle,
    onTypeChange
}) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Separate state for complex inputs
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  // --- REMOVED: State for topographicSignatures ---
  // --- Kept state for descriptiveSignatures ---
  const [descriptiveSignatures, setDescriptiveSignatures] = useState<number[][]>([]);
  // State for UnitSelector
  const [selectedParentUnitId, setSelectedParentUnitId] = useState<number | null>(forcedParentId ?? null);

  // Fixed: Remove explicit type from useForm, let inference work with zodResolver
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(createArchiveDocumentFormSchema),
    defaultValues: {
        // Set initial type based on forceType or default to 'document'
        parentUnitArchiveDocumentId: forcedParentId ?? null,
        type: forceType ?? "document",
        title: '', creator: '', creationDate: '',
        numberOfPages: null, documentType: null, dimensions: null, binding: null, condition: null,
        documentLanguage: null, contentDescription: null, remarks: null, accessLevel: null,
        accessConditions: null, additionalInformation: null, relatedDocumentsReferences: null,
        isDigitized: false, digitizedVersionLink: null, tagIds: [],
        // --- UPDATED: Initialize topographicSignature string ---
        topographicSignature: null,
        // Initialize descriptive signature field in RHF although managed by state
        descriptiveSignatureElementIds: [],
    },
  });

  // Watch the 'type' field to conditionally show parent selector and update dialog title
  const watchedType = watch('type');
  useEffect(() => {
    onTypeChange?.(watchedType); // Notify parent about type change for title
  }, [watchedType, onTypeChange]);

  // Watch the parent ID from UnitSelector to update RHF
  useEffect(() => {
    // Only set RHF value if not forcing parent ID (i.e., not creating within a unit context)
    if (forcedParentId === undefined) {
        setValue('parentUnitArchiveDocumentId', selectedParentUnitId);
    }
  }, [selectedParentUnitId, setValue, forcedParentId]);


  // Fetch full document details when editing
  useEffect(() => {
    const populateForm = async () => {
        if (docToEdit?.archiveDocumentId && token) {
            setIsFetchingDetails(true); setError(null);
            try {
                const fullDoc = await api.getArchiveDocumentById(docToEdit.archiveDocumentId, token);
                const tagIds = fullDoc.tags?.map(t => t.tagId!) ?? [];
                const parentId = fullDoc.parentUnitArchiveDocumentId ?? null;
                // --- UPDATED: Use topographicSignature string ---
                const topoSignature = fullDoc.topographicSignature ?? null;
                const descSignatures = fullDoc.descriptiveSignatureElementIds ?? [];

                reset({
                    parentUnitArchiveDocumentId: forcedParentId ?? parentId,
                    // Ensure type is set from fetched doc, respecting forceType if present
                    type: forceType ?? fullDoc.type ?? 'document',
                    title: fullDoc.title ?? '', creator: fullDoc.creator ?? '',
                    creationDate: fullDoc.creationDate ?? '',
                    numberOfPages: fullDoc.numberOfPages ?? null,
                    documentType: fullDoc.documentType ?? null,
                    dimensions: fullDoc.dimensions ?? null,
                    binding: fullDoc.binding ?? null,
                    condition: fullDoc.condition ?? null,
                    documentLanguage: fullDoc.documentLanguage ?? null,
                    contentDescription: fullDoc.contentDescription ?? null,
                    remarks: fullDoc.remarks ?? null,
                    accessLevel: fullDoc.accessLevel ?? null,
                    accessConditions: fullDoc.accessConditions ?? null,
                    additionalInformation: fullDoc.additionalInformation ?? null,
                    relatedDocumentsReferences: fullDoc.relatedDocumentsReferences ?? null,
                    isDigitized: fullDoc.isDigitized ?? false,
                    digitizedVersionLink: fullDoc.digitizedVersionLink ?? null,
                    tagIds: tagIds,
                    // --- UPDATED: Set topographicSignature ---
                    topographicSignature: topoSignature,
                    descriptiveSignatureElementIds: descSignatures,
                });
                setSelectedTagIds(tagIds);
                // --- REMOVED: setTopographicSignatures ---
                setDescriptiveSignatures(descSignatures);
                if (forcedParentId === undefined) {
                     setSelectedParentUnitId(parentId);
                }
            } catch (err: any) {
                const msg = `Failed to load document details: ${err.message}`; setError(msg); toast.error(msg); console.error("Load Error:", err);
                 reset({
                    parentUnitArchiveDocumentId: forcedParentId ?? docToEdit.parentUnitArchiveDocumentId ?? null,
                    type: forceType ?? docToEdit.type ?? 'document',
                    title: docToEdit.title ?? '', creator: docToEdit.creator ?? '',
                    creationDate: docToEdit.creationDate ?? '',
                    tagIds: docToEdit.tags?.map(t => t.tagId!) ?? [],
                    // --- UPDATED: Set topographicSignature ---
                    topographicSignature: docToEdit.topographicSignature ?? null,
                    descriptiveSignatureElementIds: docToEdit.descriptiveSignatureElementIds ?? [],
                 });
                 setSelectedTagIds(docToEdit.tags?.map(t => t.tagId!) ?? []);
                 // --- REMOVED: setTopographicSignatures ---
                 setDescriptiveSignatures(docToEdit.descriptiveSignatureElementIds ?? []);
                 setSelectedParentUnitId(forcedParentId ?? docToEdit.parentUnitArchiveDocumentId ?? null);
            } finally { setIsFetchingDetails(false); }
        } else {
            reset({
                parentUnitArchiveDocumentId: forcedParentId ?? null,
                type: forceType ?? 'document',
                title: '', creator: '', creationDate: '',
                tagIds: [],
                // --- UPDATED: topographicSignature ---
                topographicSignature: null,
                descriptiveSignatureElementIds: [],
            });
            setSelectedTagIds([]);
            // --- REMOVED: setTopographicSignatures ---
            setDescriptiveSignatures([]);
            setSelectedParentUnitId(forcedParentId ?? null);
            setError(null); setIsFetchingDetails(false);
        }
    };
    populateForm();
  }, [docToEdit, reset, token, forceType, forcedParentId]);

  // Sync RHF hidden fields with local state for validation purposes if needed
  useEffect(() => { setValue('tagIds', selectedTagIds); }, [selectedTagIds, setValue]);
  // --- REMOVED: Sync for topographicSignatures ---
  useEffect(() => { setValue('descriptiveSignatureElementIds', descriptiveSignatures); }, [descriptiveSignatures, setValue]);


  // Handle form submission (Create or Update)
  const onSubmit: SubmitHandler<CreateArchiveDocumentFormData> = async (data) => {
    if (!token) return;
    setIsLoading(true); setError(null);

    const finalParentId = forcedParentId !== undefined ? forcedParentId : selectedParentUnitId;
    // --- UPDATED: Destructure includes topographicSignature, excludes element IDs ---
    // Also exclude 'type' when updating, as it shouldn't change
    const { tagIds: _, parentUnitArchiveDocumentId: __, type: _____, topographicSignatureElementIds: ______, descriptiveSignatureElementIds: _______, ...coreData } = data;

    try {
        if (docToEdit?.archiveDocumentId) {
            // --- UPDATED: Include topographicSignature in update payload ---
            // Removed 'type' from the payload calculation
            const updatePayload: UpdateArchiveDocumentInput = {
                 ...(finalParentId !== (docToEdit.parentUnitArchiveDocumentId ?? null) && { parentUnitArchiveDocumentId: finalParentId ?? undefined }),
                 ...(coreData.title !== docToEdit.title && { title: coreData.title }),
                 ...(coreData.creator !== docToEdit.creator && { creator: coreData.creator }),
                 ...(coreData.creationDate !== docToEdit.creationDate && { creationDate: coreData.creationDate }),
                 ...(coreData.numberOfPages !== docToEdit.numberOfPages && { numberOfPages: coreData.numberOfPages || undefined }),
                 ...(coreData.documentType !== docToEdit.documentType && { documentType: coreData.documentType || undefined }),
                 ...(coreData.dimensions !== docToEdit.dimensions && { dimensions: coreData.dimensions || undefined }),
                 ...(coreData.binding !== docToEdit.binding && { binding: coreData.binding || undefined }),
                 ...(coreData.condition !== docToEdit.condition && { condition: coreData.condition || undefined }),
                 ...(coreData.documentLanguage !== docToEdit.documentLanguage && { documentLanguage: coreData.documentLanguage || undefined }),
                 ...(coreData.contentDescription !== docToEdit.contentDescription && { contentDescription: coreData.contentDescription || undefined }),
                 ...(coreData.remarks !== docToEdit.remarks && { remarks: coreData.remarks || undefined }),
                 ...(coreData.accessLevel !== docToEdit.accessLevel && { accessLevel: coreData.accessLevel || undefined }),
                 ...(coreData.accessConditions !== docToEdit.accessConditions && { accessConditions: coreData.accessConditions || undefined }),
                 ...(coreData.additionalInformation !== docToEdit.additionalInformation && { additionalInformation: coreData.additionalInformation || undefined }),
                 ...(coreData.relatedDocumentsReferences !== docToEdit.relatedDocumentsReferences && { relatedDocumentsReferences: coreData.relatedDocumentsReferences || undefined }),
                 ...(coreData.isDigitized !== docToEdit.isDigitized && { isDigitized: coreData.isDigitized }),
                 ...(coreData.digitizedVersionLink !== docToEdit.digitizedVersionLink && { digitizedVersionLink: coreData.digitizedVersionLink || undefined }),
                 // --- UPDATED: Include topographicSignature if changed ---
                 ...(coreData.topographicSignature !== docToEdit.topographicSignature && { topographicSignature: coreData.topographicSignature ?? null }),
                 tagIds: selectedTagIds,
                 descriptiveSignatureElementIds: descriptiveSignatures,
            };
            // --- UPDATED: Check logic needs to account for topographicSignature ---
            const hasCoreChanges = Object.keys(updatePayload).some(k => !['tagIds', 'descriptiveSignatureElementIds', 'parentUnitArchiveDocumentId'].includes(k));
            const tagsChanged = JSON.stringify(selectedTagIds.sort()) !== JSON.stringify((docToEdit.tags?.map(t => t.tagId!) ?? []).sort());
            const descChanged = JSON.stringify(descriptiveSignatures) !== JSON.stringify(docToEdit.descriptiveSignatureElementIds ?? []);
            const parentChanged = finalParentId !== (docToEdit.parentUnitArchiveDocumentId ?? null);

            if (hasCoreChanges || tagsChanged || descChanged || parentChanged) {
                 await api.updateArchiveDocument(docToEdit.archiveDocumentId, updatePayload, token);
            } else {
                toast.info("No changes detected.");
                onSave();
                setIsLoading(false);
                return;
            }

        } else {
             // --- UPDATED: Create payload includes topographicSignature ---
             const createPayload: CreateArchiveDocumentInput = {
                type: data.type, // Use 'type' from original data for create
                title: coreData.title,
                creator: coreData.creator,
                creationDate: coreData.creationDate,
                parentUnitArchiveDocumentId: finalParentId ?? undefined,
                numberOfPages: coreData.numberOfPages ?? undefined,
                documentType: coreData.documentType ?? undefined,
                dimensions: coreData.dimensions ?? undefined,
                binding: coreData.binding ?? undefined,
                condition: coreData.condition ?? undefined,
                documentLanguage: coreData.documentLanguage ?? undefined,
                contentDescription: coreData.contentDescription ?? undefined,
                accessLevel: coreData.accessLevel ?? undefined,
                accessConditions: coreData.accessConditions ?? undefined,
                isDigitized: coreData.isDigitized ?? false,
                remarks: coreData.remarks ?? undefined,
                additionalInformation: coreData.additionalInformation ?? undefined,
                relatedDocumentsReferences: coreData.relatedDocumentsReferences ?? undefined,
                digitizedVersionLink: coreData.digitizedVersionLink ?? undefined,
                // --- UPDATED: Pass topographicSignature ---
                topographicSignature: coreData.topographicSignature ?? undefined,
                tagIds: selectedTagIds,
                descriptiveSignatureElementIds: descriptiveSignatures,
             };
            await api.createArchiveDocument(createPayload, token);
        }
        onSave();
    } catch (err: any) {
      const msg = err.message || 'Failed to save document/unit';
      setError(msg); toast.error(`Error saving: ${msg}`); console.error("Save Error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  // Helper for consistent form item layout
  const GridItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("grid gap-1.5", className)}>{children}</div>
  );

  if (isFetchingDetails) {
      return <div className="flex justify-center items-center p-20"><LoadingSpinner /></div>;
  }

  return (
    <form
        onSubmit={handleSubmit(onSubmit as SubmitHandler<CreateArchiveDocumentFormData>)}
        className="space-y-6 relative p-1 pr-3"
    >
        {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-20 rounded-md'><LoadingSpinner/></div>}
        {error && <ErrorDisplay message={error} className="mb-4 sticky top-0 z-10 bg-destructive/20 backdrop-blur-sm p-3" />}

        {/* --- Basic Information --- (Parent Unit logic unchanged) */}
        <Card>
            <CardHeader><CardTitle className='text-lg'>Basic Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <GridItem>
                    <Label htmlFor="doc-type">Type *</Label>
                    <Controller control={control} name="type" render={({ field }) => (
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            // Disable if editing or if type is forced
                            disabled={!!docToEdit || !!forceType}
                            >
                            <SelectTrigger
                                id='doc-type'
                                aria-invalid={!!errors.type}
                                className={cn(errors.type && "border-destructive", (!!docToEdit || !!forceType) && "text-muted-foreground")}
                            >
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="document">Document</SelectItem>
                                <SelectItem value="unit">Unit</SelectItem>
                            </SelectContent>
                        </Select>
                    )} />
                    {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
                     {/* Add tooltip or text indicating why it's disabled */}
                     {(!!docToEdit || !!forceType) && <p className="text-xs text-muted-foreground italic">Type cannot be changed after creation.</p>}
                </GridItem>
                {watchedType === 'document' && forcedParentId === undefined && (
                    <GridItem>
                        <Label htmlFor="doc-parent">Parent Unit (Optional)</Label>
                        <UnitSelector selectedUnitId={selectedParentUnitId} onChange={setSelectedParentUnitId} currentDocumentId={docToEdit?.archiveDocumentId} />
                        <input type="hidden" {...register('parentUnitArchiveDocumentId')} />
                        {errors.parentUnitArchiveDocumentId && <p className="text-xs text-destructive">{errors.parentUnitArchiveDocumentId.message}</p>}
                    </GridItem>
                )}
                {watchedType === 'document' && forcedParentId !== undefined && (
                    <GridItem>
                        <Label>Parent Unit</Label>
                        <Input value={forcedParentTitle ? `"${forcedParentTitle}" (Set by context)` : `ID: ${forcedParentId} (Set by context)`} disabled className='text-muted-foreground'/>
                    </GridItem>
                )}
                <GridItem className="md:col-span-2">
                    <Label htmlFor="doc-title">Title *</Label>
                    <Input id="doc-title" {...register('title')} aria-invalid={!!errors.title} className={cn(errors.title && "border-destructive")}/>
                    {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </GridItem>
                <GridItem>
                    <Label htmlFor="doc-creator">Creator *</Label>
                    <Input id="doc-creator" {...register('creator')} aria-invalid={!!errors.creator} className={cn(errors.creator && "border-destructive")}/>
                    {errors.creator && <p className="text-xs text-destructive">{errors.creator.message}</p>}
                </GridItem>
                <GridItem>
                    <Label htmlFor="doc-creationDate">Creation Date *</Label>
                    <Input id="doc-creationDate" {...register('creationDate')} placeholder="e.g., 2023-10-26, ca. 1950" aria-invalid={!!errors.creationDate} className={cn(errors.creationDate && "border-destructive")}/>
                    {errors.creationDate && <p className="text-xs text-destructive">{errors.creationDate.message}</p>}
                </GridItem>
            </CardContent>
        </Card>

        {/* --- Physical Description --- (Unchanged) */}
        <Card>
            <CardHeader><CardTitle className='text-lg'>Physical Description</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <GridItem><Label htmlFor="doc-pages">Number of Pages</Label><Input id="doc-pages" {...register('numberOfPages')} /></GridItem>
                <GridItem><Label htmlFor="doc-docType">Document Type</Label><Input id="doc-docType" {...register('documentType')} placeholder="e.g., Letter, Report, Map" /></GridItem>
                <GridItem><Label htmlFor="doc-dimensions">Dimensions</Label><Input id="doc-dimensions" {...register('dimensions')} placeholder="e.g., 21x30 cm"/></GridItem>
                <GridItem><Label htmlFor="doc-binding">Binding</Label><Input id="doc-binding" {...register('binding')} placeholder="e.g., Bound volume, Loose leaf" /></GridItem>
                <GridItem className="md:col-span-2"><Label htmlFor="doc-condition">Condition</Label><Input id="doc-condition" {...register('condition')} placeholder="e.g., Good, Fragile, Water damage" /></GridItem>
            </CardContent>
        </Card>

        {/* --- Content & Context --- (Unchanged) */}
        <Card>
            <CardHeader><CardTitle className='text-lg'>Content & Context</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
                <GridItem><Label htmlFor="doc-language">Document Language</Label><Input id="doc-language" {...register('documentLanguage')} placeholder="e.g., English, German" /></GridItem>
                <GridItem><Label htmlFor="doc-contentDesc">Content Description</Label><Textarea id="doc-contentDesc" {...register('contentDescription')} rows={4} placeholder="Summary of the document's content..." /></GridItem>
                <GridItem><Label htmlFor="doc-remarks">Remarks</Label><Textarea id="doc-remarks" {...register('remarks')} rows={2} placeholder="Any additional remarks..." /></GridItem>
                <GridItem><Label htmlFor="doc-related">Related Documents References</Label><Textarea id="doc-related" {...register('relatedDocumentsReferences')} rows={2} placeholder="Links or references to related materials..." /></GridItem>
                <GridItem><Label htmlFor="doc-additionalInfo">Additional Information</Label><Textarea id="doc-additionalInfo" {...register('additionalInformation')} rows={2} placeholder="Other relevant info..." /></GridItem>
            </CardContent>
        </Card>

        {/* --- Access & Digitization --- (Unchanged) */}
        <Card>
            <CardHeader><CardTitle className='text-lg'>Access & Digitization</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <GridItem><Label htmlFor="doc-accessLevel">Access Level</Label><Input id="doc-accessLevel" {...register('accessLevel')} placeholder="e.g., Public, Restricted" /></GridItem>
                <GridItem><Label htmlFor="doc-accessCond">Access Conditions</Label><Input id="doc-accessCond" {...register('accessConditions')} placeholder="e.g., Requires permission" /></GridItem>
                <GridItem className="flex items-center space-x-2 md:col-span-2 pt-1">
                    <Controller control={control} name="isDigitized" render={({ field }) => ( <Checkbox id="doc-digitized" checked={field.value} onCheckedChange={field.onChange} /> )} />
                    <Label htmlFor="doc-digitized" className='cursor-pointer font-normal'>Is Digitized?</Label>
                </GridItem>
                {watch('isDigitized') && (
                    <GridItem className="md:col-span-2">
                        <Label htmlFor="doc-digitizedLink">Digitized Version Link</Label>
                        <Input id="doc-digitizedLink" {...register('digitizedVersionLink')} type="url" placeholder="https://..." aria-invalid={!!errors.digitizedVersionLink} className={cn(errors.digitizedVersionLink && "border-destructive")}/>
                        {errors.digitizedVersionLink && <p className="text-xs text-destructive">{errors.digitizedVersionLink.message}</p>}
                    </GridItem>
                )}
            </CardContent>
        </Card>

        {/* --- Indexing (Signatures & Tags) --- */}
        <Card>
            <CardHeader><CardTitle className='text-lg'>Indexing</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 items-start">
                 {/* --- UPDATED: Simple Input for Topographic Signature --- */}
                 <GridItem>
                     <Label htmlFor="doc-topo-sig">Topographic Signature (Optional)</Label>
                     <Input
                        id="doc-topo-sig"
                        {...register('topographicSignature')}
                        placeholder="e.g., Box 1, Folder 5, Item 3"
                        aria-invalid={!!errors.topographicSignature}
                        className={cn(errors.topographicSignature && "border-destructive")}
                     />
                    {errors.topographicSignature && <p className="text-xs text-destructive">{errors.topographicSignature.message}</p>}
                 </GridItem>

                {/* --- Kept SignatureSelector for Descriptive Signatures --- */}
                <SignatureSelector
                    label="Descriptive Signatures"
                    signatures={descriptiveSignatures}
                    onChange={setDescriptiveSignatures}
                    className="min-w-0"
                />
                <input type="hidden" {...register('descriptiveSignatureElementIds')} />
                {errors.descriptiveSignatureElementIds && <p className="text-xs text-destructive">{errors.descriptiveSignatureElementIds.message}</p>}

                {/* Tag Selector (Unchanged) */}
                <div className="grid gap-1.5">
                    <Label>Tags</Label>
                    <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
                    <input type="hidden" {...register('tagIds')} />
                    {errors.tagIds && <p className="text-xs text-destructive">{typeof errors.tagIds.message === 'string' ? errors.tagIds.message : 'Invalid tag selection'}</p>}
                </div>
            </CardContent>
        </Card>

        {/* Submit button (Unchanged) */}
        <div className="pt-2 flex justify-start sticky bottom-0 bg-background pb-1">
            <Button type="submit" disabled={isLoading || isFetchingDetails}>
                {isLoading ? <LoadingSpinner size="sm" className='mr-2' /> : (docToEdit ? 'Update Item' : 'Create Item')}
            </Button>
        </div>
    </form>

  );
};

export default DocumentForm;