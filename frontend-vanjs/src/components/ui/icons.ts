import van from "vanjs-core";
import type { State } from "vanjs-core"; // Import State type

const { svg, path, line, polyline, rect, circle } = van.tags; // Use van.tags directly

// --- Minimal Type Definitions ---
// Define VanTag locally as VanJS doesn't export it directly in older versions
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    // Allow any string key for attributes, including class, style, event handlers etc.
    [key: string]: PropValueOrDerived | any;
}
// --- Icon Component Props ---
interface IconProps extends Omit<VanTag<SVGSVGElement>, 'children' | 'size'> { // Omit children/size if handled by commonAttrs
    size?: number | string;
    class?: string | State<string>; // Explicitly allow class
}


// --- Common Attributes ---
// Spread props first to allow overrides, but ensure core SVG attributes are set
const commonAttrs = (props: IconProps) => ({
    // Allow props like class, style, event handlers to be passed through
    ...props,
    // Set SVG defaults, potentially overridden by props if needed, but less likely
    width: props.size ?? "1em",
    height: props.size ?? "1em",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
});


// --- Icon Definitions (Add more as needed) ---

export const Loader2Icon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M21 12a9 9 0 1 1-6.219-8.56"})
);

export const MenuIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    line({x1:"3", y1:"12", x2:"21", y2:"12"}),
    line({x1:"3", y1:"6", x2:"21", y2:"6"}),
    line({x1:"3", y1:"18", x2:"21", y2:"18"})
);

export const LogOutIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}),
    polyline({points:"16 17 21 12 16 7"}),
    line({x1:"21", y1:"12", x2:"9", y2:"12"})
);

export const CheckCircleIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),
    polyline({points:"22 4 12 14.01 9 11.01"})
);

export const AlertCircleIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    circle({cx:"12", cy:"12", r:"10"}),
    line({x1:"12", y1:"8", x2:"12", y2:"12"}),
    line({x1:"12", y1:"16", x2:"12.01", y2:"16"})
);

export const CheckIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    polyline({points:"20 6 9 17 4 12"})
);

export const MinusIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    line({x1:"5", y1:"12", x2:"19", y2:"12"})
);

export const LayoutDashboardIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    rect({ width:"7", height:"9", x:"3", y:"3", rx:"1"}),
    rect({ width:"7", height:"5", x:"14", y:"3", rx:"1"}),
    rect({ width:"7", height:"9", x:"14", y:"12", rx:"1"}),
    rect({ width:"7", height:"5", x:"3", y:"16", rx:"1"})
);

export const ArchiveIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    rect({ width:"20", height:"5", x:"2", y:"3", rx:"1"}),
    path({d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"}),
    line({ x1:"10", y1:"12", x2:"14", y2:"12"})
);

export const PenToolIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"m12 19 7-7 3 3-7 7-3-3z"}),
    path({d:"m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"}),
    path({d:"m2 2 7.586 7.586"}),
    circle({ cx:"11", cy:"11", r:"2"})
);

export const TagIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.432 0l6.568-6.568a2.426 2.426 0 0 0 0-3.432l-8.704-8.704z"}),
    circle({ cx:"18", cy:"18", r:"1"}) // Use circle instead of line for the hole
);

export const StickyNoteIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"}),
    polyline({points:"15 3 15 8 20 8"})
);

export const ShieldAlertIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"}),
    path({d:"M12 8v4"}),
    path({d:"M12 16h.01"})
);

export const Trash2Icon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M3 6h18"}),
    path({d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"}),
    path({d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"}),
    line({x1:"10", y1:"11", x2:"10", y2:"17"}),
    line({x1:"14", y1:"11", x2:"14", y2:"17"})
);

export const EditIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),
    path({d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"})
);

export const PlusCircleIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    circle({cx:"12", cy:"12", r:"10"}),
    line({x1:"12", y1:"8", x2:"12", y2:"16"}),
    line({x1:"8", y1:"12", x2:"16", y2:"12"})
);

export const ArrowLeftIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"m12 19-7-7 7-7"}),
    path({d:"M19 12H5"})
);

export const FolderIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"})
);

export const FileTextIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"}),
    polyline({points:"14 2 14 8 20 8"}),
    line({x1:"16", y1:"13", x2:"8", y2:"13"}),
    line({x1:"16", y1:"17", x2:"8", y2:"17"}),
    line({x1:"10", y1:"9", x2:"8", y2:"9"})
);

export const EyeIcon = (props: IconProps = {}) => svg(commonAttrs(props),
   path({d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"}),
   circle({cx:"12", cy:"12", r:"3"})
);

export const FolderOpenIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"})
);

export const ListRestartIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M21 6H3"}),
    path({d:"M7 12H3"}),
    path({d:"M7 18H3"}),
    path({d:"M12 18a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L11 14"}),
    path({d:"M11 9v5h5"})
);

export const UserIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"}),
    circle({cx:"12", cy:"7", r:"4"})
);

export const PlusIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M5 12h14"}),
    path({d:"M12 5v14"})
);

export const XIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M18 6 6 18"}),
    path({d:"m6 6 12 12"})
);

export const SearchIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    circle({cx:"11", cy:"11", r:"8"}),
    path({d:"m21 21-4.3-4.3"})
);

export const ChevronsUpDownIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"m7 15 5 5 5-5"}),
    path({d:"m7 9 5-5 5 5"})
);

export const ArrowRightIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M5 12h14"}),
    path({d:"m12 5 7 7-7 7"})
);

export const NetworkIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    rect({width:"7", height:"7", x:"2", y:"2", rx:"1"}),
    rect({width:"7", height:"7", x:"15", y:"2", rx:"1"}),
    rect({width:"7", height:"7", x:"15", y:"15", rx:"1"}),
    rect({width:"7", height:"7", x:"2", y:"15", rx:"1"}),
    path({d:"M9 2v3"}),
    path({d:"M9 9v3"}),
    path({d:"M15 9v3"}),
    path({d:"M15 15v3"}),
    path({d:"M9 15v3"}),
    path({d:"M2 9h3"}),
    path({d:"M2 15h3"}),
    path({d:"M12 9h3"}),
    path({d:"M12 15h3"}),
    path({d:"M22 9h-3"}),
    path({d:"M22 15h-3"})
);

export const BanIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    circle({cx:"12", cy:"12", r:"10"}),
    path({d:"m4.9 4.9 14.2 14.2"})
);

// Added Missing Icons
export const ChevronLeftIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    polyline({points:"15 18 9 12 15 6"})
);

export const ChevronRightIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    polyline({points:"9 18 15 12 9 6"})
);

export const MoreHorizontalIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    circle({cx:"12", cy:"12", r:"1"}),
    circle({cx:"19", cy:"12", r:"1"}),
    circle({cx:"5", cy:"12", r:"1"})
);

export const RotateCwIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"}),
    path({d:"M21 3v5h-5"})
);

export const UploadIcon = (props: IconProps = {}) => svg(commonAttrs(props),
    path({d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),
    polyline({points:"17 8 12 3 7 8"}),
    line({x1:"12", y1:"3", x2:"12", y2:"15"})
);