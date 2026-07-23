const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badgeId: {
    type: String,
    required: true // e.g. "first_session", "streak_7", "hours_10", "flashcards_50", "quizzes_100", "roadmap_completed"
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'Award'
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can only unlock a specific badge once
achievementSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);
