import mongoose from 'mongoose';

const MeetingTimeSchema = new mongoose.Schema({
  weekDays: [{
    type: String,
    enum: ["M", "T", "W", "R", "F", "S", "U"]
  }],
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  meetingType: {
    code: { type: String },
    description: { type: String }
  },
  buildingDescription: {
    type: String
  },
  room: {
    type: String
  }
});

const SectionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  crn: {
    type: String,
    required: true
  },
  sectionNumber: {
    type: String,
    required: true
  },
  termCode: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  courseNumber: {
    type: String,
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  creditHours: {
    type: Number,
    required: true
  },
  scheduleType: {
    code: {
      type: String,
      enum: ["LEC", "DIS", "LAB", "SEM", "IND"],
      required: true
    },
    description: {
      type: String
    }
  },
  instructor: {
    type: String
  },
  meetingTimes: [MeetingTimeSchema],
  enrollmentMax: {
    type: Number,
    required: true
  },
  enrollmentCurrent: {
    type: Number,
    required: true
  },
  waitlistTotal: {
    type: Number,
    default: 0
  },
  waitlistRemaining: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["Open", "Closed", "Waitlisted"],
    required: true
  },
  campus: {
    type: String
  },
  requirementDesignation: {
    type: String
  },
  linkIdentifier: {
    type: String,
    default: null
  }
});

SectionSchema.index({ crn: 1, termCode: 1 }, { unique: true });
SectionSchema.index({ subject: 1, courseNumber: 1 });
SectionSchema.index({ requirementDesignation: 1 });

export const Section = mongoose.model('Section', SectionSchema);
