import { Component, JSX, splitProps } from 'solid-js';
import { cn } from '@/lib/utils';
// import * as styles from './Table.css'; // Removed VE import
import styles from './Table.module.css'; // Import CSS Module

// --- Table Components ---

// Container allows horizontal scrolling
const TableContainer: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <div class={cn(styles.tableContainer, local.class)} {...rest}>{local.children}</div>;
};

// Table Element - now renders inside TableContainer by default
// Use JSX.HTMLAttributes<HTMLTableElement> instead of JSX.TableHTMLAttributes
export const Table: Component<JSX.HTMLAttributes<HTMLTableElement>> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    // Wrap table in container for overflow handling
    return (
        <TableContainer>
            <table class={cn(styles.table, local.class)} {...rest}>
                {local.children}
            </table>
        </TableContainer>
    );
};

// Table Header (thead)
export const TableHeader: Component<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <thead class={cn(styles.tableHeader, local.class)} {...rest}>{local.children}</thead>;
};

// Table Body (tbody)
export const TableBody: Component<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <tbody class={cn(styles.tableBody, local.class)} {...rest}>{local.children}</tbody>;
};

// Table Footer (tfoot)
export const TableFooter: Component<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <tfoot class={cn(styles.tableFooter, local.class)} {...rest}>{local.children}</tfoot>;
};

// Table Row (tr)
interface TableRowProps extends JSX.HTMLAttributes<HTMLTableRowElement> {
    selected?: boolean; // Optional selected state
}
export const TableRow: Component<TableRowProps> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children', 'selected']);
    return <tr class={cn(styles.tableRow, local.class)} data-state={local.selected ? 'selected' : undefined} {...rest}>{local.children}</tr>;
};

// Table Head (th)
export const TableHead: Component<JSX.ThHTMLAttributes<HTMLTableCellElement>> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <th class={cn(styles.tableHead, local.class)} {...rest}>{local.children}</th>;
};

// Table Cell (td)
export const TableCell: Component<JSX.TdHTMLAttributes<HTMLTableCellElement>> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    return <td class={cn(styles.tableCell, local.class)} {...rest}>{local.children}</td>;
};

// Table Caption (caption)
export const TableCaption: Component<JSX.HTMLAttributes<HTMLTableCaptionElement>> = (props) => {
    const [local, rest] = splitProps(props, ['class', 'children']);
    // Cast rest to any to avoid TS complaining about non-standard attributes potentially passed
    return <caption class={cn(styles.tableCaption, local.class)} {...rest as any}>{local.children}</caption>;
};