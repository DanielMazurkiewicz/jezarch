import { Component, createMemo, For, Show, Switch, Match } from 'solid-js'; // Added Switch, Match
import { createStore, produce } from 'solid-js/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { FormLabel } from '@/components/ui/FormLabel';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon } from '@/components/shared/Icon';
import TagSelector from './TagSelector'; // Import TagSelector
import LoadingSpinner from './LoadingSpinner';
import { cn } from '@/lib/utils';
import type { SearchRequest, SearchQuery, SearchQueryElement } from '../../../../backend/src/utils/search';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import styles from './SearchBar.module.css'; // Import CSS Module (Typed)

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'tags' | 'date'; // Added date

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

// Available conditions mapped by type
const conditionsByType: Record<FieldType, { value: SearchQueryElement['condition'] | 'NULL'; label: string }[]> = {
    text: [ { value: 'FRAGMENT', label: 'Contains' }, { value: 'EQ', label: 'Equals' }, { value: 'NULL', label: 'Is Empty'} ],
    number: [ { value: 'EQ', label: '=' }, { value: 'GT', label: '>' }, { value: 'GTE', label: '>=' }, { value: 'LT', label: '<' }, { value: 'LTE', label: '<=' }, { value: 'NULL', label: 'Is Empty'} ],
    boolean: [ { value: 'EQ', label: 'Is' }, ], // 'NULL' typically not used for booleans
    select: [ { value: 'EQ', label: 'Is' }, { value: 'ANY_OF', label: 'Is Any Of' }, { value: 'NULL', label: 'Is Empty'} ],
    tags: [ { value: 'ANY_OF', label: 'Has Any Of' }, { value: 'NULL', label: 'Is Empty'} ],
    date: [ { value: 'EQ', label: 'Is' }, { value: 'GT', label: 'After' }, { value: 'GTE', label: 'On or After' }, { value: 'LT', label: 'Before' }, { value: 'LTE', label: 'On or Before' }, { value: 'NULL', label: 'Is Empty'} ],
};

// Type for the internal state of a single criterion row
type SearchCriterionState = {
    field: string; // Always has a field
    condition: SearchQueryElement['condition'] | 'NULL'; // Allow 'NULL'
    value: string | number | boolean | number[] | (string | number | boolean)[]; // Allow array for ANY_OF/tags
    not: boolean;
    _key: string; // Unique key for list rendering
};

// Helper to get the initial state for a criterion
const getInitialCriterion = (fields: SearchFieldOption[]): SearchCriterionState => {
    const initialField = fields[0];
    if (!initialField) {
        throw new Error("SearchBar requires at least one field definition.");
    }
    const type = initialField.type;
    const initialCondition = conditionsByType[type]?.[0]?.value ?? 'EQ';
    let initialValue: SearchCriterionState['value'] = '';
    if (type === 'boolean') initialValue = true; // Default boolean to true
    else if (type === 'tags' || (type === 'select' && initialCondition === 'ANY_OF')) initialValue = [];

    return {
        field: initialField.value,
        condition: initialCondition,
        value: initialValue,
        not: false,
        _key: Math.random().toString(36).substring(2, 9),
    };
};


const SearchBar: Component<SearchBarProps> = (props) => {
    const [criteria, setCriteria] = createStore<SearchCriterionState[]>([getInitialCriterion(props.fields)]);

    const handleAddCriterion = () => {
        setCriteria(produce(c => { c.push(getInitialCriterion(props.fields)); }));
    };

    const handleRemoveCriterion = (keyToRemove: string) => {
        if (criteria.length > 1) {
            setCriteria(prev => prev.filter((c) => c._key !== keyToRemove));
        } else {
            // Reset the single criterion instead of removing it
            setCriteria([getInitialCriterion(props.fields)]);
        }
    };

    // Update a specific criterion's property
    const handleCriterionChange = (key: string, field: keyof Omit<SearchCriterionState, '_key'>, value: any) => {
        setCriteria(
            (c) => c._key === key, // Find the criterion by key
            produce(item => { // Update using produce
                // @ts-ignore - Allow dynamic assignment
                item[field] = value;

                 // If the main field changed, reset condition and value based on new type
                 if (field === 'field') {
                    const selectedFieldDef = props.fields.find(f => f.value === value);
                    const newType = selectedFieldDef?.type ?? 'text';
                    const newCondition = conditionsByType[newType]?.[0]?.value ?? 'EQ';
                    item.condition = newCondition;
                    item.value = newType === 'boolean' ? true :
                                (newType === 'tags' || (newType === 'select' && newCondition === 'ANY_OF')) ? [] : '';
                    item.not = false; // Reset NOT toggle when field changes
                 }
                 // If condition changed, adjust value type if necessary
                 else if (field === 'condition') {
                    const currentFieldDef = props.fields.find(f => f.value === item.field);
                    // Reset value if changing to/from NULL condition or boolean
                    if (value === 'NULL' || currentFieldDef?.type === 'boolean') {
                         item.value = currentFieldDef?.type === 'boolean' ? true : ''; // Booleans always need a value, NULL needs none
                    } else if (currentFieldDef?.type === 'select' || currentFieldDef?.type === 'tags') {
                         // If switching to multi-select, ensure value is array, otherwise clear it
                         item.value = value === 'ANY_OF' ? (Array.isArray(item.value) ? item.value : []) : '';
                    } else if (Array.isArray(item.value)) { // If switching away from multi-select/tags
                        item.value = ''; // Reset value if it was an array
                    }
                 }
            })
        );
    };

    // Build the final query for the API
    const buildQuery = (): SearchQuery => {
        return criteria.map(crit => {
            const fieldDef = props.fields.find(f => f.value === crit.field);
            if (!crit.field || !crit.condition || !fieldDef) return null;

            let parsedValue: any = crit.value;
            let isValid = true;
            let finalCondition: SearchQueryElement['condition'] = crit.condition as SearchQueryElement['condition']; // Assume valid initially

            if (crit.condition === 'NULL') {
                parsedValue = undefined; // NULL condition means no value
                finalCondition = 'EQ'; // Backend usually handles NULL via EQ with undefined/null value
                // Null condition is always valid, regardless of field type (except maybe boolean if not allowed)
            } else {
                 // Check for empty values for non-NULL conditions
                 if (parsedValue === undefined || parsedValue === null || (typeof parsedValue === 'string' && parsedValue.trim() === '') || (Array.isArray(parsedValue) && parsedValue.length === 0)) {
                      isValid = false; // Value required for non-NULL conditions (and non-empty array for ANY_OF)
                 } else {
                     // Type-specific parsing/validation
                     switch (fieldDef.type) {
                         case 'number':
                             const num = Number(parsedValue);
                             if (isNaN(num)) isValid = false; else parsedValue = num;
                             break;
                         case 'boolean':
                             // Already handled by Select/Checkbox, should be true/false
                             parsedValue = String(parsedValue).toLowerCase() === 'true';
                             break;
                         case 'tags':
                             if (!Array.isArray(parsedValue) || !parsedValue.every(id => typeof id === 'number')) isValid = false;
                             // isValid already checks for empty array above
                             break;
                         case 'select':
                              if (crit.condition === 'ANY_OF') {
                                 if (!Array.isArray(parsedValue)) isValid = false; // Should be handled by TagSelector/MultiSelect
                                 // Convert potential number strings back to numbers if options use numbers
                                 parsedValue = parsedValue.map((v: string | number | boolean) => String(v).match(/^\d+$/) ? Number(v) : v);
                             } else {
                                  // Convert potential number string back to number if options use numbers
                                  if (fieldDef.options?.some(o => typeof o.value === 'number') && String(parsedValue).match(/^\d+$/)) {
                                     parsedValue = Number(parsedValue);
                                  }
                             } break;
                         case 'text': case 'date':
                             // Value already validated for emptiness above
                             break;
                     }
                 }
            }

            if (!isValid) { console.warn(`SearchBar: Skipping invalid criterion:`, crit); return null; }
            // Construct the final element for the query
            return {
                field: crit.field,
                condition: finalCondition,
                value: parsedValue,
                not: crit.not || false
            } as SearchQueryElement; // Cast is necessary as we handled NULL separately
        }).filter((c): c is SearchQueryElement => c !== null);
    };

    const handleSearchClick = () => { props.onSearch(buildQuery()); };
    const handleResetClick = () => { setCriteria([getInitialCriterion(props.fields)]); props.onSearch([]); };

    const isCriteriaDirty = createMemo(() => {
        if (criteria.length > 1) return true;
        const defaultCrit = getInitialCriterion(props.fields);
        const currentCrit = criteria[0];
        return currentCrit.field !== defaultCrit.field || currentCrit.condition !== defaultCrit.condition ||
               JSON.stringify(currentCrit.value) !== JSON.stringify(defaultCrit.value) || currentCrit.not !== defaultCrit.not;
    });

     const getTagsFromOptions = (fieldName: string): Tag[] => {
        const fieldDef = props.fields.find(f => f.value === fieldName);
        if (!fieldDef || fieldDef.type !== 'tags' || !fieldDef.options) return [];
        return fieldDef.options.map(opt => ({ tagId: typeof opt.value === 'number' ? opt.value : parseInt(String(opt.value), 10), name: opt.label }));
     };

    return (
        <div class={styles.searchBarContainer}>
            <For each={criteria}>
                {(criterion, index) => {
                    const fieldDef = createMemo(() => props.fields.find(f => f.value === criterion.field));
                    const fieldType = createMemo(() => fieldDef()?.type ?? 'text');
                    const availableConditions = createMemo(() => conditionsByType[fieldType()] ?? []);
                    const allowMultiselectValue = createMemo(() => fieldType() === 'tags' || (fieldType() === 'select' && criterion.condition === 'ANY_OF'));
                    const isValueDisabled = createMemo(() => criterion.condition === 'NULL');

                    return (
                        <div class={styles.criteriaRow}>
                             {/* Field Select */}
                            <div class={styles.fieldSelectWrapper}>
                                <FormLabel class={styles.criteriaLabel} for={`field-${criterion._key}`}>Field</FormLabel>
                                <Select value={criterion.field} onChange={(value) => handleCriterionChange(criterion._key, 'field', value)} id={`field-${criterion._key}`}>
                                     {/* FIX: Add SelectValue inside SelectTrigger */}
                                     <SelectTrigger>
                                         <SelectValue />
                                     </SelectTrigger>
                                     <SelectContent>
                                         <For each={props.fields}>{(f) => <SelectItem value={f.value}>{f.label}</SelectItem>}</For>
                                     </SelectContent>
                                </Select>
                            </div>
                            {/* NOT Toggle */}
                            <div class={styles.notToggleWrapper}>
                                <Checkbox id={`not-${criterion._key}`} checked={criterion.not} onCheckedChange={(checked) => handleCriterionChange(criterion._key, 'not', !!checked)} />
                                <FormLabel class={styles.criteriaLabel} for={`not-${criterion._key}`}>NOT</FormLabel>
                            </div>
                            {/* Condition Select */}
                            <Show when={fieldDef()}>
                                <div class={styles.conditionSelectWrapper}>
                                    <FormLabel class={styles.criteriaLabel} for={`condition-${criterion._key}`}>Condition</FormLabel>
                                    <Select value={criterion.condition} onChange={(value) => handleCriterionChange(criterion._key, 'condition', value)} id={`condition-${criterion._key}`}>
                                         {/* FIX: Add SelectValue inside SelectTrigger */}
                                         <SelectTrigger>
                                             <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                             <For each={availableConditions()}>{(c) => <SelectItem value={c.value}>{c.label}</SelectItem>}</For>
                                         </SelectContent>
                                     </Select>
                                </div>
                            </Show>
                             {/* Value Input */}
                            <Show when={fieldDef()}>
                                <div class={styles.valueInputWrapper}>
                                    <FormLabel class={styles.criteriaLabel} for={`value-${criterion._key}`}>Value</FormLabel>
                                    <Switch>
                                         <Match when={fieldType() === 'boolean'}>
                                            <Select value={String(criterion.value ?? true)} onChange={(value) => handleCriterionChange(criterion._key, 'value', value === 'true')} id={`value-${criterion._key}`} disabled={isValueDisabled()}>
                                                 {/* FIX: Add SelectValue inside SelectTrigger */}
                                                 <SelectTrigger>
                                                     <SelectValue />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                     <SelectItem value="true">True</SelectItem>
                                                     <SelectItem value="false">False</SelectItem>
                                                 </SelectContent>
                                            </Select>
                                        </Match>
                                         <Match when={fieldType() === 'tags'}>
                                            <TagSelector selectedTagIds={Array.isArray(criterion.value) ? criterion.value as number[] : []} onChange={(ids) => handleCriterionChange(criterion._key, 'value', ids)} availableTags={getTagsFromOptions(criterion.field)} disabled={isValueDisabled()} />
                                         </Match>
                                         <Match when={fieldType() === 'select'}>
                                              <Select
                                                 // Use the string representation for the Select value prop
                                                 value={allowMultiselectValue() ? JSON.stringify(criterion.value) : String(criterion.value ?? '')}
                                                 onChange={(value) => {
                                                     // Need to parse back if multiselect
                                                     const finalValue = allowMultiselectValue() ? JSON.parse(value as string) : value;
                                                     handleCriterionChange(criterion._key, 'value', finalValue);
                                                 }}
                                                 id={`value-${criterion._key}`}
                                                 disabled={isValueDisabled()}
                                                 placeholder={ allowMultiselectValue() ? "Select one or more..." : "Select value..."}
                                              >
                                                 {/* FIX: Add SelectValue inside SelectTrigger */}
                                                 <SelectTrigger>
                                                     <SelectValue />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                     {/* Filter out invalid options */}
                                                     <For each={fieldDef()?.options?.filter(o => o.value !== undefined && o.value !== null) ?? []}>
                                                         {(o) => <SelectItem value={String(o.value)}>{o.label}</SelectItem>}
                                                     </For>
                                                 </SelectContent>
                                             </Select>
                                         </Match>
                                          <Match when={true}>
                                                <Input id={`value-${criterion._key}`} type={fieldType() === 'number' ? 'number' : fieldType() === 'date' ? 'date' : 'text'} value={String(criterion.value ?? '')} onInput={(e) => handleCriterionChange(criterion._key, 'value', e.currentTarget.value)} placeholder={ isValueDisabled() ? '(Not applicable)' : fieldType() === 'date' ? 'YYYY-MM-DD' : 'Enter value...' } disabled={isValueDisabled()} />
                                          </Match>
                                    </Switch>
                                </div>
                            </Show>
                             {/* Remove Button */}
                             <Button variant="ghost" size="icon" onClick={() => handleRemoveCriterion(criterion._key)} class={styles.removeButton} title='Remove criterion' disabled={criteria.length <= 1 && index() === 0} aria-label="Remove filter criterion">
                                <Icon name="Trash2" size="1rem" />
                            </Button>
                        </div>
                    );
                }}
            </For>

             {/* Actions Footer */}
            <div class={styles.actionsContainer}>
                <Button type="button" variant="outline" onClick={handleAddCriterion} size="sm" class={styles.addFilterButton}>
                    <Icon name="PlusCircle" class={styles.iconMargin} size="1em"/> Add Filter
                </Button>
                <div class={styles.searchActionsGroup}>
                     <Show when={props.showResetButton !== false}>
                         <Button type="button" variant="ghost" onClick={handleResetClick} disabled={props.isLoading || !isCriteriaDirty()} size='sm' title="Reset all filters">
                             <Icon name="RefreshCcw" class={cn(styles.iconMargin, props.isLoading && styles.animateSpin)} size="1em"/> Reset
                         </Button>
                     </Show>
                    <Button type="button" onClick={handleSearchClick} disabled={props.isLoading} size='sm'>
                        <Show when={props.isLoading} fallback={<><Icon name="Search" class={styles.iconMargin} size="1em"/> Search</>}>
                            <LoadingSpinner size='sm' class={styles.iconMargin}/> Searching...
                        </Show>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SearchBar;