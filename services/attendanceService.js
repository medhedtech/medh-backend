import Attendance from "../models/attendance.model.js";
import Enrollment from "../models/enrollment-model.js";
import mongoose from "mongoose";

class AttendanceService {
  /**
   * Mark attendance for a session
   * @param {Object} attendanceData - Session and attendance data
   * @returns {Object} Created attendance record
   */
  async markAttendance(attendanceData) {
    try {
      const {
        batch_id,
        instructor_id,
        session_date,
        session_type,
        session_title,
        attendance_records,
        session_notes,
        marked_by,
        session_duration_minutes,
        meeting_link,
        recording_link,
        materials_shared
      } = attendanceData;

      // Check if attendance already exists for this session
      const existingAttendance = await Attendance.findOne({
        batch_id: new mongoose.Types.ObjectId(batch_id),
        session_date: new Date(session_date),
        session_type
      });

      if (existingAttendance) {
        throw new Error('Attendance already marked for this session');
      }

      // Create new attendance record
      const attendance = new Attendance({
        batch_id,
        instructor_id,
        session_date: new Date(session_date),
        session_type,
        session_title,
        session_duration_minutes: session_duration_minutes || 60,
        attendance_records: attendance_records || [],
        session_notes: session_notes || '',
        marked_by,
        meeting_link,
        recording_link,
        materials_shared: materials_shared || []
      });

      await attendance.save();

      return {
        success: true,
        data: attendance,
        message: 'Attendance marked successfully'
      };
    } catch (error) {
      console.error('Error in markAttendance:', error);
      throw new Error(`Failed to mark attendance: ${error.message}`);
    }
  }

  /**
   * Bulk mark attendance for multiple students
   * @param {Object} bulkData - Bulk attendance data
   * @returns {Object} Updated attendance record
   */
  async bulkMarkAttendance(bulkData) {
    try {
      const {
        attendance_id,
        attendance_records,
        updated_by
      } = bulkData;

      const attendance = await Attendance.findById(attendance_id);
      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      if (attendance.is_finalized) {
        throw new Error('Cannot update finalized attendance');
      }

      // Update attendance records
      attendance_records.forEach(record => {
        const existingIndex = attendance.attendance_records.findIndex(
          existing => existing.student_id.toString() === record.student_id.toString()
        );

        if (existingIndex !== -1) {
          // Update existing record
          Object.assign(attendance.attendance_records[existingIndex], record);
        } else {
          // Add new record
          attendance.attendance_records.push(record);
        }
      });

      attendance.last_updated_by = updated_by;
      attendance.last_updated_at = new Date();

      await attendance.save();

      return {
        success: true,
        data: attendance,
        message: 'Bulk attendance updated successfully'
      };
    } catch (error) {
      console.error('Error in bulkMarkAttendance:', error);
      throw new Error(`Failed to bulk mark attendance: ${error.message}`);
    }
  }

  /**
   * Update single attendance record
   * @param {string} attendanceId - Attendance document ID
   * @param {string} studentId - Student ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated attendance
   */
  async updateAttendanceRecord(attendanceId, studentId, updateData) {
    try {
      const attendance = await Attendance.findById(attendanceId);
      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      if (attendance.is_finalized) {
        throw new Error('Cannot update finalized attendance');
      }

      await attendance.updateAttendanceRecord(studentId, updateData.status, updateData);

      return {
        success: true,
        data: attendance,
        message: 'Attendance record updated successfully'
      };
    } catch (error) {
      console.error('Error in updateAttendanceRecord:', error);
      throw new Error(`Failed to update attendance record: ${error.message}`);
    }
  }

  /**
   * Get attendance for a specific session
   * @param {string} attendanceId - Attendance ID
   * @returns {Object} Attendance data
   */
  async getAttendanceById(attendanceId) {
    try {
      const attendance = await Attendance.findById(attendanceId)
        .populate('batch_id', 'batch_name course_id')
        .populate('instructor_id', 'full_name email')
        .populate('attendance_records.student_id', 'full_name email profile_picture')
        .populate('marked_by', 'full_name')
        .populate('last_updated_by', 'full_name')
        .lean();

      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      return {
        success: true,
        data: attendance
      };
    } catch (error) {
      console.error('Error in getAttendanceById:', error);
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }
  }

  /**
   * Get batch attendance summary
   * @param {string} batchId - Batch ID
   * @param {Object} options - Query options
   * @returns {Object} Attendance summary
   */
  async getBatchAttendanceSummary(batchId, options = {}) {
    try {
      const { start_date, end_date, session_type } = options;

      const query = {
        batch_id: new mongoose.Types.ObjectId(batchId)
      };

      if (start_date && end_date) {
        query.session_date = {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        };
      }

      if (session_type) {
        query.session_type = session_type;
      }

      const attendanceRecords = await Attendance.find(query)
        .populate('attendance_records.student_id', 'full_name email')
        .sort({ session_date: -1 })
        .lean();

      // Calculate summary statistics
      const stats = await Attendance.getBatchAttendanceStats(batchId, start_date, end_date);

      // Get student-wise attendance summary
      const studentAttendance = await this.getStudentAttendanceSummary(batchId, start_date, end_date);

      return {
        success: true,
        data: {
          sessions: attendanceRecords,
          statistics: stats,
          studentSummary: studentAttendance,
          totalSessions: attendanceRecords.length
        }
      };
    } catch (error) {
      console.error('Error in getBatchAttendanceSummary:', error);
      throw new Error(`Failed to fetch batch attendance summary: ${error.message}`);
    }
  }

  /**
   * Get student attendance summary for a batch
   * @param {string} batchId - Batch ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Array} Student attendance summary
   */
  async getStudentAttendanceSummary(batchId, startDate, endDate) {
    try {
      // Get all enrolled students for the batch
      const enrollments = await Enrollment.find({
        batch_id: new mongoose.Types.ObjectId(batchId),
        enrollment_status: 'active'
      })
      .populate('student_id', 'full_name email profile_picture')
      .lean();

      const studentSummary = [];

      for (const enrollment of enrollments) {
        const stats = await Attendance.getStudentAttendanceStats(
          enrollment.student_id._id,
          batchId,
          startDate,
          endDate
        );

        studentSummary.push({
          student: enrollment.student_id,
          attendance: stats || {
            totalSessions: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            excusedCount: 0,
            attendancePercentage: 0
          }
        });
      }

      return studentSummary;
    } catch (error) {
      console.error('Error in getStudentAttendanceSummary:', error);
      return [];
    }
  }

  /**
   * Get instructor attendance reports
   * @param {string} instructorId - Instructor ID
   * @param {Object} options - Query options
   * @returns {Object} Instructor attendance reports
   */
  async getInstructorAttendanceReports(instructorId, options = {}) {
    try {
      const { start_date, end_date, batch_id } = options;

      const query = {
        instructor_id: new mongoose.Types.ObjectId(instructorId)
      };

      if (start_date && end_date) {
        query.session_date = {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        };
      }

      if (batch_id) {
        query.batch_id = new mongoose.Types.ObjectId(batch_id);
      }

      const attendanceRecords = await Attendance.find(query)
        .populate('batch_id', 'batch_name course_id')
        .sort({ session_date: -1 })
        .lean();

      // Get instructor statistics
      const stats = await Attendance.getInstructorAttendanceStats(instructorId, start_date, end_date);

      // Group by batch
      const batchWiseAttendance = attendanceRecords.reduce((acc, record) => {
        const batchId = record.batch_id._id.toString();
        if (!acc[batchId]) {
          acc[batchId] = {
            batch: record.batch_id,
            sessions: [],
            totalSessions: 0,
            averageAttendance: 0
          };
        }
        acc[batchId].sessions.push(record);
        acc[batchId].totalSessions++;
        return acc;
      }, {});

      // Calculate average attendance for each batch
      Object.keys(batchWiseAttendance).forEach(batchId => {
        const batch = batchWiseAttendance[batchId];
        const totalAttendance = batch.sessions.reduce((sum, session) => sum + session.attendance_percentage, 0);
        batch.averageAttendance = batch.totalSessions > 0 ? Math.round(totalAttendance / batch.totalSessions) : 0;
      });

      return {
        success: true,
        data: {
          overallStats: stats,
          batchWiseAttendance: Object.values(batchWiseAttendance),
          totalSessions: attendanceRecords.length,
          dateRange: {
            start: start_date,
            end: end_date
          }
        }
      };
    } catch (error) {
      console.error('Error in getInstructorAttendanceReports:', error);
      throw new Error(`Failed to fetch instructor attendance reports: ${error.message}`);
    }
  }

  /**
   * Finalize attendance (lock from further edits)
   * @param {string} attendanceId - Attendance ID
   * @param {string} userId - User finalizing the attendance
   * @returns {Object} Updated attendance
   */
  async finalizeAttendance(attendanceId, userId) {
    try {
      const attendance = await Attendance.findById(attendanceId);
      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      if (attendance.is_finalized) {
        throw new Error('Attendance is already finalized');
      }

      await attendance.finalizeAttendance(userId);

      return {
        success: true,
        data: attendance,
        message: 'Attendance finalized successfully'
      };
    } catch (error) {
      console.error('Error in finalizeAttendance:', error);
      throw new Error(`Failed to finalize attendance: ${error.message}`);
    }
  }

  /**
   * Get attendance analytics for dashboard
   * @param {string} instructorId - Instructor ID
   * @param {Object} options - Query options
   * @returns {Object} Attendance analytics
   */
  async getAttendanceAnalytics(instructorId, options = {}) {
    try {
      const { period = 'month' } = options;
      
      let startDate;
      const endDate = new Date();

      switch (period) {
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        default:
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
      }

      const pipeline = [
        {
          $match: {
            instructor_id: new mongoose.Types.ObjectId(instructorId),
            session_date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$session_date"
              }
            },
            sessionsCount: { $sum: 1 },
            averageAttendance: { $avg: "$attendance_percentage" },
            totalStudents: { $sum: "$total_students" },
            totalPresent: { $sum: "$present_count" }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ];

      const dailyStats = await Attendance.aggregate(pipeline);

      // Get session type distribution
      const sessionTypeStats = await Attendance.aggregate([
        {
          $match: {
            instructor_id: new mongoose.Types.ObjectId(instructorId),
            session_date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: "$session_type",
            count: { $sum: 1 },
            averageAttendance: { $avg: "$attendance_percentage" }
          }
        }
      ]);

      return {
        success: true,
        data: {
          period,
          dateRange: { start: startDate, end: endDate },
          dailyStats,
          sessionTypeStats,
          summary: {
            totalSessions: dailyStats.reduce((sum, day) => sum + day.sessionsCount, 0),
            averageAttendance: dailyStats.length > 0 
              ? Math.round(dailyStats.reduce((sum, day) => sum + day.averageAttendance, 0) / dailyStats.length)
              : 0
          }
        }
      };
    } catch (error) {
      console.error('Error in getAttendanceAnalytics:', error);
      throw new Error(`Failed to fetch attendance analytics: ${error.message}`);
    }
  }

  /**
   * Export attendance data
   * @param {Object} filters - Export filters
   * @returns {Object} Attendance data for export
   */
  async exportAttendanceData(filters) {
    try {
      const {
        instructor_id,
        batch_id,
        start_date,
        end_date,
        format = 'json'
      } = filters;

      const query = {};

      if (instructor_id) {
        query.instructor_id = new mongoose.Types.ObjectId(instructor_id);
      }

      if (batch_id) {
        query.batch_id = new mongoose.Types.ObjectId(batch_id);
      }

      if (start_date && end_date) {
        query.session_date = {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        };
      }

      const attendanceData = await Attendance.find(query)
        .populate('batch_id', 'batch_name course_id')
        .populate('instructor_id', 'full_name email')
        .populate('attendance_records.student_id', 'full_name email')
        .sort({ session_date: -1 })
        .lean();

      // Format data for export
      const exportData = attendanceData.map(session => ({
        session_date: session.session_date,
        batch_name: session.batch_id?.batch_name,
        instructor_name: session.instructor_id?.full_name,
        session_type: session.session_type,
        session_title: session.session_title,
        total_students: session.total_students,
        present_count: session.present_count,
        absent_count: session.absent_count,
        attendance_percentage: session.attendance_percentage,
        students: session.attendance_records.map(record => ({
          student_name: record.student_id?.full_name,
          student_email: record.student_id?.email,
          status: record.status,
          join_time: record.join_time,
          leave_time: record.leave_time,
          duration_minutes: record.duration_minutes
        }))
      }));

      return {
        success: true,
        data: exportData,
        format,
        totalRecords: exportData.length
      };
    } catch (error) {
      console.error('Error in exportAttendanceData:', error);
      throw new Error(`Failed to export attendance data: ${error.message}`);
    }
  }
}

export default new AttendanceService(); 