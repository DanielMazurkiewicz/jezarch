import React, { useState, useCallback, useMemo } from 'react'; // Added useMemo
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
// Added RefreshCcw icon for reset
import { Trash2, PlusCircle, Search, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchRequest, SearchQuery, SearchQueryElement } from '../../../../backend/src/utils/search';
import LoadingSpinner from './LoadingSpinner';
import TagSelector from './TagSelector';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'date' | 'tags';

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
  /** Whether to show the reset button */
  showResetButton?: boolean;
}

const conditionsByType: Record<FieldType, { value: SearchQueryElement['condition']; label: string }[]> = {
  text: [ { value: 'FRAGMENT', label: 'Contains' }, { value: 'EQ', label: 'Equals' }, ],
  number: [ { value: 'EQ', label: '=' }, { value: 'GT', label: '>' }, { value: 'GTE', label: '>=' }, { value: 'LT', label: '<' }, { value: 'LTE', label: '<=' }, ],
  boolean: [ { value: 'EQ', label: 'Is' }, ],
  select: [ { value: 'EQ', label: 'Is' }, { value: 'ANY_OF', label: 'Is Any Of' }, ],
  tags: [ { value: 'ANY_OF', label: 'Has Any Of' }, { value: 'EQ', label: 'Has Only' } ],
  date: [ { value: 'EQ', label: 'Is' }, { value: 'GT', label: 'After' }, { value: 'GTE', label: 'On or After' }, { value: 'LT', label: 'Before' }, { value: 'LTE', label: 'On or Before' }, ],
};

type SearchCriterionState = Partial<Omit<SearchQueryElement, 'value' | 'condition'>> & {
    value?: string | number | boolean | number[] | (string | number | boolean | null)[] | null;
    condition?: SearchQueryElement['condition'];
    _key?: string;
};

// Memoize the initial criterion function
const useInitialCriterion = (fields: SearchFieldOption[]) => {
    return useCallback((fieldValue?: string, fieldType?: FieldType): SearchCriterionState => {
        const initialField = fieldValue ? fields.find(f => f.value === fieldValue) : fields[0];
        const type = fieldType ?? initialField?.type ?? 'text';
        const initialCondition = conditionsByType[type]?.[0]?.value ?? 'EQ';
        let initialValue: SearchCriterionState['value'] = '';
        if (type === 'boolean') initialValue = true;
        else if (type === 'tags' || (type === 'select' && initialCondition === 'ANY_OF')) initialValue = [];

        return {
            field: initialField?.value,
            condition: initialCondition,
            value: initialValue,
            not: false,
            _key: Math.random().toString(36).substring(2, 9),
        };
    }, [fields]); // Dependency array includes fields
};


const SearchBar: React.FC<SearchBarProps> = ({
    fields,
    onSearch,
    isLoading = false,
    showResetButton = true // Default to true
}) => {
    const getInitialCriterion = useInitialCriterion(fields); // Use the hook
    const [criteria, setCriteria] = useState<SearchCriterionState[]>(() => [getInitialCriterion()]);

    const handleAddCriterion = () => setCriteria([...criteria, getInitialCriterion()]);

    const handleRemoveCriterion = (keyToRemove: string) => {
        if (criteria.length > 1) setCriteria(criteria.filter((c) => c._key !== keyToRemove));
        else setCriteria([getInitialCriterion()]); // Reset to one empty if last one removed
    };

    const handleCriterionChange = useCallback((key: string, field: keyof SearchCriterionState, value: any) => {
        setCriteria(currentCriteria => {
            const index = currentCriteria.findIndex(c => c._key === key);
            if (index === -1) return currentCriteria;
            const newCriteria = [...currentCriteria];
            let criterion = { ...newCriteria[index] };

            if (field === 'not') {
                 criterion.not = value as boolean;
             } else {
                 // @ts-ignore
                 criterion[field] = value;
            }

            if (field === 'field') {
                const selectedField = fields.find(f => f.value === value);
                const newType = selectedField?.type || 'text';
                const newCondition = conditionsByType[newType]?.[0]?.value ?? 'EQ';
                criterion.condition = newCondition;
                criterion.value = newType === 'boolean' ? true :
                                  (newType === 'tags' || (newType === 'select' && newCondition === 'ANY_OF')) ? [] : '';
            } else if (field === 'condition') {
                 const currentFieldDef = fields.find(f => f.value === criterion.field);
                 if (currentFieldDef?.type === 'boolean') criterion.value = true;
                 else if (currentFieldDef?.type === 'select' || currentFieldDef?.type === 'tags') {
                     criterion.value = value === 'ANY_OF' ? [] : '';
                 } else if (Array.isArray(criterion.value)) criterion.value = '';
                 else if (criterion.value === undefined || criterion.value === null) criterion.value = '';
             }
            newCriteria[index] = criterion;
            return newCriteria;
        });
    }, [fields]); // Add fields dependency

    const buildQuery = useCallback((): SearchQuery => {
         return criteria.map(crit => {
            const fieldDef = fields.find(f => f.value === crit.field);
            if (!crit.field || crit.condition === undefined || crit.value === undefined || !fieldDef) {
                 console.warn("Skipping incomplete criterion:", crit);
                 return null;
            }

            let parsedValue: any = crit.value;
            let isValid = true;

            switch (fieldDef.type) {
                case 'number':
                    const num = Number(parsedValue);
                    if (isNaN(num) || String(parsedValue).trim() === '') isValid = false;
                    else parsedValue = num;
                    break;
                case 'boolean': parsedValue = Boolean(parsedValue); break;
                case 'tags':
                    if (!Array.isArray(parsedValue) || !parsedValue.every(id => typeof id === 'number')) isValid = false;
                    else if (parsedValue.length === 0 && crit.condition === 'ANY_OF') isValid = false;
                    break;
                case 'select':
                    if (crit.condition === 'ANY_OF') {
                        if (!Array.isArray(parsedValue)) parsedValue = [parsedValue].filter(v => v !== null && v !== undefined && String(v).trim() !== '');
                        parsedValue = parsedValue.map((v: string | number | boolean | null) => /^\d+$/.test(String(v)) ? Number(v) : v);
                        if (parsedValue.length === 0) isValid = false;
                    } else if (String(parsedValue).trim() === '' || parsedValue === null) isValid = false;
                    else if (/^\d+$/.test(String(parsedValue))) parsedValue = Number(parsedValue);
                    break;
                case 'text': case 'date':
                    if (String(parsedValue).trim() === '' || parsedValue === null) isValid = false;
                    break;
            }

            if (!isValid) {
                 console.warn(`Skipping criterion due to invalid/empty value:`, crit);
                 return null;
            }

            return {
                field: crit.field!, condition: crit.condition!,
                value: parsedValue, not: crit.not || false,
            } as SearchQueryElement;

        }).filter((c): c is SearchQueryElement => c !== null);
    }, [criteria, fields]); // Add criteria and fields dependencies

    const handleSearchClick = () => {
        const finalQuery = buildQuery();
        console.log("SearchBar: Built final query for parent:", finalQuery);
        onSearch(finalQuery);
    };

    // --- Reset Handler ---
    const handleResetClick = () => {
        setCriteria([getInitialCriterion()]); // Reset criteria state
        onSearch([]); // Call parent's search handler with empty query
    };
    // ---------------------

    const getFieldType = (fieldName: string | undefined): FieldType => fields.find(f => f.value === fieldName)?.type || 'text';
    const getFieldOptions = (fieldName: string | undefined): SearchFieldOption['options'] => fields.find(f => f.value === fieldName)?.options;
    const getTagsFromOptions = (options: SearchFieldOption['options']): Tag[] => {
        if (!options) return [];
        return options.map(opt => ({
            tagId: typeof opt.value === 'number' ? opt.value : parseInt(String(opt.value), 10),
            name: opt.label,
        }));
    }

    // Check if any criteria have non-default values to enable reset button
    const isCriteriaDirty = useMemo(() => {
        if (criteria.length > 1) return true;
        const defaultCrit = getInitialCriterion();
        const currentCrit = criteria[0];
        return (
            currentCrit.field !== defaultCrit.field ||
            currentCrit.condition !== defaultCrit.condition ||
            JSON.stringify(currentCrit.value) !== JSON.stringify(defaultCrit.value) || // Compare potentially complex values
            currentCrit.not !== defaultCrit.not
        );
    }, [criteria, getInitialCriterion]);

    return (
        <div className="p-4 border rounded-lg bg-card space-y-3 shadow-sm">
            {criteria.map((criterion) => {
                const fieldType = getFieldType(criterion.field);
                const fieldOptions = getFieldOptions(criterion.field);
                return (
                <div key={criterion._key} className="flex flex-wrap items-end gap-2 p-2 border rounded bg-background">
                    {/* Field */}
                    <div className='flex-grow min-w-[150px]'>
                        <Label htmlFor={`field-${criterion._key}`} className='text-xs mb-1 block'>Field</Label>
                        <Select value={criterion.field} onValueChange={(value) => handleCriterionChange(criterion._key!, 'field', value)}>
                            <SelectTrigger id={`field-${criterion._key}`} className='h-9 text-sm'><SelectValue placeholder="Select field..." /></SelectTrigger>
                            <SelectContent> {fields.map(f => ( <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem> ))} </SelectContent>
                        </Select>
                    </div>
                    {/* NOT */}
                    <div className='flex items-center space-x-1 self-end pb-1.5'>
                        <Checkbox id={`not-${criterion._key}`} checked={criterion.not || false} onCheckedChange={(checked) => handleCriterionChange(criterion._key!, 'not', checked)} className='h-4 w-4' />
                        <Label htmlFor={`not-${criterion._key}`} className='text-xs font-medium cursor-pointer'>NOT</Label>
                    </div>
                    {/* Condition */}
                    {criterion.field && (
                        <div className='flex-grow min-w-[120px]'>
                            <Label htmlFor={`condition-${criterion._key}`} className='text-xs mb-1 block'>Condition</Label>
                            <Select value={criterion.condition} onValueChange={(value) => handleCriterionChange(criterion._key!, 'condition', value)} disabled={!criterion.field} >
                                <SelectTrigger id={`condition-${criterion._key}`} className='h-9 text-sm'><SelectValue /></SelectTrigger>
                                <SelectContent> {(conditionsByType[fieldType] || []).map(c => ( <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem> ))} </SelectContent>
                            </Select>
                        </div>
                    )}
                    {/* Value Input Area */}
                    {criterion.field && (
                        <div className='flex-grow min-w-[180px]'>
                            <Label htmlFor={`value-${criterion._key}`} className='text-xs mb-1 block'>Value</Label>
                            { fieldType === 'boolean' ? (
                                <Select value={String(criterion.value ?? true)} onValueChange={(value) => handleCriterionChange(criterion._key!, 'value', value === 'true')} disabled={!criterion.field} >
                                    <SelectTrigger id={`value-${criterion._key}`} className='h-9 text-sm'><SelectValue /></SelectTrigger>
                                    <SelectContent> <SelectItem value="true">True</SelectItem> <SelectItem value="false">False</SelectItem> </SelectContent>
                                </Select>
                            ) : fieldType === 'select' && criterion.condition !== 'ANY_OF' ? (
                                <Select value={String(criterion.value ?? '')} onValueChange={(value) => handleCriterionChange(criterion._key!, 'value', value)} disabled={!criterion.field} >
                                    <SelectTrigger id={`value-${criterion._key}`} className='h-9 text-sm'><SelectValue placeholder="Select value..."/></SelectTrigger>
                                    <SelectContent> {(fieldOptions || []).map(opt => ( <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem> ))} </SelectContent>
                                </Select>
                            ) : fieldType === 'tags' ? (
                                <TagSelector
                                    selectedTagIds={Array.isArray(criterion.value) ? criterion.value as number[] : []}
                                    onChange={(selectedIds) => handleCriterionChange(criterion._key!, 'value', selectedIds)}
                                    availableTags={getTagsFromOptions(fieldOptions)}
                                    className='bg-card border-none p-0'
                                />
                            ) : (
                                <Input
                                    id={`value-${criterion._key}`}
                                    type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
                                    value={Array.isArray(criterion.value) ? criterion.value.join(',') : criterion.value as string | number ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const isAnyOfSelect = fieldType === 'select' && criterion.condition === 'ANY_OF';
                                        handleCriterionChange(criterion._key!, 'value', isAnyOfSelect ? val.split(',').map(s=>s.trim()).filter(Boolean) : val);
                                    }}
                                    placeholder={ fieldType === 'date' ? 'YYYY-MM-DD' : (fieldType === 'select' && criterion.condition === 'ANY_OF') ? 'value1, value2...' : 'Enter value...' }
                                    disabled={!criterion.field}
                                    className='h-9 text-sm'
                                />
                            )}
                        </div>
                    )}
                    {/* Remove */}
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCriterion(criterion._key!)} className='self-end text-muted-foreground hover:text-destructive h-9 w-9' title='Remove criterion' disabled={criteria.length <= 1} >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                );
            })}
            {/* Actions */}
            <div className="flex justify-between items-center pt-2 flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleAddCriterion} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Filter
                </Button>
                <div className="flex items-center gap-2">
                    {/* Reset Button */}
                    {showResetButton && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResetClick}
                            disabled={isLoading || !isCriteriaDirty}
                            size='sm'
                            title="Reset all filters"
                        >
                            <RefreshCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Reset
                        </Button>
                    )}
                    {/* Search Button */}
                    <Button type="button" onClick={handleSearchClick} disabled={isLoading} size='sm'>
                        {isLoading && <LoadingSpinner size='sm' className='mr-2' />}
                        <Search className="mr-2 h-4 w-4" /> Search
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SearchBar;