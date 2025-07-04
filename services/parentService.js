import mongoose from "mongoose";
import ParentChild from "../models/parent-child.model.js";
import User from "../models/user-modal.js";
import EnrolledCourse from "../models/enrolled-courses-model.js";
import Enrollment from "../models/enrollment-model.js";
import Attendance from "../models/attendance.model.js";
import DemoBooking from "../models/demo-booking.model.js";
import Certificate from "../models/certificate-model.js";
import Announcement from "../models/announcement-model.js";
import Assignment from "../models/assignment.js";
import { Course } from "../models/course-model.js";
import Progress from "../models/progress-model.js";
import EnhancedProgress from "../models/enhanced-progress.model.js";
import RecordedSession from "../models/recorded-sessions-model.js";
import logger from "../utils/logger.js";

class ParentService {
  /**
   * Get parent dashboard profile with linked children
   * @param {string} parentId - Parent user ID
   * @returns {Object} Parent profile with children
   */
  static async getParentDashboardProfile(parentId) {
    try {
      // Get parent details
      const parent = await User.findById(parentId)
        .select('full_name email phone_numbers user_image status role created_at last_login')
        .lean();

      if (!parent) {
        throw new Error('Parent not found');
      }

      // Get children relationships with pagination support
      const dashboardData = await ParentChild.getParentDashboardData(parentId);

      return {
        success: true,
        data: {
          parent: {
            id: parent._id,
            full_name: parent.full_name,
            email: parent.email,
            phone_numbers: parent.phone_numbers,
            user_image: parent.user_image,
            status: parent.status,
            member_since: parent.created_at,
            last_login: parent.last_login
          },
          children: dashboardData.children,
          summary: {
            total_children: dashboardData.total_children,
            active_children: dashboardData.active_children,
            permissions: dashboardData.has_permissions
          }
        }
      };
    } catch (error) {
      logger.error('Error in getParentDashboardProfile:', error);
      throw error;
    }
  }

  /**
   * Get upcoming classes for all children
   * @param {string} parentId - Parent user ID
   * @param {Object} options - Query options
   * @returns {Object} Upcoming classes
   */
  static async getUpcomingClasses(parentId, options = {}) {
    try {
      const { limit = 10, child_id, days_ahead = 7 } = options;
      
      // Get parent's children
      const children = await ParentChild.findChildrenByParent(parentId);
      
      if (!children.length) {
        return {
          success: true,
          data: {
            classes: [],
            total_classes: 0,
            children_with_classes: 0
          }
        };
      }

      const childIds = children.map(rel => rel.child_id._id);
      const targetChildIds = child_id ? [child_id] : childIds;

      // Get enrollments for children
      const enrollments = await Enrollment.find({
        student: { $in: targetChildIds },
        status: 'active'
      })
      .populate('course', 'course_title course_image')
      .populate('batch', 'batch_name schedule start_date end_date')
      .lean();

      // Get upcoming classes from enrollments with batches
      const upcomingClasses = [];
      const now = new Date();
      const futureDate = new Date(now.getTime() + (days_ahead * 24 * 60 * 60 * 1000));

      for (const enrollment of enrollments) {
        if (enrollment.batch && enrollment.batch.schedule) {
          const schedule = enrollment.batch.schedule;
          
          // Generate upcoming class sessions based on schedule
          const classSessions = this.generateUpcomingClassSessions(
            schedule, 
            enrollment.batch.start_date, 
            enrollment.batch.end_date,
            now,
            futureDate
          );

          classSessions.forEach(session => {
            const childInfo = children.find(rel => 
              rel.child_id._id.toString() === enrollment.student.toString()
            );

            upcomingClasses.push({
              class_id: `${enrollment._id}_${session.date}`,
              child: {
                id: childInfo.child_id._id,
                name: childInfo.child_id.full_name,
                student_id: childInfo.child_id.student_id
              },
              course: {
                id: enrollment.course._id,
                title: enrollment.course.course_title,
                image: enrollment.course.course_image
              },
              batch: {
                id: enrollment.batch._id,
                name: enrollment.batch.batch_name
              },
              session: {
                date: session.date,
                start_time: session.start_time,
                end_time: session.end_time,
                duration: session.duration,
                type: session.type || 'live_class',
                topic: session.topic || 'Regular Class'
              },
              status: 'scheduled',
              meeting_link: session.meeting_link,
              instructor: session.instructor
            });
          });
        }
      }

      // Sort by date and limit
      upcomingClasses.sort((a, b) => new Date(a.session.date) - new Date(b.session.date));
      const limitedClasses = upcomingClasses.slice(0, limit);

      // Get unique children with classes
      const childrenWithClasses = new Set(limitedClasses.map(cls => cls.child.id.toString())).size;

      return {
        success: true,
        data: {
          classes: limitedClasses,
          total_classes: upcomingClasses.length,
          children_with_classes: childrenWithClasses,
          date_range: {
            from: now,
            to: futureDate
          }
        }
      };
    } catch (error) {
      logger.error('Error in getUpcomingClasses:', error);
      throw error;
    }
  }

  /**
   * Generate upcoming class sessions from batch schedule
   * @private
   */
  static generateUpcomingClassSessions(schedule, startDate, endDate, fromDate, toDate) {
    const sessions = [];
    
    if (!schedule || !schedule.days || !schedule.time) {
      return sessions;
    }

    const currentDate = new Date(Math.max(fromDate, startDate));
    const finalDate = new Date(Math.min(toDate, endDate));
    
    // Generate sessions for each scheduled day
    while (currentDate <= finalDate) {
      const dayOfWeek = currentDate.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      
      if (schedule.days.includes(dayName)) {
        const sessionDate = new Date(currentDate);
        const [startHour, startMinute] = schedule.time.start.split(':').map(Number);
        const [endHour, endMinute] = schedule.time.end.split(':').map(Number);
        
        sessionDate.setHours(startHour, startMinute, 0, 0);
        
        if (sessionDate >= fromDate) {
          const endTime = new Date(sessionDate);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          sessions.push({
            date: sessionDate,
            start_time: schedule.time.start,
            end_time: schedule.time.end,
            duration: Math.round((endTime - sessionDate) / (1000 * 60)), // minutes
            type: 'live_class'
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return sessions;
  }

  /**
   * Get performance summary for all children
   * @param {string} parentId - Parent user ID
   * @param {Object} options - Query options
   * @returns {Object} Performance summary
   */
  static async getPerformanceSummary(parentId, options = {}) {
    try {
      const { child_id, time_period = '30d' } = options;
      
      // Get parent's children with permission check
      const children = await ParentChild.find({
        parent_id: parentId,
        status: 'active',
        can_view_performance: true
      }).populate('child_id', 'full_name student_id user_image');

      if (!children.length) {
        return {
          success: true,
          data: {
            children: [],
            overall_stats: {
              total_children: 0,
              average_performance: 0,
              children_excelling: 0,
              children_struggling: 0
            }
          }
        };
      }

      const targetChildren = child_id 
        ? children.filter(rel => rel.child_id._id.toString() === child_id)
        : children;

      const performanceData = [];
      let totalPerformance = 0;
      let excellingCount = 0;
      let strugglingCount = 0;

      for (const childRel of targetChildren) {
        const childId = childRel.child_id._id;
        
        // Get enhanced progress for all child's courses
        const progressRecords = await EnhancedProgress.find({
          student: childId
        }).populate('course', 'course_title course_image');

        // Get recent assignments and grades
        const recentAssignments = await this.getChildRecentAssignments(childId, time_period);
        
        // Get attendance summary
        const attendanceSummary = await this.getChildAttendanceSummary(childId, time_period);

        // Calculate overall performance metrics
        const overallCompletion = progressRecords.length > 0
          ? Math.round(progressRecords.reduce((sum, p) => sum + p.overallProgress.overallCompletionPercentage, 0) / progressRecords.length)
          : 0;

        const averageQuizScore = progressRecords.length > 0
          ? Math.round(progressRecords.reduce((sum, p) => sum + (p.overallProgress.averageQuizScore || 0), 0) / progressRecords.length)
          : 0;

        const averageAssignmentScore = progressRecords.length > 0
          ? Math.round(progressRecords.reduce((sum, p) => sum + (p.overallProgress.averageAssignmentScore || 0), 0) / progressRecords.length)
          : 0;

        // Calculate overall performance score (weighted average)
        const performanceScore = Math.round(
          (overallCompletion * 0.4) + 
          (averageQuizScore * 0.3) + 
          (averageAssignmentScore * 0.3)
        );

        // Categorize performance
        if (performanceScore >= 85) excellingCount++;
        else if (performanceScore < 60) strugglingCount++;

        totalPerformance += performanceScore;

        performanceData.push({
          child: {
            id: childRel.child_id._id,
            name: childRel.child_id.full_name,
            student_id: childRel.child_id.student_id,
            image: childRel.child_id.user_image
          },
          performance: {
            overall_score: performanceScore,
            course_completion: overallCompletion,
            quiz_average: averageQuizScore,
            assignment_average: averageAssignmentScore,
            attendance_percentage: attendanceSummary.percentage
          },
          current_courses: progressRecords.length,
          recent_activity: {
            assignments_completed: recentAssignments.completed,
            assignments_pending: recentAssignments.pending,
            classes_attended: attendanceSummary.attended,
            total_classes: attendanceSummary.total
          },
          trends: {
            performance_trend: this.calculatePerformanceTrend(progressRecords),
            attendance_trend: attendanceSummary.trend
          }
        });
      }

      const averagePerformance = targetChildren.length > 0
        ? Math.round(totalPerformance / targetChildren.length)
        : 0;

      return {
        success: true,
        data: {
          children: performanceData,
          overall_stats: {
            total_children: targetChildren.length,
            average_performance: averagePerformance,
            children_excelling: excellingCount,
            children_struggling: strugglingCount
          },
          time_period: time_period
        }
      };
    } catch (error) {
      logger.error('Error in getPerformanceSummary:', error);
      throw error;
    }
  }

  /**
   * Get dashboard shortcuts based on permissions and usage
   * @param {string} parentId - Parent user ID
   * @returns {Object} Dashboard shortcuts
   */
  static async getDashboardShortcuts(parentId) {
    try {
      // Get parent permissions
      const parentData = await ParentChild.getParentDashboardData(parentId);
      const permissions = parentData.has_permissions;

      // Default shortcuts available to all parents
      const shortcuts = [
        {
          id: 'profile',
          title: 'My Profile',
          description: 'View and edit your profile information',
          icon: 'user',
          url: '/parent/profile',
          category: 'account',
          enabled: true,
          priority: 1
        },
        {
          id: 'children',
          title: 'My Children',
          description: 'Manage linked children profiles',
          icon: 'users',
          url: '/parent/children',
          category: 'family',
          enabled: parentData.total_children > 0,
          priority: 2,
          badge: parentData.total_children > 0 ? parentData.total_children.toString() : null
        }
      ];

      // Add permission-based shortcuts
      if (permissions.can_view_performance) {
        shortcuts.push({
          id: 'performance',
          title: 'Performance Tracking',
          description: 'Track your children\'s academic progress',
          icon: 'chart-line',
          url: '/parent/performance',
          category: 'academics',
          enabled: true,
          priority: 3
        });
      }

      if (permissions.can_view_attendance) {
        shortcuts.push({
          id: 'attendance',
          title: 'Attendance Reports',
          description: 'View attendance records for your children',
          icon: 'calendar-check',
          url: '/parent/attendance',
          category: 'academics',
          enabled: true,
          priority: 4
        });
      }

      if (permissions.can_communicate_with_instructors) {
        shortcuts.push({
          id: 'messages',
          title: 'Messages',
          description: 'Communicate with instructors',
          icon: 'message-circle',
          url: '/parent/messages',
          category: 'communication',
          enabled: true,
          priority: 5
        });
      }

      if (permissions.can_schedule_meetings) {
        shortcuts.push({
          id: 'demo_sessions',
          title: 'Demo Sessions',
          description: 'Schedule and manage demo sessions',
          icon: 'video',
          url: '/parent/demo-sessions',
          category: 'meetings',
          enabled: true,
          priority: 6
        });
      }

      // Add general shortcuts
      shortcuts.push(
        {
          id: 'announcements',
          title: 'Announcements',
          description: 'View school announcements and updates',
          icon: 'megaphone',
          url: '/parent/announcements',
          category: 'information',
          enabled: true,
          priority: 7
        },
        {
          id: 'timetable',
          title: 'Class Schedule',
          description: 'View children\'s class timetables',
          icon: 'calendar',
          url: '/parent/timetable',
          category: 'academics',
          enabled: parentData.total_children > 0,
          priority: 8
        }
      );

      // Sort by priority and group by category
      shortcuts.sort((a, b) => a.priority - b.priority);
      
      const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
        const category = shortcut.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(shortcut);
        return groups;
      }, {});

      return {
        success: true,
        data: {
          shortcuts: shortcuts.filter(s => s.enabled),
          grouped_shortcuts: groupedShortcuts,
          total_shortcuts: shortcuts.filter(s => s.enabled).length
        }
      };
    } catch (error) {
      logger.error('Error in getDashboardShortcuts:', error);
      throw error;
    }
  }

  /**
   * Get demo sessions for parent's children
   * @param {string} parentId - Parent user ID
   * @param {Object} options - Query options
   * @returns {Object} Demo sessions
   */
  static async getDemoSessions(parentId, options = {}) {
    try {
      const { page = 1, limit = 10, status, child_id } = options;
      
      // Get parent's children
      const children = await ParentChild.findChildrenByParent(parentId);
      
      if (!children.length) {
        return {
          success: true,
          data: {
            sessions: [],
            pagination: {
              current_page: parseInt(page),
              total_pages: 0,
              total_sessions: 0,
              has_next: false,
              has_prev: false
            }
          }
        };
      }

      const childEmails = children.map(rel => rel.child_id.email);
      const childIds = children.map(rel => rel.child_id._id);

      // Build query
      const query = {
        $or: [
          { email: { $in: childEmails } },
          { userId: { $in: childIds } }
        ]
      };

      if (status) {
        query.status = status;
      }

      if (child_id) {
        const targetChild = children.find(rel => rel.child_id._id.toString() === child_id);
        if (targetChild) {
          query.$or = [
            { email: targetChild.child_id.email },
            { userId: targetChild.child_id._id }
          ];
        }
      }

      // Get sessions with pagination
      const skip = (page - 1) * limit;
      const [sessions, totalCount] = await Promise.all([
        DemoBooking.find(query)
          .sort({ scheduledDateTime: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        DemoBooking.countDocuments(query)
      ]);

      // Enhance sessions with child information
      const enhancedSessions = sessions.map(session => {
        const child = children.find(rel => 
          rel.child_id.email === session.email || 
          rel.child_id._id.toString() === session.userId?.toString()
        );

        return {
          ...session,
          child_info: child ? {
            id: child.child_id._id,
            name: child.child_id.full_name,
            student_id: child.child_id.student_id
          } : null
        };
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: {
          sessions: enhancedSessions,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_sessions: totalCount,
            has_next: page < totalPages,
            has_prev: page > 1
          }
        }
      };

    } catch (error) {
      logger.error('Error in getDemoSessions:', error);
      throw error;
    }
  }

  /**
   * Get demo session by ID
   * @param {string} parentId - Parent user ID
   * @param {string} sessionId - Demo session ID
   * @returns {Object} Demo session details
   */
  static async getDemoSessionById(parentId, sessionId) {
    try {
      // Get parent's children
      const children = await ParentChild.findChildrenByParent(parentId);
      
      if (!children.length) {
        throw new Error('No children found for this parent');
      }

      const childEmails = children.map(rel => rel.child_id.email);
      const childIds = children.map(rel => rel.child_id._id);

      // Find session and verify access
      const session = await DemoBooking.findOne({
        _id: sessionId,
        $or: [
          { email: { $in: childEmails } },
          { userId: { $in: childIds } }
        ]
      }).lean();

      if (!session) {
        throw new Error('Demo session not found or access denied');
      }

      // Find associated child
      const child = children.find(rel => 
        rel.child_id.email === session.email || 
        rel.child_id._id.toString() === session.userId?.toString()
      );

      return {
        success: true,
        data: {
          ...session,
          child_info: child ? {
            id: child.child_id._id,
            name: child.child_id.full_name,
            student_id: child.child_id.student_id
          } : null
        }
      };

    } catch (error) {
      logger.error('Error in getDemoSessionById:', error);
      throw error;
    }
  }

  /**
   * Get certificates for parent's children
   * @param {string} parentId - Parent user ID
   * @param {Object} options - Query options
   * @returns {Object} Certificates
   */
  static async getCertificates(parentId, options = {}) {
    try {
      const { child_id, course_id } = options;
      
      // Get parent's children
      const children = await ParentChild.findChildrenByParent(parentId);
      
      if (!children.length) {
        return {
          success: true,
          data: {
            certificates: [],
            total_certificates: 0,
            children_with_certificates: 0
          }
        };
      }

      const childIds = children.map(rel => rel.child_id._id);
      const targetChildIds = child_id ? [child_id] : childIds;

      // Build query
      const query = { student: { $in: targetChildIds } };
      if (course_id) {
        query.course = course_id;
      }

      // Get certificates
      const certificates = await Certificate.find(query)
        .populate('course', 'course_title course_image')
        .populate('student', 'full_name student_id')
        .sort({ issueDate: -1 })
        .lean();

      // Enhance with child information
      const enhancedCertificates = certificates.map(cert => {
        const childRel = children.find(rel => 
          rel.child_id._id.toString() === cert.student._id.toString()
        );

        return {
          ...cert,
          child_info: {
            id: cert.student._id,
            name: cert.student.full_name,
            student_id: cert.student.student_id,
            relationship: childRel ? childRel.relationship_type : 'unknown'
          }
        };
      });

      // Get unique children with certificates
      const childrenWithCerts = new Set(certificates.map(cert => cert.student._id.toString())).size;

      return {
        success: true,
        data: {
          certificates: enhancedCertificates,
          total_certificates: certificates.length,
          children_with_certificates: childrenWithCerts
        }
      };

    } catch (error) {
      logger.error('Error in getCertificates:', error);
      throw error;
    }
  }

  /**
   * Get timetable for children
   * @param {string} parentId - Parent user ID
   * @param {Object} options - Query options
   * @returns {Object} Timetable data
   */
  static async getTimetable(parentId, options = {}) {
    try {
      const { child_id, week_offset = 0 } = options;
      
      // Calculate week dates
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (week_offset * 7));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Get parent's children
      const children = await ParentChild.findChildrenByParent(parentId);
      
      if (!children.length) {
        return {
          success: true,
          data: {
            timetable: [],
            week_info: {
              start_date: startOfWeek,
              end_date: endOfWeek,
              week_offset: week_offset
            }
          }
        };
      }

      const childIds = children.map(rel => rel.child_id._id);
      const targetChildIds = child_id ? [child_id] : childIds;

      // Get active enrollments with batch schedules
      const enrollments = await Enrollment.find({
        student: { $in: targetChildIds },
        status: 'active'
      })
      .populate('course', 'course_title course_image')
      .populate('batch', 'batch_name schedule start_date end_date')
      .lean();

      // Generate timetable
      const timetableData = [];
      const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + dayOffset);
        const dayName = weekDays[dayOffset].toLowerCase();

        const dayClasses = [];

        for (const enrollment of enrollments) {
          if (enrollment.batch && enrollment.batch.schedule && enrollment.batch.schedule.days) {
            if (enrollment.batch.schedule.days.includes(dayName)) {
              const childInfo = children.find(rel => 
                rel.child_id._id.toString() === enrollment.student.toString()
              );

              dayClasses.push({
                child: {
                  id: childInfo.child_id._id,
                  name: childInfo.child_id.full_name,
                  student_id: childInfo.child_id.student_id
                },
                course: {
                  id: enrollment.course._id,
                  title: enrollment.course.course_title,
                  image: enrollment.course.course_image
                },
                batch: {
                  id: enrollment.batch._id,
                  name: enrollment.batch.batch_name
                },
                time: {
                  start: enrollment.batch.schedule.time.start,
                  end: enrollment.batch.schedule.time.end
                },
                date: currentDate,
                status: currentDate < today ? 'completed' : 'scheduled'
              });
            }
          }
        }

        // Sort classes by start time
        dayClasses.sort((a, b) => a.time.start.localeCompare(b.time.start));

        timetableData.push({
          day: weekDays[dayOffset],
          date: currentDate,
          classes: dayClasses,
          total_classes: dayClasses.length
        });
      }

      return {
        success: true,
        data: {
          timetable: timetableData,
          week_info: {
            start_date: startOfWeek,
            end_date: endOfWeek,
            week_offset: week_offset
          },
          summary: {
            total_weekly_classes: timetableData.reduce((sum, day) => sum + day.total_classes, 0),
            children_with_classes: new Set(
              timetableData.flatMap(day => day.classes.map(cls => cls.child.id.toString()))
            ).size
          }
        }
      };

    } catch (error) {
      logger.error('Error in getTimetable:', error);
      throw error;
    }
  }

  /**
   * Get attendance reports for children
   * @param {string} parentId - Parent user ID
   * @param {Object} options - Query options
   * @returns {Object} Attendance reports
   */
  static async getAttendanceReports(parentId, options = {}) {
    try {
      const { child_id, start_date, end_date, batch_id } = options;
      
      // Get parent's children with attendance permission
      const children = await ParentChild.find({
        parent_id: parentId,
        status: 'active',
        can_view_attendance: true
      }).populate('child_id', 'full_name student_id user_image');

      if (!children.length) {
        return {
          success: true,
          data: {
            attendance_reports: [],
            summary: {
              total_children: 0,
              average_attendance: 0
            }
          }
        };
      }

      const targetChildren = child_id 
        ? children.filter(rel => rel.child_id._id.toString() === child_id)
        : children;

      const attendanceReports = [];
      let totalAttendancePercentage = 0;

      for (const childRel of targetChildren) {
        const childId = childRel.child_id._id;
        
        // Get child's enrollments
        const enrollments = await Enrollment.find({
          student: childId,
          status: 'active',
          ...(batch_id && { batch: batch_id })
        }).populate('batch', 'batch_name');

        const childAttendanceData = [];
        let childTotalSessions = 0;
        let childAttendedSessions = 0;

        for (const enrollment of enrollments) {
          if (enrollment.batch) {
            // Get attendance records for this batch
            const attendanceQuery = {
              batch_id: enrollment.batch._id,
              'attendance_records.student_id': childId
            };

            if (start_date && end_date) {
              attendanceQuery.session_date = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
              };
            }

            const attendanceRecords = await Attendance.find(attendanceQuery);

            let batchTotalSessions = attendanceRecords.length;
            let batchAttendedSessions = 0;

            attendanceRecords.forEach(record => {
              const studentRecord = record.attendance_records.find(
                ar => ar.student_id.toString() === childId.toString()
              );
              
              if (studentRecord && ['present', 'late'].includes(studentRecord.status)) {
                batchAttendedSessions++;
              }
            });

            childTotalSessions += batchTotalSessions;
            childAttendedSessions += batchAttendedSessions;

            const batchAttendancePercentage = batchTotalSessions > 0 
              ? Math.round((batchAttendedSessions / batchTotalSessions) * 100)
              : 0;

            childAttendanceData.push({
              batch: {
                id: enrollment.batch._id,
                name: enrollment.batch.batch_name
              },
              total_sessions: batchTotalSessions,
              attended_sessions: batchAttendedSessions,
              attendance_percentage: batchAttendancePercentage,
              recent_sessions: attendanceRecords.slice(-5).map(record => {
                const studentRecord = record.attendance_records.find(
                  ar => ar.student_id.toString() === childId.toString()
                );
                
                return {
                  date: record.session_date,
                  status: studentRecord ? studentRecord.status : 'absent',
                  session_title: record.session_title
                };
              })
            });
          }
        }

        const childAttendancePercentage = childTotalSessions > 0
          ? Math.round((childAttendedSessions / childTotalSessions) * 100)
          : 0;

        totalAttendancePercentage += childAttendancePercentage;

        attendanceReports.push({
          child: {
            id: childRel.child_id._id,
            name: childRel.child_id.full_name,
            student_id: childRel.child_id.student_id,
            image: childRel.child_id.user_image
          },
          overall_attendance: {
            total_sessions: childTotalSessions,
            attended_sessions: childAttendedSessions,
            attendance_percentage: childAttendancePercentage
          },
          batch_wise_attendance: childAttendanceData,
          attendance_trend: this.calculateAttendanceTrend(childAttendanceData)
        });
      }

      const averageAttendance = targetChildren.length > 0
        ? Math.round(totalAttendancePercentage / targetChildren.length)
        : 0;

      return {
        success: true,
        data: {
          attendance_reports: attendanceReports,
          summary: {
            total_children: targetChildren.length,
            average_attendance: averageAttendance,
            date_range: start_date && end_date ? {
              start: start_date,
              end: end_date
            } : null
          }
        }
      };

    } catch (error) {
      logger.error('Error in getAttendanceReports:', error);
      throw error;
    }
  }

  /**
   * Helper method to get child's recent assignments
   * @private
   */
  static async getChildRecentAssignments(childId, timePeriod) {
    try {
      const days = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get child's enrolled courses
      const enrollments = await EnrolledCourse.find({
        student_id: childId,
        status: 'active'
      }).select('course_id');

      const courseIds = enrollments.map(e => e.course_id);

      // Get assignments for these courses
      const assignments = await Assignment.find({
        courseId: { $in: courseIds },
        due_date: { $gte: startDate }
      });

      const completed = assignments.filter(a => 
        a.submissions.some(s => s.studentId.toString() === childId.toString())
      ).length;

      const pending = assignments.length - completed;

      return { completed, pending, total: assignments.length };
    } catch (error) {
      logger.error('Error getting child recent assignments:', error);
      return { completed: 0, pending: 0, total: 0 };
    }
  }

  /**
   * Helper method to get child's attendance summary
   * @private
   */
  static async getChildAttendanceSummary(childId, timePeriod) {
    try {
      const days = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get attendance records
      const attendanceRecords = await Attendance.find({
        'attendance_records.student_id': childId,
        session_date: { $gte: startDate }
      });

      let totalSessions = attendanceRecords.length;
      let attendedSessions = 0;

      attendanceRecords.forEach(record => {
        const studentRecord = record.attendance_records.find(
          ar => ar.student_id.toString() === childId.toString()
        );
        
        if (studentRecord && ['present', 'late'].includes(studentRecord.status)) {
          attendedSessions++;
        }
      });

      const percentage = totalSessions > 0 
        ? Math.round((attendedSessions / totalSessions) * 100)
        : 0;

      return {
        total: totalSessions,
        attended: attendedSessions,
        percentage: percentage,
        trend: 'stable' // Simplified for now
      };
    } catch (error) {
      logger.error('Error getting child attendance summary:', error);
      return { total: 0, attended: 0, percentage: 0, trend: 'stable' };
    }
  }

  /**
   * Helper method to calculate performance trend
   * @private
   */
  static calculatePerformanceTrend(progressRecords) {
    // Simplified trend calculation
    if (progressRecords.length === 0) return 'stable';
    
    const recentProgress = progressRecords.reduce((sum, p) => 
      sum + p.overallProgress.overallCompletionPercentage, 0
    ) / progressRecords.length;

    if (recentProgress >= 80) return 'improving';
    if (recentProgress <= 40) return 'declining';
    return 'stable';
  }

  /**
   * Helper method to calculate attendance trend
   * @private
   */
  static calculateAttendanceTrend(attendanceData) {
    if (attendanceData.length === 0) return 'stable';
    
    const averageAttendance = attendanceData.reduce((sum, batch) => 
      sum + batch.attendance_percentage, 0
    ) / attendanceData.length;

    if (averageAttendance >= 85) return 'excellent';
    if (averageAttendance >= 75) return 'good';
    if (averageAttendance >= 60) return 'average';
    return 'needs_improvement';
  }
}

export default ParentService; 