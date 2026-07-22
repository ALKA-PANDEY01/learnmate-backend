const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: String, required: true }, // e.g. "45 mins"
  type: {
    type: String,
    required: true,
    enum: ['theory', 'practical', 'quiz']
  },
  resources: [resourceSchema],
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'skipped'],
    default: 'pending'
  }
}, { _id: false });

const weekSchema = new mongoose.Schema({
  id: { type: String, required: true }, // e.g. "w-1"
  weekNumber: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  isExpanded: { type: Boolean, default: false },
  tasks: [taskSchema]
}, { _id: false });

const learningPlanSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weeks: [weekSchema],
  version: {
    type: Number,
    default: 1
  },
  history: [
    {
      version: Number,
      weeks: [weekSchema],
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LearningPlan', learningPlanSchema);
