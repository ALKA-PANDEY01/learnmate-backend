const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Flashcard = require('../models/Flashcard');
const ChatHistory = require('../models/ChatHistory');

// @desc    Perform a global keyword regex search across all study assets
// @route   GET /api/search
// @access  Private
const globalSearch = async (req, res, next) => {
  const userId = req.user.id;
  const queryStr = req.query.q || req.query.query;

  if (!queryStr) {
    return res.status(200).json({
      success: true,
      results: { courses: [], tasks: [], flashcards: [], chats: [] }
    });
  }

  try {
    const regex = new RegExp(queryStr, 'i');

    // 1. Search Goals (Courses/Roadmaps)
    const courses = await Goal.find({
      userId,
      $or: [{ goal: regex }, { domain: regex }]
    });

    // 2. Search Tasks (Roadmap Topics)
    const tasks = await Task.find({
      userId,
      $or: [{ title: regex }, { description: regex }]
    }).limit(20);

    // 3. Search Flashcards
    const flashcards = await Flashcard.find({
      userId,
      $or: [{ question: regex }, { answer: regex }]
    }).limit(20);

    // 4. Search Chat history messages
    const chats = await ChatHistory.find({
      userId,
      'messages.content': regex
    }).limit(10);

    res.status(200).json({
      success: true,
      results: {
        courses: courses.map(c => ({ id: c._id, title: c.goal, domain: c.domain, status: c.status })),
        tasks: tasks.map(t => ({ id: t._id, title: t.title, week: t.week, status: t.status })),
        flashcards: flashcards.map(f => ({ id: f._id, question: f.question, answer: f.answer, category: f.category })),
        chats: chats.map(ch => ({ id: ch._id, matchedSnippet: queryStr }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  globalSearch
};
