import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { sslSchema, SslFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"; // Assuming Alert component
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { SslConfig as SslConfigType } from "../../../../backend/src/functionalities/config/ssl/models"; // Import type

const { div, form, p } = van.tags;

// --- Styles ---
const gridLayoutStyle = style([styles.grid, styles.gap6, {
    '@media': { 'screen and (min-width: 768px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } } // md:grid-cols-2
}]);
const formStyle = style([styles.spaceY4]);
const fieldStyle = style([styles.grid, styles.gap1]); // gap-1.5 approx
const errorMsgStyle = style([styles.textXs, styles.textDestructive]);
const monoTextareaStyle = style([styles.fontMono, styles.textXs]);
const successAlertStyle = style({ borderColor: 'hsl(140, 70%, 40%)', /* Add more success styles if needed */ });

// --- Component ---
const SslConfig = () => {
    const { token } = authStore;

    // --- State ---
    // Upload Form
    const key = van.state("");
    const cert = van.state("");
    const uploadStatus = van.state<'idle' | 'saving' | 'success' | 'error'>('idle');
    const uploadError = van.state<string | null>(null);
    const uploadFormErrors = van.state<Partial<Record<keyof SslFormData, string>>>({});
    const isUploadFormDirty = van.derive(() => key.val !== "" || cert.val !== ""); // Basic dirty check

    // Generate Action
    const generateStatus = van.state<'idle' | 'generating' | 'success' | 'error'>('idle');
    const generateError = van.state<string | null>(null);

    // --- Form Handling ---
    const uploadResolver = zodResolver(sslSchema);

    const handleUpload = async (e: Event) => {
        e.preventDefault();
        if (!token.val) return;

        uploadStatus.val = 'saving';
        uploadError.val = null;
        uploadFormErrors.val = {};

        const formData = { key: key.val, cert: cert.val };
        const validationResult = uploadResolver(formData);

        if (!validationResult.success) {
            uploadFormErrors.val = validationResult.errors;
            uploadStatus.val = 'error';
            uploadError.val = "Validation failed.";
            return;
        }

        try {
            await api.uploadSsl(validationResult.data as SslConfigType, token.val);
            uploadStatus.val = 'success';
            key.val = ""; // Clear form on success
            cert.val = "";
            setTimeout(() => uploadStatus.val = 'idle', 3000);
        } catch (err: any) {
            uploadError.val = err.message || "Failed to upload SSL configuration.";
            uploadStatus.val = 'error';
        }
    };

    const handleGenerate = async () => {
        if (!token.val) return;
        if (!window.confirm("Generate a new self-signed certificate? Recommended only for testing. This will overwrite existing SSL files.")) return;

        generateStatus.val = 'generating';
        generateError.val = null;
        try {
            await api.generateSsl(token.val);
            generateStatus.val = 'success';
            setTimeout(() => generateStatus.val = 'idle', 3000);
        } catch (err: any) {
            generateError.val = err.message || "Failed to generate SSL certificate.";
            generateStatus.val = 'error';
        }
    };

     // Clear errors when inputs change
     van.derive(() => { key.val; cert.val; uploadFormErrors.val = {}; uploadError.val = null; });


    // --- Render ---
    return div({ class: gridLayoutStyle },
        // Upload Card
        Card( // Removed forced white bg
            CardHeader(
                CardTitle("Upload Existing SSL"),
                CardDescription("Paste your private key and certificate (PEM format). Requires server restart.")
            ),
            CardContent(
                form({ class: formStyle, onsubmit: handleUpload },
                    // Upload Status/Error Messages
                    () => {
                        if (uploadStatus.val === 'error' && uploadError.val) {
                            return ErrorDisplay({ message: uploadError.val });
                        }
                        if (uploadStatus.val === 'success') {
                            return Alert({ variant: "success", class: successAlertStyle }, // Use custom success variant if defined
                                icons.CheckCircleIcon({ class: "h-5 w-5 text-green-600" }), // Added class prop
                                AlertTitle("Upload Successful"),
                                AlertDescription("SSL configuration uploaded. Server restart needed.")
                            );
                        }
                        return null;
                    },

                    // Private Key Input
                    div({ class: fieldStyle },
                        Label({ for: "ssl-key" }, "Private Key (.key)"),
                        Textarea({
                            id: "ssl-key", rows: 8,
                            value: key,
                            oninput: (e: Event) => key.val = (e.target as HTMLTextAreaElement).value,
                            placeholder: "-----BEGIN PRIVATE KEY-----\n...",
                            class: () => `${monoTextareaStyle} ${uploadFormErrors.val.key ? styles.borderDestructive : ''}`,
                             'aria-invalid': () => !!uploadFormErrors.val.key
                        }),
                        () => uploadFormErrors.val.key ? p({ class: errorMsgStyle }, uploadFormErrors.val.key) : null
                    ),

                    // Certificate Input
                    div({ class: fieldStyle },
                        Label({ for: "ssl-cert" }, "Certificate (.crt/.pem)"),
                        Textarea({
                            id: "ssl-cert", rows: 8,
                            value: cert,
                            oninput: (e: Event) => cert.val = (e.target as HTMLTextAreaElement).value,
                            placeholder: "-----BEGIN CERTIFICATE-----\n...",
                            class: () => `${monoTextareaStyle} ${uploadFormErrors.val.cert ? styles.borderDestructive : ''}`,
                            'aria-invalid': () => !!uploadFormErrors.val.cert
                        }),
                        () => uploadFormErrors.val.cert ? p({ class: errorMsgStyle }, uploadFormErrors.val.cert) : null
                    ),

                    // Upload Button
                    Button({
                        type: "submit",
                        disabled: () => uploadStatus.val === 'saving' || !isUploadFormDirty.val
                        },
                        () => uploadStatus.val === 'saving'
                            ? LoadingSpinner({ size: "sm", class: styles.pr2 })
                            : icons.UploadCloudIcon({ class: styles.pr2 }), // Added class prop
                        "Upload SSL Files"
                    )
                ) // End Form
            ) // End CardContent
        ), // End Upload Card

        // Generate Card
        Card( // Removed forced white bg
            CardHeader(
                CardTitle("Generate Self-Signed SSL"),
                CardDescription("Generate a new certificate for testing/development. Requires server restart.")
            ),
            CardContent({ class: styles.spaceY4 },
                // Generate Status/Error Messages
                () => {
                    if (generateStatus.val === 'error' && generateError.val) {
                        return ErrorDisplay({ message: generateError.val });
                    }
                    if (generateStatus.val === 'success') {
                        return Alert({ variant: "success", class: successAlertStyle },
                            icons.CheckCircleIcon({ class: "h-5 w-5 text-green-600" }), // Added class prop
                            AlertTitle("Generation Successful"),
                            AlertDescription("Self-signed certificate generated. Server restart may be required.")
                        );
                    }
                    return null;
                },
                // Generate Button
                Button({
                    variant: "outline",
                    onclick: handleGenerate,
                    disabled: () => generateStatus.val === 'generating'
                    },
                    () => generateStatus.val === 'generating'
                        ? LoadingSpinner({ size: "sm", class: styles.pr2 })
                        : icons.RefreshCcwIcon({ class: styles.pr2 }), // Added class prop
                    "Generate New Certificate"
                )
                // Optional info text
            ) // End CardContent
        ) // End Generate Card
    ); // End Grid Div
};

export default SslConfig;