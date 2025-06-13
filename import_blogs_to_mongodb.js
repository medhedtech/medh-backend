#!/usr/bin/env node

/**
 * MongoDB Blog Import Script
 * Imports converted blog data into MongoDB using the blog model
 */

import fs from 'fs';
import mongoose from 'mongoose';
import BlogsModel from './models/blog-model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class BlogImporter {
  constructor() {
    this.importedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
  }

  /**
   * Connect to MongoDB
   */
  async connectToDatabase() {
    try {
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/medh';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnectFromDatabase() {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
  }

  /**
   * Check if a blog already exists by slug or title
   */
  async blogExists(blog) {
    const existingBlog = await BlogsModel.findOne({
      $or: [
        { slug: blog.slug },
        { title: blog.title }
      ]
    });
    return existingBlog !== null;
  }

  /**
   * Validate blog data before import
   */
  validateBlogData(blog) {
    const errors = [];

    if (!blog.title || blog.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!blog.content || blog.content.trim().length === 0) {
      errors.push('Content is required');
    }

    if (!blog.upload_image) {
      errors.push('Upload image is required');
    }

    if (!blog.author) {
      errors.push('Author is required');
    }

    if (!blog.slug || blog.slug.trim().length === 0) {
      errors.push('Slug is required');
    }

    return errors;
  }

  /**
   * Import a single blog
   */
  async importBlog(blogData, options = {}) {
    try {
      // Check if blog already exists
      if (await this.blogExists(blogData)) {
        if (options.skipExisting) {
          console.log(`⏭️  Skipping existing blog: ${blogData.title}`);
          this.skippedCount++;
          return null;
        } else if (options.updateExisting) {
          // Update existing blog
          const existingBlog = await BlogsModel.findOne({
            $or: [
              { slug: blogData.slug },
              { title: blogData.title }
            ]
          });

          if (existingBlog) {
            Object.assign(existingBlog, blogData);
            const updatedBlog = await existingBlog.save();
            console.log(`🔄 Updated existing blog: ${blogData.title}`);
            return updatedBlog;
          }
        }
      }

      // Validate blog data
      const validationErrors = this.validateBlogData(blogData);
      if (validationErrors.length > 0) {
        console.error(`❌ Validation errors for "${blogData.title}":`, validationErrors);
        this.errorCount++;
        return null;
      }

      // Create new blog
      const newBlog = new BlogsModel(blogData);
      const savedBlog = await newBlog.save();
      console.log(`✅ Imported blog: ${blogData.title}`);
      this.importedCount++;
      return savedBlog;

    } catch (error) {
      console.error(`❌ Error importing blog "${blogData.title}":`, error.message);
      this.errorCount++;
      return null;
    }
  }

  /**
   * Import all blogs from JSON file
   */
  async importAllBlogs(inputFile, options = {}) {
    try {
      console.log('📖 Reading converted blog data...');
      const rawData = fs.readFileSync(inputFile, 'utf8');
      const convertedData = JSON.parse(rawData);

      console.log(`📊 Found ${convertedData.blogs.length} blogs to import`);

      const results = [];
      for (let i = 0; i < convertedData.blogs.length; i++) {
        const blog = convertedData.blogs[i];
        console.log(`\n🔄 Processing blog ${i + 1}/${convertedData.blogs.length}: ${blog.title}`);
        
        const result = await this.importBlog(blog, options);
        if (result) {
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error importing blogs:', error);
      throw error;
    }
  }

  /**
   * Generate import summary
   */
  generateSummary() {
    console.log('\n📈 Import Summary:');
    console.log(`✅ Successfully imported: ${this.importedCount} blogs`);
    console.log(`⏭️  Skipped existing: ${this.skippedCount} blogs`);
    console.log(`❌ Errors encountered: ${this.errorCount} blogs`);
    console.log(`📊 Total processed: ${this.importedCount + this.skippedCount + this.errorCount} blogs`);
  }

  /**
   * Create sample categories for blogs
   */
  async createSampleCategories() {
    try {
      // Note: You'll need to create a Category model and import it
      // This is just a placeholder for category creation
      console.log('📝 Note: Categories need to be created separately using your Category model');
      
      const sampleCategories = [
        { name: 'Technology', slug: 'technology' },
        { name: 'Programming', slug: 'programming' },
        { name: 'Data Science', slug: 'data-science' },
        { name: 'Digital Marketing', slug: 'digital-marketing' },
        { name: 'Cybersecurity', slug: 'cybersecurity' },
        { name: 'Cloud Computing', slug: 'cloud-computing' },
        { name: 'Leadership', slug: 'leadership' },
        { name: 'Personal Development', slug: 'personal-development' },
        { name: 'Mathematics', slug: 'mathematics' },
        { name: 'Career Development', slug: 'career-development' }
      ];

      console.log('📋 Suggested categories:', sampleCategories.map(c => c.name).join(', '));
      return sampleCategories;
    } catch (error) {
      console.error('❌ Error creating categories:', error);
      return [];
    }
  }

  /**
   * Update author IDs for all blogs
   */
  async updateAuthorIds(authorId) {
    try {
      console.log(`🔄 Updating all blog authors to: ${authorId}`);
      const result = await BlogsModel.updateMany(
        {},
        { $set: { author: authorId } }
      );
      console.log(`✅ Updated ${result.modifiedCount} blogs with new author ID`);
      return result;
    } catch (error) {
      console.error('❌ Error updating author IDs:', error);
      throw error;
    }
  }

  /**
   * Get import statistics
   */
  async getImportStats() {
    try {
      const totalBlogs = await BlogsModel.countDocuments();
      const publishedBlogs = await BlogsModel.countDocuments({ status: 'published' });
      const draftBlogs = await BlogsModel.countDocuments({ status: 'draft' });
      const featuredBlogs = await BlogsModel.countDocuments({ featured: true });

      console.log('\n📊 Database Statistics:');
      console.log(`Total blogs: ${totalBlogs}`);
      console.log(`Published blogs: ${publishedBlogs}`);
      console.log(`Draft blogs: ${draftBlogs}`);
      console.log(`Featured blogs: ${featuredBlogs}`);

      return {
        total: totalBlogs,
        published: publishedBlogs,
        draft: draftBlogs,
        featured: featuredBlogs
      };
    } catch (error) {
      console.error('❌ Error getting import stats:', error);
      return null;
    }
  }
}

// Main execution function
async function main() {
  const importer = new BlogImporter();
  
  try {
    // Connect to database
    await importer.connectToDatabase();

    // Configuration options
    const options = {
      skipExisting: true,      // Skip blogs that already exist
      updateExisting: false,   // Set to true to update existing blogs instead of skipping
    };

    const inputFile = 'converted_blogs_for_model.json';
    
    console.log('🚀 Starting blog import process...');
    console.log(`📁 Input file: ${inputFile}`);
    console.log(`⚙️  Options:`, options);

    // Import blogs
    const results = await importer.importAllBlogs(inputFile, options);

    // Generate summary
    importer.generateSummary();

    // Show database statistics
    await importer.getImportStats();

    // Create sample categories (informational)
    await importer.createSampleCategories();

    console.log('\n🎉 Blog import process completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Create categories using your Category model');
    console.log('2. Update blog categories by mapping content to appropriate categories');
    console.log('3. Update author IDs to match actual users in your User collection');
    console.log('4. Review imported blogs in your MongoDB database');
    console.log('5. Set featured flags for important blogs');

  } catch (error) {
    console.error('💥 Import process failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await importer.disconnectFromDatabase();
  }
}

// Command line options
const args = process.argv.slice(2);
const command = args[0];

if (command === 'update-authors' && args[1]) {
  // Update author IDs for all blogs
  const importer = new BlogImporter();
  importer.connectToDatabase()
    .then(() => importer.updateAuthorIds(args[1]))
    .then(() => importer.disconnectFromDatabase())
    .catch(console.error);
} else if (command === 'stats') {
  // Show database statistics
  const importer = new BlogImporter();
  importer.connectToDatabase()
    .then(() => importer.getImportStats())
    .then(() => importer.disconnectFromDatabase())
    .catch(console.error);
} else {
  // Run main import process
  main();
}

export default BlogImporter; 