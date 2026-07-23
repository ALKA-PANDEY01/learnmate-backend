const StudySession = require('../models/StudySession');
const Goal = require('../models/Goal');
const { checkAllAchievements } = require('../utils/achievementsEngine');

// @desc    Register a new completed study session focus block
// @route   POST /api/study-session
// @access  Private
const createStudySession = async (req, res, next) => {
  const userId = req.user.id;
  const { duration, goalId, topic } = req.body;

  if (!duration || !goalId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide goalId and duration in minutes.'
    });
  }

  try {
    const session = await StudySession.create({
      userId,
      goalId,
      duration: Number(duration),
      topic: topic || 'General Study',
      date: new Date()
    });

    // Update goal's studied hours automatically
    const goal = await Goal.findById(goalId);
    if (goal) {
      const addedHours = Number((duration / 60).toFixed(1));
      goal.hoursStudied = Number((goal.hoursStudied + addedHours).toFixed(1));
      await goal.save();
    }

    // Check achievements
    await checkAllAchievements(userId);

    res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStudySession
};
