import van, { State } from "vanjs-core"; // Import State
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css";
import * as styles from "@/styles/utils.css";

const { table, thead, tbody, tfoot, tr, th, td, caption, div } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// --- Styles ---
const tableContainerStyle = style([
    styles.relative, // For potential absolute elements later if needed
    styles.wFull,
    styles.overflowXAuto, // Ensure horizontal scroll on small screens
]);

const tableStyle = style([
    styles.wFull,
    styles.textSm,
    {
        captionSide: 'bottom',
        borderCollapse: 'collapse', // Use collapse for cleaner borders
    }
]);

const tableHeaderStyle = style({
    // Optional: Add background or specific styling for thead
    // backgroundColor: themeVars.color.muted,
    borderBottom: `1px solid ${themeVars.color.border}`,
});

const tableBodyStyle = style({
    // Styling for tbody rows
    selectors: {
        '& tr:last-child': {
            borderBottomWidth: '0', // Remove border from last row
        }
    }
});

const tableFooterStyle = style([
    styles.borderT,
    styles.fontMedium,
    styles.bgMuted, // Use solid muted background
    styles.textMutedForeground,
    {
        selectors: {
            '& > tr:last-child': { // Ensure footer rows also don't have double bottom border
                borderBottomWidth: '0',
            }
        }
    }
]);

const tableRowStyle = style([
    styles.borderB,
    styles.transitionColors,
    {
        selectors: {
            '&:hover': {
                backgroundColor: themeVars.color.muted, // Use solid muted for hover
            },
            // Example for data-state=selected (if needed)
            '&[data-state="selected"]': {
                backgroundColor: themeVars.color.accent,
            }
        }
    }
]);

const tableHeadStyle = style([
    styles.h10, // Approx h-10
    styles.px2, // Approx px-2
    styles.textLeft,
    styles.itemsCenter, // Use itemsCenter for vertical alignment
    styles.fontMedium,
    styles.textForeground, // Use foreground, adjust if header bg added
    styles.whitespaceNowrap,
    {
        // Specific alignment for checkbox columns if used
        selectors: {
            '&:has([role=checkbox])': { paddingRight: '0' },
            // '& > [role=checkbox]': { transform: 'translateY(2px)' } // Complex selector
        }
    }
]);

const tableCellStyle = style([
    styles.p2, // Approx p-2
    styles.itemsCenter, // Use itemsCenter for vertical alignment
    styles.whitespaceNowrap, // Default to nowrap, override per cell if needed
    {
        // Specific alignment for checkbox columns if used
        selectors: {
            '&:has([role=checkbox])': { paddingRight: '0' },
            // '& > [role=checkbox]': { transform: 'translateY(2px)' }
        }
    }
]);

const tableCaptionStyle = style([
    styles.mt4, // margin-top
    styles.textSm,
    styles.textMutedForeground,
]);

// --- Components ---
interface TableProps extends VanTag<HTMLTableElement> {}
export const Table = (props: TableProps | State<TableProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<TableProps>).val : props as TableProps;
    // Wrap table in a div for overflow handling
    return div({ class: tableContainerStyle },
        table({ class: `${tableStyle} ${className}`.trim(), ...rest }, children)
    );
};

interface TableHeaderProps extends VanTag<HTMLTableSectionElement> {}
export const TableHeader = (props: TableHeaderProps | State<TableHeaderProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<TableHeaderProps>).val : props as TableHeaderProps;
    return thead({ class: `${tableHeaderStyle} ${className}`.trim(), ...rest }, children);
};

interface TableBodyProps extends VanTag<HTMLTableSectionElement> {}
export const TableBody = (props: TableBodyProps | State<TableBodyProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<TableBodyProps>).val : props as TableBodyProps;
    return tbody({ class: `${tableBodyStyle} ${className}`.trim(), ...rest }, children);
};

interface TableFooterProps extends VanTag<HTMLTableSectionElement> {}
export const TableFooter = (props: TableFooterProps | State<TableFooterProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<TableFooterProps>).val : props as TableFooterProps;
    return tfoot({ class: `${tableFooterStyle} ${className}`.trim(), ...rest }, children);
};

interface TableRowProps extends VanTag<HTMLTableRowElement> {}
export const TableRow = (props: TableRowProps | State<TableRowProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<TableRowProps>).val : props as TableRowProps;
    return tr({ class: `${tableRowStyle} ${className}`.trim(), ...rest }, children);
};

interface TableHeadProps extends VanTag<HTMLTableCellElement> {}
export const TableHead = (props: TableHeadProps | State<TableHeadProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<TableHeadProps>).val : props as TableHeadProps;
    return th({ class: `${tableHeadStyle} ${className}`.trim(), ...rest }, children);
};

interface TableCellProps extends VanTag<HTMLTableCellElement> {}
export const TableCell = (props: TableCellProps | State<TableCellProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<TableCellProps>).val : props as TableCellProps;
    return td({ class: `${tableCellStyle} ${className}`.trim(), ...rest }, children);
};

interface TableCaptionProps extends VanTag<HTMLTableCaptionElement> {}
export const TableCaption = (props: TableCaptionProps | State<TableCaptionProps>, ...children: any[]) => {
    const isPropsState = props instanceof van.state().constructor;
    const { class: className = '', ...rest } = isPropsState ? (props as State<TableCaptionProps>).val : props as TableCaptionProps;
    return caption({ class: `${tableCaptionStyle} ${className}`.trim(), ...rest }, children);
};