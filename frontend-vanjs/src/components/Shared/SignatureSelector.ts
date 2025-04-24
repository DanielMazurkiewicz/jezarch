import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import LoadingSpinner from "./LoadingSpinner";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import ElementBrowserPopoverContent from "./ElementBrowserPopoverContent"; // The browser component
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css"; // Import theme vars
import type { SignatureElement } from "../../../../backend/src/functionalities/signature/element/models";

const { div, span } = van.tags;

// --- Types ---
type ResolvedSignature = { idPath: number[]; display: string };

// --- Styles ---
const selectorContainerStyle = style([styles.flex, styles.flexCol, styles.spaceY2, styles.roundedMd, styles.border, styles.p3, styles.bgMuted]);
const headerStyle = style([styles.flex, styles.justifyBetween, styles.itemsCenter, styles.mb1]); // Added mb1
const displayAreaStyle = style([styles.flexGrow, styles.spaceY1, styles.minH40, styles.maxH150, styles.overflowYAuto, styles.border, styles.roundedMd, styles.bgBackground, styles.p2]); // Added spaceY1, minH40, maxH150
const signatureRowStyle = style([styles.flex, styles.itemsCenter, styles.justifyBetween, styles.gap2, styles.roundedMd, styles.bgMuted, styles.p1, styles.px2, styles.textSm]);
const signatureTextStyle = style([styles.fontMono, styles.textXs, styles.flexGrow, { wordBreak: 'break-word', minWidth: 0 }]);
const removeButtonStyle = style([styles.h5, styles.w5, styles.flexShrink0, styles.textMutedForeground, { // Added h5, w5
    ':hover': { color: themeVars.color.destructive } // Use theme var
}]);
const removeButtonIconStyle = style([styles.h3, styles.w3]); // Added h3, w3

// --- Component Props ---
interface SignatureSelectorProps {
    label: string;
    signatures: State<number[][]>; // Expect VanJS state containing array of ID paths
    onChange: (newSignatures: number[][]) => void; // Callback to parent
    class?: string;
}

// --- Component ---
const SignatureSelector = ({
    label,
    signatures, // Expecting a State<number[][]>
    onChange,
    class: className = ''
}: SignatureSelectorProps) => {
    const { token } = authStore;

    // --- State ---
    const resolvedSignatures = van.state<ResolvedSignature[]>([]);
    const isLoadingSignatures = van.state(false);
    const isBrowserOpen = van.state(false); // State for the popover

    // --- Resolve Signatures ---
    van.derive(async () => { // Replaced effect with derive
        const sigPaths = signatures.val; // Depend on the state value
        if (!token.val || sigPaths.length === 0) {
            resolvedSignatures.val = []; return;
        }
        // Prevent re-fetching if already loading
        if (isLoadingSignatures.val) return;

        isLoadingSignatures.val = true;
        const resolved: ResolvedSignature[] = [];
        try {
            for (const idPath of sigPaths) {
                if (!idPath || idPath.length === 0) continue;
                // Consider caching element lookups if this becomes slow
                const elements = await Promise.all(
                    idPath.map(id => api.getSignatureElementById(id, [], token.val!).catch(() => null))
                );
                const displayParts = elements.map((el: SignatureElement | null, idx: number) => // Added types
                    el ? `${el.index ? `[${el.index}]` : ''}${el.name}` : `[Error ID: ${idPath[idx]}]`
                );
                resolved.push({ idPath, display: displayParts.join(' / ') });
            }
            resolvedSignatures.val = resolved.sort((a, b) => a.display.localeCompare(b.display));
        } catch (error) {
            console.error("Error resolving signatures:", error);
            // Fallback display on major error
            resolvedSignatures.val = sigPaths.map((p: number[]) => ({ idPath: p, display: `[${p.join(' / ')}] (Resolve Error)` })); // Added type
        } finally {
            isLoadingSignatures.val = false;
        }
    });


    // --- Event Handlers ---
    const addSignature = (newSignaturePath: number[]) => {
        const currentSigs = signatures.val;
        const newSigStr = JSON.stringify(newSignaturePath);
        if (!currentSigs.some((p: number[]) => JSON.stringify(p) === newSigStr)) { // Added type
            const updatedSigs = [...currentSigs, newSignaturePath];
            signatures.val = updatedSigs; // Update the state directly
            onChange(updatedSigs); // Notify parent
        }
        isBrowserOpen.val = false; // Close popover
    };

    const removeSignature = (pathToRemove: number[]) => {
        const pathToRemoveStr = JSON.stringify(pathToRemove);
        const updatedSigs = signatures.val.filter((p: number[]) => JSON.stringify(p) !== pathToRemoveStr); // Added type
        signatures.val = updatedSigs; // Update state
        onChange(updatedSigs); // Notify parent
    };

    // --- Render ---
    return div({ class: `${selectorContainerStyle} ${className}`.trim() },
        // Header
        div({ class: headerStyle },
            Label({ class: styles.textSm }, label),
            Popover({ open: isBrowserOpen, onOpenChange: v => isBrowserOpen.val = v },
                PopoverTrigger({ }, // Empty props, children are next arg
                    Button({ type: "button", size: "sm", variant: "outline", class: styles.flexShrink0 },
                        icons.PlusIcon({ class: styles.pr1 }), "Add Signature" // Pass class
                    )
                ),
                // Render PopoverContent only when open
                () => isBrowserOpen.val ? PopoverContent({ class: "w-[500px] max-w-[calc(100vw-2rem)] p-0", align: "start" }, // Example width, remove padding
                    ElementBrowserPopoverContent({
                        onSelectSignature: addSignature,
                        onClose: () => isBrowserOpen.val = false
                    })
                ) : null
            ) // End Popover
        ), // End Header

        // Display Area
        div({ class: displayAreaStyle },
            () => isLoadingSignatures.val ? div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.p2}` }, LoadingSpinner({ size: 'sm' })) : null,
            // Use derive for reactive list rendering
            van.derive(() => !isLoadingSignatures.val && resolvedSignatures.val.length > 0
                ? resolvedSignatures.val.map((resolved) =>
                    div({ key: JSON.stringify(resolved.idPath), class: signatureRowStyle },
                        span({ class: signatureTextStyle }, resolved.display || span({ class: styles.italic }, "Empty Signature")),
                        Button({ type: "button", variant: "ghost", size: "icon", class: removeButtonStyle, onclick: () => removeSignature(resolved.idPath), 'aria-label': `Remove signature ${resolved.display}` },
                            icons.XIcon({ class: removeButtonIconStyle }) // Pass class
                        )
                    )
                  )
                : null),
             () => !isLoadingSignatures.val && signatures.val.length === 0 ? p({ class: `${styles.textXs} ${styles.textMutedForeground} ${styles.italic} ${styles.textCenter} ${styles.py1}` }, "No signatures added.") : null
        ) // End Display Area
    ); // End Container Div
};

export default SignatureSelector;