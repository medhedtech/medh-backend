const { exec } = require('child_process');
const logger = require('./logger');
const path = require('path');
const fs = require('fs');
const os = require('os');

class ChromeService {
  constructor() {
    this.chromeProcess = null;
    this.debugPort = 9222;
    this.isRunning = false;
    this.chromePath = this.getChromePath();
  }

  getChromePath() {
    switch (os.platform()) {
      case 'darwin': // macOS
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      case 'win32': // Windows
        const programFiles = process.env['ProgramFiles'];
        const programFilesX86 = process.env['ProgramFiles(x86)'];
        const paths = [
          path.join(programFiles || '', 'Google/Chrome/Application/chrome.exe'),
          path.join(programFilesX86 || '', 'Google/Chrome/Application/chrome.exe')
        ];
        return paths.find(p => fs.existsSync(p)) || 'chrome';
      default: // Linux and others
        return 'google-chrome';
    }
  }

  async startChrome() {
    if (this.isRunning) {
      return;
    }

    try {
      const userDataDir = path.join(os.tmpdir(), 'chrome-pdf-service');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      const args = [
        `--remote-debugging-port=${this.debugPort}`,
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--user-data-dir=${userDataDir}`,
        '--disable-dev-shm-usage'
      ];

      this.chromeProcess = exec(`"${this.chromePath}" ${args.join(' ')}`, (error) => {
        if (error) {
          logger.error('Chrome process error:', {
            error: {
              message: error.message,
              stack: error.stack
            }
          });
        }
      });

      this.chromeProcess.on('exit', (code) => {
        logger.info(`Chrome process exited with code ${code}`);
        this.isRunning = false;
      });

      // Wait for Chrome to start
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.isRunning = true;

      logger.info('Chrome started successfully', {
        port: this.debugPort,
        pid: this.chromeProcess.pid
      });
    } catch (error) {
      logger.error('Failed to start Chrome:', {
        error: {
          message: error.message,
          stack: error.stack
        }
      });
      throw new Error('Failed to start Chrome');
    }
  }

  async stopChrome() {
    if (!this.isRunning || !this.chromeProcess) {
      return;
    }

    try {
      if (os.platform() === 'win32') {
        exec(`taskkill /pid ${this.chromeProcess.pid} /T /F`);
      } else {
        this.chromeProcess.kill('SIGTERM');
      }

      this.isRunning = false;
      this.chromeProcess = null;

      logger.info('Chrome stopped successfully');
    } catch (error) {
      logger.error('Failed to stop Chrome:', {
        error: {
          message: error.message,
          stack: error.stack
        }
      });
    }
  }

  async ensureRunning() {
    if (!this.isRunning) {
      await this.startChrome();
    }
  }
}

// Create singleton instance
const chromeService = new ChromeService();

// Ensure Chrome is stopped on process exit
process.on('exit', () => {
  chromeService.stopChrome();
});

process.on('SIGINT', () => {
  chromeService.stopChrome();
  process.exit();
});

process.on('SIGTERM', () => {
  chromeService.stopChrome();
  process.exit();
});

module.exports = chromeService; 