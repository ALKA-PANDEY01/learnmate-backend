const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
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
  topic: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  feedback: {
    explanation: String,
    weakTopics: [String],
    recommendedTopic: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

quizAttemptSchema.index({ userId: 1, goalId: 1, submittedAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
