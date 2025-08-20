/**
 * Test script for certificate template generation
 * Run with: node test-certificate-template.js
 */

import { generateProfessionalCertificateHTML, formatCertificateData } from './utils/certificateTemplate.js';
import fs from 'fs';
import path from 'path';

// Test certificate data
const testCertificateData = {
  studentName: 'Hitika Meratwal',
  courseName: 'PERSONALITY DEVELOPMENT',
  sessionDate: '9 JULY',
  issuedDate: '11 July',
  certificateId: 'CERT-20241225-CD490534',
  enrollmentId: 'MEDH-CERT-2024-C971ED24',
  instructorName: 'Addya Pandey',
  coordinatorName: 'Neeraj Narain',
  qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Placeholder QR code
  sessionType: 'Demo Session Attendance'
};

// Format the certificate data
const formattedData = formatCertificateData(testCertificateData);

// Generate the HTML
const htmlContent = generateProfessionalCertificateHTML(formattedData);

// Save to file for testing
const outputPath = path.join(process.cwd(), 'test-certificate.html');
fs.writeFileSync(outputPath, htmlContent);

console.log('✅ Certificate template test completed!');
console.log(`📄 HTML file saved to: ${outputPath}`);
console.log('🌐 Open the HTML file in a browser to view the certificate');

// Log the formatted data
console.log('\n📋 Formatted Certificate Data:');
console.log(JSON.stringify(formattedData, null, 2));

