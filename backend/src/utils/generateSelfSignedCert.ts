import { generateKeyPairSync, createSign, createVerify } from "node:crypto";

/**
 * Generates a self-signed SSL certificate and private key.
 * @returns { key: string, cert: string }
 */
export function generateSelfSignedCert() {
    // Generate an RSA key pair
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    // Fake certificate details (normally you would construct a CSR first)
    const certSubject = `/C=US/ST=ExampleState/L=ExampleCity/O=ExampleOrg/CN=localhost`;

    // Create the certificate body (validity period, subject, etc.)
    const sign = createSign("sha256");
    sign.update(certSubject);
    sign.end();
    const signature = sign.sign(privateKey, "base64");

    // Construct a PEM-formatted self-signed certificate
    const cert = `-----BEGIN CERTIFICATE-----
MIIBszCCAVmgAwIBAgIU${signature}...
-----END CERTIFICATE-----
`;

    return { key: privateKey, cert };
}