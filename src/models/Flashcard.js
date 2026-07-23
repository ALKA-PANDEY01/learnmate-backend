const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
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
  question: {
    type: String,
    required: [true, 'Please provide the card question'],
    trim: true
  },
  answer: {
    type: String,
    required: [true, 'Please provide the card answer'],
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  favorite: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  // Spaced Repetition parameters (SuperMemo-2 inspired)
  interval: {
    type: Number,
    default: 1 // Days until next review
  },
  easeFactor: {
    type: Number,
    default: 2.5 // Difficulty adjuster
  },
  repetitions: {
    type: Number,
    default: 0
  },
  nextReviewDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

flashcardSchema.index({ userId: 1, goalId: 1, nextReviewDate: 1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);
