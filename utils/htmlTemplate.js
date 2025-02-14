const generatePdfContentForSubscription = (subscription) => {
  const { student_name, student_email, course_name, amount, date } =
    subscription;

  return `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .invoice-container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: white;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .invoice-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .invoice-header h1 {
              font-size: 36px;
              margin: 0;
            }
            .invoice-body {
              font-size: 14px;
              margin-bottom: 20px;
            }
            .invoice-footer {
              font-size: 12px;
              text-align: center;
              margin-top: 40px;
              color: #888;
            }
            .invoice-footer p {
              margin: 0;
            }
            .details {
              margin-bottom: 15px;
            }
            .details strong {
              width: 150px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="invoice-header">
              <h1>Invoice</h1>
              <p>Thank you for your subscription</p>
            </div>
            <div class="invoice-body">
              <div class="details">
                <strong>Student Name:</strong> ${student_name}
              </div>
              <div class="details">
                <strong>Email:</strong> ${student_email}
              </div>
              <div class="details">
                <strong>Course Name:</strong> ${course_name}
              </div>
              <div class="details">
                <strong>Amount:</strong> ₹${amount}
              </div>
              <div class="details">
                <strong>Subscription Date:</strong> ${new Date(
                  date
                ).toLocaleDateString()}
              </div>
            </div>
            <div class="invoice-footer">
              <p>Note: Thank you for subscribing to our course. We hope you enjoy your learning journey!</p>
            </div>
          </div>
        </body>
      </html>
    `;
};

const generatePdfContentForCertificate = (subscription) => {
  const { student_name, course_name } = subscription;

  return `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .invoice-container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: white;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .invoice-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .invoice-header h1 {
              font-size: 36px;
              margin: 0;
            }
            .invoice-body {
              font-size: 14px;
              margin-bottom: 20px;
            }
            .invoice-footer {
              font-size: 12px;
              text-align: center;
              margin-top: 40px;
              color: #888;
            }
            .invoice-footer p {
              margin: 0;
            }
            .details {
              margin-bottom: 15px;
            }
            .details strong {
              width: 150px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="invoice-header">
              <h1>Certificate</h1>
              <p>Here is your certificate</p>
            </div>
            <div class="invoice-body">
              <div class="details">
                <strong>Student Name:</strong> ${student_name}
              </div>
              <div class="details">
                <strong>Course Name:</strong> ${course_name}
              </div>
            </div>
            <div class="invoice-footer">
              <p>Note: </p>
            </div>
          </div>
        </body>
      </html>
    `;
};

module.exports = {
  generatePdfContentForSubscription,
  generatePdfContentForCertificate,
};
