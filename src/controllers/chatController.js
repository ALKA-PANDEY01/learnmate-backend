const ChatHistory = require('../models/ChatHistory');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Quiz = require('../models/Quiz');
const { generateTutorResponse } = require('../services/ai.service');

// @desc    Retrieve chat history for a goal
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId } = req.query;

  try {
    let chat = await ChatHistory.findOne({ userId, goalId });
    if (!chat) {
      chat = await ChatHistory.create({
        userId,
        goalId,
        messages: [
          {
            role: 'model',
            content: "Hello! I am your LearnMate AI Study Tutor. Ask me to explain topics, generate code examples, create practice questions, or compile summaries from your roadmap!",
            timestamp: new Date()
          }
        ]
      });
    }

    res.status(200).json({
      success: true,
      chat
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message to the AI Study Tutor with context awareness
// @route   POST /api/chats
// @access  Private
const sendMessageToTutor = async (req, res, next) => {
  const userId = req.user.id;
  const { goalId, message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Please provide a message query.' });
  }

  try {
    let chat = await ChatHistory.findOne({ userId, goalId });
    if (!chat) {
      chat = await ChatHistory.create({ userId, goalId, messages: [] });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Compile Context Details
    let goalTitle = 'General Learning';
    let domain = 'Technology';
    let skillLevel = 'Intermediate';
    let completedTasks = [];
    let recentQuizScores = [];
    let weakTopics = [];

    const goal = await Goal.findById(goalId);
    if (goal) {
      goalTitle = goal.goal;
      domain = goal.domain;
      skillLevel = goal.skillLevel;

      // Completed tasks
      const doneTasks = await Task.find({ goalId, userId, completed: true });
      completedTasks = doneTasks.map(t => t.title);

      // Recent quizzes
      const quizzes = await Quiz.find({ goalId, userId }).sort({ submittedAt: -1 }).limit(5);
      recentQuizScores = quizzes.map(q => ({ topic: q.topic, score: q.score }));
      weakTopics = quizzes.filter(q => q.score < 60).map(q => q.topic);
    }

    const context = {
      goalTitle,
      domain,
      skillLevel,
      completedTasks,
      recentQuizScores,
      weakTopics
    };

    // Slice messages to avoid context window blowup
    const conversationWindow = chat.messages.slice(-15);

    // Call Gemini
    const replyText = await generateTutorResponse(message, conversationWindow, context);

    // Append AI reply
    chat.messages.push({
      role: 'model',
      content: replyText,
      timestamp: new Date()
    });

    await chat.save();

    res.status(200).json({
      success: true,
      reply: replyText,
      chat
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChats,
  sendMessageToTutor
};
