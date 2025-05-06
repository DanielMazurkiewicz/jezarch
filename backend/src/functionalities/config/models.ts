export interface Config {
  key: string;
  value: string;
}

// Define specific configuration types for better type safety
// Renamed PORT, added HTTPS related keys
export enum AppConfigKeys {
  DEFAULT_LANGUAGE = 'default_language',
  HTTP_PORT = 'http_port', // Renamed from PORT
  HTTPS_PORT = 'https_port', // New
  HTTPS_KEY_PATH = 'https_key_path', // Renamed from SSL_KEY, stores path now
  HTTPS_CERT_PATH = 'https_cert_path', // Renamed from SSL_CERT, stores path now
  HTTPS_CA_PATH = 'https_ca_path', // New for Certificate Authority path
}