import van, { State } from "vanjs-core"; // Added State
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select"; // Use the basic Select
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox"; // Use Checkbox
import TagSelector from "./TagSelector"; // Use TagSelector
import LoadingSpinner from "./LoadingSpinner";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import type { SearchQuery, SearchQueryElement } from "../../../../backend/src/utils/search";
import type { Tag } from "../../../../backend/src/functionalities/tag/models";

const { div, p } = van.tags;

// --- Types ---
export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'date' | 'tags';
export interface SearchFieldOption {
    value: string;
    label: string;
    type: FieldType;
    options?: { value: string | number | boolean; label: string }[];
}
type SearchCriterionState = { // Using internal state objects
    field: State<string | undefined>;
    condition: State<SearchQueryElement['condition'] | undefined>;
    value: State<any>; // Allow any value type initially
    not: State<boolean>;
    _key: string; // Unique key for list rendering
};
interface SearchBarProps {
    fields: SearchFieldOption[];
    onSearch: (query: SearchQuery) => void;
    isLoading?: State<boolean> | boolean;
    showResetButton?: boolean;
}

// --- Styles ---
const searchBarContainerStyle = style([styles.p4, styles.border, styles.roundedLg, styles.bgCard, styles.spaceY3, styles.shadowSm]); // Added spaceY3
const criterionRowStyle = style([styles.flex, styles.flexWrap, styles.itemsEnd, styles.gap2, styles.p2, styles.border, styles.roundedMd, styles.bgBackground]);
const fieldContainerStyle = style([styles.flexGrow, { minWidth: '120px' }]); // Ensure fields don't get too small
const valueContainerStyle = style([styles.flexGrow, { minWidth: '150px' }]);
const actionContainerStyle = style([styles.flex, styles.justifyBetween, styles.itemsCenter, styles.pt2, styles.flexWrap, styles.gap2]);
const labelStyle = style([styles.textXs, styles.mb1, styles.block]); // Added mb1, block

// --- Logic ---
const conditionsByType: Record<FieldType, { value: SearchQueryElement['condition']; label: string }[]> = {
    text: [{ value: 'FRAGMENT', label: 'Contains' }, { value: 'EQ', label: 'Equals' }],
    number: [{ value: 'EQ', label: '=' }, { value: 'GT', label: '>' }, { value: 'GTE', label: '>=' }, { value: 'LT', label: '<' }, { value: 'LTE', label: '<=' }],
    boolean: [{ value: 'EQ', label: 'Is' }],
    select: [{ value: 'EQ', label: 'Is' }, { value: 'ANY_OF', label: 'Is Any Of' }],
    tags: [{ value: 'ANY_OF', label: 'Has Any Of' }, /*{ value: 'ALL_OF', label: 'Has All Of' },*/ { value: 'EQ', label: 'Has Only' }], // EQ might be tricky for tags array
    date: [{ value: 'EQ', label: 'Is' }, { value: 'GT', label: 'After' }, { value: 'GTE', label: 'On or After' }, { value: 'LT', label: 'Before' }, { value: 'LTE', label: 'On or Before' }],
};

const getInitialValue = (type: FieldType, condition?: SearchQueryElement['condition']): any => {
    if (type === 'boolean') return true;
    if (type === 'tags' || (type === 'select' && condition === 'ANY_OF')) return [];
    return '';
};

const createCriterion = (fields: SearchFieldOption[], initialField?: SearchFieldOption): SearchCriterionState => {
    const fieldDef = initialField || fields[0];
    const type = fieldDef?.type || 'text';
    const initialCondition = conditionsByType[type]?.[0]?.value ?? 'EQ';
    return {
        field: van.state(fieldDef?.value),
        condition: van.state(initialCondition),
        value: van.state(getInitialValue(type, initialCondition)),
        not: van.state(false),
        _key: Math.random().toString(36).substring(2, 9),
    };
};

const parseValueForQuery = (value: any, type: FieldType, condition?: SearchQueryElement['condition']): { parsedValue: any, isValid: boolean } => {
    let parsedValue = value;
    let isValid = true;

    switch (type) {
        case 'number':
            const num = Number(parsedValue);
            if (isNaN(num) || String(parsedValue).trim() === '') isValid = false;
            else parsedValue = num;
            break;
        case 'boolean': parsedValue = Boolean(parsedValue); break;
        case 'tags':
            if (!Array.isArray(parsedValue) || !parsedValue.every(id => typeof id === 'number')) isValid = false;
            else if (parsedValue.length === 0 && condition === 'ANY_OF') isValid = false; // ANY_OF needs at least one tag
            break;
        case 'select':
            if (condition === 'ANY_OF') {
                if (!Array.isArray(parsedValue)) parsedValue = String(parsedValue).split(',').map(s=>s.trim()).filter(Boolean); // Simple comma split for multi-select text input
                parsedValue = parsedValue.map((v: string | number | boolean | null) => /^\d+(\.\d+)?$/.test(String(v)) ? Number(v) : v); // Parse numbers
                if (parsedValue.length === 0) isValid = false;
            } else if (String(parsedValue).trim() === '' || parsedValue === null) isValid = false;
            else if (/^\d+(\.\d+)?$/.test(String(parsedValue))) parsedValue = Number(parsedValue);
            break;
        case 'text': case 'date':
            if (String(parsedValue ?? '').trim() === '') isValid = false;
            break;
    }
    return { parsedValue, isValid };
};


// --- Component ---
const SearchBar = ({
    fields,
    onSearch,
    isLoading: isLoadingProp = false,
    showResetButton = true
}: SearchBarProps) => {

    const isLoading = typeof isLoadingProp === 'object' && 'val' in isLoadingProp ? isLoadingProp : van.state(isLoadingProp);
    const criteria = van.state<SearchCriterionState[]>([createCriterion(fields)]);

    const handleAddCriterion = () => {
        criteria.val = [...criteria.val, createCriterion(fields)];
    };

    const handleRemoveCriterion = (keyToRemove: string) => {
        const current = criteria.val;
        if (current.length > 1) {
            criteria.val = current.filter((c) => c._key !== keyToRemove);
        } else {
            // Reset the single criterion instead of removing it
            const firstField = fields[0];
            const type = firstField?.type || 'text';
            const initialCondition = conditionsByType[type]?.[0]?.value ?? 'EQ';
            const initialValue = getInitialValue(type, initialCondition);
            current[0].field.val = firstField?.value;
            current[0].condition.val = initialCondition;
            current[0].value.val = initialValue;
            current[0].not.val = false;
        }
    };

    const handleFieldChange = (crit: SearchCriterionState, newValue: string) => {
        crit.field.val = newValue;
        const fieldDef = fields.find(f => f.value === newValue);
        const newType = fieldDef?.type || 'text';
        const newCondition = conditionsByType[newType]?.[0]?.value ?? 'EQ';
        crit.condition.val = newCondition;
        crit.value.val = getInitialValue(newType, newCondition); // Reset value based on new type/condition
    };

    const handleConditionChange = (crit: SearchCriterionState, newCondition: SearchQueryElement['condition']) => {
        crit.condition.val = newCondition;
        const fieldDef = fields.find(f => f.value === crit.field.val);
        const type = fieldDef?.type || 'text';
         // Reset value if condition changes type expectation (e.g., EQ -> ANY_OF for select)
        crit.value.val = getInitialValue(type, newCondition);
    };

    const buildQuery = (): SearchQuery => {
        return criteria.val.map(crit => {
            const fieldDef = fields.find(f => f.value === crit.field.val);
            if (!crit.field.val || crit.condition.val === undefined || crit.value.val === undefined || !fieldDef) {
                console.warn("SearchBar: Skipping incomplete criterion:", { field: crit.field.val, cond: crit.condition.val, val: crit.value.val });
                return null;
            }

            const { parsedValue, isValid } = parseValueForQuery(crit.value.val, fieldDef.type, crit.condition.val);

            if (!isValid) {
                 console.warn(`SearchBar: Skipping criterion due to invalid/empty value:`, { field: crit.field.val, cond: crit.condition.val, val: crit.value.val });
                 return null;
            }

            return {
                field: crit.field.val!, condition: crit.condition.val!,
                value: parsedValue, not: crit.not.val || false,
            } as SearchQueryElement;
        }).filter((c): c is SearchQueryElement => c !== null);
    };

    const handleSearchClick = () => {
        onSearch(buildQuery());
    };

    const handleResetClick = () => {
        criteria.val = [createCriterion(fields)]; // Reset criteria state
        onSearch([]); // Trigger search with empty query
    };

    // Derive if reset should be enabled
    const isCriteriaDirty = van.derive(() => {
        if (criteria.val.length > 1) return true;
        const defaultCritData = createCriterion(fields);
        const currentCrit = criteria.val[0];
        // Ensure default values are not undefined before comparing
        const defaultFieldValue = defaultCritData.field.val ?? fields[0]?.value;
        const defaultCondValue = defaultCritData.condition.val ?? conditionsByType[fields[0]?.type || 'text']?.[0]?.value;
        const defaultValValue = defaultCritData.value.val ?? getInitialValue(fields[0]?.type || 'text', defaultCondValue);

        return (
            currentCrit.field.val !== defaultFieldValue ||
            currentCrit.condition.val !== defaultCondValue ||
            JSON.stringify(currentCrit.value.val) !== JSON.stringify(defaultValValue) ||
            currentCrit.not.val !== defaultCritData.not.val
        );
    });

    return div({ class: searchBarContainerStyle },
        // Render each criterion row reactively
        van.derive(() => criteria.val.map((criterion) => { // Wrap map in derive
            const fieldDef = van.derive(() => fields.find(f => f.value === criterion.field.val));
            const fieldType = van.derive(() => fieldDef.val?.type || 'text');
            const fieldOptions = van.derive(() => fieldDef.val?.options || []);
            const conditionOptions = van.derive(() => conditionsByType[fieldType.val] || []);

            return div({ key: criterion._key, class: criterionRowStyle },
                // Field Select
                div({ class: fieldContainerStyle },
                    Label({ for: `field-${criterion._key}`, class: labelStyle }, "Field"),
                    Select({ // Using the simple native Select
                        id: `field-${criterion._key}`,
                        value: criterion.field, // Bind state
                        onchange: (e: Event) => handleFieldChange(criterion, (e.target as HTMLSelectElement).value),
                        options: fields.map(f => ({ value: f.value, label: f.label }))
                    })
                ),
                // NOT Checkbox
                div({ class: `${styles.flex} ${styles.itemsCenter} ${styles.spaceX1} self-end pb-[5px]`}, // Align checkbox with bottom of inputs, Added spaceX1
                    Checkbox({ // Use Checkbox component
                        id: `not-${criterion._key}`,
                        checked: criterion.not, // Bind state
                        onCheckedChange: (checked: boolean) => criterion.not.val = checked // Update state
                    }),
                    Label({ for: `not-${criterion._key}`, class: `${labelStyle} !mb-0`}, "NOT") // !mb-0 override
                ),
                // Condition Select
                div({ class: fieldContainerStyle },
                    Label({ for: `condition-${criterion._key}`, class: labelStyle }, "Condition"),
                     () => Select({ // Select must be reactive to options change
                        id: `condition-${criterion._key}`,
                        value: criterion.condition, // Bind state
                        onchange: (e: Event) => handleConditionChange(criterion, (e.target as HTMLSelectElement).value as SearchQueryElement['condition']),
                        options: conditionOptions.val, // Use derived options
                        disabled: () => !criterion.field.val // Reactive disabled
                    })
                ),
                // Value Input
                div({ class: valueContainerStyle },
                    Label({ for: `value-${criterion._key}`, class: labelStyle }, "Value"),
                    // Conditionally render input based on fieldType (reactive)
                    () => {
                        const type = fieldType.val;
                        const condition = criterion.condition.val;
                        if (type === 'boolean') {
                            return Select({
                                id: `value-${criterion._key}`,
                                value: criterion.value, // Bind boolean state (Select handles string conversion)
                                onchange: (e: Event) => criterion.value.val = (e.target as HTMLSelectElement).value === 'true',
                                options: [{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }]
                            });
                        } else if (type === 'select' && condition !== 'ANY_OF') {
                            return Select({
                                id: `value-${criterion._key}`,
                                value: criterion.value,
                                onchange: (e: Event) => criterion.value.val = (e.target as HTMLSelectElement).value,
                                options: fieldOptions.val,
                                placeholder: "Select value..."
                            });
                        } else if (type === 'tags') {
                             // Assuming availableTags are correctly mapped in fieldOptions
                            const tagsForSelector = van.derive(() =>
                                fieldOptions.val.map(opt => ({ tagId: Number(opt.value), name: opt.label }))
                             );
                             return TagSelector({
                                 selectedTagIds: criterion.value as State<number[]>, // Pass state directly
                                 onChange: (ids) => criterion.value.val = ids, // Update state
                                 availableTags: tagsForSelector.val, // Pass derived tags
                                 // Remove internal padding/border from TagSelector if needed
                                 class: `${styles.bgCard} border-none !p-0` // Removed !p-0 as it requires !important generally
                             });
                        } else {
                            return Input({
                                id: `value-${criterion._key}`,
                                type: type === 'number' ? 'number' : type === 'date' ? 'date' : 'text',
                                value: criterion.value, // Bind state
                                oninput: (e: Event) => criterion.value.val = (e.target as HTMLInputElement).value,
                                placeholder: type === 'select' && condition === 'ANY_OF' ? 'value1, value2...' : 'Enter value...',
                                class: styles.h9 // Ensure height matches selects, Added h9
                            });
                        }
                    }
                ),
                // Remove Button
                Button({
                    variant: "ghost", size: "icon",
                    onclick: () => handleRemoveCriterion(criterion._key),
                    class: `${styles.textMutedForeground} hover:${styles.textDestructive} h-9 w-9 self-end`, // Added h-9, w-9
                    title: 'Remove criterion',
                    disabled: () => criteria.val.length <= 1 // Disable if only one row
                    },
                    icons.Trash2Icon({ class: `${styles.h4} ${styles.w4}` }) // Added h4, w4
                )
            ) // End criterion div
        })), // End map + derive

        // Action Buttons
        div({ class: actionContainerStyle },
            Button({ type: "button", variant: "outline", onclick: handleAddCriterion, size: "sm" },
                icons.PlusCircleIcon({ class: styles.pr2 }), "Add Filter" // Pass class
            ),
            div({ class: `${styles.flex} ${styles.itemsCenter} ${styles.gap2}`},
                showResetButton ? Button({
                    type: "button", variant: "ghost", onclick: handleResetClick,
                    disabled: () => isLoading.val || !isCriteriaDirty.val, // Use derived state
                    size: 'sm', title: "Reset all filters"
                    },
                    icons.RefreshCcwIcon({ class: styles.pr2 }), "Reset" // Pass class
                ) : null,
                Button({ type: "button", onclick: handleSearchClick, disabled: isLoading, size: 'sm' },
                    () => isLoading.val ? LoadingSpinner({ size: 'sm', class: styles.pr2 }) : null,
                    icons.SearchIcon({ class: styles.pr2 }), "Search" // Pass class
                )
            )
        )
    );
};

export default SearchBar;