import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, PlusCircle, Search, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchRequest, SearchQuery, SearchQueryElement } from '../../../../backend/src/utils/search';
import LoadingSpinner from './LoadingSpinner';
import TagSelector from './TagSelector';
import SingleSignaturePathPicker from './SingleSignaturePathPicker'; // New import
import type { Tag } from '../../../../backend/src/functionalities/tag/models';

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'date' | 'tags' | 'signaturePath'; // Added 'signaturePath'

export interface SearchFieldOption {
  value: string;
  label: string;
  type: FieldType;
  options?: { value: string | number | boolean; label: string }[];
}

interface SearchBarProps {
  fields: SearchFieldOption[];
  onSearch: (query: SearchQuery) => void;
  isLoading?: boolean;
  showResetButton?: boolean;
}

const conditionsByType: Record<FieldType, { value: SearchQueryElement['condition']; label: string }[]> = {
  text: [ { value: 'FRAGMENT', label: 'Contains' }, { value: 'EQ', label: 'Equals' }, ],
  number: [ { value: 'EQ', label: '=' }, { value: 'GT', label: '>' }, { value: 'GTE', label: '>=' }, { value: 'LT', label: '<' }, { value: 'LTE', label: '<=' }, ],
  boolean: [ { value: 'EQ', label: 'Is' }, ],
  select: [ { value: 'EQ', label: 'Is' }, { value: 'ANY_OF', label: 'Is Any Of' }, ],
  tags: [ { value: 'ANY_OF', label: 'Has Any Of' } ],
  date: [ { value: 'EQ', label: 'Is' }, { value: 'GT', label: 'After' }, { value: 'GTE', label: 'On or After' }, { value: 'LT', label: 'Before' }, { value: 'LTE', label: 'On or Before' }, ],
  signaturePath: [ { value: 'EQ', label: 'Equals Path' }, { value: 'STARTS_WITH', label: 'Starts With Path' }, { value: 'CONTAINS_SEQUENCE', label: 'Contains Sequence' } ], // New conditions
};

type SearchCriterionState = Partial<Omit<SearchQueryElement, 'value' | 'condition'>> & {
    value?: string | number | boolean | number[] | (string | number | boolean | null)[] | null;
    condition?: SearchQueryElement['condition'];
    _key?: string;
};

const useInitialCriterion = (fields: SearchFieldOption[]) => {
    return useCallback((): SearchCriterionState => {
        const initialField = fields[0];
        const type = initialField?.type ?? 'text';
        const initialCondition = conditionsByType[type]?.[0]?.value ?? 'EQ';
        let initialValue: SearchCriterionState['value'] = '';
        if (type === 'boolean') initialValue = true;
        else if (type === 'tags' || type === 'signaturePath' || (type === 'select' && initialCondition === 'ANY_OF')) initialValue = [];

        return {
            field: initialField?.value,
            condition: initialCondition,
            value: initialValue,
            not: false,
            _key: Math.random().toString(36).substring(2, 9),
        };
    }, [fields]);
};

const SearchBar: React.FC<SearchBarProps> = ({
    fields,
    onSearch,
    isLoading = false,
    showResetButton = true
}) => {
    const getInitialCriterion = useInitialCriterion(fields);
    const [criteria, setCriteria] = useState<SearchCriterionState[]>(() => fields.length > 0 ? [getInitialCriterion()] : []);

    useEffect(() => {
        if (fields.length === 0 && criteria.length > 0) {
            setCriteria([]);
        } else if (fields.length > 0 && criteria.length === 0) {
            setCriteria([getInitialCriterion()]);
        } else {
             setCriteria(prev => prev.map(crit => {
                 if (crit.field && !fields.some(f => f.value === crit.field)) {
                     return getInitialCriterion();
                 }
                 return crit;
             }).filter(Boolean));
        }
    }, [fields, getInitialCriterion]);

    const handleAddCriterion = () => {
         if (fields.length === 0) return;
         setCriteria([...criteria, getInitialCriterion()]);
    }

    const handleRemoveCriterion = (keyToRemove: string) => {
        if (fields.length === 0) return;
        if (criteria.length > 1) setCriteria(criteria.filter((c) => c._key !== keyToRemove));
        else setCriteria([getInitialCriterion()]);
    };

    const handleCriterionChange = useCallback((key: string, changedProperty: keyof SearchCriterionState, newValue: any) => {
        setCriteria(currentCriteria => {
            const index = currentCriteria.findIndex(c => c._key === key);
            if (index === -1) return currentCriteria;

            const newCriteria = [...currentCriteria];
            let criterion = { ...newCriteria[index] };

            if (changedProperty === 'not') {
                 criterion.not = !!newValue;
             } else {
                 // @ts-ignore
                 criterion[changedProperty] = newValue;
            }

            if (changedProperty === 'field') {
                const selectedFieldDef = fields.find(f => f.value === newValue);
                const newType = selectedFieldDef?.type || 'text';
                const currentConditionIsValidForNewType = conditionsByType[newType]?.some(c => c.value === criterion.condition);
                criterion.condition = currentConditionIsValidForNewType ? criterion.condition : (conditionsByType[newType]?.[0]?.value ?? 'EQ');

                if (newType === 'boolean') criterion.value = true;
                else if (newType === 'tags' || newType === 'signaturePath' || (newType === 'select' && criterion.condition === 'ANY_OF')) criterion.value = [];
                else criterion.value = '';
            } else if (changedProperty === 'condition') {
                const currentFieldDef = fields.find(f => f.value === criterion.field);
                const newCondition = newValue as SearchQueryElement['condition'];

                if (currentFieldDef?.type === 'signaturePath') {
                    const validSignatureConditions: SearchQueryElement['condition'][] = ['EQ', 'STARTS_WITH', 'CONTAINS_SEQUENCE'];
                    if (!validSignatureConditions.includes(newCondition)) {
                        // This case implies the UI allowed an invalid condition for signaturePath,
                        // which shouldn't happen. Resetting is a safeguard.
                        criterion.value = [];
                    }
                    // If newCondition IS a valid signature condition, DO NOTHING to criterion.value, preserving it.
                } else if (currentFieldDef?.type === 'boolean') {
                    criterion.value = true; // Booleans usually default to true on condition change
                } else if (currentFieldDef?.type === 'tags' || (currentFieldDef?.type === 'select' && newCondition === 'ANY_OF')) {
                    criterion.value = []; // Reset to empty array for multi-select types
                } else {
                    criterion.value = ''; // Reset for other types
                }
            }
            newCriteria[index] = criterion;
            return newCriteria;
        });
    }, [fields]);

    const buildQuery = useCallback((): SearchQuery => {
         return criteria.map(crit => {
            const fieldDef = fields.find(f => f.value === crit.field);
            if (!fieldDef || !crit.field || crit.condition === undefined) { // Allow value to be null/empty array initially
                 console.warn("Skipping incomplete criterion (field/condition missing):", crit);
                 return null;
            }

            let parsedValue: any = crit.value;
            let isValid = true;

            switch (fieldDef.type) {
                case 'number':
                    if (parsedValue === null || String(parsedValue).trim() === '') isValid = false;
                    else { const num = Number(parsedValue); if (isNaN(num)) isValid = false; else parsedValue = num; }
                    break;
                case 'boolean': parsedValue = Boolean(parsedValue); break;
                case 'tags':
                case 'signaturePath': // Signature path value is number[]
                    if (!Array.isArray(parsedValue) || !parsedValue.every(id => typeof id === 'number')) isValid = false;
                    else if (parsedValue.length === 0 && crit.condition !== 'EQ') isValid = false; // Allow empty array for EQ (e.g. "no tags") if backend handles it
                    break;
                case 'select':
                    if (crit.condition === 'ANY_OF') {
                        if (!Array.isArray(parsedValue)) parsedValue = [parsedValue].filter(v => v !== null && v !== undefined && String(v).trim() !== '');
                        parsedValue = parsedValue.map((v: string | number | boolean | null) => /^\d+$/.test(String(v)) ? Number(v) : v);
                        if (parsedValue.length === 0) isValid = false;
                    } else if (String(parsedValue).trim() === '' || parsedValue === null) isValid = false;
                    else if (/^\d+$/.test(String(parsedValue))) parsedValue = Number(parsedValue);
                    break;
                case 'text':
                    if (parsedValue === null || String(parsedValue).trim() === '') isValid = false;
                    else parsedValue = String(parsedValue);
                    break;
                case 'date':
                    if (parsedValue === null || String(parsedValue).trim() === '' || !/^\d{4}-\d{2}-\d{2}$/.test(String(parsedValue))) isValid = false;
                    break;
            }

            if (!isValid) { console.warn(`Skipping criterion due to invalid/empty value:`, crit); return null; }
            return { field: crit.field!, condition: crit.condition!, value: parsedValue, not: crit.not || false } as SearchQueryElement;
        }).filter((c): c is SearchQueryElement => c !== null);
    }, [criteria, fields]);

    const handleSearchClick = () => { const finalQuery = buildQuery(); onSearch(finalQuery); };
    const handleResetClick = () => { setCriteria(fields.length > 0 ? [getInitialCriterion()] : []); onSearch([]); };
    const getFieldType = (fieldName: string | undefined): FieldType => fields.find(f => f.value === fieldName)?.type || 'text';
    const getFieldOptions = (fieldName: string | undefined): SearchFieldOption['options'] => fields.find(f => f.value === fieldName)?.options;
    const getTagsFromOptions = (options: SearchFieldOption['options']): Tag[] => { if (!options) return []; return options.map(opt => ({ tagId: typeof opt.value === 'number' ? opt.value : parseInt(String(opt.value), 10), name: opt.label })).filter(tag => !isNaN(tag.tagId)); }

    const isCriteriaDirty = useMemo(() => {
        if (criteria.length > 1) return true;
        if (criteria.length === 0 || fields.length === 0) return false;
        const defaultCrit = getInitialCriterion();
        const currentCrit = criteria[0];
        if (!currentCrit) return false;
        return ( currentCrit.field !== defaultCrit.field || currentCrit.condition !== defaultCrit.condition || JSON.stringify(currentCrit.value) !== JSON.stringify(defaultCrit.value) || currentCrit.not !== defaultCrit.not );
    }, [criteria, fields, getInitialCriterion]);

     if (fields.length === 0 && !isLoading) { return ( <div className="p-4 border rounded-lg bg-card text-center text-muted-foreground shadow-sm"> No search options available for your role. </div> ); }

    return (
        <div className="p-4 border rounded-lg bg-card space-y-3 shadow-sm">
            {criteria.map((criterion) => {
                const fieldType = getFieldType(criterion.field);
                const fieldOptions = getFieldOptions(criterion.field);
                return (
                <div key={criterion._key} className="flex flex-wrap items-end gap-2 p-2 border rounded bg-background">
                    <div className='flex-grow min-w-[150px]'>
                        <Label htmlFor={`field-${criterion._key}`} className='text-xs mb-1 block'>Field</Label>
                        <Select value={criterion.field} onValueChange={(value) => handleCriterionChange(criterion._key!, 'field', value)} disabled={fields.length === 0}>
                            <SelectTrigger id={`field-${criterion._key}`} className='h-9 text-sm'><SelectValue placeholder="Select field..." /></SelectTrigger>
                            <SelectContent> {fields.map(f => ( <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem> ))} </SelectContent>
                        </Select>
                    </div>
                    <div className='flex items-center space-x-1 self-end pb-1.5'>
                        <Checkbox id={`not-${criterion._key}`} checked={criterion.not || false} onCheckedChange={(checked) => handleCriterionChange(criterion._key!, 'not', !!checked)} className='h-4 w-4' disabled={fields.length === 0}/>
                        <Label htmlFor={`not-${criterion._key}`} className={cn('text-xs font-medium cursor-pointer', fields.length === 0 && 'opacity-50')}>NOT</Label>
                    </div>
                    {criterion.field && (
                        <div className='flex-grow min-w-[120px]'>
                            <Label htmlFor={`condition-${criterion._key}`} className='text-xs mb-1 block'>Condition</Label>
                            <Select value={criterion.condition} onValueChange={(value) => handleCriterionChange(criterion._key!, 'condition', value as SearchQueryElement['condition'])} disabled={!criterion.field} >
                                <SelectTrigger id={`condition-${criterion._key}`} className='h-9 text-sm'><SelectValue /></SelectTrigger>
                                <SelectContent> {(conditionsByType[fieldType] || []).map(c => ( <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem> ))} </SelectContent>
                            </Select>
                        </div>
                    )}
                    {criterion.field && (
                        <div className={cn('flex-grow', fieldType === 'signaturePath' ? 'min-w-[250px]' : 'min-w-[180px]')}>
                            <Label htmlFor={`value-${criterion._key}`} className='text-xs mb-1 block'>Value</Label>
                            { fieldType === 'boolean' ? (
                                <Select value={String(criterion.value ?? true)} onValueChange={(value) => handleCriterionChange(criterion._key!, 'value', value === 'true')} disabled={!criterion.field} > <SelectTrigger id={`value-${criterion._key}`} className='h-9 text-sm'><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="true">True</SelectItem> <SelectItem value="false">False</SelectItem> </SelectContent> </Select>
                            ) : fieldType === 'select' && criterion.condition !== 'ANY_OF' ? (
                                <Select value={String(criterion.value ?? '')} onValueChange={(value) => handleCriterionChange(criterion._key!, 'value', value)} disabled={!criterion.field} > <SelectTrigger id={`value-${criterion._key}`} className='h-9 text-sm'><SelectValue placeholder="Select value..."/></SelectTrigger> <SelectContent> {(fieldOptions || []).map(opt => ( <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem> ))} </SelectContent> </Select>
                            ) : fieldType === 'tags' ? (
                                <TagSelector selectedTagIds={Array.isArray(criterion.value) ? criterion.value as number[] : []} onChange={(selectedIds) => handleCriterionChange(criterion._key!, 'value', selectedIds)} availableTags={getTagsFromOptions(fieldOptions)} className='bg-card border-none p-0' />
                            ) : fieldType === 'signaturePath' ? ( // New case for signaturePath
                                <SingleSignaturePathPicker
                                    selectedPath={Array.isArray(criterion.value) ? criterion.value as number[] : null}
                                    onChange={(path) => handleCriterionChange(criterion._key!, 'value', path)}
                                    className="w-full"
                                    label="" // No extra label needed as it's clear from context
                                />
                            ) : (
                                <Input id={`value-${criterion._key}`} type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'} value={Array.isArray(criterion.value) ? criterion.value.join(',') : criterion.value as string | number ?? ''} onChange={(e) => { const val = e.target.value; const isAnyOfSelect = fieldType === 'select' && criterion.condition === 'ANY_OF'; handleCriterionChange(criterion._key!, 'value', isAnyOfSelect ? val.split(',').map(s=>s.trim()).filter(Boolean) : val); }} placeholder={ fieldType === 'date' ? 'YYYY-MM-DD' : (fieldType === 'select' && criterion.condition === 'ANY_OF') ? 'value1, value2...' : 'Enter value...' } disabled={!criterion.field} className='h-9 text-sm' />
                            )}
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCriterion(criterion._key!)} className='self-end text-muted-foreground hover:text-destructive h-9 w-9' title='Remove criterion' disabled={criteria.length <= 1 || fields.length === 0} >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                );
            })}
            <div className="flex justify-between items-center pt-2 flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleAddCriterion} size="sm" disabled={fields.length === 0}> <PlusCircle className="mr-2 h-4 w-4" /> Add Filter </Button>
                <div className="flex items-center gap-2">
                    {showResetButton && ( <Button type="button" variant="ghost" onClick={handleResetClick} disabled={isLoading || !isCriteriaDirty} size='sm' title="Reset all filters" > <RefreshCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Reset </Button> )}
                    <Button type="button" onClick={handleSearchClick} disabled={isLoading || fields.length === 0} size='sm'> {isLoading && <LoadingSpinner size='sm' className='mr-2' />} <Search className="mr-2 h-4 w-4" /> Search </Button>
                </div>
            </div>
        </div>
    );
};

export default SearchBar;