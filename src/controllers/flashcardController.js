const Flashcard = require('../models/Flashcard');
const Goal = require('../models/Goal');
const { generateFlashcards } = require('../services/ai.service');
const { checkAllAchievements } = require('../utils/achievementsEngine');

// @desc    Generate a deck of flashcards using Gemini AI
// @route   POST /api/flashcards/generate
// @access  Private
const generateFlashcardsForGoal = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId, topic } = req.body;

  if (!goalId || !topic) {
    return res.status(400).json({
      success: false,
      error: 'Please provide goalId and topic key.'
    });
  }

  try {
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const rawData = await generateFlashcards(topic, goal.domain, goal.skillLevel);

    const flashcardsToCreate = rawData.flashcards.map(card => ({
      userId,
      goalId,
      question: card.question,
      answer: card.answer,
      category: topic,
      difficulty: 'medium'
    }));

    const createdCards = await Flashcard.insertMany(flashcardsToCreate);

    // Check badges
    await checkAllAchievements(userId);

    res.status(201).json({
      success: true,
      count: createdCards.length,
      flashcards: createdCards
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Retrieve all user flashcards (supports filters & search)
// @route   GET /api/flashcards
// @access  Private
const getFlashcards = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId, search, favorite } = req.query;

  try {
    const filter = { userId };
    if (goalId) filter.goalId = goalId;
    if (favorite === 'true') filter.favorite = true;

    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } }
      ];
    }

    const flashcards = await Flashcard.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: flashcards.length,
      flashcards
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update flashcard difficulty (spaced repetition review) or favorite status
// @route   PATCH /api/flashcards/:id
// @access  Private
const updateFlashcard = async (req, res, next) => {
  const userId = req.user.id;
  const cardId = req.params.id;
  const { difficulty, favorite } = req.body;

  try {
    const card = await Flashcard.findOne({ _id: cardId, userId });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
    }

    if (favorite !== undefined) card.favorite = favorite;

    if (difficulty) {
      // SM-2 Spaced Repetition Logic:
      // quality: 5 (easy), 3 (medium), 1 (hard)
      let quality = 3;
      if (difficulty === 'easy') quality = 5;
      if (difficulty === 'hard') quality = 1;

      card.difficulty = difficulty;

      // Adjust ease factor
      card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

      if (quality < 3) {
        card.repetitions = 0;
        card.interval = 1;
      } else {
        card.repetitions += 1;
        if (card.repetitions === 1) {
          card.interval = 1;
        } else if (card.repetitions === 2) {
          card.interval = 6;
        } else {
          card.interval = Math.round(card.interval * card.easeFactor);
        }
      }

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + card.interval);
      card.nextReviewDate = nextReview;
    }

    await card.save();

    res.status(200).json({
      success: true,
      flashcard: card
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete flashcard
// @route   DELETE /api/flashcards/:id
// @access  Private
const deleteFlashcard = async (req, res, next) => {
  const userId = req.user.id;
  const cardId = req.params.id;

  try {
    const card = await Flashcard.findOneAndDelete({ _id: cardId, userId });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Flashcard deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateFlashcardsForGoal,
  getFlashcards,
  updateFlashcard,
  deleteFlashcard
};
