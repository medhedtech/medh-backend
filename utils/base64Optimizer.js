import { Worker } from 'worker_threads';
import { cpus } from 'os';

/**
 * Optimized base64 decoder using parallel processing for large files
 */
export class Base64Optimizer {
  //@ts-ignore
  constructor() {
    this.chunkSize = 1024 * 1024; // 1MB chunks
    this.maxWorkers = cpus().length;
  }

  /**
   * Decode base64 string using parallel processing
   * @param {string} base64String - The base64 string to decode
   * @returns {Promise<Buffer>} - The decoded buffer
   */
  async decodeParallel(base64String) {
    // For small strings, use regular decoding
    if (base64String.length < this.chunkSize) {
      return Buffer.from(base64String, 'base64');
    }

    // Split into chunks for parallel processing
    const chunks = this.splitIntoChunks(base64String);
    const workers = [];
    const results = new Array(chunks.length);

    // Process chunks in parallel
    const workerPromises = chunks.map((chunk, index) => {
      return new Promise((resolve, reject) => {
        const workerCode = `
          const { parentPort } = require('worker_threads');
          parentPort.on('message', ({ chunk, index }) => {
            try {
              const buffer = Buffer.from(chunk, 'base64');
              parentPort.postMessage({ buffer, index });
            } catch (error) {
              parentPort.postMessage({ error: error.message, index });
            }
          });
        `;

        const worker = new Worker(workerCode, { eval: true });
        workers.push(worker);

        worker.on('message', ({ buffer, error, index: resultIndex }) => {
          if (error) {
            reject(new Error(error));
          } else {
            results[resultIndex] = buffer;
            resolve();
          }
          worker.terminate();
        });

        worker.on('error', reject);
        worker.postMessage({ chunk, index });
      });
    });

    await Promise.all(workerPromises);
    return Buffer.concat(results);
  }

  /**
   * Split base64 string into chunks for parallel processing
   * @param {string} base64String - The base64 string to split
   * @returns {string[]} - Array of chunks
   */
  splitIntoChunks(base64String) {
    const chunks = [];
    const chunkCount = Math.ceil(base64String.length / this.chunkSize);
    
    for (let i = 0; i < chunkCount; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, base64String.length);
      
      // Ensure we split on 4-byte boundaries for valid base64
      const adjustedEnd = this.adjustToBase64Boundary(base64String, end);
      chunks.push(base64String.slice(start, adjustedEnd));
    }
    
    return chunks;
  }

  /**
   * Adjust chunk end to align with base64 4-byte boundaries
   * @param {string} str - The base64 string
   * @param {number} end - The proposed end index
   * @returns {number} - The adjusted end index
   */
  adjustToBase64Boundary(str, end) {
    if (end >= str.length) return str.length;
    
    // Base64 encodes 3 bytes as 4 characters
    // Find the nearest 4-character boundary
    const remainder = end % 4;
    return remainder === 0 ? end : end + (4 - remainder);
  }

  /**
   * Validate base64 string format
   * @param {string} base64String - The base64 string to validate
   * @returns {boolean} - Whether the string is valid base64
   */
  static isValidBase64(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      return false;
    }

    // Remove data URI prefix if present
    const base64Data = base64String.replace(/^data:.*?;base64,/, '');
    
    // Check for valid base64 characters
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(base64Data);
  }

  /**
   * Extract MIME type from data URI
   * @param {string} dataUri - The data URI string
   * @returns {string|null} - The MIME type or null
   */
  static extractMimeType(dataUri) {
    const match = dataUri.match(/^data:(.*?);base64,/);
    return match ? match[1] : null;
  }

  /**
   * Optimize base64 string by removing unnecessary whitespace
   * @param {string} base64String - The base64 string to optimize
   * @returns {string} - The optimized base64 string
   */
  static optimize(base64String) {
    // Remove all whitespace characters
    return base64String.replace(/\s/g, '');
  }
}

// Export singleton instance
export const base64Optimizer = new Base64Optimizer(); 