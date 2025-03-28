export interface Config {
  key: string;
  value: string;
}

// Define specific configuration types for better type safety
export enum AppConfigKeys {
  DEFAULT_LANGUAGE = 'default_language',
  PORT = 'port',
  SSL_KEY = 'ssl_key',
  SSL_CERT = 'ssl_cert'
}
