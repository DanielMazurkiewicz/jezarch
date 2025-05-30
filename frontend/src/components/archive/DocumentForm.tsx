import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createArchiveDocumentFormSchema } from '@/lib/zodSchemas';
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
import SignaturePathSelector from '@/components/shared/SignaturePathSelector';
import UnitSelector from './UnitSelector';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
// Updated type imports (no ownerUserId/ownerLogin)
import type { ArchiveDocument, ArchiveDocumentType } from '../../../../backend/src/functionalities/archive/document/models';
import type { CreateArchiveDocumentInput, UpdateArchiveDocumentInput } from '../../../../backend/src/functionalities/archive/document/models';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { t } from '@/translations/utils';


type CreateArchiveDocumentFormData = z.infer<typeof createArchiveDocumentFormSchema>;

interface DocumentFormProps {
  docToEdit: ArchiveDocument | null;
  onSave: () => void;
  forceType?: ArchiveDocumentType;
  forcedParentId?: number;
  forcedParentTitle?: string;
  onTypeChange?: (type: ArchiveDocumentType) => void;
}

const DocumentForm: React.FC<DocumentFormProps> = ({
    docToEdit,
    onSave,
    forceType,
    forcedParentId,
    forcedParentTitle,
    onTypeChange
}) => {
  const { token, preferredLanguage } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [descriptiveSignatures, setDescriptiveSignatures] = useState<number[][]>([]);
  const [selectedParentUnitId, setSelectedParentUnitId] = useState<number | null>(forcedParentId ?? null);

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(createArchiveDocumentFormSchema),
    defaultValues: {
        parentUnitArchiveDocumentId: forcedParentId ?? null,
        type: forceType ?? "document",
        title: '', creator: '', creationDate: '',
        numberOfPages: null, documentType: null, dimensions: null, binding: null, condition: null,
        documentLanguage: null, contentDescription: null, remarks: null, accessLevel: null,
        accessConditions: null, additionalInformation: null, relatedDocumentsReferences: null,
        isDigitized: false, digitizedVersionLink: null, tagIds: [],
        topographicSignature: null,
        descriptiveSignatureElementIds: [],
        // createdBy, updatedBy, createdOn, modifiedOn are not part of the form
    },
  });

  const watchedType = watch('type');
  useEffect(() => {
    onTypeChange?.(watchedType);
  }, [watchedType, onTypeChange]);

  useEffect(() => {
    if (forcedParentId === undefined) {
        setValue('parentUnitArchiveDocumentId', selectedParentUnitId);
    }
  }, [selectedParentUnitId, setValue, forcedParentId]);

  useEffect(() => {
    const populateForm = async () => {
        if (docToEdit?.archiveDocumentId && token) {
            setIsFetchingDetails(true); setError(null);
            try {
                // Fetch full doc details including tags
                const fullDoc = await api.getArchiveDocumentById(docToEdit.archiveDocumentId, token);
                const tagIds = fullDoc.tags?.map(t => t.tagId!) ?? [];
                const parentId = fullDoc.parentUnitArchiveDocumentId ?? null;
                const topoSignature = fullDoc.topographicSignature ?? null;
                const descSignatures = fullDoc.descriptiveSignatureElementIds ?? [];

                reset({
                    parentUnitArchiveDocumentId: forcedParentId ?? parentId,
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
                    tagIds: tagIds, // Set tagIds for validation
                    topographicSignature: topoSignature,
                    descriptiveSignatureElementIds: descSignatures, // Set desc sigs for validation
                });
                setSelectedTagIds(tagIds); // Sync TagSelector state
                setDescriptiveSignatures(descSignatures); // Sync SignaturePathSelector state
                if (forcedParentId === undefined) {
                     setSelectedParentUnitId(parentId); // Sync UnitSelector state
                }
            } catch (err: any) {
                const msg = t('archiveDetailsLoadFailed', preferredLanguage, { message: err.message });
                setError(msg); toast.error(msg); console.error("Load Error:", err);
                 // Fallback to potentially partial data from list
                 reset({
                    parentUnitArchiveDocumentId: forcedParentId ?? docToEdit.parentUnitArchiveDocumentId ?? null,
                    type: forceType ?? docToEdit.type ?? 'document',
                    title: docToEdit.title ?? '', creator: docToEdit.creator ?? '',
                    creationDate: docToEdit.creationDate ?? '',
                    tagIds: docToEdit.tags?.map(t => t.tagId!) ?? [],
                    topographicSignature: docToEdit.topographicSignature ?? null,
                    descriptiveSignatureElementIds: docToEdit.descriptiveSignatureElementIds ?? [],
                 });
                 setSelectedTagIds(docToEdit.tags?.map(t => t.tagId!) ?? []);
                 setDescriptiveSignatures(docToEdit.descriptiveSignatureElementIds ?? []);
                 setSelectedParentUnitId(forcedParentId ?? docToEdit.parentUnitArchiveDocumentId ?? null);
            } finally { setIsFetchingDetails(false); }
        } else {
            // Reset form for creation
            reset({
                parentUnitArchiveDocumentId: forcedParentId ?? null,
                type: forceType ?? 'document',
                title: '', creator: '', creationDate: '',
                tagIds: [],
                topographicSignature: null,
                descriptiveSignatureElementIds: [],
                // Reset other fields to null/default
                numberOfPages: null, documentType: null, dimensions: null, binding: null, condition: null,
                documentLanguage: null, contentDescription: null, remarks: null, accessLevel: null,
                accessConditions: null, additionalInformation: null, relatedDocumentsReferences: null,
                isDigitized: false, digitizedVersionLink: null,
            });
            setSelectedTagIds([]);
            setDescriptiveSignatures([]);
            setSelectedParentUnitId(forcedParentId ?? null);
            setError(null); setIsFetchingDetails(false);
        }
    };
    populateForm();
  }, [docToEdit, reset, token, forceType, forcedParentId, preferredLanguage]);

  useEffect(() => { setValue('tagIds', selectedTagIds); }, [selectedTagIds, setValue]);
  useEffect(() => { setValue('descriptiveSignatureElementIds', descriptiveSignatures); }, [descriptiveSignatures, setValue]);

  // Removed ownerUserId from form data extraction
  const onSubmit: SubmitHandler<CreateArchiveDocumentFormData> = async (data) => {
    if (!token) return;
    setIsLoading(true); setError(null);

    const finalParentId = forcedParentId !== undefined ? forcedParentId : selectedParentUnitId;
    // Remove fields not directly sent to backend payload, but used for form state/validation
    const { tagIds: _, parentUnitArchiveDocumentId: __, type: _____, descriptiveSignatureElementIds: _______, ...coreData } = data;

    try {
        if (docToEdit?.archiveDocumentId) {
            // Construct the update payload carefully, comparing with original doc
            const updatePayload: UpdateArchiveDocumentInput = {};

            // Add field to payload only if it has actually changed
            if (finalParentId !== (docToEdit.parentUnitArchiveDocumentId ?? null)) updatePayload.parentUnitArchiveDocumentId = finalParentId ?? undefined;
            if (coreData.title !== docToEdit.title) updatePayload.title = coreData.title;
            if (coreData.creator !== docToEdit.creator) updatePayload.creator = coreData.creator;
            if (coreData.creationDate !== docToEdit.creationDate) updatePayload.creationDate = coreData.creationDate;
            if ((coreData.numberOfPages || null) !== docToEdit.numberOfPages) updatePayload.numberOfPages = coreData.numberOfPages || undefined;
            if ((coreData.documentType || null) !== docToEdit.documentType) updatePayload.documentType = coreData.documentType || undefined;
            if ((coreData.dimensions || null) !== docToEdit.dimensions) updatePayload.dimensions = coreData.dimensions || undefined;
            if ((coreData.binding || null) !== docToEdit.binding) updatePayload.binding = coreData.binding || undefined;
            if ((coreData.condition || null) !== docToEdit.condition) updatePayload.condition = coreData.condition || undefined;
            if ((coreData.documentLanguage || null) !== docToEdit.documentLanguage) updatePayload.documentLanguage = coreData.documentLanguage || undefined;
            if ((coreData.contentDescription || null) !== docToEdit.contentDescription) updatePayload.contentDescription = coreData.contentDescription || undefined;
            if ((coreData.remarks || null) !== docToEdit.remarks) updatePayload.remarks = coreData.remarks || undefined;
            if ((coreData.accessLevel || null) !== docToEdit.accessLevel) updatePayload.accessLevel = coreData.accessLevel || undefined;
            if ((coreData.accessConditions || null) !== docToEdit.accessConditions) updatePayload.accessConditions = coreData.accessConditions || undefined;
            if ((coreData.additionalInformation || null) !== docToEdit.additionalInformation) updatePayload.additionalInformation = coreData.additionalInformation || undefined;
            if ((coreData.relatedDocumentsReferences || null) !== docToEdit.relatedDocumentsReferences) updatePayload.relatedDocumentsReferences = coreData.relatedDocumentsReferences || undefined;
            if (coreData.isDigitized !== docToEdit.isDigitized) updatePayload.isDigitized = coreData.isDigitized;
            if ((coreData.digitizedVersionLink || null) !== docToEdit.digitizedVersionLink) updatePayload.digitizedVersionLink = coreData.digitizedVersionLink || undefined;
            if ((coreData.topographicSignature ?? null) !== docToEdit.topographicSignature) updatePayload.topographicSignature = coreData.topographicSignature ?? null;

            // Always send tags and signatures for update (backend handles replace logic)
            updatePayload.tagIds = selectedTagIds;
            updatePayload.descriptiveSignatureElementIds = descriptiveSignatures;

            // Check if anything actually changed besides tags/signatures/parent (which are handled by updatePayload anyway)
            const hasCoreChanges = Object.keys(updatePayload).some(k => !['tagIds', 'descriptiveSignatureElementIds', 'parentUnitArchiveDocumentId'].includes(k));
            const parentChanged = finalParentId !== (docToEdit.parentUnitArchiveDocumentId ?? null); // Re-check specifically

            if (hasCoreChanges || parentChanged ||
                JSON.stringify(selectedTagIds.sort()) !== JSON.stringify((docToEdit.tags?.map(t => t.tagId!) ?? []).sort()) ||
                JSON.stringify(descriptiveSignatures) !== JSON.stringify(docToEdit.descriptiveSignatureElementIds ?? [])
            ) {
                 await api.updateArchiveDocument(docToEdit.archiveDocumentId, updatePayload, token);
            } else {
                toast.info(t('archiveFormNoChangesDetected', preferredLanguage));
                onSave(); // Call onSave even if no API call made
                setIsLoading(false);
                return;
            }
        } else {
             // Create payload uses all validated data + selected tags/signatures
             const createPayload: CreateArchiveDocumentInput = {
                ...coreData, // Includes all validated fields from base schema
                type: data.type, // Ensure type is included
                parentUnitArchiveDocumentId: finalParentId ?? undefined,
                tagIds: selectedTagIds,
                descriptiveSignatureElementIds: descriptiveSignatures,
             };
            await api.createArchiveDocument(createPayload, token);
        }
        onSave(); // Trigger parent component refresh/close
    } catch (err: any) {
      const msg = err.message || t('archiveSaveFailed', preferredLanguage, { message: '' }).replace(': {message}', '');
      setError(msg); toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg })); console.error("Save Error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  const GridItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("grid gap-1.5", className)}>{children}</div>
  );

  if (isFetchingDetails) {
      return <div className="flex justify-center items-center p-20"><LoadingSpinner /></div>;
  }

  return (
    <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col h-full overflow-hidden"
    >
        {error && <div className="p-1 pr-3"><ErrorDisplay message={error} /></div>}
        <div className="flex-grow p-1 pr-3 space-y-6 overflow-y-auto relative">
            {isLoading && <div className='absolute inset-0 bg-background/80 flex items-center justify-center z-20 rounded-md'><LoadingSpinner/></div>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* --- Basic Information --- */}
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className='text-lg'>{t('archiveFormBasicInfoTitle', preferredLanguage)}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <GridItem className="md:col-span-1">
                            <Label htmlFor="doc-type">{t('archiveFormTypeLabel', preferredLanguage)}</Label>
                            <Controller control={control} name="type" render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value} disabled={!!docToEdit || !!forceType}>
                                    <SelectTrigger id='doc-type' aria-invalid={!!errors.type} className={cn("w-full", errors.type && "border-destructive", (!!docToEdit || !!forceType) && "text-muted-foreground")}>
                                        <SelectValue placeholder={t('archiveFormSelectTypePlaceholder', preferredLanguage)} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="document">{t('archiveFormDocumentOption', preferredLanguage)}</SelectItem>
                                        <SelectItem value="unit">{t('archiveFormUnitOption', preferredLanguage)}</SelectItem>
                                    </SelectContent>
                                </Select>
                            )} />
                            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
                            {(!!docToEdit || !!forceType) && <p className="text-xs text-muted-foreground italic">{t('archiveFormTypeDisabledHint', preferredLanguage)}</p>}
                        </GridItem>
                         {watchedType === 'document' && forcedParentId === undefined && (
                             <GridItem className="md:col-span-1">
                                <Label htmlFor="doc-parent">{t('archiveFormParentUnitLabel', preferredLanguage)}</Label>
                                <UnitSelector selectedUnitId={selectedParentUnitId} onChange={setSelectedParentUnitId} currentDocumentId={docToEdit?.archiveDocumentId} className="w-full" />
                                <input type="hidden" {...register('parentUnitArchiveDocumentId')} />
                                {errors.parentUnitArchiveDocumentId && <p className="text-xs text-destructive">{errors.parentUnitArchiveDocumentId.message}</p>}
                             </GridItem>
                        )}
                         {watchedType === 'document' && forcedParentId !== undefined && (
                             <GridItem className="md:col-span-1">
                                <Label>{t('archiveFormParentUnitLabel', preferredLanguage)}</Label>
                                <Input value={forcedParentTitle ? `"${forcedParentTitle}" ${t('archiveFormParentUnitContextHint', preferredLanguage)}` : `ID: ${forcedParentId} ${t('archiveFormParentUnitContextHint', preferredLanguage)}`} disabled className='text-muted-foreground'/>
                             </GridItem>
                        )}
                        {watchedType !== 'document' && <div className="md:col-span-1"></div>}
                        <GridItem className="md:col-span-2">
                            <Label htmlFor="doc-title">{t('archiveFormTitleLabel', preferredLanguage)}</Label>
                            <Input id="doc-title" {...register('title')} aria-invalid={!!errors.title} className={cn(errors.title && "border-destructive")}/>
                            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                        </GridItem>
                        <GridItem className="md:col-span-1">
                            <Label htmlFor="doc-creator">{t('archiveFormCreatorLabel', preferredLanguage)}</Label>
                            <Input id="doc-creator" {...register('creator')} aria-invalid={!!errors.creator} className={cn(errors.creator && "border-destructive")}/>
                            {errors.creator && <p className="text-xs text-destructive">{errors.creator.message}</p>}
                        </GridItem>
                        <GridItem className="md:col-span-1">
                            <Label htmlFor="doc-creationDate">{t('archiveFormCreationDateLabel', preferredLanguage)}</Label>
                            <Input id="doc-creationDate" {...register('creationDate')} placeholder={t('archiveFormCreationDatePlaceholder', preferredLanguage)} aria-invalid={!!errors.creationDate} className={cn(errors.creationDate && "border-destructive")}/>
                            {errors.creationDate && <p className="text-xs text-destructive">{errors.creationDate.message}</p>}
                        </GridItem>
                    </CardContent>
                </Card>
                {/* --- Physical Description --- */}
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle className='text-lg'>{t('archiveFormPhysicalDescTitle', preferredLanguage)}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4">
                        <GridItem><Label htmlFor="doc-pages">{t('archiveFormPagesLabel', preferredLanguage)}</Label><Input id="doc-pages" {...register('numberOfPages')} /></GridItem>
                        <GridItem><Label htmlFor="doc-docType">{t('archiveFormDocTypeLabel', preferredLanguage)}</Label><Input id="doc-docType" {...register('documentType')} placeholder={t('archiveFormDocTypePlaceholder', preferredLanguage)} /></GridItem>
                        <GridItem><Label htmlFor="doc-dimensions">{t('archiveFormDimensionsLabel', preferredLanguage)}</Label><Input id="doc-dimensions" {...register('dimensions')} placeholder={t('archiveFormDimensionsPlaceholder', preferredLanguage)}/></GridItem>
                        <GridItem><Label htmlFor="doc-binding">{t('archiveFormBindingLabel', preferredLanguage)}</Label><Input id="doc-binding" {...register('binding')} placeholder={t('archiveFormBindingPlaceholder', preferredLanguage)} /></GridItem>
                        <GridItem><Label htmlFor="doc-condition">{t('archiveFormConditionLabel', preferredLanguage)}</Label><Input id="doc-condition" {...register('condition')} placeholder={t('archiveFormConditionPlaceholder', preferredLanguage)} /></GridItem>
                    </CardContent>
                </Card>
                {/* --- Content & Context --- */}
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle className='text-lg'>{t('archiveFormContentContextTitle', preferredLanguage)}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4">
                        <GridItem><Label htmlFor="doc-language">{t('archiveFormLanguageLabel', preferredLanguage)}</Label><Input id="doc-language" {...register('documentLanguage')} placeholder={t('archiveFormLanguagePlaceholder', preferredLanguage)} /></GridItem>
                        <GridItem><Label htmlFor="doc-contentDesc">{t('archiveFormContentDescLabel', preferredLanguage)}</Label><Textarea id="doc-contentDesc" {...register('contentDescription')} rows={4} placeholder={t('archiveFormContentDescPlaceholder', preferredLanguage)} /></GridItem>
                        <GridItem><Label htmlFor="doc-remarks">{t('archiveFormRemarksLabel', preferredLanguage)}</Label><Textarea id="doc-remarks" {...register('remarks')} rows={2} placeholder={t('archiveFormRemarksPlaceholder', preferredLanguage)} /></GridItem>
                        <GridItem><Label htmlFor="doc-related">{t('archiveFormRelatedDocsLabel', preferredLanguage)}</Label><Textarea id="doc-related" {...register('relatedDocumentsReferences')} rows={2} placeholder={t('archiveFormRelatedDocsPlaceholder', preferredLanguage)} /></GridItem>
                        <GridItem><Label htmlFor="doc-additionalInfo">{t('archiveFormAdditionalInfoLabel', preferredLanguage)}</Label><Textarea id="doc-additionalInfo" {...register('additionalInformation')} rows={2} placeholder={t('archiveFormAdditionalInfoPlaceholder', preferredLanguage)} /></GridItem>
                    </CardContent>
                </Card>
                 {/* --- Access & Digitization --- */}
                 <Card className="lg:col-span-1">
                    <CardHeader><CardTitle className='text-lg'>{t('archiveFormAccessDigitizationTitle', preferredLanguage)}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4">
                        <GridItem><Label htmlFor="doc-accessLevel">{t('archiveFormAccessLevelLabel', preferredLanguage)}</Label><Input id="doc-accessLevel" {...register('accessLevel')} placeholder={t('archiveFormAccessLevelPlaceholder', preferredLanguage)} /></GridItem>
                        <GridItem><Label htmlFor="doc-accessCond">{t('archiveFormAccessConditionsLabel', preferredLanguage)}</Label><Input id="doc-accessCond" {...register('accessConditions')} placeholder={t('archiveFormAccessConditionsPlaceholder', preferredLanguage)} /></GridItem>
                        <GridItem className="flex items-center space-x-2 pt-1">
                            <Controller control={control} name="isDigitized" render={({ field }) => ( <Checkbox id="doc-digitized" checked={field.value} onCheckedChange={field.onChange} /> )} />
                            <Label htmlFor="doc-digitized" className='cursor-pointer font-normal'>{t('archiveFormIsDigitizedLabel', preferredLanguage)}</Label>
                        </GridItem>
                        {watch('isDigitized') && (
                            <GridItem>
                                <Label htmlFor="doc-digitizedLink">{t('archiveFormDigitizedLinkLabel', preferredLanguage)}</Label>
                                <Input id="doc-digitizedLink" {...register('digitizedVersionLink')} type="url" placeholder={t('archiveFormDigitizedLinkPlaceholder', preferredLanguage)} aria-invalid={!!errors.digitizedVersionLink} className={cn(errors.digitizedVersionLink && "border-destructive")}/>
                                {errors.digitizedVersionLink && <p className="text-xs text-destructive">{errors.digitizedVersionLink.message}</p>}
                            </GridItem>
                        )}
                    </CardContent>
                </Card>
                {/* --- Indexing (Signatures & Tags) --- */}
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle className='text-lg'>{t('archiveFormIndexingTitle', preferredLanguage)}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 items-start">
                        <GridItem>
                            <Label htmlFor="doc-topo-sig">{t('archiveFormTopoSigLabel', preferredLanguage)}</Label>
                            <Input id="doc-topo-sig" {...register('topographicSignature')} placeholder={t('archiveFormTopoSigPlaceholder', preferredLanguage)} aria-invalid={!!errors.topographicSignature} className={cn(errors.topographicSignature && "border-destructive")} />
                            {errors.topographicSignature && <p className="text-xs text-destructive">{errors.topographicSignature.message}</p>}
                        </GridItem>
                        <SignaturePathSelector
                            label={t('archiveFormDescSigLabel', preferredLanguage)}
                            signatures={descriptiveSignatures}
                            onChange={setDescriptiveSignatures}
                            className="min-w-0"
                        />
                        <input type="hidden" {...register('descriptiveSignatureElementIds')} />
                        {errors.descriptiveSignatureElementIds && <p className="text-xs text-destructive">{errors.descriptiveSignatureElementIds.message}</p>}
                        <div className="grid gap-1.5">
                            <Label>{t('archiveFormTagsLabel', preferredLanguage)}</Label>
                            <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
                            <input type="hidden" {...register('tagIds')} />
                            {errors.tagIds && <p className="text-xs text-destructive">{typeof errors.tagIds.message === 'string' ? errors.tagIds.message : 'Invalid tag selection'}</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        <div className="pt-4 pb-2 px-1 border-t flex justify-start shrink-0">
            <Button type="submit" disabled={isLoading || isFetchingDetails}>
                {isLoading ? <LoadingSpinner size="sm" className='mr-2' /> : (docToEdit ? t('archiveFormUpdateItemButton', preferredLanguage) : t('archiveFormCreateItemButton', preferredLanguage))}
            </Button>
        </div>
    </form>

  );
};

export default DocumentForm;