import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createArchiveDocumentFormSchema, CreateArchiveDocumentFormData } from '@/lib/zodSchemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import TagSelector from '@/components/shared/TagSelector';
import SignaturePathSelector from '@/components/shared/SignaturePathSelector';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { ArchiveDocument } from '../../../../backend/src/functionalities/archive/document/models';
import type { CreateArchiveDocumentInput, UpdateArchiveDocumentInput } from '../../../../backend/src/functionalities/archive/document/models';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

interface DocumentFormProps {
  docToEdit: ArchiveDocument | null;
  onSave: () => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({ docToEdit, onSave }) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [topographicPaths, setTopographicPaths] = useState<number[][]>([]);
  const [descriptivePaths, setDescriptivePaths] = useState<number[][]>([]);

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<CreateArchiveDocumentFormData>({
    resolver: zodResolver(createArchiveDocumentFormSchema),
    defaultValues: { /* Default values remain the same */
        parentUnitArchiveDocumentId: null,
        type: "document", title: '', creator: '', creationDate: '', numberOfPages: '', documentType: '', dimensions: '',
        binding: '', condition: '', documentLanguage: '', contentDescription: '', remarks: '',
        accessLevel: '', accessConditions: '', additionalInformation: '', relatedDocumentsReferences: '',
        isDigitized: false, digitizedVersionLink: '', tagIds: [],
    },
  });

  // useEffect for populating form remains the same
  useEffect(() => {
    const populateForm = async () => {
        if (docToEdit?.archiveDocumentId && token) {
            setIsFetchingDetails(true); setError(null);
            try {
                const fullDoc = await api.getArchiveDocumentById(docToEdit.archiveDocumentId, token);
                const tagIds = fullDoc.tags?.map(t => t.tagId!) ?? [];
                reset({
                    parentUnitArchiveDocumentId: fullDoc.parentUnitArchiveDocumentId ?? null,
                    type: fullDoc.type ?? 'document', title: fullDoc.title ?? '', creator: fullDoc.creator ?? '',
                    creationDate: fullDoc.creationDate ?? '', numberOfPages: fullDoc.numberOfPages ?? '',
                    documentType: fullDoc.documentType ?? '', dimensions: fullDoc.dimensions ?? '',
                    binding: fullDoc.binding ?? '', condition: fullDoc.condition ?? '',
                    documentLanguage: fullDoc.documentLanguage ?? '', contentDescription: fullDoc.contentDescription ?? '',
                    remarks: fullDoc.remarks ?? '', accessLevel: fullDoc.accessLevel ?? '',
                    accessConditions: fullDoc.accessConditions ?? '', additionalInformation: fullDoc.additionalInformation ?? '',
                    relatedDocumentsReferences: fullDoc.relatedDocumentsReferences ?? '',
                    isDigitized: fullDoc.isDigitized ?? false, digitizedVersionLink: fullDoc.digitizedVersionLink ?? '',
                    tagIds: tagIds,
                });
                setSelectedTagIds(tagIds); setTopographicPaths(fullDoc.topographicSignatureElementIds ?? []); setDescriptivePaths(fullDoc.descriptiveSignatureElementIds ?? []);
            } catch (err: any) {
                const msg = "Failed to load document details."; setError(msg); toast.error(msg); console.error("Load Error:", err);
                reset(); setSelectedTagIds([]); setTopographicPaths([]); setDescriptivePaths([]);
            } finally { setIsFetchingDetails(false); }
        } else {
            reset(); setSelectedTagIds([]); setTopographicPaths([]); setDescriptivePaths([]);
            setError(null); setIsFetchingDetails(false);
        }
    };
    populateForm();
  }, [docToEdit, reset, token]);

  useEffect(() => { setValue('tagIds', selectedTagIds); }, [selectedTagIds, setValue]);

  const onSubmit = async (data: CreateArchiveDocumentFormData) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    const { tagIds: _, ...coreData } = data;

    try {
        if (docToEdit?.archiveDocumentId) {
            // --- Construct Update Payload ---
            const updatePayload: UpdateArchiveDocumentInput = {
                ...(coreData.parentUnitArchiveDocumentId !== docToEdit.parentUnitArchiveDocumentId && { parentUnitArchiveDocumentId: coreData.parentUnitArchiveDocumentId ? Number(coreData.parentUnitArchiveDocumentId) : null }),
                ...(coreData.type !== docToEdit.type && { type: coreData.type }),
                ...(coreData.title !== docToEdit.title && { title: coreData.title }),
                ...(coreData.creator !== docToEdit.creator && { creator: coreData.creator }),
                ...(coreData.creationDate !== docToEdit.creationDate && { creationDate: coreData.creationDate }),
                // Provide default empty string '' if optional fields are null/undefined in form data but required as string in API type
                ...(coreData.numberOfPages !== docToEdit.numberOfPages && { numberOfPages: coreData.numberOfPages ?? '' }),
                ...(coreData.documentType !== docToEdit.documentType && { documentType: coreData.documentType ?? '' }),
                ...(coreData.dimensions !== docToEdit.dimensions && { dimensions: coreData.dimensions ?? '' }),
                ...(coreData.binding !== docToEdit.binding && { binding: coreData.binding ?? '' }),
                ...(coreData.condition !== docToEdit.condition && { condition: coreData.condition ?? '' }),
                ...(coreData.documentLanguage !== docToEdit.documentLanguage && { documentLanguage: coreData.documentLanguage ?? '' }),
                ...(coreData.contentDescription !== docToEdit.contentDescription && { contentDescription: coreData.contentDescription ?? '' }),
                // These can be null
                ...(coreData.remarks !== docToEdit.remarks && { remarks: coreData.remarks ?? null }),
                // Default these back to string if needed by API, even if optional
                ...(coreData.accessLevel !== docToEdit.accessLevel && { accessLevel: coreData.accessLevel ?? '' }),
                ...(coreData.accessConditions !== docToEdit.accessConditions && { accessConditions: coreData.accessConditions ?? '' }),
                // These can be null
                ...(coreData.additionalInformation !== docToEdit.additionalInformation && { additionalInformation: coreData.additionalInformation ?? null }),
                ...(coreData.relatedDocumentsReferences !== docToEdit.relatedDocumentsReferences && { relatedDocumentsReferences: coreData.relatedDocumentsReferences ?? null }),
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
                // Required fields
                type: coreData.type,
                title: coreData.title,
                creator: coreData.creator,
                creationDate: coreData.creationDate,
                // Optional fields - ensure they match backend expectations (string vs null/undefined)
                parentUnitArchiveDocumentId: coreData.parentUnitArchiveDocumentId ? Number(coreData.parentUnitArchiveDocumentId) : null,
                numberOfPages: coreData.numberOfPages ?? '', // Provide default empty string
                documentType: coreData.documentType ?? '', // Provide default empty string
                dimensions: coreData.dimensions ?? '', // Provide default empty string
                binding: coreData.binding ?? '', // Provide default empty string
                condition: coreData.condition ?? '', // Provide default empty string
                documentLanguage: coreData.documentLanguage ?? '', // Provide default empty string
                contentDescription: coreData.contentDescription ?? '', // Provide default empty string
                remarks: coreData.remarks ?? null,
                accessLevel: coreData.accessLevel ?? '', // Provide default empty string
                accessConditions: coreData.accessConditions ?? '', // Provide default empty string
                additionalInformation: coreData.additionalInformation ?? null,
                relatedDocumentsReferences: coreData.relatedDocumentsReferences ?? null,
                isDigitized: coreData.isDigitized ?? false,
                digitizedVersionLink: coreData.digitizedVersionLink || null,
                tagIds: selectedTagIds,
                topographicSignatureElementIds: topographicPaths,
                descriptiveSignatureElementIds: descriptivePaths,
             };
            await api.createArchiveDocument(createPayload, token);
        }
        onSave();
    } catch (err: any) {
      const msg = err.message || 'Failed to save document';
      setError(msg); toast.error(`Error saving: ${msg}`); console.error("Save Document Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // GridItem helper and JSX structure remain the same
  const GridItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => <div className={cn("grid gap-1.5", className)}>{children}</div>;
  if (isFetchingDetails) return <div className="flex justify-center items-center p-20"><LoadingSpinner /></div>;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-3 relative">
       {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-20 rounded-md'><LoadingSpinner/></div>}
       {error && <ErrorDisplay message={error} className="mb-4 sticky top-0 z-10 bg-destructive/20" />}
       {/* Sections */}
        <Card> <CardHeader><CardTitle className='text-lg'>Basic Information</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"> <GridItem> <Label htmlFor="doc-type">Type *</Label> <Controller control={control} name="type" render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger id='doc-type' aria-invalid={errors.type ? "true" : "false"}> <SelectValue placeholder="Select type..." /> </SelectTrigger> <SelectContent> <SelectItem value="document">Document</SelectItem> <SelectItem value="unit">Unit</SelectItem> </SelectContent> </Select> )} /> {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>} </GridItem> <GridItem> <Label htmlFor="doc-parent">Parent Unit ID (Optional)</Label> <Input id="doc-parent" type="number" {...register('parentUnitArchiveDocumentId', { setValueAs: (v) => v === '' ? null : parseInt(v, 10) || null })} placeholder="Enter ID of parent unit" aria-invalid={errors.parentUnitArchiveDocumentId ? "true" : "false"} /> {errors.parentUnitArchiveDocumentId && <p className="text-xs text-destructive">{errors.parentUnitArchiveDocumentId.message}</p>} </GridItem> <GridItem className="md:col-span-2"> <Label htmlFor="doc-title">Title *</Label> <Input id="doc-title" {...register('title')} aria-invalid={errors.title ? "true" : "false"}/> {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>} </GridItem> <GridItem> <Label htmlFor="doc-creator">Creator *</Label> <Input id="doc-creator" {...register('creator')} aria-invalid={errors.creator ? "true" : "false"}/> {errors.creator && <p className="text-xs text-destructive">{errors.creator.message}</p>} </GridItem> <GridItem> <Label htmlFor="doc-creationDate">Creation Date *</Label> <Input id="doc-creationDate" {...register('creationDate')} placeholder="e.g., 2023-10-26, ca. 1950" aria-invalid={errors.creationDate ? "true" : "false"}/> {errors.creationDate && <p className="text-xs text-destructive">{errors.creationDate.message}</p>} </GridItem> </CardContent> </Card>
        <Card> <CardHeader><CardTitle className='text-lg'>Physical Description</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"> <GridItem><Label htmlFor="doc-pages">Number of Pages</Label><Input id="doc-pages" {...register('numberOfPages')} /></GridItem> <GridItem><Label htmlFor="doc-docType">Document Type</Label><Input id="doc-docType" {...register('documentType')} placeholder="e.g., Letter, Report, Map" /></GridItem> <GridItem><Label htmlFor="doc-dimensions">Dimensions</Label><Input id="doc-dimensions" {...register('dimensions')} placeholder="e.g., 21x30 cm"/></GridItem> <GridItem><Label htmlFor="doc-binding">Binding</Label><Input id="doc-binding" {...register('binding')} placeholder="e.g., Bound volume, Loose leaf" /></GridItem> <GridItem className="md:col-span-2"><Label htmlFor="doc-condition">Condition</Label><Input id="doc-condition" {...register('condition')} placeholder="e.g., Good, Fragile, Water damage" /></GridItem> </CardContent> </Card>
        <Card> <CardHeader><CardTitle className='text-lg'>Content & Context</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 gap-4"> <GridItem><Label htmlFor="doc-language">Document Language</Label><Input id="doc-language" {...register('documentLanguage')} placeholder="e.g., English, German" /></GridItem> <GridItem><Label htmlFor="doc-contentDesc">Content Description</Label><Textarea id="doc-contentDesc" {...register('contentDescription')} rows={4} placeholder="Summary of the document's content..." /></GridItem> <GridItem><Label htmlFor="doc-remarks">Remarks</Label><Textarea id="doc-remarks" {...register('remarks')} rows={2} placeholder="Any additional remarks..." /></GridItem> <GridItem><Label htmlFor="doc-related">Related Documents References</Label><Textarea id="doc-related" {...register('relatedDocumentsReferences')} rows={2} placeholder="Links or references to related materials..." /></GridItem> <GridItem><Label htmlFor="doc-additionalInfo">Additional Information</Label><Textarea id="doc-additionalInfo" {...register('additionalInformation')} rows={2} placeholder="Other relevant info..." /></GridItem> </CardContent> </Card>
        <Card> <CardHeader><CardTitle className='text-lg'>Access & Digitization</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"> <GridItem><Label htmlFor="doc-accessLevel">Access Level</Label><Input id="doc-accessLevel" {...register('accessLevel')} placeholder="e.g., Public, Restricted" /></GridItem> <GridItem><Label htmlFor="doc-accessCond">Access Conditions</Label><Input id="doc-accessCond" {...register('accessConditions')} placeholder="e.g., Requires permission" /></GridItem> <GridItem className="flex items-center space-x-2 md:col-span-2"> <Controller control={control} name="isDigitized" render={({ field }) => ( <Checkbox id="doc-digitized" checked={field.value} onCheckedChange={field.onChange} /> )} /> <Label htmlFor="doc-digitized" className='cursor-pointer'>Is Digitized?</Label> </GridItem> {watch('isDigitized') && ( <GridItem className="md:col-span-2"> <Label htmlFor="doc-digitizedLink">Digitized Version Link</Label> <Input id="doc-digitizedLink" {...register('digitizedVersionLink')} type="url" placeholder="https://..." aria-invalid={errors.digitizedVersionLink ? "true" : "false"}/> {errors.digitizedVersionLink && <p className="text-xs text-destructive">{errors.digitizedVersionLink.message}</p>} </GridItem> )} </CardContent> </Card>
        <Card> <CardHeader><CardTitle className='text-lg'>Signatures & Tags</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"> <GridItem> <SignaturePathSelector label="Topographic Signatures" elementIdPaths={topographicPaths} onChange={setTopographicPaths} /> </GridItem> <GridItem> <SignaturePathSelector label="Descriptive Signatures" elementIdPaths={descriptivePaths} onChange={setDescriptivePaths} /> </GridItem> <GridItem className="md:col-span-2"> <Label>Tags</Label> <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} /> <input type="hidden" {...register('tagIds')} /> {errors.tagIds && <p className="text-xs text-destructive">{typeof errors.tagIds.message === 'string' ? errors.tagIds.message : 'Invalid tag selection'}</p>} </GridItem> </CardContent> </Card>

      <Button type="submit" disabled={isLoading || isFetchingDetails} className="w-full md:w-auto mt-4">
        {isLoading ? <LoadingSpinner size="sm" /> : (docToEdit ? 'Update Document/Unit' : 'Create Document/Unit')}
      </Button>
    </form>
  );
};

export default DocumentForm;