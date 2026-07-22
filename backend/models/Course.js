import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  courseNumber: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  creditHours: {
    low: {
      type: Number,
      required: true
    },
    high: {
      type: Number,
      required: true
    }
  },
  description: {
    type: String
  },
  college: {
    type: String
  },
  department: {
    type: String
  }
});

CourseSchema.index({ subject: 1, courseNumber: 1 });

export const Course = mongoose.model('Course', CourseSchema);
