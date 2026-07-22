const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
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
  duration: {
    type: Number, // studied duration in minutes
    required: [true, 'Please specify study duration in minutes']
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StudySession', studySessionSchema);
