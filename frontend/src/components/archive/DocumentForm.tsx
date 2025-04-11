import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createArchiveDocumentFormSchema } from '@/lib/zodSchemas'; // Keep type import if needed elsewhere, but rely on inference for useForm
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Use nested Cards for better form structure
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import TagSelector from '@/components/shared/TagSelector';
import SignaturePathSelector from '@/components/shared/SignaturePathSelector';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { ArchiveDocument } from '../../../../backend/src/functionalities/archive/document/models';
// Import backend input types correctly
import type { CreateArchiveDocumentInput, UpdateArchiveDocumentInput } from '../../../../backend/src/functionalities/archive/document/models';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { z } from 'zod'; // Import z for inferring type in onSubmit

// Infer the form data type directly from the schema
type CreateArchiveDocumentFormData = z.infer<typeof createArchiveDocumentFormSchema>;

interface DocumentFormProps {
  docToEdit: ArchiveDocument | null;
  onSave: () => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({ docToEdit, onSave }) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false); // Saving state
  const [isFetchingDetails, setIsFetchingDetails] = useState(false); // Loading state for edit
  const [error, setError] = useState<string | null>(null);

  // Separate state management for complex inputs
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [topographicPaths, setTopographicPaths] = useState<number[][]>([]);
  const [descriptivePaths, setDescriptivePaths] = useState<number[][]>([]);

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm({ // Remove explicit type here
    resolver: zodResolver(createArchiveDocumentFormSchema),
    // Set comprehensive default values matching the schema
    defaultValues: {
        parentUnitArchiveDocumentId: null, type: "document" as const, title: '', creator: '', creationDate: '',
        numberOfPages: null, documentType: null, dimensions: null, binding: null, condition: null,
        documentLanguage: null, contentDescription: null, remarks: null, accessLevel: null,
        accessConditions: null, additionalInformation: null, relatedDocumentsReferences: null,
        isDigitized: false, digitizedVersionLink: null, tagIds: [],
    },
  });

  // Fetch full document details when editing
  useEffect(() => {
    const populateForm = async () => {
        if (docToEdit?.archiveDocumentId && token) {
            setIsFetchingDetails(true); setError(null);
            try {
                const fullDoc = await api.getArchiveDocumentById(docToEdit.archiveDocumentId, token);
                const tagIds = fullDoc.tags?.map(t => t.tagId!) ?? [];
                // Reset RHF form state
                reset({
                    parentUnitArchiveDocumentId: fullDoc.parentUnitArchiveDocumentId ?? null,
                    type: fullDoc.type ?? 'document', title: fullDoc.title ?? '', creator: fullDoc.creator ?? '',
                    creationDate: fullDoc.creationDate ?? '',
                    // Use nullish coalescing to provide null for potentially undefined backend fields
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
                });
                // Reset local state for complex inputs
                setSelectedTagIds(tagIds);
                setTopographicPaths(fullDoc.topographicSignatureElementIds ?? []);
                setDescriptivePaths(fullDoc.descriptiveSignatureElementIds ?? []);
            } catch (err: any) {
                const msg = `Failed to load document details: ${err.message}`; setError(msg); toast.error(msg); console.error("Load Error:", err);
                reset(); setSelectedTagIds([]); setTopographicPaths([]); setDescriptivePaths([]);
            } finally { setIsFetchingDetails(false); }
        } else {
            // Reset for creating a new document
            reset(); setSelectedTagIds([]); setTopographicPaths([]); setDescriptivePaths([]);
            setError(null); setIsFetchingDetails(false);
        }
    };
    populateForm();
  }, [docToEdit, reset, token]);

  // Sync RHF hidden tagIds field with local state
  useEffect(() => { setValue('tagIds', selectedTagIds); }, [selectedTagIds, setValue]);

  // Handle form submission (Create or Update)
  // Use the inferred type for 'data'
  const onSubmit = async (data: CreateArchiveDocumentFormData) => {
    if (!token) return;
    setIsLoading(true); setError(null);

    // Exclude RHF tagIds, use local state instead
    const { tagIds: _, ...coreData } = data;

    try {
        if (docToEdit?.archiveDocumentId) {
            // --- Construct Update Payload ---
            const updatePayload: UpdateArchiveDocumentInput = {
                 ...(coreData.parentUnitArchiveDocumentId !== docToEdit.parentUnitArchiveDocumentId && { parentUnitArchiveDocumentId: coreData.parentUnitArchiveDocumentId }),
                 ...(coreData.type !== docToEdit.type && { type: coreData.type }),
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
                 ...(coreData.remarks !== docToEdit.remarks && { remarks: coreData.remarks || null }),
                 ...(coreData.accessLevel !== docToEdit.accessLevel && { accessLevel: coreData.accessLevel || undefined }),
                 ...(coreData.accessConditions !== docToEdit.accessConditions && { accessConditions: coreData.accessConditions || undefined }),
                 ...(coreData.additionalInformation !== docToEdit.additionalInformation && { additionalInformation: coreData.additionalInformation || null }),
                 ...(coreData.relatedDocumentsReferences !== docToEdit.relatedDocumentsReferences && { relatedDocumentsReferences: coreData.relatedDocumentsReferences || null }),
                 ...(coreData.isDigitized !== docToEdit.isDigitized && { isDigitized: coreData.isDigitized }),
                 ...(coreData.digitizedVersionLink !== docToEdit.digitizedVersionLink && { digitizedVersionLink: coreData.digitizedVersionLink || null }),
                 tagIds: selectedTagIds,
                 topographicSignatureElementIds: topographicPaths,
                 descriptiveSignatureElementIds: descriptivePaths,
            };
            await api.updateArchiveDocument(docToEdit.archiveDocumentId, updatePayload, token);
        } else {
             // --- Construct Create Payload ---
             const createPayload: CreateArchiveDocumentInput = {
                type: coreData.type,
                title: coreData.title,
                creator: coreData.creator,
                creationDate: coreData.creationDate,
                parentUnitArchiveDocumentId: coreData.parentUnitArchiveDocumentId ?? undefined,
                numberOfPages: coreData.numberOfPages ?? '',
                documentType: coreData.documentType ?? '',
                dimensions: coreData.dimensions ?? '',
                binding: coreData.binding ?? '',
                condition: coreData.condition ?? '',
                documentLanguage: coreData.documentLanguage ?? '',
                contentDescription: coreData.contentDescription ?? '',
                accessLevel: coreData.accessLevel ?? '',
                accessConditions: coreData.accessConditions ?? '',
                isDigitized: coreData.isDigitized ?? false,
                remarks: coreData.remarks ?? undefined,
                additionalInformation: coreData.additionalInformation ?? undefined,
                relatedDocumentsReferences: coreData.relatedDocumentsReferences ?? undefined,
                digitizedVersionLink: coreData.digitizedVersionLink ?? undefined,
                tagIds: selectedTagIds,
                topographicSignatureElementIds: topographicPaths,
                descriptiveSignatureElementIds: descriptivePaths,
             };
            await api.createArchiveDocument(createPayload, token);
        }
        onSave(); // Trigger success callback
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

  // Show loading spinner while fetching details
  if (isFetchingDetails) {
      return <div className="flex justify-center items-center p-20"><LoadingSpinner /></div>;
  }

  return (
    <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 relative"
    >
       {/* Loading overlay during save */}
       {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-20 rounded-md'><LoadingSpinner/></div>}
       {/* Sticky error display */}
       {error && <ErrorDisplay message={error} className="mb-4 sticky top-0 z-10 bg-destructive/20 backdrop-blur-sm p-3" />}

       {/* --- Basic Information --- */}
        <Card>
            <CardHeader><CardTitle className='text-lg'>Basic Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <GridItem>
                    <Label htmlFor="doc-type">Type *</Label>
                    <Controller control={control} name="type" render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger id='doc-type' aria-invalid={!!errors.type} className={cn(errors.type && "border-destructive")}> <SelectValue placeholder="Select type..." /> </SelectTrigger> <SelectContent> <SelectItem value="document">Document</SelectItem> <SelectItem value="unit">Unit</SelectItem> </SelectContent> </Select> )} />
                    {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
                </GridItem>
                <GridItem>
                     <Label htmlFor="doc-parent">Parent Unit ID (Optional)</Label>
                     <Input id="doc-parent" type="number" {...register('parentUnitArchiveDocumentId')} placeholder="Enter ID of parent unit" aria-invalid={!!errors.parentUnitArchiveDocumentId} className={cn(errors.parentUnitArchiveDocumentId && "border-destructive")} />
                     {errors.parentUnitArchiveDocumentId && <p className="text-xs text-destructive">{errors.parentUnitArchiveDocumentId.message}</p>}
                 </GridItem>
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

        {/* --- Physical Description --- */}
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

         {/* --- Content & Context --- */}
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

         {/* --- Access & Digitization --- */}
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

         {/* --- Signatures & Tags --- */}
         <Card>
             <CardHeader><CardTitle className='text-lg'>Signatures & Tags</CardTitle></CardHeader>
             {/* Added items-start to align items at the top of their grid cells */}
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                 {/* Added min-w-0 */}
                 <SignaturePathSelector
                     label="Topographic Signatures"
                     elementIdPaths={topographicPaths}
                     onChange={setTopographicPaths}
                     className="min-w-0"
                 />
                 <br></br>
                 {/* Added min-w-0 */}
                 <SignaturePathSelector
                     label="Descriptive Signatures"
                     elementIdPaths={descriptivePaths}
                     onChange={setDescriptivePaths}
                     className="min-w-0"
                 />
                 {/* Tags section spans full width */}
                 <div className="md:col-span-2 grid gap-1.5">
                     <Label>Tags</Label>
                     <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
                     <input type="hidden" {...register('tagIds')} />
                     {errors.tagIds && <p className="text-xs text-destructive">{typeof errors.tagIds.message === 'string' ? errors.tagIds.message : 'Invalid tag selection'}</p>}
                 </div>
             </CardContent>
         </Card>

        {/* Submit button */}
        <div className="pt-2 flex justify-start">
            <Button type="submit" disabled={isLoading || isFetchingDetails}>
                {isLoading ? <LoadingSpinner size="sm" className='mr-2' /> : (docToEdit ? 'Update Document/Unit' : 'Create Document/Unit')}
            </Button>
        </div>
    </form>
  );
};

export default DocumentForm;