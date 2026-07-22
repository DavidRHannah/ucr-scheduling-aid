import mongoose from 'mongoose';

const RequirementSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  }
});

export const Requirement = mongoose.model('Requirement', RequirementSchema);
