/**
 * Professional Certificate Template Generator
 * Creates certificates matching the MEDH certificate design from Canva template
 */

/**
 * Generate professional certificate HTML content
 * @param {Object} certificateData - Certificate data object
 * @param {string} certificateData.studentName - Student's full name
 * @param {string} certificateData.courseName - Course name
 * @param {string} certificateData.sessionDate - Session date (e.g., "9 JULY")
 * @param {string} certificateData.issuedDate - Issued date (e.g., "11 July")
 * @param {string} certificateData.certificateId - Certificate ID (e.g., "CERT-20241225-CD490534")
 * @param {string} certificateData.enrollmentId - Enrollment ID (e.g., "MEDH-CERT-2024-C971ED24")
 * @param {string} certificateData.instructorName - Instructor name
 * @param {string} certificateData.coordinatorName - Program coordinator name
 * @param {string} certificateData.qrCodeDataUrl - Base64 QR code image
 * @param {string} certificateData.sessionType - Session type (e.g., "Demo Session Attendance")
 * @returns {string} - HTML content for the certificate
 */
export const generateProfessionalCertificateHTML = (certificateData) => {
  const {
    studentName,
    courseName,
    sessionDate,
    issuedDate,
    certificateId,
    enrollmentId,
    instructorName,
    coordinatorName,
    qrCodeDataUrl,
    sessionType = "Demo Session Attendance",
    instructorSignature,
    coordinatorSignature
  } = certificateData;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MEDH Certificate - ${studentName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Dancing+Script:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Dancing+Script:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');
        
        /* Ensure fonts are loaded before rendering */
        @font-face {
          font-family: 'Dancing Script';
          font-style: normal;
          font-weight: 600;
          font-display: block;
          src: url('https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSoHTeB9ptDqpw.woff2') format('woff2');
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .certificate-container {
          width: 1123px;
          height: 794px;
          background: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        /* Corner accents matching the template */
        .corner-accent {
          position: absolute;
          border-radius: 50%;
        }
        
        .corner-accent.top-left {
          top: -100px;
          left: -100px;
          width: 200px;
          height: 200px;
          background: linear-gradient(135deg, #ff6b35, #ff8c42);
        }
        
        .corner-accent.top-right {
          top: -100px;
          right: -100px;
          width: 200px;
          height: 200px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        
        .corner-accent.bottom-left {
          bottom: -100px;
          left: -100px;
          width: 200px;
          height: 200px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        
        .corner-accent.bottom-right {
          bottom: -100px;
          right: -100px;
          width: 200px;
          height: 200px;
          background: linear-gradient(135deg, #ff6b35, #ff8c42);
        }
        
        .certificate-content {
          padding: 60px;
          position: relative;
          z-index: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        /* Header Section */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .logo {
          width: 60px;
          height: 60px;
          background: #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border: 2px solid #22c55e;
        }
        
        .logo::before {
          content: 'M';
          font-size: 24px;
          font-weight: 700;
          color: white;
          font-family: 'Inter', sans-serif;
        }
        
        .logo::after {
          content: '';
          position: absolute;
          width: 40px;
          height: 2px;
          background: #22c55e;
          transform: rotate(-45deg);
        }
        
        .logo-text {
          display: flex;
          flex-direction: column;
        }
        
        .logo-text h1 {
          font-size: 28px;
          font-weight: 700;
          color: #000;
          margin: 0;
          letter-spacing: 2px;
        }
        
        .logo-text .edh {
          color: #22c55e;
        }
        
        .logo-text p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }
        
        .stem-logo {
          text-align: right;
        }
        
        .stem-shield {
          width: 60px;
          height: 70px;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          border-radius: 8px;
          margin: 0 auto 8px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
        
        .stem-shield::before {
          content: '🚀';
          font-size: 16px;
          position: absolute;
          top: 5px;
        }
        
        .stem-shield::after {
          content: '';
          position: absolute;
          bottom: 8px;
          width: 30px;
          height: 4px;
          background: white;
          border-radius: 2px;
        }
        
        .stem-text {
          font-size: 14px;
          font-weight: 700;
          color: #000;
          margin: 0;
        }
        
        .stem-org {
          font-size: 10px;
          color: #64748b;
          margin: 0;
        }
        
        .stem-accredited {
          font-size: 10px;
          font-weight: 700;
          color: #000;
          margin: 2px 0;
        }
        
        .stem-check {
          font-size: 10px;
          color: #64748b;
          font-weight: 500;
        }
        
        /* Main Title Section */
        .main-title {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .main-title h2 {
          font-size: 64px;
          font-weight: 900;
          color: #1e293b;
          margin: 0;
          letter-spacing: 8px;
          font-family: 'Inter', sans-serif;
          text-transform: uppercase;
        }
        
        .main-title p {
          font-size: 20px;
          color: #1e293b;
          margin: 8px 0 0;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          letter-spacing: 4px;
          text-transform: uppercase;
        }
        
        .session-type {
          font-size: 22px;
          color: #1e293b;
          margin: 25px 0;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
        }
        
        /* Certificate Body */
        .certificate-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          margin: 30px 0;
        }
        
        .certify-text {
          font-size: 18px;
          color: #1e293b;
          margin-bottom: 25px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-family: 'Inter', sans-serif;
        }
        
        /* CRITICAL: Student name styling matching "Hitika Meratwal" exactly */
        .student-name {
          font-family: 'Dancing Script', 'Brush Script MT', 'Lucida Handwriting', cursive !important;
          font-size: 56px !important;
          font-weight: 700 !important;
          color: #ff6b35 !important;
          margin: 25px 0 30px 0;
          line-height: 1.1;
          text-shadow: 0 2px 4px rgba(255, 107, 53, 0.15);
          font-display: swap;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-style: italic;
        }
        
        .participation-text {
          font-size: 16px;
          color: #1e293b;
          margin-bottom: 20px;
          line-height: 1.6;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-family: 'Inter', sans-serif;
        }
        
        .course-name {
          font-size: 32px;
          font-weight: 700;
          color: #22c55e !important;
          margin: 20px 0;
          letter-spacing: 2px;
          text-shadow: 0 2px 4px rgba(34, 197, 94, 0.15);
          text-transform: uppercase;
          font-family: 'Inter', sans-serif;
        }
        
        .session-date {
          font-size: 20px;
          color: #1e293b;
          margin: 20px 0;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-family: 'Inter', sans-serif;
        }
        
        .session-description {
          font-size: 16px;
          color: #1e293b;
          margin: 25px 0;
          line-height: 1.6;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          font-weight: 400;
          font-family: 'Inter', sans-serif;
        }
        
        /* Signatures Section */
        .signatures-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin: 40px 0 30px 0;
          gap: 100px;
        }
        
        .signature-box {
          flex: 1;
          text-align: center;
        }
        
        .signature-image {
          width: 120px;
          height: 60px;
          margin: 0 auto 10px;
          object-fit: contain;
        }
        
        .signature-name {
          font-size: 16px;
          color: #1e293b;
          margin-bottom: 5px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
        }
        
        .signature-title {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
        }
        
        .signature-line {
          width: 180px;
          height: 1px;
          background: #1e293b;
          margin: 0 auto 10px;
          position: relative;
        }
        
        /* QR Code and IDs Section */
        .qr-ids-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin: 20px 0;
        }
        
        .enrollment-id {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          text-align: left;
          font-family: 'Inter', sans-serif;
        }
        
        .qr-code-container {
          text-align: center;
          flex: 0 0 auto;
        }
        
        .qr-code {
          width: 100px;
          height: 100px;
          margin: 0 auto 8px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 5px;
          background: white;
        }
        
        .issued-date {
          font-size: 12px;
          color: #1e293b;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
        }
        
        .issued-label {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
          font-family: 'Inter', sans-serif;
        }
        
        .certificate-id {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          text-align: right;
          font-family: 'Inter', sans-serif;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          margin-top: 20px;
        }
        
        .slogan {
          font-family: 'Dancing Script', cursive;
          font-size: 28px;
          color: #22c55e;
          font-weight: 600;
          margin-bottom: 12px;
          text-shadow: 0 2px 4px rgba(34, 197, 94, 0.15);
          font-style: italic;
        }
        
        .verification-note {
          font-size: 10px;
          color: #64748b;
          line-height: 1.4;
          font-family: 'Inter', sans-serif;
        }
        
        /* Responsive adjustments for print */
        @media print {
          body {
            background: none;
            padding: 0;
            margin: 0;
          }
          
          .certificate-container {
            box-shadow: none;
            width: 100%;
            height: 100vh;
          }
          
          .certificate-content {
            padding: 40px;
          }
        }
        
        /* Ensure proper rendering */
        .certificate-container,
        .certificate-content {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <!-- Corner Accents -->
        <div class="corner-accent top-left"></div>
        <div class="corner-accent top-right"></div>
        <div class="corner-accent bottom-left"></div>
        <div class="corner-accent bottom-right"></div>
        
        <div class="certificate-content">
          <!-- Header -->
          <div class="header">
            <div class="logo-section">
              <div class="logo"></div>
              <div class="logo-text">
                <h1>M<span class="edh">EDH</span></h1>
                <p>LEARN. UPSKILL. ELEVATE.</p>
              </div>
            </div>
            
            <div class="stem-logo">
              <div class="stem-shield"></div>
              <p class="stem-text">STEM<span class="stem-org">.org</span></p>
              <p class="stem-accredited">ACCREDITED</p>
              <p class="stem-check">EDUCATIONAL EXPERIENCE ✓</p>
            </div>
          </div>
          
          <!-- Main Title -->
          <div class="main-title">
            <h2>CERTIFICATE</h2>
            <p>OF PARTICIPATION</p>
            <div class="session-type">${sessionType}</div>
          </div>
          
          <!-- Certificate Body -->
          <div class="certificate-body">
            <div class="certify-text">THIS IS TO CERTIFY THAT</div>
            
            <div class="student-name">${studentName}</div>
            
            <div class="participation-text">
              HAS SUCCESSFULLY PARTICIPATED IN THE LIVE INTERACTIVE DEMO SESSION OF
            </div>
            
            <div class="course-name">${courseName}</div>
            
            <div class="session-date">${sessionDate}</div>
            
            <div class="session-description">
              This introductory session presented fundamental concepts and methodologies essential to this educational pathway.
            </div>
          </div>
          
          <!-- Signatures -->
          <div class="signatures-section">
            <div class="signature-box">
              ${instructorSignature ? `<img src="${instructorSignature}" alt="Instructor Signature" class="signature-image" />` : '<div class="signature-line"></div>'}
              <div class="signature-name">${instructorName}</div>
              <div class="signature-title">Instructor</div>
            </div>
            
            <div class="signature-box">
              ${coordinatorSignature ? `<img src="${coordinatorSignature}" alt="Coordinator Signature" class="signature-image" />` : '<div class="signature-line"></div>'}
              <div class="signature-name">${coordinatorName}</div>
              <div class="signature-title">Program Coordinator</div>
            </div>
          </div>
          
          <!-- QR Code and IDs -->
          <div class="qr-ids-section">
            <div class="enrollment-id">
              Enrollment ID: ${enrollmentId}
            </div>
            
            <div class="qr-code-container">
              <img src="${qrCodeDataUrl}" alt="Certificate QR Code" class="qr-code" />
              <div class="issued-date">${issuedDate}</div>
              <div class="issued-label">Issued on</div>
            </div>
            
            <div class="certificate-id">
              Certificate ID: ${certificateId}
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="slogan">Medh Hai Toh Mumkin Hai !</div>
            <div class="verification-note">
              Note: Certificate authenticity is verifiable via scanning the QR code or at https://medh.co/certificate-verify/
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate certificate data object with all required fields
 * @param {Object} params - Certificate generation parameters
 * @returns {Object} - Formatted certificate data
 */
export const formatCertificateData = (params) => {
  const {
    studentName,
    courseName,
    sessionDate,
    issuedDate,
    certificateId,
    enrollmentId,
    instructorName,
    coordinatorName,
    qrCodeDataUrl,
    sessionType
  } = params;

  return {
    studentName: studentName || 'Student Name',
    courseName: courseName || 'Course Name',
    sessionDate: sessionDate || new Date().toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long' 
    }).toUpperCase(),
    issuedDate: issuedDate || new Date().toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long' 
    }),
    certificateId: certificateId || 'CERT-20241225-XXXXXXX',
    enrollmentId: enrollmentId || 'MEDH-CERT-2024-XXXXXXX',
    instructorName: instructorName || 'Instructor Name',
    coordinatorName: coordinatorName || 'Coordinator Name',
    qrCodeDataUrl: qrCodeDataUrl || '',
    sessionType: sessionType || 'Demo Session Attendance'
  };
};
