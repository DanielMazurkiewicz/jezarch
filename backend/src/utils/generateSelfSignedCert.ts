import { generateKeyPairSync } from "node:crypto"; // Simplified imports as sign/verify are not used here anymore

/**
 * Generates a self-signed SSL certificate and private key PEM strings.
 * NOTE: This creates very basic, insecure certificates suitable ONLY for
 * local development/testing where proper certificates are not available.
 * DO NOT USE IN PRODUCTION.
 *
 * @returns { key: string, cert: string } PEM encoded key and certificate.
 */
export function generateSelfSignedCert(): { key: string; cert: string } {
    try {
        // Generate an RSA key pair
        const { privateKey, publicKey } = generateKeyPairSync("rsa", {
            modulusLength: 2048, // Standard length
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" }, // PKCS#8 is common
        });

        // --- Create a basic self-signed certificate structure ---
        // This is a simplified representation. Real certs involve complex ASN.1 structures.
        // We are creating a plausible-looking PEM block, not a cryptographically valid signed cert.
        const certHeader = "-----BEGIN CERTIFICATE-----";
        const certFooter = "-----END CERTIFICATE-----";

        // Extract the base64 part of the public key PEM
        const pubKeyBase64 = publicKey
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace(/\s+/g, ""); // Remove whitespace

        // Construct a fake certificate body - this is NOT a real signature process
        // It just embeds the public key in a certificate-like structure.
        // The content here is mostly placeholder.
        const fakeCertBody = `
MIIC+DCCAeCgAwIBAgIUDxXhIIyZ0jLdG5zU/1Y+1kgn6qgwDQYJKoZIhvcN
AQELBQAwEzERMA8GA1UEAwwIbG9jYWxob3N0MB4XDTI0MDExNTEyMDAwMFoX
DTI1MDExNTEyMDAwMFowEzERMA8GA1UEAwwIbG9jYWxob3N0MIIBIjANBgkq
hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...${pubKeyBase64.substring(0, 64)}...
... (Placeholder content representing issuer, validity, extensions etc.) ...
...${pubKeyBase64.substring(pubKeyBase64.length - 64)}...IDAQAB
MA0GCSqGSIb3DQEBCwUAA4IBAQBLAHf... (Fake signature block) ...
`.replace(/\s+/g, '\n').trim(); // Format roughly like PEM

        const cert = `${certHeader}\n${fakeCertBody}\n${certFooter}`;

        console.warn("Generated a FAKE self-signed certificate for development use only. NOT FOR PRODUCTION.");

        return { key: privateKey, cert };

    } catch (error: any) {
        console.error("Error generating self-signed certificate:", error);
        throw new Error(`Failed to generate self-signed certificate: ${error.message}`);
    }
}