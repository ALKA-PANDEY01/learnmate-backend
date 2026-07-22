const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true // Custom task identifier, e.g. "t-1-1"
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  week: {
    type: Number,
    required: [true, 'Please specify the week number']
  },
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  estimatedTime: {
    type: String,
    default: '45 mins'
  },
  type: {
    type: String,
    enum: ['theory', 'practical', 'quiz'],
    default: 'theory'
  },
  resources: [resourceSchema],
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'skipped'],
    default: 'pending'
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
});

// Compound indexes to speed up goal syllabus searches
taskSchema.index({ goalId: 1, week: 1, status: 1 });
taskSchema.index({ userId: 1, completed: 1 });

module.exports = mongoose.model('Task', taskSchema);
