import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Trash2, PlusCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
// Import only the main SearchQueryElement union type
import type { SearchRequest, SearchQuery, SearchQueryElement } from '../../../../backend/src/utils/search';
import LoadingSpinner from './LoadingSpinner';

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'date';

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
}

const conditionsByType: Record<FieldType, { value: SearchQueryElement['condition']; label: string }[]> = {
  text: [ { value: 'FRAGMENT', label: 'Contains' }, { value: 'EQ', label: 'Equals' }, ],
  number: [ { value: 'EQ', label: '=' }, { value: 'GT', label: '>' }, { value: 'GTE', label: '>=' }, { value: 'LT', label: '<' }, { value: 'LTE', label: '<=' }, ],
  boolean: [ { value: 'EQ', label: 'Is' }, ],
  // Updated Select conditions to handle ANY_OF for multi-select like scenarios
  select: [ { value: 'EQ', label: 'Is' }, { value: 'ANY_OF', label: 'Is Any Of' }, ],
  date: [ { value: 'EQ', label: 'Is' }, { value: 'GT', label: 'After' }, { value: 'GTE', label: 'On or After' }, { value: 'LT', label: 'Before' }, { value: 'LTE', label: 'On or Before' }, ],
};

// Use the main SearchQueryElement type for state, but keep value flexible
type SearchCriterionState = Partial<Omit<SearchQueryElement, 'value' | 'condition'>> & {
    value?: string | number | boolean | (string | number | boolean | null)[] | null;
    condition?: SearchQueryElement['condition']; // Explicitly type condition
    _key?: string; // Internal key for React list rendering
};


const initialCriterion = (fieldValue: string = '', fieldType: FieldType = 'text'): SearchCriterionState => {
    const initialCondition = conditionsByType[fieldType]?.[0]?.value ?? 'EQ';
    let initialValue: SearchCriterionState['value'] = '';
    if (fieldType === 'boolean') initialValue = true;
    // Default ANY_OF for select to empty array if options exist
    else if (fieldType === 'select' && initialCondition === 'ANY_OF') initialValue = [];

    return {
        field: fieldValue,
        condition: initialCondition, // Assign directly
        value: initialValue,
        not: false,
        _key: Math.random().toString(36).substring(2, 9),
    };
};

const SearchBar: React.FC<SearchBarProps> = ({ fields, onSearch, isLoading = false }) => {
    const [criteria, setCriteria] = useState<SearchCriterionState[]>(() => [initialCriterion(fields[0]?.value, fields[0]?.type)]);

    const handleAddCriterion = () => setCriteria([...criteria, initialCriterion(fields[0]?.value, fields[0]?.type)]);

    const handleRemoveCriterion = (keyToRemove: string) => {
        if (criteria.length > 1) setCriteria(criteria.filter((c) => c._key !== keyToRemove));
        else setCriteria([initialCriterion(fields[0]?.value, fields[0]?.type)]);
    };

    const handleCriterionChange = useCallback((key: string, field: keyof SearchCriterionState, value: any) => {
        setCriteria(currentCriteria => {
            const index = currentCriteria.findIndex(c => c._key === key);
            if (index === -1) return currentCriteria;
            const newCriteria = [...currentCriteria];
            let criterion = { ...newCriteria[index] };
            // Special handling for Checkbox 'not' field
            if (field === 'not') {
                 criterion.not = value as boolean;
             } else {
                 // @ts-ignore - General handling for other fields
                 criterion[field] = value;
            }

            // Reset dependent fields when primary field changes
            if (field === 'field') {
                const selectedField = fields.find(f => f.value === value);
                const newType = selectedField?.type || 'text';
                const newCondition = conditionsByType[newType]?.[0]?.value ?? 'EQ';
                criterion.condition = newCondition;
                // Reset value based on new type/condition
                criterion.value = newType === 'boolean' ? true : (newType === 'select' && newCondition === 'ANY_OF' ? [] : '');
            } else if (field === 'condition') {
                 const currentFieldDef = fields.find(f => f.value === criterion.field);
                 if (currentFieldDef?.type === 'boolean') criterion.value = true;
                 // If changing condition for select, reset value appropriately
                 else if (currentFieldDef?.type === 'select') {
                     criterion.value = value === 'ANY_OF' ? [] : '';
                 }
                 // Ensure value is reset to string if it was an array previously (e.g., from ANY_OF)
                 else if (Array.isArray(criterion.value)) criterion.value = '';
                 // Default to empty string if value is somehow null/undefined
                 else if (criterion.value === undefined || criterion.value === null) criterion.value = '';
             }
            newCriteria[index] = criterion;
            return newCriteria;
        });
    }, [fields]);

    const handleSearchClick = () => {
        const finalQuery: SearchQuery = criteria.map(crit => {
            const fieldDef = fields.find(f => f.value === crit.field);
            // Ensure essential parts are defined
            if (!crit.field || crit.condition === undefined || crit.value === undefined || !fieldDef) {
                 console.warn("Skipping invalid criterion:", crit);
                 return null;
            }

            let parsedValue: any = crit.value;
            let isValid = true;

            // --- Type/Value Validation & Parsing ---
            switch (fieldDef.type) {
                case 'number': const num = Number(parsedValue); if (isNaN(num)) isValid = false; else parsedValue = num; break;
                case 'boolean': parsedValue = Boolean(parsedValue); break;
                case 'select':
                    if (crit.condition === 'ANY_OF') {
                        // ANY_OF expects an array. If it's not, try to make it one.
                        if (!Array.isArray(parsedValue)) parsedValue = [parsedValue].filter(v => v !== null && v !== undefined && v !== '');
                        // Ensure array elements have correct type if needed (e.g., numbers for ID fields)
                        // Add explicit type for 'v'
                        parsedValue = parsedValue.map((v: string | number | boolean | null) => /^\d+$/.test(String(v)) ? Number(v) : v);
                        if (parsedValue.length === 0) isValid = false; // Skip empty ANY_OF arrays
                    }
                    // Handle single EQ select
                    else if (parsedValue === '' || parsedValue === null) isValid = false; // Skip empty/null single select EQ
                    else if (/^\d+$/.test(String(parsedValue))) parsedValue = Number(parsedValue); // Convert numeric string to number for ID fields
                    break;
                case 'text': case 'date': if (parsedValue === '' || parsedValue === null) isValid = false; break; // Skip empty/null text/date
            }

            if (!isValid) {
                 console.warn("Skipping criterion with invalid value:", crit);
                 return null;
            }

            // Construct a valid SearchQueryElement object
            const queryElement = {
                field: crit.field!,
                condition: crit.condition!,
                value: parsedValue, // Use the validated & parsed value
                not: crit.not || false,
            };

            // TypeScript should accept this as it conforms to the SearchQueryElement union
            return queryElement as SearchQueryElement;

        }).filter((c): c is SearchQueryElement => c !== null); // Filter out nulls

         console.log("Executing Search:", finalQuery);
        onSearch(finalQuery);
    };


    // getFieldType and getFieldOptions remain the same
    const getFieldType = (fieldName: string | undefined): FieldType => fields.find(f => f.value === fieldName)?.type || 'text';
    const getFieldOptions = (fieldName: string | undefined): SearchFieldOption['options'] => fields.find(f => f.value === fieldName)?.options;

    return (
        <div className="p-4 border rounded-lg bg-card space-y-3 shadow-sm">
            {criteria.map((criterion) => (
                <div key={criterion._key} className="flex flex-wrap items-end gap-2 p-2 border rounded bg-background">
                    {/* Field */}
                    <div className='flex-grow min-w-[150px]'>
                        <Label htmlFor={`field-${criterion._key}`} className='text-xs mb-1 block'>Field</Label> {/* Added margin */}
                        <Select value={criterion.field} onValueChange={(value) => handleCriterionChange(criterion._key!, 'field', value)}>
                            <SelectTrigger id={`field-${criterion._key}`} className='h-9 text-sm'><SelectValue placeholder="Select field..." /></SelectTrigger> {/* Smaller height */}
                            <SelectContent> {fields.map(f => ( <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem> ))} </SelectContent>
                        </Select>
                    </div>
                    {/* NOT */}
                    <div className='flex items-center space-x-1 self-end pb-1.5'> {/* Adjusted alignment */}
                        <Checkbox
                            id={`not-${criterion._key}`}
                            checked={criterion.not || false}
                            onCheckedChange={(checked) => handleCriterionChange(criterion._key!, 'not', checked)} // Pass boolean directly
                            className='h-4 w-4'
                        />
                        <Label htmlFor={`not-${criterion._key}`} className='text-xs font-medium cursor-pointer'>NOT</Label>
                    </div>
                    {/* Condition */}
                    {criterion.field && (
                        <div className='flex-grow min-w-[120px]'>
                            <Label htmlFor={`condition-${criterion._key}`} className='text-xs mb-1 block'>Condition</Label> {/* Added margin */}
                            <Select value={criterion.condition} onValueChange={(value) => handleCriterionChange(criterion._key!, 'condition', value)} disabled={!criterion.field} >
                                <SelectTrigger id={`condition-${criterion._key}`} className='h-9 text-sm'><SelectValue /></SelectTrigger> {/* Smaller height */}
                                <SelectContent> {(conditionsByType[getFieldType(criterion.field)] || []).map(c => ( <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem> ))} </SelectContent>
                            </Select>
                        </div>
                    )}
                    {/* Value */}
                    {criterion.field && (
                        <div className='flex-grow min-w-[180px]'>
                            <Label htmlFor={`value-${criterion._key}`} className='text-xs mb-1 block'>Value</Label> {/* Added margin */}
                            { getFieldType(criterion.field) === 'boolean' ? (
                                <Select value={String(criterion.value ?? true)} onValueChange={(value) => handleCriterionChange(criterion._key!, 'value', value === 'true')} disabled={!criterion.field} >
                                    <SelectTrigger id={`value-${criterion._key}`} className='h-9 text-sm'><SelectValue /></SelectTrigger> {/* Smaller height */}
                                    <SelectContent> <SelectItem value="true">True</SelectItem> <SelectItem value="false">False</SelectItem> </SelectContent>
                                </Select>
                            ) : getFieldType(criterion.field) === 'select' && criterion.condition !== 'ANY_OF' ? (
                                <Select value={String(criterion.value ?? '')} onValueChange={(value) => handleCriterionChange(criterion._key!, 'value', value)} disabled={!criterion.field} >
                                    <SelectTrigger id={`value-${criterion._key}`} className='h-9 text-sm'><SelectValue placeholder="Select value..."/></SelectTrigger> {/* Smaller height */}
                                    <SelectContent> {(getFieldOptions(criterion.field) || []).map(opt => ( <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem> ))} </SelectContent>
                                </Select>
                            ) : ( // Render standard input for text, number, date, and select with ANY_OF (user types comma-separated)
                                <Input
                                    id={`value-${criterion._key}`}
                                    type={getFieldType(criterion.field) === 'number' ? 'number' : getFieldType(criterion.field) === 'date' ? 'date' : 'text'}
                                    value={Array.isArray(criterion.value) ? criterion.value.join(',') : criterion.value as string | number ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const isAnyOfSelect = getFieldType(criterion.field) === 'select' && criterion.condition === 'ANY_OF';
                                        handleCriterionChange(criterion._key!, 'value', isAnyOfSelect ? val.split(',').map(s=>s.trim()).filter(Boolean) : val);
                                    }}
                                    placeholder={
                                        getFieldType(criterion.field) === 'date' ? 'YYYY-MM-DD' :
                                        (getFieldType(criterion.field) === 'select' && criterion.condition === 'ANY_OF') ? 'value1, value2...' :
                                        'Enter value...'
                                    }
                                    disabled={!criterion.field}
                                    className='h-9 text-sm' // Smaller height
                                />
                            )}
                        </div>
                    )}
                    {/* Remove */}
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCriterion(criterion._key!)} className='self-end text-muted-foreground hover:text-destructive h-9 w-9' title='Remove criterion' disabled={criteria.length <= 1} > {/* Adjusted size */}
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
                <Button type="button" variant="outline" onClick={handleAddCriterion} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Filter
                </Button>
                <Button type="button" onClick={handleSearchClick} disabled={isLoading} size='sm'>
                    {isLoading && <LoadingSpinner size='sm' className='mr-2' />}
                    <Search className="mr-2 h-4 w-4" /> Search
                </Button>
            </div>
        </div>
    );
};

export default SearchBar;