const ExcelJS = require('exceljs');
const logger = require('../utils/logger');

class ExcelService {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  /**
   * Create a new Excel workbook from JSON data
   * @param {Object[]} data - Array of objects to convert to Excel
   * @param {Object} options - Options for Excel creation
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async jsonToExcel(data, options = {}) {
    try {
      const {
        sheetName = 'Sheet1',
        headers = Object.keys(data[0] || {}),
        headerStyle = {
          font: { bold: true },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          }
        }
      } = options;

      const worksheet = this.workbook.addWorksheet(sheetName);

      // Add headers
      worksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: Math.max(header.length + 2, 15)
      }));

      // Style headers
      worksheet.getRow(1).eachCell(cell => {
        cell.style = headerStyle;
      });

      // Add data
      data.forEach(row => {
        const rowData = {};
        headers.forEach(header => {
          rowData[header] = row[header];
        });
        worksheet.addRow(rowData);
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        const maxLength = column.values.reduce((max, value) => {
          const valueLength = value ? String(value).length : 0;
          return Math.max(max, valueLength);
        }, 0);
        column.width = Math.min(maxLength + 2, 30);
      });

      return await this.workbook.xlsx.writeBuffer();
    } catch (error) {
      logger.error('Excel Generation Error', {
        error: {
          message: error.message,
          stack: error.stack
        }
      });
      throw new Error('Failed to generate Excel file');
    }
  }

  /**
   * Read Excel file and convert to JSON
   * @param {Buffer} buffer - Excel file buffer
   * @param {Object} options - Options for Excel reading
   * @returns {Promise<Object[]>} Parsed data as array of objects
   */
  async excelToJson(buffer, options = {}) {
    try {
      const {
        sheetName = 'Sheet1',
        headerRow = 1,
        dataStartRow = 2
      } = options;

      await this.workbook.xlsx.load(buffer);
      const worksheet = this.workbook.getWorksheet(sheetName);

      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const headers = [];
      worksheet.getRow(headerRow).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value;
      });

      const data = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= dataStartRow) {
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = this.getCellValue(cell);
            }
          });
          data.push(rowData);
        }
      });

      return data;
    } catch (error) {
      logger.error('Excel Parsing Error', {
        error: {
          message: error.message,
          stack: error.stack
        }
      });
      throw new Error('Failed to parse Excel file');
    }
  }

  /**
   * Get formatted cell value
   * @param {Object} cell - ExcelJS cell object
   * @returns {*} Formatted cell value
   */
  getCellValue(cell) {
    if (!cell) return null;

    switch (cell.type) {
      case ExcelJS.ValueType.Number:
        return cell.value;
      case ExcelJS.ValueType.Boolean:
        return cell.value;
      case ExcelJS.ValueType.Date:
        return cell.value.toISOString();
      case ExcelJS.ValueType.Formula:
        return cell.result;
      case ExcelJS.ValueType.String:
        return cell.value.trim();
      default:
        return cell.value;
    }
  }

  /**
   * Create a template Excel file
   * @param {Object} template - Template configuration
   * @returns {Promise<Buffer>} Excel template buffer
   */
  async createTemplate(template) {
    try {
      const {
        sheetName = 'Template',
        headers = [],
        validations = {}
      } = template;

      const worksheet = this.workbook.addWorksheet(sheetName);

      // Add headers with styling
      worksheet.columns = headers.map(header => ({
        header: header.name,
        key: header.key,
        width: Math.max(header.name.length + 2, 15)
      }));

      // Style headers
      worksheet.getRow(1).eachCell(cell => {
        cell.style = {
          font: { bold: true },
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          }
        };
      });

      // Add data validations
      Object.entries(validations).forEach(([column, validation]) => {
        const colNumber = headers.findIndex(h => h.key === column) + 1;
        if (colNumber > 0) {
          worksheet.getColumn(colNumber).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            if (rowNumber > 1) {
              cell.dataValidation = validation;
            }
          });
        }
      });

      return await this.workbook.xlsx.writeBuffer();
    } catch (error) {
      logger.error('Template Creation Error', {
        error: {
          message: error.message,
          stack: error.stack
        }
      });
      throw new Error('Failed to create Excel template');
    }
  }
}

module.exports = new ExcelService(); 