import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    default: "Untitled Schedule"
  },
  termCode: {
    type: String,
    required: true
  },
  sectionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  }]
}, {
  timestamps: true
});

ScheduleSchema.index({ userId: 1, termCode: 1 });

export const Schedule = mongoose.model('Schedule', ScheduleSchema);
