import van, { State } from "vanjs-core"; // Import State
import { themeVars } from "@/styles/theme.css";
import { style } from "@vanilla-extract/css";
import * as styles from "@/styles/utils.css"; // Import all utility styles
import Header from "./Header";
import Sidebar from "./Sidebar";

const { div, main } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
type VanChild = Node | State<Node | null> | string | number | boolean | null | undefined | readonly VanChild[];
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}


// --- Styles ---
const layoutStyle = style([
    styles.flex,
    styles.minHScreen,
    styles.wFull,
    {
        backgroundColor: themeVars.color.muted, // Use muted for the overall background tint
    }
]);

const mainWrapperStyle = style([
    styles.flex,
    styles.flexCol,
    styles.flexGrow, // Take remaining space
]);

const mainContentStyle = style([
    styles.flexGrow,
    styles.overflowAuto,
    styles.p4, // Standard padding
    styles.bgBackground, // Solid background for content area
    {
        '@media': {
            'screen and (min-width: 768px)': { // md breakpoint
                padding: themeVars.spacing.xl, // Use theme variable equivalent to p-6
            },
        },
    }
]);

const contentContainerStyle = style([
    styles.maxW7xl, // Max width container
    {
        marginLeft: 'auto',
        marginRight: 'auto',
    }
]);

// --- Component ---
// Updated signature to accept VanChild[]
const Layout = (...children: VanChild[]) => {
  // State for mobile sidebar (optional, implement if needed)
  // const isSidebarOpen = van.state(false);
  // const toggleSidebar = () => isSidebarOpen.val = !isSidebarOpen.val;

  return div({ class: layoutStyle },
    Sidebar(), // Render Sidebar
    div({ class: mainWrapperStyle },
      Header(/* { toggleSidebar } */), // Render Header
      main({ class: mainContentStyle },
        div({ class: contentContainerStyle },
           children // Render child components passed to Layout
        )
      )
    )
  );
};

export default Layout;