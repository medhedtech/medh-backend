const Course = require('../models/course-model');
const Lesson = require('../models/lesson-model');
const Enrollment = require('../models/enrollment-model');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

class CourseCreationService {
  static async createCourseWithLessons(courseData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate course data
      this.validateCourseData(courseData);

      // Create the course first
      const course = await Course.create([courseData], { session });

      // Process curriculum and create lessons
      const lessons = await this.processCurriculum(course[0], courseData.curriculum, session);

      // Update course with lesson references and initialize enrollment count
      await Course.findByIdAndUpdate(
        course[0]._id,
        { 
          $set: { 
            'meta.totalLessons': lessons.length,
            'meta.lastUpdated': new Date(),
            'meta.enrollmentCount': 0,
            'meta.totalRevenue': 0,
            'meta.averageRating': 0,
            'meta.totalRatings': 0
          }
        },
        { session }
      );

      await session.commitTransaction();
      return course[0];
    } catch (error) {
      await session.abortTransaction();
      this.handleError(error);
    } finally {
      session.endSession();
    }
  }

  static handleError(error) {
    // Log the error for debugging
    console.error('Course Creation Error:', error);

    // Create a structured error response
    const errorResponse = {
      message: 'Failed to create course with lessons',
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        details: error.errors || {}
      }
    };

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      errorResponse.message = 'Validation failed';
      errorResponse.error.code = 'VALIDATION_ERROR';
    } else if (error.name === 'MongoError' && error.code === 11000) {
      errorResponse.message = 'Duplicate key error';
      errorResponse.error.code = 'DUPLICATE_ERROR';
    }

    throw new Error(JSON.stringify(errorResponse));
  }

  static async updateEnrollmentCount(courseId) {
    try {
      const count = await Enrollment.countDocuments({ course: courseId });
      await Course.findByIdAndUpdate(courseId, {
        $set: { 'meta.enrollmentCount': count }
      });
      return count;
    } catch (error) {
      console.error('Error updating enrollment count:', error);
      throw new Error(JSON.stringify({
        message: 'Error updating enrollment count',
        error: {
          code: error.code || 'ENROLLMENT_COUNT_ERROR',
          message: error.message
        }
      }));
    }
  }

  static async updateCourseStats(courseId) {
    try {
      const stats = await Promise.all([
        this.updateEnrollmentCount(courseId),
        this.calculateCourseRevenue(courseId),
        this.calculateCourseRating(courseId)
      ]);

      await Course.findByIdAndUpdate(courseId, {
        $set: {
          'meta.enrollmentCount': stats[0],
          'meta.totalRevenue': stats[1],
          'meta.averageRating': stats[2].averageRating,
          'meta.totalRatings': stats[2].totalRatings,
          'meta.lastUpdated': new Date()
        }
      });

      return {
        enrollmentCount: stats[0],
        totalRevenue: stats[1],
        averageRating: stats[2].averageRating,
        totalRatings: stats[2].totalRatings
      };
    } catch (error) {
      console.error('Error updating course stats:', error);
      throw new Error(JSON.stringify({
        message: 'Error updating course statistics',
        error: {
          code: error.code || 'COURSE_STATS_ERROR',
          message: error.message
        }
      }));
    }
  }

  static async calculateCourseRevenue(courseId) {
    try {
      const enrollments = await Enrollment.find({ course: courseId });
      return enrollments.reduce((total, enrollment) => total + (enrollment.price || 0), 0);
    } catch (error) {
      console.error('Error calculating course revenue:', error);
      return 0;
    }
  }

  static async calculateCourseRating(courseId) {
    try {
      const course = await Course.findById(courseId);
      return {
        averageRating: course.meta.averageRating || 0,
        totalRatings: course.meta.totalRatings || 0
      };
    } catch (error) {
      console.error('Error calculating course rating:', error);
      return { averageRating: 0, totalRatings: 0 };
    }
  }

  static validateCourseData(courseData) {
    if (!courseData.course_title) {
      throw new Error('Course title is required');
    }
    if (!courseData.curriculum || !Array.isArray(courseData.curriculum)) {
      throw new Error('Valid curriculum is required');
    }
    if (!courseData.course_category) {
      throw new Error('Course category is required');
    }
  }

  static async processCurriculum(course, curriculum, session) {
    const lessons = [];
    let lessonOrder = 1;

    for (const week of curriculum) {
      if (!week.sections || !Array.isArray(week.sections)) {
        throw new Error(`Invalid sections in week: ${week.weekTitle}`);
      }

      for (const section of week.sections) {
        if (!section.lessons || !Array.isArray(section.lessons)) {
          throw new Error(`Invalid lessons in section: ${section.title}`);
        }

        for (const lessonData of section.lessons) {
          const lesson = await this.createLesson(course, section, lessonData, lessonOrder++, session);
          lessons.push(lesson);
        }
      }
    }

    return lessons;
  }

  static async createLesson(course, section, lessonData, order, session) {
    const lessonType = this.determineLessonType(lessonData);
    const content = this.processLessonContent(lessonData, lessonType);
    
    const lesson = {
      id: uuidv4(),
      course: course._id,
      section: section.id,
      title: lessonData.title || section.title,
      description: lessonData.description || section.description || '',
      order,
      type: lessonType,
      duration: this.calculateDuration(lessonData),
      objectives: this.extractObjectives(lessonData),
      prerequisites: this.extractPrerequisites(lessonData),
      difficulty: this.determineDifficulty(lessonData),
      tags: this.extractTags(lessonData),
      isPublished: course.status === 'Published',
      isPreview: this.isPreviewLesson(lessonData),
      meta: {
        views: 0,
        averageRating: 0,
        totalRatings: 0,
        lastAccessed: null
      },
      ...content
    };

    // Add resources if any
    if (lessonData.resources && lessonData.resources.length > 0) {
      lesson.resources = this.processResources(lessonData.resources);
    }

    return await Lesson.create([lesson], { session });
  }

  static processLessonContent(lessonData, type) {
    const content = {};

    if (type === 'video' || type === 'mixed') {
      content.videoContent = this.createVideoContent(lessonData);
    }

    if (type === 'text' || type === 'mixed') {
      content.textContent = this.createTextContent(lessonData);
    }

    return content;
  }

  static determineLessonType(lessonData) {
    if (lessonData.videoUrl) {
      return lessonData.content ? 'mixed' : 'video';
    }
    return 'text';
  }

  static calculateDuration(lessonData) {
    if (lessonData.videoUrl && lessonData.videoDuration) {
      return lessonData.videoDuration;
    }
    
    if (lessonData.content) {
      // Estimate duration based on content length
      const words = lessonData.content.split(/\s+/).length;
      return Math.ceil(words / 200); // Assuming 200 words per minute
    }

    return 30; // Default duration in minutes
  }

  static extractObjectives(lessonData) {
    if (lessonData.objectives && Array.isArray(lessonData.objectives)) {
      return lessonData.objectives;
    }
    
    // Extract objectives from content if not explicitly provided
    if (lessonData.content) {
      const objectives = lessonData.content.match(/^[•-]\s*(.+)$/gm);
      return objectives ? objectives.map(obj => obj.replace(/^[•-]\s*/, '')) : ['Understand the key concepts'];
    }

    return ['Understand the key concepts'];
  }

  static extractPrerequisites(lessonData) {
    if (lessonData.prerequisites && Array.isArray(lessonData.prerequisites)) {
      return lessonData.prerequisites;
    }
    return [];
  }

  static determineDifficulty(lessonData) {
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    if (lessonData.difficulty && difficulties.includes(lessonData.difficulty.toLowerCase())) {
      return lessonData.difficulty.toLowerCase();
    }
    return 'intermediate';
  }

  static extractTags(lessonData) {
    if (lessonData.tags && Array.isArray(lessonData.tags)) {
      return lessonData.tags;
    }
    
    // Extract tags from content if not explicitly provided
    if (lessonData.content) {
      const hashtags = lessonData.content.match(/#\w+/g);
      return hashtags ? hashtags.map(tag => tag.slice(1)) : [];
    }

    return [];
  }

  static isPreviewLesson(lessonData) {
    return lessonData.isPreview || false;
  }

  static createVideoContent(lessonData) {
    if (!lessonData.videoUrl) return null;

    return {
      title: lessonData.title,
      url: lessonData.videoUrl,
      duration: this.calculateDuration(lessonData),
      thumbnail: lessonData.thumbnail || '',
      quality: this.processVideoQuality(lessonData),
      captions: this.processCaptions(lessonData),
      chapters: this.processChapters(lessonData),
      downloadUrl: lessonData.downloadUrl,
      isPreview: this.isPreviewLesson(lessonData)
    };
  }

  static processVideoQuality(lessonData) {
    const qualities = ['360p', '480p', '720p', '1080p', '4K'];
    if (lessonData.quality && Array.isArray(lessonData.quality)) {
      return lessonData.quality.filter(q => qualities.includes(q));
    }
    return ['720p'];
  }

  static processCaptions(lessonData) {
    if (!lessonData.captions || !Array.isArray(lessonData.captions)) {
      return [];
    }

    return lessonData.captions.map(caption => ({
      language: caption.language || 'en',
      url: caption.url,
      label: caption.label || caption.language
    }));
  }

  static processChapters(lessonData) {
    if (!lessonData.chapters || !Array.isArray(lessonData.chapters)) {
      return [];
    }

    return lessonData.chapters.map(chapter => ({
      title: chapter.title,
      timestamp: chapter.timestamp,
      description: chapter.description || ''
    }));
  }

  static createTextContent(lessonData) {
    if (!lessonData.content) return null;

    return {
      title: lessonData.title,
      content: lessonData.content,
      format: this.determineContentFormat(lessonData),
      sections: this.createContentSections(lessonData),
      estimatedReadingTime: this.calculateReadingTime(lessonData.content)
    };
  }

  static determineContentFormat(lessonData) {
    if (lessonData.format) {
      return ['markdown', 'html', 'plain'].includes(lessonData.format) 
        ? lessonData.format 
        : 'markdown';
    }
    return 'markdown';
  }

  static createContentSections(lessonData) {
    if (lessonData.sections && Array.isArray(lessonData.sections)) {
      return lessonData.sections.map((section, index) => ({
        title: section.title,
        content: section.content,
        order: index + 1
      }));
    }

    return [{
      title: lessonData.title,
      content: lessonData.content,
      order: 1
    }];
  }

  static calculateReadingTime(content) {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200); // Assuming 200 words per minute
  }

  static processResources(resources) {
    return resources.map((resource, index) => ({
      id: `resource_${index + 1}`,
      title: resource.title,
      type: resource.type,
      description: resource.description || '',
      fileUrl: resource.fileUrl,
      filename: this.extractFilename(resource.fileUrl),
      mimeType: this.determineMimeType(resource.type),
      size: resource.size || 0,
      duration: resource.duration,
      pages: resource.pages,
      isDownloadable: resource.isDownloadable !== false,
      isPreview: resource.isPreview || false,
      metadata: {
        author: resource.author,
        publisher: resource.publisher,
        publishedDate: resource.publishedDate,
        version: resource.version,
        language: resource.language
      }
    }));
  }

  static extractFilename(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop();
    } catch {
      return 'resource';
    }
  }

  static determineMimeType(type) {
    const mimeTypes = {
      'pdf': 'application/pdf',
      'document': 'application/msword',
      'image': 'image/jpeg',
      'audio': 'audio/mpeg',
      'video': 'video/mp4',
      'link': 'text/plain',
      'code': 'text/plain'
    };
    return mimeTypes[type] || 'application/octet-stream';
  }
}

module.exports = CourseCreationService; 