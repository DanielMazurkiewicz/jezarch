import { style } from "@vanilla-extract/css";
import { themeVars } from "./theme.css";

// Helper function to create spacing styles for direct children
const createSpaceY = (spaceVar: string) => style({
  selectors: { '& > * + *': { marginTop: spaceVar } }
});
const createSpaceX = (spaceVar: string) => style({
  selectors: { '& > * + *': { marginLeft: spaceVar } }
});

// Helper for simple media query prefixes (very basic)
const sm = (styles: Record<string, string | number>) => ({
    '@media': { 'screen and (min-width: 640px)': styles }
});
const md = (styles: Record<string, string | number>) => ({
    '@media': { 'screen and (min-width: 768px)': styles }
});
const lg = (styles: Record<string, string | number>) => ({
    '@media': { 'screen and (min-width: 1024px)': styles }
});
// Add xl, 2xl if needed

// --- Layout ---
export const block = style({ display: "block" }); // Added block
export const inlineBlock = style({ display: "inline-block" }); // Added inline-block
export const flex = style({ display: "flex" });
export const inlineFlex = style({ display: "inline-flex" });
export const grid = style({ display: "grid" });

export const itemsCenter = style({ alignItems: "center" });
export const itemsStart = style({ alignItems: "flex-start" });
export const itemsEnd = style({ alignItems: "flex-end" });

export const justifyCenter = style({ justifyContent: "center" });
export const justifyStart = style({ justifyContent: "flex-start" });
export const justifyEnd = style({ justifyContent: "flex-end" });
export const justifyBetween = style({ justifyContent: "space-between" });
export const justifySelfStart = style({ justifySelf: "flex-start" }); // Added

export const flexCol = style({ flexDirection: "column" });
export const flexRow = style({ flexDirection: "row" });
export const flexWrap = style({ flexWrap: "wrap" });
export const flexGrow = style({ flexGrow: 1 });
export const flexShrink0 = style({ flexShrink: 0 });

// --- Spacing (using theme variables) ---
// Example: gap
export const gap1 = style({ gap: themeVars.spacing.xs });
export const gap2 = style({ gap: themeVars.spacing.sm });
export const gap3 = style({ gap: themeVars.spacing.md });
export const gap4 = style({ gap: themeVars.spacing.lg });
export const gap6 = style({ gap: themeVars.spacing.xl });

// Example: padding (all sides)
export const p0 = style({ padding: '0px'}); // Added p0
export const p1 = style({ padding: themeVars.spacing.xs });
export const p2 = style({ padding: themeVars.spacing.sm });
export const p3 = style({ padding: themeVars.spacing.md });
export const p4 = style({ padding: themeVars.spacing.lg });
export const p6 = style({ padding: themeVars.spacing.xl });
export const p10 = style({ padding: `calc(${themeVars.spacing.xl} * 1.25)` }); // p-10 approx
export const p20 = style({ padding: `calc(${themeVars.spacing.xl} * 2.5)` }); // p-20 approx

// Example: padding (individual sides)
export const pt1 = style({ paddingTop: themeVars.spacing.xs });
export const pt2 = style({ paddingTop: themeVars.spacing.sm });
export const pt3 = style({ paddingTop: themeVars.spacing.md });
export const pt4 = style({ paddingTop: themeVars.spacing.lg });
export const pt6 = style({ paddingTop: themeVars.spacing.xl });

export const pb1 = style({ paddingBottom: themeVars.spacing.xs });
export const pb2 = style({ paddingBottom: themeVars.spacing.sm });
export const pb3 = style({ paddingBottom: themeVars.spacing.md });
export const pb4 = style({ paddingBottom: themeVars.spacing.lg });
export const pb6 = style({ paddingBottom: themeVars.spacing.xl });

export const pl1 = style({ paddingLeft: themeVars.spacing.xs });
export const pl2 = style({ paddingLeft: themeVars.spacing.sm });
export const pl3 = style({ paddingLeft: themeVars.spacing.md });
export const pl4 = style({ paddingLeft: themeVars.spacing.lg });
export const pl6 = style({ paddingLeft: themeVars.spacing.xl });

export const pr1 = style({ paddingRight: themeVars.spacing.xs });
export const pr2 = style({ paddingRight: themeVars.spacing.sm });
export const pr3 = style({ paddingRight: themeVars.spacing.md });
export const pr4 = style({ paddingRight: themeVars.spacing.lg });
export const pr6 = style({ paddingRight: themeVars.spacing.xl });
export const pr8 = style({ paddingRight: `calc(${themeVars.spacing.xl})` }); // pr-8 approx

// Example: padding (horizontal/vertical)
export const px1 = style({ paddingLeft: themeVars.spacing.xs, paddingRight: themeVars.spacing.xs });
export const px2 = style({ paddingLeft: themeVars.spacing.sm, paddingRight: themeVars.spacing.sm });
export const px3 = style({ paddingLeft: themeVars.spacing.md, paddingRight: themeVars.spacing.md });
export const px4 = style({ paddingLeft: themeVars.spacing.lg, paddingRight: themeVars.spacing.lg });
export const px6 = style({ paddingLeft: themeVars.spacing.xl, paddingRight: themeVars.spacing.xl });

export const py1 = style({ paddingTop: themeVars.spacing.xs, paddingBottom: themeVars.spacing.xs });
export const py2 = style({ paddingTop: themeVars.spacing.sm, paddingBottom: themeVars.spacing.sm });
export const py3 = style({ paddingTop: themeVars.spacing.md, paddingBottom: themeVars.spacing.md });
export const py4 = style({ paddingTop: themeVars.spacing.lg, paddingBottom: themeVars.spacing.lg });
export const py6 = style({ paddingTop: themeVars.spacing.xl, paddingBottom: themeVars.spacing.xl });
export const py10 = style({ paddingTop: `calc(${themeVars.spacing.xl} * 1.25)`, paddingBottom: `calc(${themeVars.spacing.xl} * 1.25)` }); // py-10 approx

// Example: margin
export const mb1 = style({ marginBottom: themeVars.spacing.xs }); // Added mb1
export const mb4 = style({ marginBottom: themeVars.spacing.lg }); // Added mb4
export const mr2 = style({ marginRight: themeVars.spacing.sm }); // Added mr2
export const ml2 = style({ marginLeft: themeVars.spacing.sm }); // Added ml2
export const mt1 = style({ marginTop: themeVars.spacing.xs }); // Added mt1
export const mt2 = style({ marginTop: themeVars.spacing.sm }); // Added mt2
export const mt4 = style({ marginTop: themeVars.spacing.lg }); // Added mt4
export const mt6 = style({ marginTop: themeVars.spacing.xl }); // Added mt6
export const my4 = style({ marginTop: themeVars.spacing.lg, marginBottom: themeVars.spacing.lg }); // Added my4
export const mlAuto = style({ marginLeft: 'auto' }); // Added mlAuto

// Corrected Space styles using helper
export const spaceY0 = createSpaceY('0px');
export const spaceY1 = createSpaceY(themeVars.spacing.xs);
export const spaceY2 = createSpaceY(themeVars.spacing.sm);
export const spaceY3 = createSpaceY(themeVars.spacing.md);
export const spaceY4 = createSpaceY(themeVars.spacing.lg);
export const spaceY6 = createSpaceY(themeVars.spacing.xl);

export const spaceX1 = createSpaceX(themeVars.spacing.xs);
export const spaceX2 = createSpaceX(themeVars.spacing.sm);
export const spaceX4 = createSpaceX(themeVars.spacing.lg);

// --- Sizing ---
export const wFull = style({ width: "100%" });
export const hFull = style({ height: "100%" });
export const minHScreen = style({ minHeight: "100vh" });
export const minH40 = style({ minHeight: "40px" }); // Added
export const minH22 = style({ minHeight: "22px" }); // Added
export const maxH60vh = style({ maxHeight: "60vh" }); // Added
export const maxH150 = style({ maxHeight: "150px" }); // Added

// Approx Tailwind sizes (adjust base spacing if needed)
export const h3 = style({ height: '0.75rem'}); // 12px
export const w3 = style({ width: '0.75rem'});
export const h4 = style({ height: '1rem'}); // 16px
export const w4 = style({ width: '1rem'});
export const h5 = style({ height: '1.25rem'}); // 20px
export const w5 = style({ width: '1.25rem'});
export const h8 = style({ height: '2rem'}); // 32px
export const w8 = style({ width: '2rem'});
export const h9 = style({ height: '2.25rem'}); // 36px
export const w9 = style({ width: '2.25rem'});
export const w10 = style({ width: '2.5rem'}); // Added w10
export const h10 = style({ height: '2.5rem'}); // 40px
export const w12 = style({ width: '3rem'}); // 48px
export const h12 = style({ width: '3rem'});
export const h14 = style({ height: '3.5rem' }); // 56px
export const h32 = style({ height: '8rem'}); // Added h32
export const w64 = style({ width: '16rem' }); // 256px
export const w72 = style({ width: '18rem' }); // Added w72

export const maxWSm = style({ maxWidth: "24rem" });
export const maxW2xl = style({ maxWidth: "42rem" });
export const maxW3xl = style({ maxWidth: "48rem" });
export const maxW7xl = style({ maxWidth: "80rem" });

// --- Borders ---
export const border = style({ borderWidth: "1px", borderStyle: "solid", borderColor: themeVars.color.border });
export const borderB = style({ borderBottomWidth: "1px", borderStyle: "solid", borderColor: themeVars.color.border });
export const borderR = style({ borderRightWidth: "1px", borderStyle: "solid", borderColor: themeVars.color.border });
export const borderT = style({ borderTopWidth: "1px", borderStyle: "solid", borderColor: themeVars.color.border });
export const borderNone = style({borderWidth: "0px"}); // Added
export const roundedMd = style({ borderRadius: themeVars.radius.md });
export const roundedLg = style({ borderRadius: themeVars.radius.lg });
export const roundedXl = style({ borderRadius: themeVars.radius.lg }); // Using lg for xl

// --- Text & Font ---
export const listDisc = style({ listStyleType: 'disc' }); // Added
export const textLeft = style({ textAlign: "left" });
export const textCenter = style({ textAlign: "center" });
export const textRight = style({ textAlign: "right" });
export const textXs = style({ fontSize: "0.75rem", lineHeight: "1rem" });
export const textSm = style({ fontSize: "0.875rem", lineHeight: "1.25rem" });
export const textBase = style({ fontSize: "1rem", lineHeight: "1.5rem" });
export const textLg = style({ fontSize: "1.125rem", lineHeight: "1.75rem" });
export const textXl = style({ fontSize: "1.25rem", lineHeight: "1.75rem" });
export const text2xl = style({ fontSize: "1.5rem", lineHeight: "2rem" });
export const fontMono = style({ fontFamily: themeVars.font.mono });
export const fontNormal = style({ fontWeight: 400 });
export const fontMedium = style({ fontWeight: 500 });
export const fontSemibold = style({ fontWeight: 600 });
export const fontBold = style({ fontWeight: 700 });
export const italic = style({ fontStyle: "italic" });
export const notItalic = style({ fontStyle: "normal" });
export const underline = style({ textDecorationLine: "underline" });
export const truncate = style({
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
});
export const whitespacePreWrap = style({ whiteSpace: "pre-wrap" });
export const whitespaceNowrap = style({ whiteSpace: "nowrap" });

// --- Colors ---
export const bgBackground = style({ backgroundColor: themeVars.color.background });
export const bgCard = style({ backgroundColor: themeVars.color.card });
export const bgMuted = style({ backgroundColor: themeVars.color.muted });
export const bgPrimary = style({ backgroundColor: themeVars.color.primary });
export const bgSecondary = style({ backgroundColor: themeVars.color.secondary });
export const bgAccent = style({ backgroundColor: themeVars.color.accent });
export const bgDestructive = style({ backgroundColor: themeVars.color.destructive });
export const bgTransparent = style({ backgroundColor: "transparent" });

export const textForeground = style({ color: themeVars.color.foreground });
export const textMutedForeground = style({ color: themeVars.color.mutedForeground });
export const textPrimary = style({ color: themeVars.color.primary });
export const textPrimaryForeground = style({ color: themeVars.color.primaryForeground });
export const textSecondaryForeground = style({ color: themeVars.color.secondaryForeground });
export const textAccentForeground = style({ color: themeVars.color.accentForeground });
export const textDestructive = style({ color: themeVars.color.destructive });
export const textDestructiveForeground = style({ color: themeVars.color.destructiveForeground });

export const borderInput = style({ borderColor: themeVars.color.input });
export const borderDestructive = style({ borderColor: themeVars.color.destructive });

// --- Effects ---
export const shadowSm = style({ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" });
export const shadow = style({ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" });
export const shadowMd = style({ boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" });
export const shadowLg = style({ boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" });
export const opacity50 = style({ opacity: 0.5 });
export const opacity70 = style({ opacity: 0.7 });

// --- Interactivity ---
export const cursorPointer = style({ cursor: "pointer" });
export const cursorNotAllowed = style({ cursor: "not-allowed" });

// --- Positioning ---
export const relative = style({ position: "relative" });
export const absolute = style({ position: "absolute" });
export const fixed = style({ position: "fixed" });
export const sticky = style({ position: "sticky" });
export const inset0 = style({ inset: 0 });
export const top0 = style({ top: 0 });
export const bottom0 = style({ bottom: 0 }); // Added bottom0
export const z10 = style({ zIndex: 10 });
export const z20 = style({ zIndex: 20 });
export const z30 = style({ zIndex: themeVars.zIndex.header });
export const z50 = style({ zIndex: themeVars.zIndex.dialog }); // or popover

// --- Misc ---
export const overflowHidden = style({ overflow: "hidden" });
export const overflowAuto = style({ overflow: "auto" });
export const overflowYAuto = style({ overflowY: "auto" });
export const overflowXAuto = style({ overflowX: "auto" });
export const hidden = style({ display: 'none' }); // Added hidden
export const srOnly = style({ // Added srOnly
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
});

// --- Full Screen Center Helper ---
export const fullScreenCenter = style([flex, justifyCenter, itemsCenter, minHScreen, wFull]); // Added

// --- Transitions ---
export const transitionColors = style({
    transitionProperty: "color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform", // Added opacity, box-shadow, transform
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
    transitionDuration: "150ms",
});