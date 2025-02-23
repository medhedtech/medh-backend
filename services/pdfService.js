const PDF = require('html-pdf-chrome');
const logger = require('../utils/logger');

const options = {
  port: 9222, // Chrome debug port
  printOptions: {
    printBackground: true,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paperWidth: 8.27, // A4 width in inches
    paperHeight: 11.69 // A4 height in inches
  }
};

class PDFService {
  async generatePDF(html, customOptions = {}) {
    try {
      const mergedOptions = {
        ...options,
        printOptions: {
          ...options.printOptions,
          ...customOptions
        }
      };

      const pdf = await PDF.create(html, mergedOptions);
      return pdf.toBuffer();
    } catch (error) {
      logger.error('PDF Generation Error', {
        error: {
          message: error.message,
          stack: error.stack
        }
      });
      throw new Error('Failed to generate PDF');
    }
  }

  async generatePDFFromURL(url, customOptions = {}) {
    try {
      const mergedOptions = {
        ...options,
        printOptions: {
          ...options.printOptions,
          ...customOptions
        }
      };

      const pdf = await PDF.create(url, mergedOptions);
      return pdf.toBuffer();
    } catch (error) {
      logger.error('PDF Generation Error', {
        error: {
          message: error.message,
          stack: error.stack
        },
        url
      });
      throw new Error('Failed to generate PDF from URL');
    }
  }
}

module.exports = new PDFService(); 