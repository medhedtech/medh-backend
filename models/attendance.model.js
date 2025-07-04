import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true
  },
  join_time: {
    type: String,
    default: null
  },
  leave_time: {
    type: String,
    default: null
  },
  duration_minutes: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  ip_address: {
    type: String,
    default: null
  },
  device_info: {
    type: String,
    default: null
  }
});

const attendanceSchema = new mongoose.Schema({
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
    index: true
  },
  instructor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  session_date: {
    type: Date,
    required: true,
    index: true
  },
  session_type: {
    type: String,
    enum: ['live_class', 'demo', 'workshop', 'lab', 'exam', 'presentation'],
    required: true,
    default: 'live_class'
  },
  session_title: {
    type: String,
    required: true
  },
  session_duration_minutes: {
    type: Number,
    default: 60
  },
  total_students: {
    type: Number,
    default: 0
  },
  present_count: {
    type: Number,
    default: 0
  },
  absent_count: {
    type: Number,
    default: 0
  },
  late_count: {
    type: Number,
    default: 0
  },
  excused_count: {
    type: Number,
    default: 0
  },
  attendance_percentage: {
    type: Number,
    default: 0
  },
  attendance_records: [attendanceRecordSchema],
  session_notes: {
    type: String,
    default: ''
  },
  marked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  marked_at: {
    type: Date,
    default: Date.now
  },
  last_updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  last_updated_at: {
    type: Date,
    default: Date.now
  },
  is_finalized: {
    type: Boolean,
    default: false
  },
  meeting_link: {
    type: String,
    default: null
  },
  recording_link: {
    type: String,
    default: null
  },
  materials_shared: [{
    name: String,
    url: String,
    type: String
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
attendanceSchema.index({ batch_id: 1, session_date: 1 });
attendanceSchema.index({ instructor_id: 1, session_date: 1 });
attendanceSchema.index({ batch_id: 1, instructor_id: 1, session_date: 1 });
attendanceSchema.index({ 'attendance_records.student_id': 1 });

// Pre-save middleware to calculate attendance statistics
attendanceSchema.pre('save', function(next) {
  if (this.attendance_records && this.attendance_records.length > 0) {
    this.total_students = this.attendance_records.length;
    this.present_count = this.attendance_records.filter(record => record.status === 'present').length;
    this.absent_count = this.attendance_records.filter(record => record.status === 'absent').length;
    this.late_count = this.attendance_records.filter(record => record.status === 'late').length;
    this.excused_count = this.attendance_records.filter(record => record.status === 'excused').length;
    
    // Calculate attendance percentage (present + late + excused as attended)
    const attendedCount = this.present_count + this.late_count + this.excused_count;
    this.attendance_percentage = this.total_students > 0 
      ? Math.round((attendedCount / this.total_students) * 100) 
      : 0;
  }
  
  this.updated_at = new Date();
  next();
});

// Static methods for attendance analytics
attendanceSchema.statics.getBatchAttendanceStats = async function(batchId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        batch_id: new mongoose.Types.ObjectId(batchId),
        ...(startDate && endDate && {
          session_date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        })
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        averageAttendance: { $avg: '$attendance_percentage' },
        totalStudents: { $avg: '$total_students' },
        totalPresent: { $sum: '$present_count' },
        totalAbsent: { $sum: '$absent_count' },
        totalLate: { $sum: '$late_count' },
        totalExcused: { $sum: '$excused_count' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result.length > 0 ? result[0] : null;
};

attendanceSchema.statics.getStudentAttendanceStats = async function(studentId, batchId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        batch_id: new mongoose.Types.ObjectId(batchId),
        'attendance_records.student_id': new mongoose.Types.ObjectId(studentId),
        ...(startDate && endDate && {
          session_date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        })
      }
    },
    {
      $unwind: '$attendance_records'
    },
    {
      $match: {
        'attendance_records.student_id': new mongoose.Types.ObjectId(studentId)
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ['$attendance_records.status', 'present'] }, 1, 0]
          }
        },
        absentCount: {
          $sum: {
            $cond: [{ $eq: ['$attendance_records.status', 'absent'] }, 1, 0]
          }
        },
        lateCount: {
          $sum: {
            $cond: [{ $eq: ['$attendance_records.status', 'late'] }, 1, 0]
          }
        },
        excusedCount: {
          $sum: {
            $cond: [{ $eq: ['$attendance_records.status', 'excused'] }, 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        attendancePercentage: {
          $cond: [
            { $gt: ['$totalSessions', 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $add: ['$presentCount', '$lateCount', '$excusedCount'] },
                    '$totalSessions'
                  ]
                },
                100
              ]
            },
            0
          ]
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result.length > 0 ? result[0] : null;
};

attendanceSchema.statics.getInstructorAttendanceStats = async function(instructorId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        instructor_id: new mongoose.Types.ObjectId(instructorId),
        ...(startDate && endDate && {
          session_date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        })
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        averageAttendance: { $avg: '$attendance_percentage' },
        totalStudentsAcrossSessions: { $sum: '$total_students' },
        totalPresent: { $sum: '$present_count' },
        totalAbsent: { $sum: '$absent_count' },
        totalLate: { $sum: '$late_count' },
        totalExcused: { $sum: '$excused_count' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result.length > 0 ? result[0] : null;
};

// Instance methods
attendanceSchema.methods.updateAttendanceRecord = function(studentId, status, additionalData = {}) {
  const recordIndex = this.attendance_records.findIndex(
    record => record.student_id.toString() === studentId.toString()
  );

  if (recordIndex !== -1) {
    this.attendance_records[recordIndex].status = status;
    Object.assign(this.attendance_records[recordIndex], additionalData);
  } else {
    this.attendance_records.push({
      student_id: studentId,
      status,
      ...additionalData
    });
  }

  return this.save();
};

attendanceSchema.methods.finalizeAttendance = function(userId) {
  this.is_finalized = true;
  this.last_updated_by = userId;
  this.last_updated_at = new Date();
  return this.save();
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance; 