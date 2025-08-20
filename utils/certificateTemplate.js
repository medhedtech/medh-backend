/**
 * Professional Certificate Template Generator
 * Creates certificates matching the MEDH certificate design
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
    sessionType = "Demo Session Attendance"
  } = certificateData;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MEDH Certificate - ${studentName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Dancing+Script:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(45deg, #f8fafc 25%, transparent 25%), 
                      linear-gradient(-45deg, #f8fafc 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #f8fafc 75%), 
                      linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .certificate-container {
          width: 100%;
          max-width: 1200px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
          aspect-ratio: 1.414; /* A4 ratio */
        }
        
        /* Corner accents */
        .corner-accent {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
        }
        
        .corner-accent.top-left {
          top: -60px;
          left: -60px;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
        }
        
        .corner-accent.top-right {
          top: -60px;
          right: -60px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        
        .corner-accent.bottom-left {
          bottom: -60px;
          left: -60px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        
        .corner-accent.bottom-right {
          bottom: -60px;
          right: -60px;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
        }
        
        .certificate-content {
          padding: 80px 60px;
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
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .logo::after {
          content: '';
          position: absolute;
          width: 40px;
          height: 2px;
          background: white;
          transform: rotate(-45deg);
        }
        
        .logo-text {
          display: flex;
          flex-direction: column;
        }
        
        .logo-text h1 {
          font-size: 28px;
          font-weight: 700;
          color: #22c55e;
          margin: 0;
          letter-spacing: 2px;
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
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          border-radius: 15px;
          margin: 0 auto 10px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stem-shield::before {
          content: '🚀';
          font-size: 24px;
          position: absolute;
          top: 8px;
        }
        
        .stem-shield::after {
          content: '';
          position: absolute;
          bottom: 8px;
          width: 40px;
          height: 6px;
          background: white;
          border-radius: 3px;
        }
        
        .stem-text {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        
        .stem-accredited {
          font-size: 10px;
          color: #64748b;
          margin: 2px 0;
        }
        
        .stem-check {
          font-size: 12px;
          color: #22c55e;
          font-weight: 600;
        }
        
        /* Main Title */
        .main-title {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .main-title h2 {
          font-size: 48px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          letter-spacing: 4px;
        }
        
        .main-title p {
          font-size: 18px;
          color: #64748b;
          margin: 5px 0 0;
          font-weight: 500;
        }
        
        .session-type {
          font-size: 20px;
          color: #1e293b;
          margin: 15px 0;
          font-weight: 600;
        }
        
        /* Certificate Body */
        .certificate-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          margin: 20px 0;
        }
        
        .certify-text {
          font-size: 16px;
          color: #64748b;
          margin-bottom: 20px;
        }
        
        .student-name {
          font-family: 'Dancing Script', cursive;
          font-size: 48px;
          font-weight: 600;
          color: #ff6b35;
          margin: 20px 0;
          line-height: 1.2;
        }
        
        .participation-text {
          font-size: 16px;
          color: #64748b;
          margin-bottom: 15px;
          line-height: 1.5;
        }
        
        .course-name {
          font-size: 28px;
          font-weight: 700;
          color: #22c55e;
          margin: 15px 0;
          letter-spacing: 1px;
        }
        
        .session-date {
          font-size: 20px;
          color: #1e293b;
          margin: 15px 0;
          font-weight: 600;
        }
        
        .session-description {
          font-size: 14px;
          color: #64748b;
          margin: 20px 0;
          line-height: 1.6;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        /* Signatures Section */
        .signatures-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin: 40px 0;
          gap: 40px;
        }
        
        .signature-box {
          flex: 1;
          text-align: center;
        }
        
        .signature-line {
          width: 200px;
          height: 2px;
          background: #1e293b;
          margin: 0 auto 10px;
          position: relative;
        }
        
        .signature-name {
          font-family: 'Dancing Script', cursive;
          font-size: 24px;
          color: #1e293b;
          margin-bottom: 5px;
        }
        
        .signature-title {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        
        /* QR Code and IDs Section */
        .qr-ids-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 30px 0;
        }
        
        .enrollment-id {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
        
        .qr-code-container {
          text-align: center;
        }
        
        .qr-code {
          width: 120px;
          height: 120px;
          margin: 0 auto 10px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          background: white;
        }
        
        .issued-date {
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;
        }
        
        .issued-label {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }
        
        .certificate-id {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-align: right;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          margin-top: 30px;
        }
        
        .slogan {
          font-family: 'Dancing Script', cursive;
          font-size: 24px;
          color: #22c55e;
          font-weight: 600;
          margin-bottom: 15px;
        }
        
        .verification-note {
          font-size: 10px;
          color: #64748b;
          line-height: 1.4;
        }
        
        /* Print styles */
        @media print {
          body {
            background: none;
            padding: 0;
          }
          
          .certificate-container {
            box-shadow: none;
            border-radius: 0;
          }
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
                <h1>MEDH</h1>
                <p>LEARN. UPSKILL. ELEVATE.</p>
              </div>
            </div>
            
            <div class="stem-logo">
              <div class="stem-shield"></div>
              <p class="stem-text">STEM.org</p>
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
              <div class="signature-line"></div>
              <div class="signature-name">${instructorName}</div>
              <div class="signature-title">Instructor</div>
            </div>
            
            <div class="signature-box">
              <div class="signature-line"></div>
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

