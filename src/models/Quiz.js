const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: [true, 'Please provide the quiz topic subject'],
    trim: true
  },
  score: {
    type: Number,
    required: [true, 'Please provide the quiz score percentage'],
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    required: [true, 'Please specify the total questions count']
  },
  correctAnswers: {
    type: Number,
    required: [true, 'Please specify the correct answers count']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Index to optimize quiz performance charts and lookups
quizSchema.index({ userId: 1, goalId: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
