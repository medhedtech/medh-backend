import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Secure TLS configuration for production use
 * These settings follow Mozilla's Server Side TLS "Intermediate" recommendations
 * @see https://wiki.mozilla.org/Security/Server_Side_TLS
 */
export const tlsConfig = {
  // In production, load real certificates
  production: (certPath) => ({
    // Recommended: Use at least TLS 1.2, preferably TLS 1.3
    minVersion: 'TLSv1.2',
    // Recommended ciphers for modern clients
    ciphers: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-CHACHA20-POLY1305',
      'ECDHE-RSA-CHACHA20-POLY1305',
    ].join(':'),
    // Disable older protocols
    maxVersion: 'TLSv1.3',
    // OCSP Stapling
    requestOCSP: true,
    // HTTP/2 support
    ALPNProtocols: ['h2', 'http/1.1'],
    // Certificate files
    cert: fs.readFileSync(path.join(certPath, 'fullchain.pem')),
    key: fs.readFileSync(path.join(certPath, 'privkey.pem')),
    // HSTS header will be set via Helmet middleware
  }),
  
  // For local development with self-signed certs
  development: () => ({
    minVersion: 'TLSv1.2',
    // Less strict cipher requirements for development
    ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256',
    // Self-signed cert generation instructions will be in README.md
    cert: fs.readFileSync(path.join(__dirname, '../certs/localhost.crt')),
    key: fs.readFileSync(path.join(__dirname, '../certs/localhost.key')),
    // Accept self-signed certs in development
    rejectUnauthorized: false
  })
};

/**
 * Instructions for generating self-signed certificates for development:
 * 
 * 1. Create a certs directory:
 *    mkdir -p certs
 * 
 * 2. Generate a self-signed certificate:
 *    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/localhost.key -out certs/localhost.crt
 * 
 * 3. Make sure to add certs directory to .gitignore
 */ 