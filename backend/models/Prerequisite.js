import mongoose from 'mongoose';

const PrerequisiteSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  requiredCourseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  minGrade: {
    type: String,
    default: "D-"
  },
  concurrentAllowed: {
    type: Boolean,
    default: false
  },
  logicGroup: {
    type: String,
    required: true
  }
});

PrerequisiteSchema.index({ courseId: 1 });

export const Prerequisite = mongoose.model('Prerequisite', PrerequisiteSchema);
