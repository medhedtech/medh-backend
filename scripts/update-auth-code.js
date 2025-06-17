#!/usr/bin/env node

/**
 * Code Update Script: Update Auth Field References
 * 
 * This script updates all code references:
 * - user.status → user.is_active
 * - user.emailVerified → user.email_verified
 * - "Active"/"Inactive" → true/false
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CodeUpdater {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.stats = {
      filesProcessed: 0,
      filesUpdated: 0,
      replacements: 0
    };
    
    // Define replacement patterns
    this.replacements = [
      // Status field updates
      {
        pattern: /user\.status\s*===\s*["']Active["']/g,
        replacement: 'user.is_active === true',
        description: 'user.status === "Active" → user.is_active === true'
      },
      {
        pattern: /user\.status\s*===\s*["']Inactive["']/g,
        replacement: 'user.is_active === false',
        description: 'user.status === "Inactive" → user.is_active === false'
      },
      {
        pattern: /user\.status\s*!==\s*["']Active["']/g,
        replacement: 'user.is_active !== true',
        description: 'user.status !== "Active" → user.is_active !== true'
      },
      {
        pattern: /user\.status\s*!==\s*["']Inactive["']/g,
        replacement: 'user.is_active !== false',
        description: 'user.status !== "Inactive" → user.is_active !== false'
      },
      {
        pattern: /status:\s*["']Inactive["']/g,
        replacement: 'is_active: false',
        description: 'status: "Inactive" → is_active: false'
      },
      {
        pattern: /status:\s*["']Active["']/g,
        replacement: 'is_active: true',
        description: 'status: "Active" → is_active: true'
      },
      {
        pattern: /user\.status\s*=\s*["']Active["']/g,
        replacement: 'user.is_active = true',
        description: 'user.status = "Active" → user.is_active = true'
      },
      {
        pattern: /user\.status\s*=\s*["']Inactive["']/g,
        replacement: 'user.is_active = false',
        description: 'user.status = "Inactive" → user.is_active = false'
      },
      {
        pattern: /user\.status\s*===\s*["']Active["']\s*\?\s*["']Inactive["']\s*:\s*["']Active["']/g,
        replacement: 'user.is_active === true ? false : true',
        description: 'Toggle status logic'
      },
      
      // Email verification field updates
      {
        pattern: /user\.emailVerified/g,
        replacement: 'user.email_verified',
        description: 'user.emailVerified → user.email_verified'
      },
      {
        pattern: /emailVerified:\s*true/g,
        replacement: 'email_verified: true',
        description: 'emailVerified: true → email_verified: true'
      },
      {
        pattern: /emailVerified:\s*false/g,
        replacement: 'email_verified: false',
        description: 'emailVerified: false → email_verified: false'
      },
      
      // Validation updates
      {
        pattern: /\.valid\(["']Active["'],\s*["']Inactive["']\)/g,
        replacement: '.boolean()',
        description: 'Status validation → boolean validation'
      },
      {
        pattern: /\.default\(["']Active["']\)/g,
        replacement: '.default(true)',
        description: 'Default status → default true'
      },
      {
        pattern: /\.default\(["']Inactive["']\)/g,
        replacement: '.default(false)',
        description: 'Default status → default false'
      },
      
      // Query updates
      {
        pattern: /status:\s*["']Active["']/g,
        replacement: 'is_active: true',
        description: 'Query status: "Active" → is_active: true'
      },
      {
        pattern: /status:\s*["']Inactive["']/g,
        replacement: 'is_active: false',
        description: 'Query status: "Inactive" → is_active: false'
      },
      
      // Comment updates
      {
        pattern: /\/\*\*[\s\S]*?Toggle user status \(Active\/Inactive\)[\s\S]*?\*\//g,
        replacement: '/**\n   * Toggle user active status (true/false)\n   */',
        description: 'Update toggle status comment'
      }
    ];
    
    // Files to exclude from processing
    this.excludePatterns = [
      /node_modules/,
      /\.git/,
      /\.env/,
      /package-lock\.json/,
      /yarn\.lock/,
      /\.log$/,
      /scripts\/migrate-auth-structure\.js/,
      /scripts\/update-auth-code\.js/
    ];
    
    // File extensions to process
    this.includeExtensions = ['.js', '.ts', '.jsx', '.tsx'];
  }

  /**
   * Check if file should be processed
   */
  shouldProcessFile(filePath) {
    // Check exclude patterns
    for (const pattern of this.excludePatterns) {
      if (pattern.test(filePath)) {
        return false;
      }
    }
    
    // Check file extension
    const ext = path.extname(filePath);
    return this.includeExtensions.includes(ext);
  }

  /**
   * Get all files to process recursively
   */
  getAllFiles(dir, files = []) {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.getAllFiles(fullPath, files);
      } else if (this.shouldProcessFile(fullPath)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Process a single file
   */
  processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      let fileReplacements = 0;
      
      // Apply all replacement patterns
      for (const replacement of this.replacements) {
        const matches = content.match(replacement.pattern);
        if (matches) {
          content = content.replace(replacement.pattern, replacement.replacement);
          fileReplacements += matches.length;
          this.stats.replacements += matches.length;
          
          console.log(`  ✅ ${matches.length}x ${replacement.description}`);
        }
      }
      
      // Write file if changes were made
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.stats.filesUpdated++;
        console.log(`📝 Updated: ${path.relative(this.projectRoot, filePath)} (${fileReplacements} changes)`);
      }
      
      this.stats.filesProcessed++;
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  /**
   * Run the code update process
   */
  run() {
    console.log('🚀 Starting Auth Code Update...\n');
    
    try {
      // Get all files to process
      const files = this.getAllFiles(this.projectRoot);
      console.log(`📁 Found ${files.length} files to process\n`);
      
      // Process each file
      for (const file of files) {
        this.processFile(file);
      }
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.error('💥 Code update failed:', error);
      process.exit(1);
    }
  }

  /**
   * Print update summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CODE UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`📁 Files Processed: ${this.stats.filesProcessed}`);
    console.log(`📝 Files Updated: ${this.stats.filesUpdated}`);
    console.log(`🔄 Total Replacements: ${this.stats.replacements}`);
    console.log('='.repeat(60));
    
    if (this.stats.filesUpdated > 0) {
      console.log('🎉 Code update completed successfully!');
      console.log('\n⚠️  IMPORTANT: Please review the changes and test thoroughly before deploying.');
    } else {
      console.log('ℹ️  No files needed updating.');
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new CodeUpdater();
  updater.run();
}

export default CodeUpdater; 