const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goal: {
    type: String,
    required: [true, 'Please provide a learning goal description'],
    trim: true
  },
  domain: {
    type: String,
    required: [true, 'Please provide a domain area'],
    trim: true
  },
  skillLevel: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate'
  },
  deadline: {
    type: Date,
    required: [true, 'Please provide a target deadline date']
  },
  hoursPerDay: {
    type: Number,
    required: [true, 'Please specify daily study hours available'],
    min: [0.5, 'Must study at least 30 minutes a day']
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  streak: {
    type: Number,
    default: 0
  },
  hoursStudied: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to optimize dashboard status lookups
goalSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Goal', goalSchema);
